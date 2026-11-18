"""
Modelos del Sistema de Control de Mantenciones — Vila's Motor (base Iquique).

Equivalen a las colecciones del prototipo (prototipo_vilas/js/data.js y flota.js).
Los usuarios usan el User de Django (contraseña con hash PBKDF2) + un Perfil con el rol.
"""
from django.conf import settings
from django.db import models


class Perfil(models.Model):
    """Rol del usuario dentro del sistema (RBAC). El login y la contraseña los maneja Django."""

    class Rol(models.TextChoices):
        ADMIN = "admin", "Administrador del sistema"
        ENCARGADA = "encargada", "Encargada de Planificación"
        ASISTENTE = "asistente", "Asistente de Planificación"
        TI = "ti", "TI · Soporte de sistemas"
        PRACTICANTE = "practicante", "Practicante (solo lectura)"

    usuario = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="perfil")
    rol = models.CharField(max_length=20, choices=Rol.choices, default=Rol.PRACTICANTE)

    class Meta:
        verbose_name_plural = "perfiles"

    def __str__(self):
        return f"{self.usuario.get_full_name() or self.usuario.username} ({self.get_rol_display()})"


class Categoria(models.Model):
    """VA vehículos de administración · VG generadores · VR maquinaria de renta · V subarrendados."""

    codigo = models.CharField(max_length=4, primary_key=True)
    nombre = models.CharField(max_length=80)
    unidad = models.CharField(max_length=2, choices=[("h", "Horas"), ("km", "Kilómetros")])
    aviso = models.PositiveIntegerField(help_text="Aviso anticipado por defecto (h o km)")

    def __str__(self):
        return f"{self.codigo} · {self.nombre}"


class Destino(models.Model):
    """Lugar donde quedó trabajando el equipo (faena minera, puerto, base…)."""

    nombre = models.CharField(max_length=80, unique=True)
    tipo = models.CharField(max_length=40)
    lat = models.FloatField(null=True, blank=True)
    lng = models.FloatField(null=True, blank=True)

    def __str__(self):
        return f"{self.nombre} · {self.tipo}"


class Equipo(models.Model):
    codigo = models.CharField(max_length=10, help_text="Ej: VR005. Único entre los equipos activos.")
    nombre = models.CharField(max_length=120)
    tipo = models.CharField(max_length=40)
    categoria = models.ForeignKey(Categoria, on_delete=models.PROTECT, related_name="equipos")
    marca = models.CharField(max_length=60, blank=True)
    modelo = models.CharField(max_length=60, blank=True)
    patente = models.CharField(max_length=30, blank=True, default="—")
    cliente = models.CharField(max_length=120, blank=True)
    destino = models.ForeignKey(Destino, on_delete=models.PROTECT, related_name="equipos")
    horometro = models.FloatField(default=0, help_text="Lectura actual (h o km)")
    unidad = models.CharField(max_length=2, choices=[("h", "Horas"), ("km", "Kilómetros")], default="h")
    intervalo = models.PositiveIntegerField(help_text="Cada cuántas h/km corresponde mantención preventiva")
    ultima_mantencion = models.FloatField(default=0, help_text="Lectura en la última mantención")
    aviso = models.PositiveIntegerField(help_text="Aviso anticipado: 50 h · 300 km camionetas · 1.000 km transporte")
    activo = models.BooleanField(default=True, help_text="Baja lógica: el historial se conserva")
    lat = models.FloatField(null=True, blank=True)
    lng = models.FloatField(null=True, blank=True)
    ultima_ubicacion = models.DateTimeField(null=True, blank=True)
    pluma = models.JSONField(null=True, blank=True, help_text="Pluma montada (camiones pluma): {marca, modelo}")

    class Meta:
        ordering = ["codigo"]

    def __str__(self):
        return f"{self.codigo} · {self.nombre}"


class Insumo(models.Model):
    """Stock de bodega (simulación de Softland, solo lectura)."""

    codigo = models.CharField(max_length=20, primary_key=True)
    nombre = models.CharField(max_length=120)
    stock = models.FloatField(default=0)
    unidad = models.CharField(max_length=10)

    def __str__(self):
        return f"{self.nombre} ({self.stock:g} {self.unidad})"


class Mantencion(models.Model):
    equipo = models.ForeignKey(Equipo, on_delete=models.PROTECT, related_name="mantenciones")
    ot = models.CharField("N° OT", max_length=30)
    fecha = models.DateField()
    tipo = models.CharField(max_length=40, help_text="Ej: Preventiva 250 h, Correctiva")
    valor = models.FloatField(help_text="Lectura al momento de la mantención")
    responsable = models.CharField(max_length=120, blank=True)
    registrado_por = models.CharField(max_length=120, blank=True)

    class Meta:
        ordering = ["-fecha", "-id"]
        verbose_name_plural = "mantenciones"

    def __str__(self):
        return f"{self.equipo.codigo} · {self.tipo} · {self.fecha}"


class MantencionInsumo(models.Model):
    """Insumo utilizado en una mantención (se guarda nombre y unidad tal como estaban)."""

    mantencion = models.ForeignKey(Mantencion, on_delete=models.CASCADE, related_name="insumos")
    insumo = models.ForeignKey(Insumo, on_delete=models.SET_NULL, null=True, blank=True)
    nombre = models.CharField(max_length=120)
    cantidad = models.FloatField()
    unidad = models.CharField(max_length=10)


class Lectura(models.Model):
    class Origen(models.TextChoices):
        MANUAL = "manual", "Manual"
        ESP32 = "ESP32", "ESP32"
        GPS = "GPS", "GPS"

    equipo = models.ForeignKey(Equipo, on_delete=models.CASCADE, related_name="lecturas")
    valor = models.FloatField()
    fecha = models.DateTimeField()
    origen = models.CharField(max_length=10, choices=Origen.choices, default=Origen.MANUAL)
    usuario = models.CharField(max_length=120, help_text="Quién registró: nombre del usuario o ID del dispositivo")
    es_correccion = models.BooleanField(default=False)
    motivo = models.TextField(blank=True)
    valor_anterior = models.FloatField(null=True, blank=True)

    class Meta:
        ordering = ["-fecha", "-id"]


class Incidencia(models.Model):
    """Lectura inconsistente: un dispositivo informó menos que el último valor (reinicio o falla)."""

    equipo = models.ForeignKey(Equipo, on_delete=models.CASCADE, related_name="incidencias")
    fecha = models.DateTimeField()
    valor = models.FloatField()
    anterior = models.FloatField()
    dispositivo = models.CharField(max_length=20, blank=True)
    resuelta = models.BooleanField(default=False)


class Dispositivo(models.Model):
    """ESP32 (horas de motor) o rastreador GPS (ubicación y km)."""

    class Estado(models.TextChoices):
        ONLINE = "online", "En línea"
        OFFLINE = "offline", "Sin señal"
        SIN_VINCULAR = "sin vincular", "Sin vincular"
        BAJA = "baja", "Dado de baja"

    device_id = models.CharField(max_length=20, unique=True, help_text="ESP32-000 o GPS-000")
    tipo = models.CharField(max_length=60)
    equipo = models.ForeignKey(Equipo, on_delete=models.SET_NULL, null=True, blank=True, related_name="dispositivos")
    estado = models.CharField(max_length=15, choices=Estado.choices, default=Estado.SIN_VINCULAR)
    ultima_conexion = models.DateTimeField(null=True, blank=True)
    cola = models.JSONField(default=list, blank=True, help_text="Lecturas pendientes sin señal (store-and-forward)")

    def __str__(self):
        return self.device_id


class Telemetria(models.Model):
    """Horómetro en tiempo real de equipos en faena minera o con GPS."""

    equipo = models.OneToOneField(Equipo, on_delete=models.CASCADE, related_name="telemetria")
    en_uso = models.BooleanField(default=False)
    horas = models.FloatField(default=0)
    delta = models.FloatField(null=True, blank=True)
    ultima_sync = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name_plural = "telemetría"


class EstadoSync(models.Model):
    """Fila única con la última sincronización de horómetros (automática y manual)."""

    ultima = models.DateTimeField(null=True, blank=True)
    ultima_manual = models.DateTimeField(null=True, blank=True)

    @classmethod
    def actual(cls):
        return cls.objects.get_or_create(pk=1)[0]


class GestionAlerta(models.Model):
    """Alerta marcada 'en gestión' (las alertas en sí se calculan con el semáforo)."""

    equipo = models.OneToOneField(Equipo, on_delete=models.CASCADE, related_name="gestion_alerta")
    usuario = models.CharField(max_length=120)
    fecha = models.DateTimeField()
    nota = models.TextField(blank=True)


class Auditoria(models.Model):
    fecha = models.DateTimeField()
    usuario = models.CharField(max_length=120)
    accion = models.CharField(max_length=60)
    detalle = models.TextField()
    valor_anterior = models.FloatField(null=True, blank=True)

    class Meta:
        ordering = ["-fecha", "-id"]
        verbose_name_plural = "auditoría"


class BloqueoLogin(models.Model):
    """Intentos fallidos por correo: 5 fallos bloquean la cuenta 5 minutos."""

    email = models.EmailField(unique=True)
    fallos = models.PositiveSmallIntegerField(default=0)
    hasta = models.DateTimeField(null=True, blank=True)
