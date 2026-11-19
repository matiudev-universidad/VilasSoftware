"""
Normalización (paso 2 de 3): copia los datos de los campos viejos a las relaciones nuevas.
Solo hace algo en bases que ya tenían datos; en una base nueva no hay filas que mover.
"""
from datetime import datetime

from django.conf import settings
from django.db import migrations
from django.utils import timezone


def nombre_completo(u):
    return f"{u.first_name} {u.last_name}".strip() or u.username


def copiar_datos(apps, schema_editor):
    User = apps.get_model(*settings.AUTH_USER_MODEL.split("."))
    Auditoria = apps.get_model("api", "Auditoria")
    Dispositivo = apps.get_model("api", "Dispositivo")
    Equipo = apps.get_model("api", "Equipo")
    GestionAlerta = apps.get_model("api", "GestionAlerta")
    Incidencia = apps.get_model("api", "Incidencia")
    Insumo = apps.get_model("api", "Insumo")
    Lectura = apps.get_model("api", "Lectura")
    LecturaPendiente = apps.get_model("api", "LecturaPendiente")
    Mantencion = apps.get_model("api", "Mantencion")
    MantencionInsumo = apps.get_model("api", "MantencionInsumo")
    Pluma = apps.get_model("api", "Pluma")

    usuarios = {nombre_completo(u): u for u in User.objects.all()}
    dispositivos = {d.device_id: d for d in Dispositivo.objects.all()}

    for l in Lectura.objects.all():
        l.dispositivo = dispositivos.get(l.usuario_texto)
        l.registrado_por = None if l.dispositivo else usuarios.get(l.usuario_texto)
        l.save(update_fields=["dispositivo", "registrado_por"])

    for i in Incidencia.objects.exclude(dispositivo_texto=""):
        i.dispositivo = dispositivos.get(i.dispositivo_texto)
        i.save(update_fields=["dispositivo"])

    for m in Mantencion.objects.exclude(registrado_por_texto=""):
        m.registrado_por = usuarios.get(m.registrado_por_texto)
        m.save(update_fields=["registrado_por"])

    for g in GestionAlerta.objects.all():
        g.usuario = usuarios.get(g.usuario_texto)
        if g.usuario is None:  # no se sabe quién la tomó: la alerta vuelve a quedar abierta
            g.delete()
        else:
            g.save(update_fields=["usuario"])

    for a in Auditoria.objects.all():
        a.usuario = usuarios.get(a.usuario_texto)
        if a.usuario is None and a.usuario_texto not in ("", "Sistema"):
            a.detalle = f"[{a.usuario_texto}] {a.detalle}"  # no se pierde el nombre
        a.save(update_fields=["usuario", "detalle"])

    # Insumos usados que no estaban en el catálogo: se agregan para no perder el historial
    for mi in MantencionInsumo.objects.filter(insumo__isnull=True):
        mi.insumo = Insumo.objects.filter(nombre=mi.nombre).first() or Insumo.objects.create(
            codigo=f"SIN-{mi.id}", nombre=mi.nombre, stock=0, unidad=mi.unidad
        )
        mi.save(update_fields=["insumo"])

    for e in Equipo.objects.all():
        if e.pluma_json is None:
            continue
        p = e.pluma_json
        Pluma.objects.create(equipo=e, marca=p.get("marca") or "", modelo=p.get("modelo") or "")

    for d in Dispositivo.objects.all():
        for c in d.cola or []:
            LecturaPendiente.objects.create(
                dispositivo=d, valor=c["valor"], fecha=timezone.make_aware(datetime.fromisoformat(c["fecha"]))
            )


class Migration(migrations.Migration):

    dependencies = [("api", "0002_normalizacion_relaciones")]

    operations = [
        migrations.RunPython(copiar_datos, migrations.RunPython.noop),
    ]
