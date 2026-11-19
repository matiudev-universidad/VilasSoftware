"""Panel de administración de Django (/admin): para revisar y corregir datos a mano."""
from django.contrib import admin

from .models import (
    Auditoria, Categoria, CodigoVerificacion, Destino, Dispositivo, Equipo, GestionAlerta, Incidencia, Insumo, Lectura, LecturaPendiente,
    Mantencion, MantencionInsumo, Perfil, Pluma, Telemetria,
)


@admin.register(Perfil)
class PerfilAdmin(admin.ModelAdmin):
    list_display = ("usuario", "rol")
    list_filter = ("rol",)


@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    list_display = ("codigo", "nombre", "unidad", "aviso")


@admin.register(Destino)
class DestinoAdmin(admin.ModelAdmin):
    list_display = ("nombre", "tipo", "lat", "lng")


class PlumaInline(admin.StackedInline):
    model = Pluma
    extra = 0


@admin.register(Equipo)
class EquipoAdmin(admin.ModelAdmin):
    list_display = ("codigo", "nombre", "categoria", "destino", "horometro", "unidad", "intervalo", "ultima_mantencion", "aviso", "activo")
    list_filter = ("categoria", "destino", "activo", "unidad")
    search_fields = ("codigo", "nombre", "marca", "modelo", "patente", "cliente")
    inlines = [PlumaInline]


class MantencionInsumoInline(admin.TabularInline):
    model = MantencionInsumo
    extra = 0
    autocomplete_fields = ("insumo",)


@admin.register(Mantencion)
class MantencionAdmin(admin.ModelAdmin):
    list_display = ("fecha", "equipo", "ot", "tipo", "valor", "responsable", "registrado_por")
    list_filter = ("tipo",)
    search_fields = ("equipo__codigo", "ot")
    inlines = [MantencionInsumoInline]


@admin.register(Lectura)
class LecturaAdmin(admin.ModelAdmin):
    list_display = ("fecha", "equipo", "valor", "origen", "registrado_por", "dispositivo", "es_correccion")
    list_filter = ("origen", "es_correccion")
    search_fields = ("equipo__codigo",)


class LecturaPendienteInline(admin.TabularInline):
    model = LecturaPendiente
    extra = 0


@admin.register(Dispositivo)
class DispositivoAdmin(admin.ModelAdmin):
    list_display = ("device_id", "tipo", "equipo", "estado", "ultima_conexion")
    list_filter = ("estado",)
    search_fields = ("device_id",)
    inlines = [LecturaPendienteInline]


@admin.register(Insumo)
class InsumoAdmin(admin.ModelAdmin):
    list_display = ("codigo", "nombre", "stock", "unidad")
    search_fields = ("codigo", "nombre")


@admin.register(Auditoria)
class AuditoriaAdmin(admin.ModelAdmin):
    list_display = ("fecha", "usuario", "accion", "detalle")
    list_filter = ("accion",)


@admin.register(CodigoVerificacion)
class CodigoVerificacionAdmin(admin.ModelAdmin):
    list_display = ("usuario", "creado", "expira", "intentos", "usado")
    readonly_fields = ("codigo_hash",)


admin.site.register([Incidencia, Telemetria, GestionAlerta])
admin.site.site_header = "Vila's Motor · Administración"
