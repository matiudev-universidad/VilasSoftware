/* Telemetría y horómetros (equipos en faena minera + equipos con GPS) */
import { api } from './http'

/** Filas: { equipo, t, disp, online, gps } */
export const getTelemetria = () => api.get('/telemetria/')

/** "Sincronizar horómetros" (botón). Luego hay que esperar 2 min para repetir. */
export const sincronizarTelemetria = () => api.post('/telemetria/sincronizar/', { manual: true })

/** Actualización automática (cada 5 min) */
export const sincronizarAuto = () => api.post('/telemetria/sincronizar/', { manual: false })

/** { ultima (ms), proximaAuto (ms), cooldown (ms), tocaAuto } */
export const getEstadoSync = () => api.get('/telemetria/estado/')
