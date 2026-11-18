import { useEffect, useRef, useState } from 'react'
import { fmt } from '../../lib/formato'
import { Icon } from '../ui'

const LOTE = 5

/**
 * Selector de insumos con buscador (comboInsumos() del prototipo).
 * Muestra 5 resultados y carga de a 5 más (rueda, scroll al final, ↓ en el último o «Ver 5 más»).
 * Teclado: ↑ ↓ para moverse, Enter elige, Escape cierra.
 */
export function ComboInsumos({ insumos, value, onChange }) {
  const [abierto, setAbierto] = useState(false)
  const [q, setQ] = useState('')
  const [visibles, setVisibles] = useState(LOTE)
  const [activo, setActivo] = useState(0)
  const raiz = useRef(null)
  const trigger = useRef(null)
  const buscador = useRef(null)

  const filtrados = insumos.filter((i) => !q.trim() || `${i.nombre} ${i.codigo}`.toLowerCase().includes(q.trim().toLowerCase()))
  const vista = filtrados.slice(0, visibles)
  const activoReal = Math.min(activo, Math.max(0, vista.length - 1))
  const elegido = insumos.find((i) => i.codigo === value)

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!abierto) return
    const fuera = (ev) => {
      if (raiz.current && !raiz.current.contains(ev.target)) setAbierto(false)
    }
    document.addEventListener('mousedown', fuera)
    return () => document.removeEventListener('mousedown', fuera)
  }, [abierto])

  useEffect(() => {
    if (abierto) buscador.current?.focus()
  }, [abierto])

  const abrir = () => {
    setQ('')
    setVisibles(LOTE)
    setActivo(0)
    setAbierto(true)
  }
  const cerrar = () => setAbierto(false)
  const elegir = (codigo) => {
    onChange(codigo)
    cerrar()
    trigger.current?.focus()
  }
  const cargarMas = () => {
    if (visibles < filtrados.length) setVisibles((v) => v + LOTE)
  }
  const alFinal = (ul) => ul.scrollTop + ul.clientHeight >= ul.scrollHeight - 4

  function teclas(ev) {
    const n = Math.min(visibles, filtrados.length)
    if (ev.key === 'ArrowDown') {
      ev.preventDefault()
      if (activoReal === n - 1) cargarMas()
      setActivo(Math.min(activoReal + 1, Math.min(visibles + (activoReal === n - 1 ? LOTE : 0), filtrados.length) - 1))
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault()
      setActivo(Math.max(0, activoReal - 1))
    } else if (ev.key === 'Enter') {
      ev.preventDefault()
      if (vista[activoReal]) elegir(vista[activoReal].codigo)
    } else if (ev.key === 'Escape') {
      // Cierra solo el combo, no el modal
      ev.nativeEvent.stopPropagation()
      cerrar()
      trigger.current?.focus()
    }
  }

  return (
    <div className="combo" ref={raiz}>
      <button
        type="button"
        className="combo-trigger"
        aria-haspopup="listbox"
        aria-expanded={abierto}
        ref={trigger}
        onClick={() => (abierto ? cerrar() : abrir())}
      >
        <span className="combo-value">
          {elegido ? (
            <>
              {elegido.nombre} <span className="muted">— stock {fmt(elegido.stock)} {elegido.unidad}</span>
            </>
          ) : (
            <span className="muted">Selecciona un insumo…</span>
          )}
        </span>
        <Icon name="chevronDown" size={16} />
      </button>

      {abierto && (
        <div className="combo-pop">
          <div className="input-icon">
            <span className="i"><Icon name="search" size={16} /></span>
            <input
              ref={buscador}
              className="combo-search"
              placeholder="Buscar insumo por nombre o código…"
              autoComplete="off"
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setVisibles(LOTE)
                setActivo(0)
              }}
              onKeyDown={teclas}
            />
          </div>
          <ul
            className="combo-list"
            role="listbox"
            onScroll={(e) => alFinal(e.currentTarget) && cargarMas()}
            onWheel={(e) => e.deltaY > 0 && alFinal(e.currentTarget) && cargarMas()}
          >
            {vista.length ? (
              vista.map((i, n) => {
                const sel = i.codigo === value
                const nivel = i.stock === 0 ? 'rojo' : i.stock <= 2 ? 'amarillo' : ''
                return (
                  <li
                    key={i.codigo}
                    role="option"
                    aria-selected={sel}
                    className={`${n === activoReal ? 'active' : ''} ${sel ? 'sel' : ''}`}
                    onClick={() => elegir(i.codigo)}
                  >
                    <span>
                      {i.nombre}
                      <small className="mono">{i.codigo}</small>
                    </span>
                    <span className={`combo-stock ${nivel}`}>{fmt(i.stock)} {i.unidad}</span>
                  </li>
                )
              })
            ) : (
              <li className="combo-empty">Sin resultados para «{q.trim()}»</li>
            )}
          </ul>
          <div className="combo-foot">
            <span className="mono small muted combo-count">
              {filtrados.length ? `${vista.length} DE ${filtrados.length}` : ''}
            </span>
            {visibles < filtrados.length && (
              <button type="button" className="btn btn-sm combo-more" onClick={cargarMas}>
                <Icon name="plus" size={14} />
                Ver 5 más
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
