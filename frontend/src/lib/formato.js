/* Formatos y utilidades compartidas (equivalen a los helpers de prototipo_vilas/js/app.js y store.js) */

/** Número con separador de miles chileno: 3157 → "3.157" */
export const fmt = (n) => Number(n).toLocaleString('es-CL')

/** "2025-03-14T10:22" → "14-03-2025 10:22" ; vacío → "—" */
export function fecha(f) {
  if (!f) return '—'
  const [d, t] = f.split('T')
  const [y, m, dd] = d.split('-')
  return `${dd}-${m}-${y}${t ? ' ' + t : ''}`
}

/** Unidad corta: "km" o "h" */
export const unidad = (u) => (u === 'km' ? 'km' : 'h')

/** Restante con signo: positivo = lo que queda; negativo = exceso (vencida) */
export const signoRestante = (r) => (r > 0 ? '+' : r < 0 ? '−' : '') + fmt(Math.abs(r))

/** Color CSS de cada nivel del semáforo */
export const COLOR_VAR = {
  verde: 'var(--green)',
  amarillo: 'var(--yellow)',
  naranja: 'var(--orange)',
  rojo: 'var(--red)',
}

/** "Juana Pérez Soto" → "JP" */
export const iniciales = (n) =>
  n.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()

/** El dispositivo es un rastreador GPS (no un ESP32) */
export const esGPS = (d) => !!d && /^GPS-/.test(d.deviceId)

/** Validación de correo usada en los formularios */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Orden natural de códigos de equipo: VA2 antes que VA10 */
const claveCodigo = (c) => {
  const m = /^([A-Z]+)(\d+)$/i.exec(c) || [c, c, 0]
  return [m[1].toUpperCase(), Number(m[2])]
}
export const compararCodigo = (a, b) => {
  const x = claveCodigo(a.codigo)
  const y = claveCodigo(b.codigo)
  return x[0].localeCompare(y[0]) || x[1] - y[1]
}

/** Número con un decimal: 3402.5 → "3.402,5" (telemetría) */
export const fmtDec = (v) =>
  Number(v).toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** Milisegundos a "m:ss" (cuentas regresivas de sincronización) */
export const mmss = (ms) => {
  const t = Math.ceil(ms / 1000)
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
}

/** Orden del semáforo de menor a mayor gravedad (para ordenar por estado) */
export const ORDEN_ESTADO = { verde: 0, amarillo: 1, naranja: 2, rojo: 3 }
