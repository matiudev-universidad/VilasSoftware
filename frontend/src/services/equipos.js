/* Equipos (CRUD con baja lógica). Cada equipo viene con su `estado` (semáforo) calculado en Django. */
import { api } from './http'

/** incluirBajas: también los dados de baja (para mostrar su historial) */
export const getEquipos = ({ incluirBajas = false } = {}) =>
  api.get(`/equipos/${incluirBajas ? '?incluirBajas=1' : ''}`)

/** Un equipo (activo o dado de baja); null si no existe */
export const getEquipo = (id) => api.get(`/equipos/${id}/`)

export const crearEquipo = (datos) => api.post('/equipos/', datos)
export const editarEquipo = (id, datos) => api.put(`/equipos/${id}/`, datos)

/** Baja lógica: deja de aparecer pero conserva su historial */
export const eliminarEquipo = (id) => api.delete(`/equipos/${id}/`)
