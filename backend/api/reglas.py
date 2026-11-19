"""
Reglas de negocio puras (sin base de datos). Portadas de prototipo_vilas/js/store.js.
"""
import math
import re

from .errores import ErrorNegocio

# ---------------- Roles y permisos (RBAC) ----------------
PERMISOS = {
    "admin": ["ver", "registrarLectura", "corregirLectura", "registrarMantencion", "verInsumos", "crudEquipos",
              "gestionarAlertas", "reportes", "auditoria", "verDispositivos", "gestionarDispositivos", "restablecer"],
    "encargada": ["ver", "registrarLectura", "corregirLectura", "registrarMantencion", "verInsumos", "crudEquipos",
                  "gestionarAlertas", "reportes", "verDispositivos"],
    "asistente": ["ver", "registrarLectura", "corregirLectura", "registrarMantencion", "verInsumos"],
    "ti": ["ver", "verDispositivos", "gestionarDispositivos", "auditoria"],
    "practicante": ["ver"],
}

# ---------------- Contraseñas ----------------
PASS_MIN = 12
MAX_INTENTOS = 5          # intentos fallidos antes del bloqueo
BLOQUEO_MINUTOS = 5       # duración del bloqueo temporal

# ---------------- Verificación en dos pasos (código al correo) ----------------
CODIGO_DIGITOS = 6
CODIGO_VIGENCIA_MINUTOS = 5   # el código vence a los 5 minutos
CODIGO_MAX_INTENTOS = 5       # códigos incorrectos antes de anularlo (hay que volver a ingresar la contraseña)
CODIGO_REENVIO_SEGUNDOS = 30  # espera antes de pedir otro código


def validar_password(p):
    """Política: mínimo 12 caracteres y al menos un carácter especial."""
    if not p or len(p) < PASS_MIN:
        raise ErrorNegocio(f"La contraseña debe tener al menos {PASS_MIN} caracteres.")
    if not re.search(r"[^A-Za-z0-9]", p):
        raise ErrorNegocio("La contraseña debe incluir al menos un carácter especial (ej: # $ % & * !).")


# ---------------- Semáforo de mantención ----------------
def hito_mantencion(eq):
    """Las mantenciones corresponden a hitos fijos (250, 500, 750… h). Una mantención hecha con
    atraso (o hasta 'aviso' antes) cuenta para su hito; la siguiente queda en el hito que sigue.
    Ej. VR005: mantención de 3.000 h hecha a las 3.157 h → programada a las 3.250 h."""
    return math.floor((eq.ultima_mantencion + (eq.aviso or 0)) / eq.intervalo) * eq.intervalo


PAUTAS_H = [2000, 1000, 500, 250]


def pauta_de_hito(eq, hito):
    """Pauta que corresponde a un hito (3.000 h → Preventiva 1000 h · 3.250 h → Preventiva 250 h)."""
    if eq.unidad == "km":
        return eq.intervalo
    return next((p for p in PAUTAS_H if p >= eq.intervalo and hito % p == 0), eq.intervalo)


def estado_equipo(eq, tiene_incidencia=False):
    """Semáforo de 4 niveles: verde · amarillo (dentro del aviso) · naranja (mitad del aviso o menos)
    · rojo (vencido o lectura inconsistente)."""
    hito = hito_mantencion(eq)
    proxima = hito + eq.intervalo
    restante = proxima - eq.horometro
    usado = eq.horometro - hito
    color, texto = "verde", "Operativo"
    if restante <= 0:
        color, texto = "rojo", "Mantención vencida"
    elif restante <= eq.aviso / 2:
        color, texto = "naranja", "Mantención crítica"
    elif restante <= eq.aviso:
        color, texto = "amarillo", "Próxima mantención"
    if tiene_incidencia:
        color, texto = "rojo", "Lectura inconsistente"
    return {
        "hito": hito, "proxima": proxima, "restante": restante, "usado": usado,
        "color": color, "texto": texto,
        "progreso": min(100, max(0, round(usado / eq.intervalo * 100))),
        "pauta": pauta_de_hito(eq, proxima),
    }


# ---------------- Aviso anticipado ----------------
TIPOS_TRANSPORTE = ["Camión", "Camión pluma", "Camión tolva", "Camión aljibe", "Camión combustible",
                    "Camión lubricador", "Tracto camión", "Cama baja", "Rampla"]


def aviso_para(unidad, tipo, categoria):
    """50 h maquinaria · 300 km camionetas · 1.000 km transporte (camiones, camas bajas, ramplas)."""
    if unidad != "km":
        return categoria.aviso
    return 1000 if tipo in TIPOS_TRANSPORTE else 300


# ---------------- Telemetría ----------------
AUTO_SEGUNDOS = 5 * 60       # sincronización automática cada 5 minutos
COOLDOWN_SEGUNDOS = 2 * 60   # espera entre sincronizaciones manuales


def es_gps(dispositivo):
    return bool(dispositivo) and dispositivo.device_id.startswith("GPS-")


def origen_de(dispositivo):
    return "GPS" if es_gps(dispositivo) else "ESP32"


def fmt(n):
    """Número con separador de miles chileno: 3157 → '3.157'."""
    n = float(n)
    entero = int(n) if n.is_integer() else n
    texto = f"{entero:,}".replace(",", "X").replace(".", ",").replace("X", ".")
    return texto
