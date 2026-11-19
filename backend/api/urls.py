from django.urls import path

from . import views

urlpatterns = [
    path("health/", views.health, name="health"),
    # Autenticación
    path("auth/me/", views.me),
    path("auth/login/", views.login_view),
    path("auth/verificar-codigo/", views.verificar_codigo),
    path("auth/reenviar-codigo/", views.reenviar_codigo),
    path("auth/logout/", views.logout_view),
    path("auth/cambiar-password/", views.cambiar_password),
    path("restablecer/", views.restablecer),
    # Catálogos
    path("resumen-login/", views.resumen_login),
    path("categorias/", views.categorias),
    path("destinos/", views.destinos),
    path("base/", views.base),
    path("insumos/", views.insumos),
    path("auditoria/", views.auditoria),
    # Equipos, lecturas y mantenciones
    path("equipos/", views.equipos),
    path("equipos/<int:pk>/", views.equipo),
    path("equipos/<int:pk>/lecturas/", views.lecturas),
    path("incidencias/<int:pk>/resolver/", views.resolver_incidencia),
    path("mantenciones/", views.mantenciones),
    # Alertas
    path("alertas/", views.alertas),
    path("alertas/<int:pk>/gestion/", views.gestion_alerta),
    # Dispositivos IoT
    path("dispositivos/", views.dispositivos),
    path("dispositivos/<int:pk>/", views.dispositivo),
    path("dispositivos/<int:pk>/vincular/", views.vincular_dispositivo),
    path("dispositivos/<int:pk>/baja/", views.baja_dispositivo),
    path("dispositivos/<int:pk>/conexion/", views.conexion_dispositivo),
    path("dispositivos/<int:pk>/simular/", views.simular_lectura),
    # Telemetría
    path("telemetria/", views.telemetria),
    path("telemetria/sincronizar/", views.sincronizar),
    path("telemetria/estado/", views.estado_sync),
]
