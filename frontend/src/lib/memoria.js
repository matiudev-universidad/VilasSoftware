/* Memoria de la sesión del usuario: filtros, orden, página y pestañas de cada vista.
   Así, al volver a una pantalla, la tabla sigue como estaba.
   Vive solo en la pestaña del navegador y se borra al cerrar o iniciar sesión,
   para que el siguiente usuario vea todo en su estado normal. */
const memoria = new Map()

/** Valor guardado para la clave (o el inicial si no hay nada guardado) */
export const recordar = (clave, inicial) => (memoria.has(clave) ? memoria.get(clave) : inicial)

export const guardar = (clave, valor) => {
  memoria.set(clave, valor)
}

/** Olvida todo lo recordado (se llama al cerrar sesión y al iniciarla) */
export const olvidarTodo = () => memoria.clear()
