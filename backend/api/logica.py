"""
Lógica de negocio con base de datos (equivale a prototipo_vilas/js/store.js).
Cada función recibe el usuario que actúa para validar permisos y registrar la auditoría.
"""
import random
import re
import time
from datetime import date, timedelta

from django.db import transaction
from django.utils import timezone

from .errores import ErrorNegocio, SinPermiso
from .models import (
    Auditoria, Categoria, Destino, Dispositivo, Equipo, EstadoSync, GestionAlerta, Incidencia, Insumo, Lectura,
    LecturaPendiente, Mantencion, MantencionInsumo, Telemetria,
)
from .reglas import AUTO_SEGUNDOS, COOLDOWN_SEGUNDOS, PERMISOS, es_gps, estado_equipo, fmt, origen_de

SISTEMA = "Sistema"


# ---------------- Sesión, permisos y auditoría ----------------
def nombre_de(usuario):
    if not usuario or not getattr(usuario, "is_authenticated", False):
        return SISTEMA
    return usuario.get_full_name() or usuario.username


def puede(usuario, permiso):
    return bool(usuario and usuario.is_authenticated and permiso in PERMISOS.get(usuario.perfil.rol, []))


def requiere(usuario, permiso):
    if not puede(usuario, permiso):
        raise SinPermiso()


def _autenticado(usuario):
    """El User si inició sesión; None si la acción la hace el sistema."""
    return usuario if usuario is not None and getattr(usuario, "is_authenticated", False) else None


def auditar(usuario, accion, detalle, valor_anterior=None):
    Auditoria.objects.create(
        fecha=timezone.now(), usuario=_autenticado(usuario), accion=accion, detalle=detalle, valor_anterior=valor_anterior
    )


def obtener_equipo(equipo_id):
    try:
        return Equipo.objects.get(pk=equipo_id)
    except (Equipo.DoesNotExist, ValueError, TypeError):
        raise ErrorNegocio("Equipo no encontrado.")


def tiene_incidencia(eq):
    return Incidencia.objects.filter(equipo=eq, resuelta=False).exists()


# ---------------- Equipos ----------------
CAMPOS_EQUIPO = {  # JSON del frontend → campo del modelo
    "codigo": "codigo", "nombre": "nombre", "tipo": "tipo", "marca": "marca", "modelo": "modelo",
    "patente": "patente", "cliente": "cliente", "unidad": "unidad", "intervalo": "intervalo",
    "horometro": "horometro", "ultimaMantencion": "ultima_mantencion",
}


def _num(v, defecto=None):
    try:
        return float(v)
    except (TypeError, ValueError):
        return defecto


def validar_equipo(d, id_actual=None):
    codigo = (d.get("codigo") or "").upper()
    if not re.fullmatch(r"(VA|VG|VR|V)\d{1,4}", codigo):
        raise ErrorNegocio("El código debe empezar con VA, VG, VR o V seguido de números (ej: VG15).")
    if Equipo.objects.filter(activo=True, codigo__iexact=codigo).exclude(pk=id_actual).exists():
        raise ErrorNegocio("Ya existe un equipo activo con ese código.")
    if not (d.get("nombre") or "").strip():
        raise ErrorNegocio("El nombre es obligatorio.")
    if not (_num(d.get("intervalo"), 0) > 0):
        raise ErrorNegocio("El intervalo de mantención debe ser mayor a 0.")
    horometro, ultima = _num(d.get("horometro")), _num(d.get("ultimaMantencion"))
    if (horometro is not None and horometro < 0) or (ultima is not None and ultima < 0):
        raise ErrorNegocio("Los valores no pueden ser negativos.")
    if horometro is not None and ultima is not None and ultima > horometro:
        raise ErrorNegocio("La última mantención no puede ser mayor al horómetro actual.")


def _categoria(codigo):
    try:
        return Categoria.objects.get(pk=codigo)
    except Categoria.DoesNotExist:
        raise ErrorNegocio("Categoría no válida.")


def _destino(nombre):
    try:
        return Destino.objects.get(nombre=nombre)
    except Destino.DoesNotExist:
        raise ErrorNegocio("Destino no válido.")


@transaction.atomic
def crear_equipo(usuario, d):
    requiere(usuario, "crudEquipos")
    validar_equipo(d)
    cat = _categoria(d.get("categoria"))
    dest = _destino(d.get("destino"))
    unidad = d.get("unidad") or cat.unidad
    eq = Equipo.objects.create(
        codigo=d["codigo"].upper(), nombre=d["nombre"].strip(), tipo=d.get("tipo") or "", categoria=cat,
        marca=d.get("marca") or "", modelo=d.get("modelo") or "", patente=d.get("patente") or "—",
        cliente=d.get("cliente") or "", destino=dest, horometro=_num(d.get("horometro"), 0),
        unidad=unidad, intervalo=int(_num(d.get("intervalo"))), ultima_mantencion=_num(d.get("ultimaMantencion"), 0),
        lat=dest.lat, lng=dest.lng,
    )
    auditar(usuario, "Alta de equipo", f"{eq.codigo} · {eq.nombre}")
    return eq


@transaction.atomic
def editar_equipo(usuario, equipo_id, d):
    requiere(usuario, "crudEquipos")
    eq = obtener_equipo(equipo_id)
    # La lectura y la última mantención solo cambian con registros (trazabilidad)
    d = {k: v for k, v in d.items() if k not in ("horometro", "ultimaMantencion")}
    validar_equipo(d, eq.id)
    d["codigo"] = d["codigo"].upper()
    cambios = []
    for clave, campo in CAMPOS_EQUIPO.items():
        if clave in d and str(getattr(eq, campo)) != str(d[clave]):
            cambios.append(f"{clave}: {getattr(eq, campo)} → {d[clave]}")
            setattr(eq, campo, int(_num(d[clave])) if campo == "intervalo" else d[clave])
    if "categoria" in d and d["categoria"] != eq.categoria_id:
        cambios.append(f"categoria: {eq.categoria_id} → {d['categoria']}")
        eq.categoria = _categoria(d["categoria"])
    if "destino" in d and d["destino"] != eq.destino.nombre:
        cambios.append(f"destino: {eq.destino.nombre} → {d['destino']}")
        eq.destino = _destino(d["destino"])
        eq.lat, eq.lng = eq.destino.lat, eq.destino.lng
    eq.save()
    auditar(usuario, "Edición de equipo", f"{eq.codigo} · {', '.join(cambios) or 'sin cambios'}")
    return eq


@transaction.atomic
def eliminar_equipo(usuario, equipo_id):
    """Baja lógica: el equipo deja de aparecer pero conserva su historial."""
    requiere(usuario, "crudEquipos")
    eq = obtener_equipo(equipo_id)
    eq.activo = False
    eq.save()
    eq.dispositivos.update(equipo=None, estado=Dispositivo.Estado.SIN_VINCULAR)
    auditar(usuario, "Baja de equipo", f"{eq.codigo} · {eq.nombre} (baja lógica, se conserva el historial)")


# ---------------- Lecturas ----------------
@transaction.atomic
def registrar_lectura(usuario, equipo_id, valor, origen="manual", motivo="", dispositivo=None, fecha=None):
    """dispositivo: el Dispositivo que envió la lectura (None si es manual).
    Devuelve {ok, estado} | {ok: False, requiereMotivo, anterior} | {ok: False, inconsistente}."""
    eq = obtener_equipo(equipo_id)
    valor = _num(valor)
    if valor is None or valor < 0:
        raise ErrorNegocio("Ingresa un valor numérico válido.")
    if origen == "manual":
        requiere(usuario, "registrarLectura")
    fecha = fecha or timezone.now()
    anterior = eq.horometro
    es_correccion = valor < anterior

    if es_correccion and origen == "manual":
        if not motivo:
            return {"ok": False, "requiereMotivo": True, "anterior": anterior}
        requiere(usuario, "corregirLectura")
    if es_correccion and origen != "manual":
        # El dispositivo informó menos que la última lectura: posible reinicio o falla
        Incidencia.objects.create(equipo=eq, fecha=fecha, valor=valor, anterior=anterior, dispositivo=dispositivo)
        auditar(usuario, "Lectura inconsistente",
                f"{eq.codigo}: {dispositivo.device_id if dispositivo else origen} informó {fmt(valor)} con último valor {fmt(anterior)} (no se actualizó el horómetro)")
        return {"ok": False, "inconsistente": True}

    Lectura.objects.create(
        equipo=eq, valor=valor, fecha=fecha, origen=origen,
        registrado_por=_autenticado(usuario) if origen == "manual" else None,
        dispositivo=dispositivo if origen != "manual" else None,
        es_correccion=es_correccion, motivo=motivo or "", valor_anterior=anterior,
    )
    eq.horometro = valor
    eq.save(update_fields=["horometro"])
    auditar(
        usuario,
        "Corrección de horómetro" if es_correccion else "Registro de horómetro",
        f"{eq.codigo}: {fmt(anterior)} → {fmt(valor)} {eq.unidad} ({origen})" + (f" · Motivo: {motivo}" if es_correccion else ""),
        valor_anterior=anterior if es_correccion else None,
    )
    return {"ok": True, "estado": estado_equipo(eq, tiene_incidencia(eq))}


@transaction.atomic
def resolver_incidencia(usuario, incidencia_id, nota=""):
    requiere(usuario, "registrarLectura")
    try:
        inc = Incidencia.objects.select_related("equipo").get(pk=incidencia_id)
    except Incidencia.DoesNotExist:
        raise ErrorNegocio("Incidencia no encontrada.")
    inc.resuelta = True
    inc.save()
    auditar(usuario, "Incidencia resuelta", f"{inc.equipo.codigo}: {nota or 'revisada'}")


# ---------------- Mantenciones ----------------
@transaction.atomic
def registrar_mantencion(usuario, d):
    requiere(usuario, "registrarMantencion")
    eq = obtener_equipo(d.get("equipoId"))
    try:
        fecha = date.fromisoformat(str(d.get("fecha") or ""))
    except ValueError:
        raise ErrorNegocio("Ingresa una fecha válida.")
    valor = _num(d.get("valor"))
    if valor is None or valor < 0:
        raise ErrorNegocio("Ingresa el horómetro al momento de la mantención.")
    if valor < eq.ultima_mantencion:
        raise ErrorNegocio(f"El horómetro no puede ser menor al de la última mantención ({fmt(eq.ultima_mantencion)}).")
    # Los insumos deben existir en el catálogo de bodega (nombre y unidad salen de ahí)
    insumos = []
    for i in d.get("insumos") or []:
        insumo = Insumo.objects.filter(pk=i.get("codigo")).first()
        if insumo is None:
            raise ErrorNegocio(f"Insumo no encontrado en bodega: {i.get('codigo') or '(sin código)'}.")
        cantidad = _num(i.get("cantidad"), 0)
        if cantidad <= 0:
            raise ErrorNegocio(f"La cantidad de {insumo.nombre} debe ser mayor a 0.")
        insumos.append((insumo, cantidad))
    m = Mantencion.objects.create(
        equipo=eq, ot=(d.get("ot") or "").strip() or "OT-" + str(int(time.time() * 1000))[-6:],
        fecha=fecha, tipo=d.get("tipo") or "", valor=valor,
        responsable=(d.get("responsable") or "").strip() or nombre_de(usuario), registrado_por=_autenticado(usuario),
    )
    MantencionInsumo.objects.bulk_create(
        MantencionInsumo(mantencion=m, insumo=insumo, cantidad=cantidad) for insumo, cantidad in insumos
    )
    eq.ultima_mantencion = valor
    if valor > eq.horometro:
        eq.horometro = valor
    eq.save()
    GestionAlerta.objects.filter(equipo=eq).delete()  # la alerta se cierra
    auditar(usuario, "Registro de mantención",
            f"{eq.codigo}: {m.tipo} a {fmt(valor)} {eq.unidad} · OT {m.ot} · {len(insumos)} insumo(s)")
    return m


# ---------------- Alertas ----------------
def alertas():
    """Calculadas con el semáforo: rojo → naranja → amarillo, y por lo que resta."""
    incidencias = {i.equipo_id: i for i in Incidencia.objects.filter(resuelta=False).select_related("dispositivo")}
    gestiones = {g.equipo_id: g for g in GestionAlerta.objects.select_related("usuario")}
    lista = []
    for eq in Equipo.objects.filter(activo=True):
        inc = incidencias.get(eq.id)
        est = estado_equipo(eq, bool(inc))
        if inc:
            lista.append({"tipo": "inconsistente", "nivel": "rojo", "equipo": eq, "estado": est, "incidencia": inc, "gestion": None})
        elif est["color"] != "verde":
            lista.append({"tipo": "mantencion", "nivel": est["color"], "equipo": eq, "estado": est,
                          "incidencia": None, "gestion": gestiones.get(eq.id)})
    orden = {"rojo": 0, "naranja": 1, "amarillo": 2}
    lista.sort(key=lambda a: (orden[a["nivel"]], a["estado"]["restante"]))
    return lista


@transaction.atomic
def marcar_en_gestion(usuario, equipo_id, nota=""):
    requiere(usuario, "gestionarAlertas")
    eq = obtener_equipo(equipo_id)
    GestionAlerta.objects.update_or_create(
        equipo=eq, defaults={"usuario": usuario, "fecha": timezone.now(), "nota": nota or ""}
    )
    auditar(usuario, "Alerta en gestión", f"{eq.codigo} marcada en gestión" + (f" · {nota}" if nota else ""))


@transaction.atomic
def quitar_gestion(usuario, equipo_id):
    requiere(usuario, "gestionarAlertas")
    eq = obtener_equipo(equipo_id)
    GestionAlerta.objects.filter(equipo=eq).delete()
    auditar(usuario, "Alerta reabierta", eq.codigo)


# ---------------- Dispositivos IoT (ESP32) y GPS ----------------
def obtener_dispositivo(dispositivo_id):
    try:
        return Dispositivo.objects.get(pk=dispositivo_id)
    except (Dispositivo.DoesNotExist, ValueError, TypeError):
        raise ErrorNegocio("Dispositivo no encontrado.")


@transaction.atomic
def vincular_dispositivo(usuario, dispositivo_id, equipo_id):
    requiere(usuario, "gestionarDispositivos")
    d = obtener_dispositivo(dispositivo_id)
    if d.estado == Dispositivo.Estado.BAJA:
        raise ErrorNegocio("El dispositivo está dado de baja.")
    eq = obtener_equipo(equipo_id) if equipo_id else None
    if eq and Dispositivo.objects.filter(equipo=eq).exclude(pk=d.pk).exclude(estado=Dispositivo.Estado.BAJA).exists():
        raise ErrorNegocio("Ese equipo ya tiene un dispositivo vinculado.")
    d.equipo = eq
    if eq:
        if d.estado == Dispositivo.Estado.SIN_VINCULAR:
            d.estado = Dispositivo.Estado.ONLINE
        d.ultima_conexion = d.ultima_conexion or timezone.now()
    else:
        d.estado = Dispositivo.Estado.SIN_VINCULAR
    d.save()
    auditar(usuario, "Vinculación de dispositivo", f"{d.device_id} → {eq.codigo if eq else 'sin equipo'}")


@transaction.atomic
def registrar_dispositivo(usuario, device_id, tipo):
    requiere(usuario, "gestionarDispositivos")
    device_id = (device_id or "").strip()
    gps = "gps" in (tipo or "").lower()
    if gps and not re.fullmatch(r"GPS-\d{3}", device_id):
        raise ErrorNegocio("El ID de un rastreador GPS debe tener el formato GPS-000.")
    if not gps and not re.fullmatch(r"ESP32-\d{3}", device_id):
        raise ErrorNegocio("El ID debe tener el formato ESP32-000.")
    if Dispositivo.objects.filter(device_id=device_id).exists():
        raise ErrorNegocio("Ya existe un dispositivo con ese ID.")
    Dispositivo.objects.create(device_id=device_id, tipo=tipo)
    auditar(usuario, "Alta de dispositivo", f"{device_id} ({tipo})")


@transaction.atomic
def dar_de_baja_dispositivo(usuario, dispositivo_id):
    requiere(usuario, "gestionarDispositivos")
    d = obtener_dispositivo(dispositivo_id)
    d.estado, d.equipo = Dispositivo.Estado.BAJA, None
    d.save()
    d.pendientes.all().delete()
    auditar(usuario, "Baja de dispositivo", d.device_id)


@transaction.atomic
def cambiar_conexion(usuario, dispositivo_id, online):
    """online=False: 'Quitar señal' (lecturas en cola). online=True: 'Reconectar' (despacha la cola)."""
    requiere(usuario, "gestionarDispositivos")
    d = obtener_dispositivo(dispositivo_id)
    if not d.equipo_id:
        raise ErrorNegocio("El dispositivo no está vinculado a un equipo.")
    if not online:
        d.estado = Dispositivo.Estado.OFFLINE
        d.save()
        return {"enviados": 0, "total": 0}
    d.estado = Dispositivo.Estado.ONLINE
    d.ultima_conexion = timezone.now()
    d.save()
    pendientes = list(d.pendientes.all())
    d.pendientes.all().delete()
    enviados = 0
    for p in pendientes:
        r = registrar_lectura(usuario, d.equipo_id, p.valor, origen=origen_de(d), dispositivo=d, fecha=p.fecha)
        enviados += 1 if r["ok"] else 0
    auditar(usuario, "Sincronización de cola", f"{d.device_id}: {len(pendientes)} lectura(s) despachadas al reconectar")
    return {"enviados": enviados, "total": len(pendientes)}


@transaction.atomic
def simular_lectura(usuario, dispositivo_id, reinicio=False):
    """Simula que el ESP32 midió horas de motor (o el GPS los km) y envía el JSON."""
    requiere(usuario, "gestionarDispositivos")
    d = obtener_dispositivo(dispositivo_id)
    if not d.equipo_id:
        raise ErrorNegocio("Vincula el dispositivo a un equipo antes de simular.")
    eq = d.equipo
    pendiente = d.pendientes.last()
    ultimo = pendiente.valor if pendiente else eq.horometro
    incremento = 150 + round(random.random() * 350) if eq.unidad == "km" else 4 + round(random.random() * 10)
    valor = 3 if reinicio else ultimo + incremento
    ahora = timezone.now()
    marca = timezone.localtime(ahora).strftime("%Y-%m-%dT%H:%M")
    payload = (
        {"deviceId": d.device_id, "odometro_km": valor, "encendido": True, "lat": eq.lat, "lng": eq.lng, "timestamp": marca}
        if es_gps(d) else
        {"deviceId": d.device_id, "horas": valor, "lat": eq.lat, "lng": eq.lng, "timestamp": marca}
    )
    if d.estado == Dispositivo.Estado.OFFLINE:
        LecturaPendiente.objects.create(dispositivo=d, valor=valor, fecha=ahora)
        return {"encolada": True, "payload": payload}
    d.ultima_conexion = ahora
    d.save()
    r = registrar_lectura(usuario, eq.id, valor, origen=origen_de(d), dispositivo=d, fecha=ahora)
    return {"payload": payload, **r}


# ---------------- Telemetría y horómetros ----------------
def filas_telemetria():
    """Equipos en faena minera o con GPS: [(equipo, telemetria, dispositivo|None)]"""
    disp_por_equipo = {
        d.equipo_id: d
        for d in Dispositivo.objects.exclude(estado=Dispositivo.Estado.BAJA).exclude(equipo=None).prefetch_related("pendientes")
    }
    tele = {t.equipo_id: t for t in Telemetria.objects.all()}
    filas = []
    for eq in Equipo.objects.filter(activo=True):
        disp = disp_por_equipo.get(eq.id)
        if eq.destino.tipo != "Minería" and not es_gps(disp):
            continue
        t = tele.get(eq.id) or Telemetria.objects.create(equipo=eq, horas=eq.horometro)
        filas.append((eq, t, disp))
    return filas


@transaction.atomic
def sincronizar_telemetria(usuario, manual):
    sync = EstadoSync.actual()
    ahora = timezone.now()
    if manual and sync.ultima_manual and ahora - sync.ultima_manual < timedelta(seconds=COOLDOWN_SEGUNDOS):
        raise ErrorNegocio("Espera a que termine el tiempo de espera para sincronizar de nuevo.")
    actualizados = 0
    for eq, t, disp in filas_telemetria():
        # si el horómetro del sistema cambió por otra vía (lectura manual, mantención), se alinea
        if int(t.horas) != int(eq.horometro):
            t.horas = eq.horometro
        online = bool(disp) and disp.estado == Dispositivo.Estado.ONLINE
        if not online:
            t.save()
            continue
        desde = t.ultima_sync or ahora - timedelta(seconds=AUTO_SEGUNDOS)
        horas = min((ahora - desde).total_seconds(), 3600) / 3600
        t.ultima_sync = ahora
        disp.ultima_conexion = ahora
        disp.save(update_fields=["ultima_conexion"])
        if not t.en_uso:
            t.save()
            continue
        anterior = t.horas
        t.horas = round(t.horas + horas * (30 if eq.unidad == "km" else 1), 2)
        t.delta = round(t.horas - anterior, 2)
        t.save()
        eq.lat = round(eq.lat + (random.random() - 0.5) * 0.004, 4)
        eq.lng = round(eq.lng + (random.random() - 0.5) * 0.004, 4)
        eq.ultima_ubicacion = ahora
        eq.save(update_fields=["lat", "lng", "ultima_ubicacion"])
        actualizados += 1
        # el horómetro registra una lectura cada vez que se completa una hora/km entero
        if int(t.horas) > eq.horometro:
            registrar_lectura(usuario, eq.id, int(t.horas), origen=origen_de(disp), dispositivo=disp, fecha=ahora)
    sync.ultima = ahora
    if manual:
        sync.ultima_manual = ahora
        auditar(usuario, "Sincronización de horómetros", f"{actualizados} equipo(s) en faena actualizados manualmente")
    sync.save()
    return {"actualizados": actualizados}


def estado_sync():
    s = EstadoSync.actual()
    ahora = timezone.now()
    ultima = s.ultima
    proxima = max(0, ((ultima + timedelta(seconds=AUTO_SEGUNDOS)) - ahora).total_seconds()) if ultima else 0
    cooldown = (
        max(0, ((s.ultima_manual + timedelta(seconds=COOLDOWN_SEGUNDOS)) - ahora).total_seconds())
        if s.ultima_manual else 0
    )
    return {
        "ultima": int(ultima.timestamp() * 1000) if ultima else None,
        "proximaAuto": int(proxima * 1000),
        "cooldown": int(cooldown * 1000),
        "tocaAuto": not ultima or (ahora - ultima).total_seconds() >= AUTO_SEGUNDOS,
    }
