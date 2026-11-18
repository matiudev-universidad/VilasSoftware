/* Lecturas de horómetro / odómetro e incidencias */
import { api } from './http'

/** Lecturas de un equipo, de la más reciente a la más antigua */
export const getLecturas = (equipoId) => api.get(`/equipos/${equipoId}/lecturas/`)

/** Registro manual. Si el valor es menor al último exige motivo:
    devuelve { ok, estado } | { ok: false, requiereMotivo, anterior } */
export const registrarLectura = (equipoId, valor, motivo) =>
  api.post(`/equipos/${equipoId}/lecturas/`, { valor, motivo })

export const resolverIncidencia = (id, nota) => api.post(`/incidencias/${id}/resolver/`, { nota })
