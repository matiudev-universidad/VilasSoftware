/* Autenticación contra Django. La contraseña se compara en el servidor (authenticate()). */
import { api } from './http'

/**
 * Paso 1: correo y contraseña. Si son correctos, el servidor envía un código al correo y responde
 * { requiereCodigo, correo, codigoSimulado, venceEn, reenviarEn }. Si falla, lanza Error con el mensaje.
 */
export const login = (email, password) => api.post('/auth/login/', { email, password })

/** Paso 2: código de 6 dígitos. Devuelve el usuario { id, nombre, email, rol, rolNombre, permisos }.
 *  Error con status 409 = hay que volver a ingresar correo y contraseña. */
export const verificarCodigo = (codigo) => api.post('/auth/verificar-codigo/', { codigo })

/** Pide un código nuevo (anula el anterior). Misma respuesta que login. */
export const reenviarCodigo = () => api.post('/auth/reenviar-codigo/')

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
