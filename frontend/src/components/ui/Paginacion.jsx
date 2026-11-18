import { useEffect, useState } from 'react'
import { Icon } from './Icon'

export const POR_PAGINA = 25

/* La página de cada tabla se recuerda por clave mientras dure la sesión
   (igual que el prototipo: al volver a una vista se mantiene la página). */
const paginasRecordadas = {}

/**
 * Pagina una lista de a 25.
 * const { items, desde, pagina, total, irA, reiniciar } = usePaginacion('equipos', lista)
 * reinicio (opcional): JSON de filtros/orden; al cambiar vuelve a la página 1 (o llamar reiniciar()).
 */
export function usePaginacion(clave, lista, reinicio = '') {
  const [pedida, setPedida] = useState(() => paginasRecordadas[clave] || 1)
  // reinicio: texto que resume filtros y orden; si cambia, se vuelve a la página 1
  const [reinicioPrevio, setReinicioPrevio] = useState(reinicio)
  if (reinicio !== reinicioPrevio) {
    setReinicioPrevio(reinicio)
    setPedida(1)
  }
  const total = Math.max(1, Math.ceil(lista.length / POR_PAGINA))
  const pagina = Math.min(Math.max(1, pedida), total)
  const desde = (pagina - 1) * POR_PAGINA

  const irA = (n) => setPedida(n)

  // Se recuerda la página para cuando el usuario vuelva a esta vista
  useEffect(() => {
    paginasRecordadas[clave] = pagina
  }, [clave, pagina])

  return {
    items: lista.slice(desde, desde + POR_PAGINA),
    desde,
    pagina,
    total,
    largo: lista.length,
    irA,
    reiniciar: () => irA(1),
  }
}

/** Pie de tabla: "26–50 DE 384" + Anterior / PÁG. 2 / 16 / Siguiente. No se muestra si hay una sola página. */
export function Pager({ pag }) {
  const { pagina, total, desde, items, largo, irA } = pag
  if (total <= 1) return null
  return (
    <div className="pager">
      <span className="mono small muted">
        {desde + 1}–{desde + items.length} DE {largo}
      </span>
      <div className="pager-btns">
        <button type="button" className="btn btn-sm" disabled={pagina === 1} onClick={() => irA(pagina - 1)}>
          <Icon name="chevronLeft" size={15} />
          Anterior
        </button>
        <span className="mono small">PÁG. {pagina} / {total}</span>
        <button type="button" className="btn btn-sm" disabled={pagina === total} onClick={() => irA(pagina + 1)}>
          Siguiente
          <Icon name="chevronRight" size={15} />
        </button>
      </div>
    </div>
  )
}
