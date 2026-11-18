/* Dispositivos IoT (ESP32) y rastreadores GPS */
import { api } from './http'

export const getDispositivos = () => api.get('/dispositivos/')
export const getDispositivo = (id) => api.get(`/dispositivos/${id}/`)

export const vincularDispositivo = (id, equipoId) => api.post(`/dispositivos/${id}/vincular/`, { equipoId: equipoId || null })
export const registrarDispositivo = (deviceId, tipo) => api.post('/dispositivos/', { deviceId, tipo })
export const darDeBaja = (id) => api.post(`/dispositivos/${id}/baja/`)

/** online=false: "Quitar señal" (lecturas en cola). online=true: "Reconectar" → { enviados, total } */
export const cambiarConexion = (id, online) => api.post(`/dispositivos/${id}/conexion/`, { online })

/** Simula el JSON que envía el ESP32 o el GPS. reinicio=true: horómetro que vuelve a 3 h (incidencia). */
export const simularLectura = (id, reinicio = false) => api.post(`/dispositivos/${id}/simular/`, { reinicio })
