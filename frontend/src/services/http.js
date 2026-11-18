/* ==========================================================================
   Cliente HTTP de la API de Django.
   - En desarrollo, Vite redirige /api a http://127.0.0.1:8000 (vite.config.js).
   - Autenticación por sesión: la cookie la maneja el navegador.
   - Peticiones que modifican datos llevan el token CSRF (cookie "csrftoken").
   - Si la API responde con error, se lanza Error con el mensaje de "detail".
   ========================================================================== */
import { notificarCambio } from './cambios'

const API_URL = import.meta.env.VITE_API_URL ?? '/api'

function leerCookie(nombre) {
  const fila = document.cookie.split('; ').find((c) => c.startsWith(nombre + '='))
  return fila ? decodeURIComponent(fila.split('=')[1]) : null
}

async function pedir(metodo, ruta, cuerpo) {
  const opciones = {
    method: metodo,
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  }
  if (metodo !== 'GET') {
    opciones.headers['Content-Type'] = 'application/json'
    opciones.headers['X-CSRFToken'] = leerCookie('csrftoken') ?? ''
    if (cuerpo !== undefined) opciones.body = JSON.stringify(cuerpo)
  }

  let respuesta
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, opciones)
  } catch {
    throw new Error('No se pudo conectar con el servidor. Revisa que Django esté corriendo (python manage.py runserver).')
  }

  const texto = await respuesta.text()
  const datos = texto ? JSON.parse(texto) : null

  if (!respuesta.ok) {
    const mensaje = datos?.detail || `Error ${respuesta.status} al llamar a ${ruta}`
    const error = new Error(mensaje)
    error.status = respuesta.status
    throw error
  }

  // Cualquier cambio exitoso hace que las vistas vuelvan a consultar sus datos
  if (metodo !== 'GET') notificarCambio()
  return datos
}

export const api = {
  get: (ruta) => pedir('GET', ruta),
  post: (ruta, cuerpo) => pedir('POST', ruta, cuerpo ?? {}),
  put: (ruta, cuerpo) => pedir('PUT', ruta, cuerpo),
  delete: (ruta) => pedir('DELETE', ruta),
}
