"""Errores de negocio con mensaje listo para mostrar en la interfaz."""
from rest_framework import status
from rest_framework.exceptions import APIException, PermissionDenied


class ErrorNegocio(APIException):
    """Validación o regla incumplida → HTTP 400 con {"detail": "mensaje"}."""

    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Solicitud inválida."


class SinPermiso(PermissionDenied):
    default_detail = "Tu rol no tiene permiso para esta acción."
