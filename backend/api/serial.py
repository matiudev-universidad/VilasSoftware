"""
Conversión de modelos a JSON con la misma forma (camelCase) que usaba el frontend,
para que las pantallas de React no tengan que cambiar.
"""
from django.utils import timezone

from .models import Incidencia
from .reglas import PERMISOS, estado_equipo


def fecha_hora(dt):
    """datetime → '2026-09-01T09:10' en hora de Chile (o None)"""
    return timezone.localtime(dt).strftime("%Y-%m-%dT%H:%M") if dt else None


def numero(v):
    """4496.0 → 4496 (sin decimales innecesarios)"""
    if v is None:
        return None
    return int(v) if float(v).is_integer() else v


def ms(dt):
    """datetime → milisegundos desde 1970 (para cuentas regresivas en JS)"""
    return int(dt.timestamp() * 1000) if dt else None


def usuario(u):
    if not u or not u.is_authenticated:
        return None
    rol = u.perfil.rol
    return {
        "id": u.id,
        "nombre": u.get_full_name() or u.username,
        "email": u.email,
        "rol": rol,
        "rolNombre": u.perfil.get_rol_display(),
        "permisos": PERMISOS.get(rol, []),
    }


def ids_con_incidencia():
    """Equipos con una lectura inconsistente sin resolver (para calcular el semáforo sin N+1)."""
    return set(Incidencia.objects.filter(resuelta=False).values_list("equipo_id", flat=True))


def equipo(e, con_incidencia=None):
    if con_incidencia is None:
        con_incidencia = ids_con_incidencia()
    est = estado_equipo(e, e.id in con_incidencia)
    return {
        "id": e.id,
        "codigo": e.codigo,
        "nombre": e.nombre,
        "tipo": e.tipo,
        "categoria": e.categoria_id,
        "marca": e.marca,
        "modelo": e.modelo,
        "patente": e.patente,
        "cliente": e.cliente,
        "destino": e.destino.nombre,
        "horometro": numero(e.horometro),
        "unidad": e.unidad,
        "intervalo": e.intervalo,
        "ultimaMantencion": numero(e.ultima_mantencion),
        "aviso": e.aviso,
        "activo": e.activo,
        "lat": e.lat,
        "lng": e.lng,
        "ultimaUbicacion": fecha_hora(e.ultima_ubicacion),
        "pluma": e.pluma,
        "estado": {k: numero(v) if isinstance(v, float) else v for k, v in est.items()},
    }


def mantencion(m):
    return {
        "id": m.id,
        "equipoId": m.equipo_id,
        "ot": m.ot,
        "fecha": m.fecha.isoformat(),
        "tipo": m.tipo,
        "valor": numero(m.valor),
        "responsable": m.responsable,
        "registradoPor": m.registrado_por,
        "insumos": [
            {"codigo": i.insumo_id, "nombre": i.nombre, "cantidad": numero(i.cantidad), "unidad": i.unidad}
            for i in m.insumos.all()
        ],
    }


def lectura(l):
    return {
        "id": l.id,
        "equipoId": l.equipo_id,
        "valor": numero(l.valor),
        "fecha": fecha_hora(l.fecha),
        "origen": l.origen,
        "usuario": l.usuario,
        "esCorreccion": l.es_correccion,
        "motivo": l.motivo or None,
        "valorAnterior": numero(l.valor_anterior),
    }


def incidencia(i):
    return {
        "id": i.id,
        "equipoId": i.equipo_id,
        "fecha": fecha_hora(i.fecha),
        "valor": numero(i.valor),
        "anterior": numero(i.anterior),
        "dispositivo": i.dispositivo,
        "resuelta": i.resuelta,
    }


def dispositivo(d):
    if not d:
        return None
    return {
        "id": d.id,
        "deviceId": d.device_id,
        "tipo": d.tipo,
        "equipoId": d.equipo_id,
        "estado": d.estado,
        "ultimaConexion": fecha_hora(d.ultima_conexion),
        "cola": d.cola,
    }


def gestion(g):
    if not g:
        return None
    return {"equipoId": g.equipo_id, "enGestion": True, "usuario": g.usuario, "fecha": fecha_hora(g.fecha), "nota": g.nota}


def telemetria(t):
    return {
        "equipoId": t.equipo_id,
        "enUso": t.en_uso,
        "horas": t.horas,
        "delta": t.delta,
        "ultimaSync": ms(t.ultima_sync),
    }


def auditoria(a):
    return {
        "fecha": fecha_hora(a.fecha),
        "usuario": a.usuario,
        "accion": a.accion,
        "detalle": a.detalle,
        "valorAnterior": numero(a.valor_anterior),
    }


def categoria(c):
    return {"codigo": c.codigo, "nombre": c.nombre, "unidad": c.unidad, "aviso": c.aviso}


def destino(d):
    return {"nombre": d.nombre, "tipo": d.tipo, "lat": d.lat, "lng": d.lng}


def insumo(i):
    return {"codigo": i.codigo, "nombre": i.nombre, "stock": numero(i.stock), "unidad": i.unidad}
