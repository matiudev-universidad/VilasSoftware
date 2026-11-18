"""Panel de administración de Django (/admin): para revisar y corregir datos a mano."""
from django.contrib import admin

from .models import (
    Auditoria, Categoria, Destino, Dispositivo, Equipo, GestionAlerta, Incidencia, Insumo, Lectura,
    Mantencion, MantencionInsumo, Perfil, Telemetria,
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


@admin.register(Equipo)
class EquipoAdmin(admin.ModelAdmin):
    list_display = ("codigo", "nombre", "categoria", "destino", "horometro", "unidad", "intervalo", "ultima_mantencion", "activo")
    list_filter = ("categoria", "destino", "activo", "unidad")
    search_fields = ("codigo", "nombre", "marca", "modelo", "patente", "cliente")


class MantencionInsumoInline(admin.TabularInline):
    model = MantencionInsumo
    extra = 0


@admin.register(Mantencion)
class MantencionAdmin(admin.ModelAdmin):
    list_display = ("fecha", "equipo", "ot", "tipo", "valor", "responsable")
    list_filter = ("tipo",)
    search_fields = ("equipo__codigo", "ot")
    inlines = [MantencionInsumoInline]


@admin.register(Lectura)
class LecturaAdmin(admin.ModelAdmin):
    list_display = ("fecha", "equipo", "valor", "origen", "usuario", "es_correccion")
    list_filter = ("origen", "es_correccion")
    search_fields = ("equipo__codigo",)


@admin.register(Dispositivo)
class DispositivoAdmin(admin.ModelAdmin):
    list_display = ("device_id", "tipo", "equipo", "estado", "ultima_conexion")
    list_filter = ("estado",)


@admin.register(Insumo)
class InsumoAdmin(admin.ModelAdmin):
    list_display = ("codigo", "nombre", "stock", "unidad")


@admin.register(Auditoria)
class AuditoriaAdmin(admin.ModelAdmin):
    list_display = ("fecha", "usuario", "accion", "detalle")
    list_filter = ("accion",)


admin.site.register([Incidencia, Telemetria, GestionAlerta])
admin.site.site_header = "Vila's Motor · Administración"
