"""
Modelos del Sistema de Control de Mantenciones — Vila's Motor (base Iquique).

Equivalen a las colecciones del prototipo (prototipo_vilas/js/data.js y flota.js).
Los usuarios usan el User de Django (contraseña con hash PBKDF2) + un Perfil con el rol.

Normalización:
- Quién hizo algo (lecturas, mantenciones, alertas, auditoría) es una FK al User, no un nombre en texto.
- Las lecturas e incidencias enviadas por un ESP32/GPS apuntan al Dispositivo con una FK.
- Los insumos de una mantención apuntan al Insumo (nombre y unidad salen del catálogo).
- No hay listas ni objetos guardados como JSON: la pluma y la cola sin señal tienen su propia tabla.
- El aviso anticipado no se guarda: se calcula desde la unidad, el tipo y la categoría (reglas.aviso_para).
- Desnormalización intencional: Equipo.horometro y Equipo.ultima_mantencion guardan el último valor
  (que también está en Lectura/Mantencion) para calcular el semáforo de 384 equipos sin recorrer el historial.
  Solo se actualizan dentro de la misma transacción que crea la lectura o la mantención (logica.py).
"""
from django.conf import settings
from django.db import models
from django.db.models import Q

from .reglas import aviso_para


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


class EquipoManager(models.Manager):
    """Trae siempre la categoría, el destino y la pluma en la misma consulta (evita N+1 en listados)."""

    def get_queryset(self):
        return super().get_queryset().select_related("categoria", "destino", "pluma")


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
    activo = models.BooleanField(default=True, help_text="Baja lógica: el historial se conserva")
    lat = models.FloatField(null=True, blank=True)
    lng = models.FloatField(null=True, blank=True)
    ultima_ubicacion = models.DateTimeField(null=True, blank=True)

    objects = EquipoManager()

    class Meta:
        ordering = ["codigo"]
        constraints = [
            # El código se puede reutilizar solo si el equipo anterior fue dado de baja
            models.UniqueConstraint(fields=["codigo"], condition=Q(activo=True), name="equipo_codigo_unico_activo"),
            models.CheckConstraint(condition=Q(intervalo__gt=0), name="equipo_intervalo_positivo"),
            models.CheckConstraint(condition=Q(horometro__gte=0), name="equipo_horometro_no_negativo"),
            models.CheckConstraint(condition=Q(ultima_mantencion__gte=0), name="equipo_ultima_mantencion_no_negativa"),
        ]
        indexes = [models.Index(fields=["activo", "codigo"], name="equipo_activo_codigo_idx")]

    def __str__(self):
        return f"{self.codigo} · {self.nombre}"

    @property
    def aviso(self):
        """Aviso anticipado (no se guarda: depende de la unidad, el tipo y la categoría)."""
        return aviso_para(self.unidad, self.tipo, self.categoria)


class Pluma(models.Model):
    """Pluma montada en un camión pluma (si existe la fila, el equipo tiene pluma)."""

    equipo = models.OneToOneField(Equipo, on_delete=models.CASCADE, primary_key=True, related_name="pluma")
    marca = models.CharField(max_length=60, blank=True)
    modelo = models.CharField(max_length=60, blank=True)

    def __str__(self):
        return f"Pluma {self.marca} {self.modelo}".strip()


class Insumo(models.Model):
    """Stock de bodega (simulación de Softland, solo lectura)."""

    codigo = models.CharField(max_length=20, primary_key=True)
    nombre = models.CharField(max_length=120)
    stock = models.FloatField(default=0)
    unidad = models.CharField(max_length=10)

    class Meta:
        constraints = [models.CheckConstraint(condition=Q(stock__gte=0), name="insumo_stock_no_negativo")]

    def __str__(self):
        return f"{self.nombre} ({self.stock:g} {self.unidad})"


class Mantencion(models.Model):
    equipo = models.ForeignKey(Equipo, on_delete=models.PROTECT, related_name="mantenciones")
    ot = models.CharField("N° OT", max_length=30)
    fecha = models.DateField()
    tipo = models.CharField(max_length=40, help_text="Ej: Preventiva 250 h, Correctiva")
    valor = models.FloatField(help_text="Lectura al momento de la mantención")
    responsable = models.CharField(max_length=120, blank=True, help_text="Taller o técnico que la ejecutó")
    registrado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="mantenciones",
        help_text="Usuario que la registró en el sistema (vacío en mantenciones históricas importadas)",
    )

    class Meta:
        ordering = ["-fecha", "-id"]
        verbose_name_plural = "mantenciones"
        constraints = [models.CheckConstraint(condition=Q(valor__gte=0), name="mantencion_valor_no_negativo")]
        indexes = [models.Index(fields=["equipo", "-fecha"], name="mantencion_equipo_fecha_idx")]

    def __str__(self):
        return f"{self.equipo.codigo} · {self.tipo} · {self.fecha}"


class MantencionInsumo(models.Model):
    """Insumo utilizado en una mantención (tabla intermedia Mantención ↔ Insumo con la cantidad)."""

    mantencion = models.ForeignKey(Mantencion, on_delete=models.CASCADE, related_name="insumos")
    insumo = models.ForeignKey(Insumo, on_delete=models.PROTECT, related_name="usos")
    cantidad = models.FloatField()

    class Meta:
        constraints = [models.CheckConstraint(condition=Q(cantidad__gt=0), name="mantencion_insumo_cantidad_positiva")]


class Lectura(models.Model):
    class Origen(models.TextChoices):
        MANUAL = "manual", "Manual"
        ESP32 = "ESP32", "ESP32"
        GPS = "GPS", "GPS"

    equipo = models.ForeignKey(Equipo, on_delete=models.CASCADE, related_name="lecturas")
    valor = models.FloatField()
    fecha = models.DateTimeField()
    origen = models.CharField(max_length=10, choices=Origen.choices, default=Origen.MANUAL)
    # Quién la registró: un usuario (lectura manual) o un dispositivo (ESP32/GPS), nunca ambos
    registrado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="lecturas"
    )
    dispositivo = models.ForeignKey(
        "Dispositivo", on_delete=models.PROTECT, null=True, blank=True, related_name="lecturas"
    )
    es_correccion = models.BooleanField(default=False)
    motivo = models.TextField(blank=True)
    valor_anterior = models.FloatField(null=True, blank=True)

    class Meta:
        ordering = ["-fecha", "-id"]
        constraints = [
            models.CheckConstraint(condition=Q(valor__gte=0), name="lectura_valor_no_negativo"),
            models.CheckConstraint(
                condition=(Q(origen="manual", dispositivo__isnull=True)
                           | (~Q(origen="manual") & Q(dispositivo__isnull=False, registrado_por__isnull=True))),
                name="lectura_origen_coherente",
            ),
            models.CheckConstraint(
                condition=Q(es_correccion=False) | ~Q(motivo="") | ~Q(origen="manual"),
                name="lectura_correccion_con_motivo",
            ),
        ]
        indexes = [
            models.Index(fields=["equipo", "-fecha"], name="lectura_equipo_fecha_idx"),
            models.Index(fields=["dispositivo", "-fecha"], name="lectura_dispositivo_fecha_idx"),
        ]

    @property
    def autor(self):
        """Nombre a mostrar: el ID del dispositivo o el nombre del usuario."""
        if self.dispositivo_id:
            return self.dispositivo.device_id
        u = self.registrado_por
        return (u.get_full_name() or u.username) if u else ""


class Incidencia(models.Model):
    """Lectura inconsistente: un dispositivo informó menos que el último valor (reinicio o falla)."""

    equipo = models.ForeignKey(Equipo, on_delete=models.CASCADE, related_name="incidencias")
    fecha = models.DateTimeField()
    valor = models.FloatField()
    anterior = models.FloatField()
    dispositivo = models.ForeignKey(
        "Dispositivo", on_delete=models.PROTECT, null=True, blank=True, related_name="incidencias"
    )
    resuelta = models.BooleanField(default=False)

    class Meta:
        indexes = [models.Index(fields=["equipo", "resuelta"], name="incidencia_equipo_resuelta_idx")]


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

    class Meta:
        constraints = [
            # Un dado de baja o sin vincular no puede quedar asociado a un equipo
            models.CheckConstraint(
                condition=~Q(estado__in=["baja", "sin vincular"]) | Q(equipo__isnull=True),
                name="dispositivo_sin_equipo_si_inactivo",
            ),
        ]

    def __str__(self):
        return self.device_id


class LecturaPendiente(models.Model):
    """Lectura que el dispositivo guardó mientras estaba sin señal (store-and-forward).
    Se envía como Lectura al reconectar y entonces se borra de aquí."""

    dispositivo = models.ForeignKey(Dispositivo, on_delete=models.CASCADE, related_name="pendientes")
    valor = models.FloatField()
    fecha = models.DateTimeField()

    class Meta:
        ordering = ["fecha", "id"]
        verbose_name_plural = "lecturas pendientes"


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
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="alertas_en_gestion")
    fecha = models.DateTimeField()
    nota = models.TextField(blank=True)


class Auditoria(models.Model):
    fecha = models.DateTimeField()
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="auditoria",
        help_text="Vacío = acción del sistema (ej. bloqueo automático de una cuenta)",
    )
    accion = models.CharField(max_length=60)
    detalle = models.TextField()
    valor_anterior = models.FloatField(null=True, blank=True)

    class Meta:
        ordering = ["-fecha", "-id"]
        verbose_name_plural = "auditoría"
        indexes = [models.Index(fields=["-fecha"], name="auditoria_fecha_idx")]


class BloqueoLogin(models.Model):
    """Intentos fallidos por correo: 5 fallos bloquean la cuenta 5 minutos."""

    email = models.EmailField(unique=True)
    fallos = models.PositiveSmallIntegerField(default=0)
    hasta = models.DateTimeField(null=True, blank=True)
