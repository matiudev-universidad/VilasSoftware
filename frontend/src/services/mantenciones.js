/* Mantenciones */
import { api } from './http'

/** Mantenciones (todas o de un equipo), de la más reciente a la más antigua */
export const getMantenciones = (equipoId) =>
  api.get(`/mantenciones/${equipoId != null ? `?equipo=${equipoId}` : ''}`)

/** d: { equipoId, fecha, tipo, valor, ot?, responsable?, insumos? } */
export const registrarMantencion = (d) => api.post('/mantenciones/', d)
