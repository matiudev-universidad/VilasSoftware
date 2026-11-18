/* Aviso a la interfaz de que los datos cambiaron (tras crear, editar, registrar, restablecer…).
   useConsulta se suscribe y vuelve a pedir sus datos a la API. */
const oyentes = new Set()
let version = 0

export function suscribir(fn) {
  oyentes.add(fn)
  return () => oyentes.delete(fn)
}

export const versionDatos = () => version

export function notificarCambio() {
  version++
  oyentes.forEach((fn) => fn(version))
}
