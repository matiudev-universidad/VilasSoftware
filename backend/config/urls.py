from django.conf import settings
from django.contrib import admin
from django.http import FileResponse, Http404
from django.urls import include, path, re_path


def frontend(request):
    """Cualquier ruta que no sea /api ni /admin devuelve la app de React (ella maneja /equipos, /alertas…)."""
    index = settings.FRONTEND_DIR / "index.html"
    if not index.exists():
        raise Http404("Frontend sin compilar: ejecuta 'npm run build:django' en la carpeta frontend.")
    return FileResponse(open(index, "rb"), content_type="text/html")


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("api.urls")),
    re_path(r"^(?!api/|admin/|static/|assets/).*$", frontend),
]
