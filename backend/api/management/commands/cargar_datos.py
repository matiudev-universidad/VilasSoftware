"""
Carga los datos iniciales en SQLite: usuarios, categorías, destinos, insumos y la flota real.

    python manage.py cargar_datos           # carga si la base está vacía
    python manage.py cargar_datos --reset   # borra todo y vuelve al estado inicial ("Restablecer datos")
"""
import json
from datetime import date, datetime
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from api.datos import semilla
from api.models import (
    Auditoria, BloqueoLogin, Categoria, Destino, Dispositivo, Equipo, EstadoSync, GestionAlerta,
    Incidencia, Insumo, Lectura, Mantencion, MantencionInsumo, Perfil, Telemetria,
)

FLOTA = Path(__file__).resolve().parents[2] / "datos" / "flota.json"


def fecha_hora(texto):
    """'2026-09-01T09:10' (hora de Chile) → datetime con zona horaria"""
    if not texto:
        return None
    return timezone.make_aware(datetime.fromisoformat(texto))


class Command(BaseCommand):
    help = "Carga los datos iniciales del sistema (usuarios, catálogos y flota real de Iquique)."

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true", help="Borra los datos actuales y recarga la semilla.")

    @transaction.atomic
    def handle(self, *args, reset=False, **opciones):
        if Equipo.objects.exists() and not reset:
            self.stdout.write(self.style.WARNING("La base ya tiene datos. Usa --reset para volver al estado inicial."))
            return
        if reset:
            self.borrar_todo()

        flota = json.loads(FLOTA.read_text(encoding="utf-8"))
        self.cargar_usuarios(reset)
        self.cargar_catalogos()
        self.cargar_flota(flota)

        self.stdout.write(self.style.SUCCESS(
            f"Datos cargados: {Equipo.objects.count()} equipos, {Mantencion.objects.count()} mantenciones, "
            f"{Lectura.objects.count()} lecturas, {Dispositivo.objects.count()} dispositivos, "
            f"{Perfil.objects.count()} usuarios."
        ))

    def borrar_todo(self):
        for modelo in (Auditoria, BloqueoLogin, GestionAlerta, Incidencia, Telemetria, Dispositivo,
                       MantencionInsumo, Mantencion, Lectura, Equipo, Insumo, Destino, Categoria, EstadoSync):
            modelo.objects.all().delete()

    def cargar_usuarios(self, reset):
        User = get_user_model()
        for u in semilla.USUARIOS:
            nombre, _, apellido = u["nombre"].partition(" ")
            usuario, creado = User.objects.get_or_create(
                username=u["email"],
                defaults={"email": u["email"], "first_name": nombre, "last_name": apellido},
            )
            # La contraseña inicial es el hash heredado del prototipo (nunca texto plano).
            # Si el usuario ya existía y no es --reset, se respeta la contraseña que tenga.
            if creado or reset:
                usuario.password = u["password_hash"]
            usuario.is_staff = usuario.is_superuser = u["rol"] == "admin"  # el admin entra también a /admin
            usuario.save()
            Perfil.objects.update_or_create(usuario=usuario, defaults={"rol": u["rol"]})

    def cargar_catalogos(self):
        Categoria.objects.bulk_create(Categoria(**c) for c in semilla.CATEGORIAS)
        Destino.objects.bulk_create(Destino(**d) for d in semilla.DESTINOS)
        Insumo.objects.bulk_create(Insumo(**i) for i in semilla.INSUMOS)

    def cargar_flota(self, f):
        destinos = {d.nombre: d for d in Destino.objects.all()}

        Equipo.objects.bulk_create(
            Equipo(
                id=e["id"], codigo=e["codigo"], nombre=e["nombre"], tipo=e["tipo"], categoria_id=e["categoria"],
                marca=e.get("marca") or "", modelo=e.get("modelo") or "", patente=e.get("patente") or "—",
                cliente=e.get("cliente") or "", destino=destinos[e["destino"]], horometro=e["horometro"],
                unidad=e["unidad"], intervalo=e["intervalo"], ultima_mantencion=e["ultimaMantencion"],
                aviso=e["aviso"], activo=e["activo"], lat=e.get("lat"), lng=e.get("lng"), pluma=e.get("pluma"),
            )
            for e in f["equipos"]
        )

        for m in f["mantenciones"]:
            mant = Mantencion.objects.create(
                id=m["id"], equipo_id=m["equipoId"], ot=m["ot"], fecha=date.fromisoformat(m["fecha"]),
                tipo=m["tipo"], valor=m["valor"], responsable=m.get("responsable") or "",
                registrado_por=m.get("registradoPor") or "",
            )
            MantencionInsumo.objects.bulk_create(
                MantencionInsumo(mantencion=mant, insumo_id=i.get("codigo"), nombre=i["nombre"],
                                 cantidad=i["cantidad"], unidad=i["unidad"])
                for i in m["insumos"]
            )

        Lectura.objects.bulk_create(
            Lectura(
                id=l["id"], equipo_id=l["equipoId"], valor=l["valor"], fecha=fecha_hora(l["fecha"]),
                origen=l["origen"], usuario=l["usuario"], es_correccion=l.get("esCorreccion", False),
                motivo=l.get("motivo") or "", valor_anterior=l.get("valorAnterior"),
            )
            for l in f["lecturas"]
        )

        Dispositivo.objects.bulk_create(
            Dispositivo(
                id=d["id"], device_id=d["deviceId"], tipo=d["tipo"], equipo_id=d["equipoId"], estado=d["estado"],
                ultima_conexion=fecha_hora(d.get("ultimaConexion")), cola=d.get("cola") or [],
            )
            for d in f["dispositivos"]
        )

        Telemetria.objects.bulk_create(
            Telemetria(equipo_id=t["equipoId"], en_uso=t["enUso"], horas=t["horas"]) for t in f["telemetria"]
        )

        GestionAlerta.objects.bulk_create(
            GestionAlerta(equipo_id=g["equipoId"], usuario=g["usuario"], fecha=fecha_hora(g["fecha"]), nota=g.get("nota", ""))
            for g in f["gestionAlertas"]
        )

        Auditoria.objects.bulk_create(
            Auditoria(fecha=fecha_hora(a["fecha"]), usuario=a["usuario"], accion=a["accion"], detalle=a["detalle"])
            for a in f["auditoria"]
        )
        EstadoSync.actual()
