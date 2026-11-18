/* Autenticación contra Django. La contraseña se compara en el servidor (authenticate()). */
import { api } from './http'

/** Devuelve el usuario { id, nombre, email, rol, rolNombre, permisos }. Si falla, lanza Error con el mensaje. */
export const login = (email, password) => api.post('/auth/login/', { email, password })

export const logout = () => api.post('/auth/logout/')

/** Usuario con sesión activa (o null). También deja lista la cookie CSRF. */
export async function usuarioActual() {
  try {
    return await api.get('/auth/me/')
  } catch {
    return null
  }
}

export const cambiarPassword = (actual, nueva, repetir) =>
  api.post('/auth/cambiar-password/', { actual, nueva, repetir })

/** "Restablecer datos": la base vuelve al estado inicial, manteniendo la sesión */
export const restablecerDatos = () => api.post('/restablecer/')
