"""
API REST del sistema. Autenticación por sesión de Django (cookie) + token CSRF.
Todas las respuestas de error tienen la forma {"detail": "mensaje para mostrar"}.
"""
import math
from datetime import timedelta

from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.core.management import call_command
from django.db.models import Prefetch
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from . import logica, serial, verificacion
from .datos.semilla import BASE
from .errores import ErrorNegocio
from .models import (
    Auditoria, BloqueoLogin, Categoria, Destino, Dispositivo, Equipo, Insumo, Lectura, Mantencion, MantencionInsumo,
)
from .reglas import BLOQUEO_MINUTOS, MAX_INTENTOS, validar_password


@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    return Response({"status": "ok", "message": "Hola desde Django"})


# ======================================================================
# Autenticación
# ======================================================================
@api_view(["GET"])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def me(request):
    """Usuario con sesión activa (o null). También entrega la cookie CSRF."""
    return Response(serial.usuario(request.user))


@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    """Paso 1: correo y contraseña. Si son correctos se envía un código al correo (paso 2: verificar_codigo)."""
    email = str(request.data.get("email") or "").strip().lower()
    password = request.data.get("password") or ""
    ahora = timezone.now()
    bloqueo = BloqueoLogin.objects.filter(email=email).first()

    if bloqueo and bloqueo.hasta and bloqueo.hasta > ahora:
        minutos = math.ceil((bloqueo.hasta - ahora).total_seconds() / 60)
        raise ErrorNegocio(f"Cuenta bloqueada temporalmente por intentos fallidos. Intenta de nuevo en {minutos} min.")

    # Django compara la contraseña con el hash guardado en auth_user (nunca se guarda en texto plano)
    usuario = authenticate(request, username=email, password=password)
    if usuario is None or not hasattr(usuario, "perfil"):
        if not bloqueo:
            bloqueo = BloqueoLogin(email=email)
        if bloqueo.hasta and bloqueo.hasta <= ahora:  # venció un bloqueo anterior: se reinicia
            bloqueo.fallos, bloqueo.hasta = 0, None
        bloqueo.fallos += 1
        if bloqueo.fallos >= MAX_INTENTOS:
            bloqueo.fallos, bloqueo.hasta = 0, ahora + timedelta(minutes=BLOQUEO_MINUTOS)
            bloqueo.save()
            logica.auditar(None, "Bloqueo de cuenta", f"{email}: {MAX_INTENTOS} intentos fallidos, bloqueada por {BLOQUEO_MINUTOS} min")
            raise ErrorNegocio(f"Demasiados intentos fallidos. La cuenta quedó bloqueada por {BLOQUEO_MINUTOS} minutos.")
        bloqueo.save()
        quedan = MAX_INTENTOS - bloqueo.fallos
        texto = "queda 1 intento" if quedan == 1 else f"quedan {quedan} intentos"
        raise ErrorNegocio(f"Correo o contraseña incorrectos. Te {texto} antes del bloqueo temporal.")

    BloqueoLogin.objects.filter(email=email).delete()
    return Response(verificacion.enviar_codigo(request, usuario))


@api_view(["POST"])
@permission_classes([AllowAny])
def verificar_codigo(request):
    """Paso 2: el código de 6 dígitos que llegó al correo. Recién aquí se abre la sesión."""
    usuario = verificacion.verificar(request, request.data.get("codigo"))
    login(request, usuario)
    logica.auditar(usuario, "Inicio de sesión",
                   f"{logica.nombre_de(usuario)} ({usuario.perfil.get_rol_display()}) · verificado con código al correo")
    return Response(serial.usuario(usuario))


@api_view(["POST"])
@permission_classes([AllowAny])
def reenviar_codigo(request):
    return Response(verificacion.reenviar(request))


@api_view(["POST"])
@permission_classes([AllowAny])
def logout_view(request):
    logout(request)
    return Response(status=204)


@api_view(["POST"])
def cambiar_password(request):
    actual = request.data.get("actual") or ""
    nueva = request.data.get("nueva") or ""
    repetir = request.data.get("repetir") or ""
    u = request.user
    if not u.check_password(actual):
        raise ErrorNegocio("La contraseña actual no es correcta.")
    validar_password(nueva)
    if nueva != repetir:
        raise ErrorNegocio("Las contraseñas nuevas no coinciden.")
    if nueva == actual:
        raise ErrorNegocio("La nueva contraseña debe ser distinta de la actual.")
    u.set_password(nueva)
    u.save()
    update_session_auth_hash(request, u)  # mantiene la sesión abierta
    logica.auditar(u, "Cambio de contraseña", logica.nombre_de(u))
    return Response(status=204)


@api_view(["POST"])
def restablecer(request):
    """'Restablecer datos': vuelve la base al estado inicial manteniendo la sesión. Solo el administrador."""
    logica.requiere(request.user, "restablecer")
    call_command("cargar_datos", reset=True)
    u = request.user
    u.refresh_from_db()
    update_session_auth_hash(request, u)
    logica.auditar(u, "Restablecer datos", f"{logica.nombre_de(u)} volvió los datos al estado inicial")
    return Response(status=204)


# ======================================================================
# Catálogos
# ======================================================================
@api_view(["GET"])
@permission_classes([AllowAny])
def resumen_login(request):
    """Cifras de la portada del login."""
    return Response({
        "equipos": Equipo.objects.filter(activo=True).count(),
        "destinos": Destino.objects.count(),
        "dispositivos": Dispositivo.objects.exclude(estado=Dispositivo.Estado.BAJA).count(),
    })


@api_view(["GET"])
def categorias(request):
    return Response([serial.categoria(c) for c in Categoria.objects.all()])


@api_view(["GET"])
def destinos(request):
    return Response([serial.destino(d) for d in Destino.objects.all()])


@api_view(["GET"])
def base(request):
    return Response({"base": BASE})


@api_view(["GET"])
def insumos(request):
    logica.requiere(request.user, "verInsumos")
    return Response([serial.insumo(i) for i in Insumo.objects.all()])


@api_view(["GET"])
def auditoria(request):
    logica.requiere(request.user, "auditoria")
    return Response([serial.auditoria(a) for a in Auditoria.objects.select_related("usuario")])


# ======================================================================
# Equipos
# ======================================================================
@api_view(["GET", "POST"])
def equipos(request):
    if request.method == "POST":
        eq = logica.crear_equipo(request.user, request.data)
        return Response(serial.equipo(eq), status=201)
    qs = Equipo.objects.all()
    if request.query_params.get("incluirBajas") not in ("1", "true"):
        qs = qs.filter(activo=True)
    con_incidencia = serial.ids_con_incidencia()
    return Response([serial.equipo(e, con_incidencia) for e in qs])


@api_view(["GET", "PUT", "DELETE"])
def equipo(request, pk):
    if request.method == "PUT":
        return Response(serial.equipo(logica.editar_equipo(request.user, pk, request.data)))
    if request.method == "DELETE":
        logica.eliminar_equipo(request.user, pk)
        return Response(status=204)
    eq = Equipo.objects.filter(pk=pk).first()
    return Response(serial.equipo(eq) if eq else None)


# ======================================================================
# Lecturas e incidencias
# ======================================================================
@api_view(["GET", "POST"])
def lecturas(request, pk):
    if request.method == "POST":
        r = logica.registrar_lectura(
            request.user, pk, request.data.get("valor"), origen="manual", motivo=(request.data.get("motivo") or "").strip()
        )
        return Response(r)
    qs = Lectura.objects.filter(equipo_id=pk).select_related("registrado_por", "dispositivo")
    return Response([serial.lectura(l) for l in qs])


@api_view(["POST"])
def resolver_incidencia(request, pk):
    logica.resolver_incidencia(request.user, pk, request.data.get("nota") or "")
    return Response(status=204)


# ======================================================================
# Mantenciones
# ======================================================================
@api_view(["GET", "POST"])
def mantenciones(request):
    if request.method == "POST":
        m = logica.registrar_mantencion(request.user, request.data)
        return Response(serial.mantencion(m), status=201)
    qs = Mantencion.objects.select_related("registrado_por").prefetch_related(
        Prefetch("insumos", queryset=MantencionInsumo.objects.select_related("insumo"))
    )
    if request.query_params.get("equipo"):
        qs = qs.filter(equipo_id=request.query_params["equipo"])
    return Response([serial.mantencion(m) for m in qs])


# ======================================================================
# Alertas
# ======================================================================
@api_view(["GET"])
def alertas(request):
    con_incidencia = serial.ids_con_incidencia()
    return Response([
        {
            "tipo": a["tipo"],
            "nivel": a["nivel"],
            "equipo": serial.equipo(a["equipo"], con_incidencia),
            "estado": serial.equipo(a["equipo"], con_incidencia)["estado"],
            "incidencia": serial.incidencia(a["incidencia"]) if a["incidencia"] else None,
            "gestion": serial.gestion(a["gestion"]),
        }
        for a in logica.alertas()
    ])


@api_view(["POST", "DELETE"])
def gestion_alerta(request, pk):
    if request.method == "DELETE":
        logica.quitar_gestion(request.user, pk)
    else:
        logica.marcar_en_gestion(request.user, pk, (request.data.get("nota") or "").strip())
    return Response(status=204)


# ======================================================================
# Dispositivos IoT
# ======================================================================
@api_view(["GET", "POST"])
def dispositivos(request):
    if request.method == "POST":
        logica.registrar_dispositivo(request.user, request.data.get("deviceId"), request.data.get("tipo"))
        return Response(status=201)
    qs = Dispositivo.objects.prefetch_related("pendientes").order_by("id")
    return Response([serial.dispositivo(d) for d in qs])


@api_view(["GET"])
def dispositivo(request, pk):
    """Ficha del dispositivo: datos, equipo vinculado, lecturas que envió e incidencias que generó."""
    logica.requiere(request.user, "verDispositivos")
    d = Dispositivo.objects.select_related("equipo__destino", "equipo__categoria", "equipo__pluma").filter(pk=pk).first()
    if not d:
        return Response(None)
    lecturas = d.lecturas.select_related("dispositivo")[:200]
    incidencias = d.incidencias.select_related("dispositivo").order_by("-fecha")
    return Response({
        **serial.dispositivo(d),
        "equipo": serial.equipo(d.equipo) if d.equipo else None,
        "lecturas": [serial.lectura(l) for l in lecturas],
        "totalLecturas": d.lecturas.count(),
        "incidencias": [serial.incidencia(i) for i in incidencias],
    })


@api_view(["POST"])
def vincular_dispositivo(request, pk):
    logica.vincular_dispositivo(request.user, pk, request.data.get("equipoId"))
    return Response(status=204)


@api_view(["POST"])
def baja_dispositivo(request, pk):
    logica.dar_de_baja_dispositivo(request.user, pk)
    return Response(status=204)


@api_view(["POST"])
def conexion_dispositivo(request, pk):
    return Response(logica.cambiar_conexion(request.user, pk, bool(request.data.get("online"))))


@api_view(["POST"])
def simular_lectura(request, pk):
    r = logica.simular_lectura(request.user, pk, bool(request.data.get("reinicio")))
    return Response(r)


# ======================================================================
# Telemetría
# ======================================================================
@api_view(["GET"])
def telemetria(request):
    con_incidencia = serial.ids_con_incidencia()
    filas = []
    for eq, t, disp in logica.filas_telemetria():
        filas.append({
            "equipo": serial.equipo(eq, con_incidencia),
            "t": serial.telemetria(t),
            "disp": serial.dispositivo(disp),
            "online": bool(disp) and disp.estado == Dispositivo.Estado.ONLINE,
            "gps": bool(disp) and disp.device_id.startswith("GPS-"),
        })
    return Response(filas)


@api_view(["POST"])
def sincronizar(request):
    return Response(logica.sincronizar_telemetria(request.user, bool(request.data.get("manual"))))


@api_view(["GET"])
def estado_sync(request):
    return Response(logica.estado_sync())
