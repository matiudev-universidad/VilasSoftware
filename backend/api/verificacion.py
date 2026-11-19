"""
Verificación en dos pasos: después de la contraseña se pide un código de 6 dígitos enviado al correo.

SIMULACIÓN: el proyecto no tiene un servicio de correo. El "correo" se envía con el backend de
consola de Django (aparece en la terminal de runserver) y, además, el código vuelve en la respuesta
de la API para que la interfaz lo muestre como un correo simulado. Con un servicio real (SMTP)
bastaría con configurar MAILERS en settings.py y quitar "codigoSimulado" de la respuesta.
"""
import secrets
from datetime import timedelta

from django.core.mail import send_mail
from django.utils import timezone
from django.utils.crypto import constant_time_compare, salted_hmac

from . import logica
from .errores import ErrorNegocio, ReiniciarLogin
from .models import CodigoVerificacion
from .reglas import CODIGO_DIGITOS, CODIGO_MAX_INTENTOS, CODIGO_REENVIO_SEGUNDOS, CODIGO_VIGENCIA_MINUTOS

CLAVE_SESION = "verificacion_pendiente"  # id del CodigoVerificacion en espera


def _hash(codigo):
    return salted_hmac("api.verificacion", codigo).hexdigest()


def correo_oculto(email):
    """james@vilasmotors.cl → j****@vilasmotors.cl"""
    nombre, _, dominio = email.partition("@")
    return f"{nombre[:1]}{'*' * max(3, len(nombre) - 1)}@{dominio}"


def enviar_codigo(request, usuario):
    """Crea un código nuevo (anula los anteriores), lo "envía" y lo deja pendiente en la sesión."""
    ahora = timezone.now()
    CodigoVerificacion.objects.filter(usuario=usuario, usado=False).update(usado=True)
    codigo = f"{secrets.randbelow(10 ** CODIGO_DIGITOS):0{CODIGO_DIGITOS}d}"  # aleatorio criptográficamente seguro
    registro = CodigoVerificacion.objects.create(
        usuario=usuario, codigo_hash=_hash(codigo), creado=ahora,
        expira=ahora + timedelta(minutes=CODIGO_VIGENCIA_MINUTOS),
    )
    request.session[CLAVE_SESION] = registro.id

    send_mail(
        "Vila's Motor · Código de verificación",
        f"Hola {logica.nombre_de(usuario)}:\n\nTu código para iniciar sesión es {codigo}.\n"
        f"Vence en {CODIGO_VIGENCIA_MINUTOS} minutos. Si no fuiste tú, ignora este correo.",
        None, [usuario.email], fail_silently=True,
    )
    return {
        "requiereCodigo": True,
        "correo": correo_oculto(usuario.email),
        "codigoSimulado": codigo,  # SIMULACIÓN: un sistema real no devuelve el código
        "venceEn": CODIGO_VIGENCIA_MINUTOS * 60,
        "reenviarEn": CODIGO_REENVIO_SEGUNDOS,
    }


def pendiente(request):
    """Código en espera de esta sesión (o error si no hay un inicio de sesión en curso)."""
    registro = (
        CodigoVerificacion.objects.select_related("usuario__perfil").filter(pk=request.session.get(CLAVE_SESION)).first()
    )
    if registro is None or registro.usado:
        request.session.pop(CLAVE_SESION, None)
        raise ReiniciarLogin("No hay un inicio de sesión en curso. Ingresa tu correo y contraseña de nuevo.")
    return registro


def reenviar(request):
    registro = pendiente(request)
    espera = CODIGO_REENVIO_SEGUNDOS - (timezone.now() - registro.creado).total_seconds()
    if espera > 0:
        raise ErrorNegocio(f"Espera {int(espera) + 1} s para pedir otro código.")
    return enviar_codigo(request, registro.usuario)


def verificar(request, codigo):
    """Devuelve el usuario si el código es correcto. Errores claros si venció o se agotaron los intentos."""
    registro = pendiente(request)
    codigo = "".join(c for c in str(codigo or "") if c.isdigit())

    if timezone.now() > registro.expira:
        registro.usado = True
        registro.save(update_fields=["usado"])
        raise ErrorNegocio("El código venció. Pide uno nuevo con «Reenviar código».")

    if len(codigo) != CODIGO_DIGITOS or not constant_time_compare(_hash(codigo), registro.codigo_hash):
        registro.intentos += 1
        if registro.intentos >= CODIGO_MAX_INTENTOS:
            registro.usado = True
            registro.save(update_fields=["intentos", "usado"])
            request.session.pop(CLAVE_SESION, None)
            logica.auditar(None, "Verificación fallida",
                           f"{registro.usuario.email}: {CODIGO_MAX_INTENTOS} códigos incorrectos, se anuló el código")
            raise ReiniciarLogin("Demasiados códigos incorrectos. Vuelve a ingresar tu correo y contraseña.")
        registro.save(update_fields=["intentos"])
        quedan = CODIGO_MAX_INTENTOS - registro.intentos
        raise ErrorNegocio(f"Código incorrecto. Te {'queda 1 intento' if quedan == 1 else f'quedan {quedan} intentos'}.")

    registro.usado = True
    registro.save(update_fields=["usado"])
    request.session.pop(CLAVE_SESION, None)
    return registro.usuario
