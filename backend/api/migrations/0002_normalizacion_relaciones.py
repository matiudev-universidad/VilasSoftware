"""
Normalización (paso 1 de 3): agrega las relaciones nuevas sin borrar nada todavía.

- Los campos de texto que guardaban nombres de usuario o IDs de dispositivo se renombran
  a *_texto y se agrega en su lugar una FK al User o al Dispositivo.
- La pluma (antes JSON en Equipo) pasa a su propia tabla.
- La cola de lecturas sin señal (antes JSON en Dispositivo) pasa a la tabla LecturaPendiente.
"""
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RenameField("lectura", "usuario", "usuario_texto"),
        migrations.RenameField("incidencia", "dispositivo", "dispositivo_texto"),
        migrations.RenameField("mantencion", "registrado_por", "registrado_por_texto"),
        migrations.RenameField("gestionalerta", "usuario", "usuario_texto"),
        migrations.RenameField("auditoria", "usuario", "usuario_texto"),
        # El JSON de la pluma se renombra para que no choque con la relación inversa Equipo.pluma
        migrations.RenameField("equipo", "pluma", "pluma_json"),
        migrations.AddField(
            model_name="lectura",
            name="registrado_por",
            field=models.ForeignKey(null=True, blank=True, on_delete=django.db.models.deletion.PROTECT,
                                    related_name="lecturas", to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name="lectura",
            name="dispositivo",
            field=models.ForeignKey(null=True, blank=True, on_delete=django.db.models.deletion.PROTECT,
                                    related_name="lecturas", to="api.dispositivo"),
        ),
        migrations.AddField(
            model_name="incidencia",
            name="dispositivo",
            field=models.ForeignKey(null=True, blank=True, on_delete=django.db.models.deletion.PROTECT,
                                    related_name="incidencias", to="api.dispositivo"),
        ),
        migrations.AddField(
            model_name="mantencion",
            name="registrado_por",
            field=models.ForeignKey(null=True, blank=True, on_delete=django.db.models.deletion.PROTECT,
                                    related_name="mantenciones", to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name="gestionalerta",
            name="usuario",
            field=models.ForeignKey(null=True, blank=True, on_delete=django.db.models.deletion.PROTECT,
                                    related_name="alertas_en_gestion", to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name="auditoria",
            name="usuario",
            field=models.ForeignKey(null=True, blank=True, on_delete=django.db.models.deletion.PROTECT,
                                    related_name="auditoria", to=settings.AUTH_USER_MODEL),
        ),
        migrations.CreateModel(
            name="Pluma",
            fields=[
                ("equipo", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, primary_key=True,
                                                related_name="pluma", serialize=False, to="api.equipo")),
                ("marca", models.CharField(blank=True, max_length=60)),
                ("modelo", models.CharField(blank=True, max_length=60)),
            ],
        ),
        migrations.CreateModel(
            name="LecturaPendiente",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("valor", models.FloatField()),
                ("fecha", models.DateTimeField()),
                ("dispositivo", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,
                                                  related_name="pendientes", to="api.dispositivo")),
            ],
            options={"ordering": ["fecha", "id"], "verbose_name_plural": "lecturas pendientes"},
        ),
    ]
