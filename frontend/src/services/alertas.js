/* Alertas (calculadas en Django con el semáforo) y su gestión */
import { api } from './http'

/** Ordenadas: rojo → naranja → amarillo, y dentro de cada nivel por lo que resta */
export const getAlertas = () => api.get('/alertas/')

export const marcarEnGestion = (equipoId, nota) => api.post(`/alertas/${equipoId}/gestion/`, { nota })
export const quitarGestion = (equipoId) => api.delete(`/alertas/${equipoId}/gestion/`)
