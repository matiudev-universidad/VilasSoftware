/* Herramientas comunes de las tablas: filtros y orden que se recuerdan durante la sesión,
   encabezados ordenables y el botón "Limpiar filtros". */
import { useEffect, useState } from 'react'
import { guardar, recordar } from '../../lib/memoria'
import { Button } from './Button'

/** useState que se recuerda mientras dure la sesión: al volver a la vista sigue igual */
export function useRecordado(clave, inicial) {
  const [valor, setValor] = useState(() => recordar(clave, inicial))
  const set = (v) => {
    guardar(clave, v)
    setValor(v)
  }
  return [valor, set]
}

/**
 * Filtros de una tabla.
 * const f = useFiltros('equipos', { q: '', cat: '' }, desdeUrl)
 * f.filtros.q · f.set('q', 'VG') · f.limpiar() · f.hay (hay alguno activo)
 * desdeUrl: valores que llegan por la URL (ej. ?estado=rojo desde el panel); reemplazan a los recordados.
 */
export function useFiltros(clave, vacios, desdeUrl) {
  const conUrl = desdeUrl && Object.values(desdeUrl).some((v) => v != null && v !== '')
  const k = 'filtros:' + clave
  const [filtros, setFiltros] = useState(() => (conUrl ? { ...vacios, ...limpio(desdeUrl) } : recordar(k, vacios)))

  useEffect(() => {
    guardar(k, filtros)
  }, [k, filtros])

  return {
    filtros,
    set: (campo, valor) => setFiltros((f) => ({ ...f, [campo]: valor })),
    cambiar: (nuevos) => setFiltros((f) => ({ ...f, ...nuevos })),
    limpiar: () => setFiltros(vacios),
    hay: Object.keys(vacios).some((c) => filtros[c] !== vacios[c]),
  }
}

const limpio = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v != null && v !== ''))

/** Compara textos en español y con números naturales ("VA2" < "VA10") */
export const compararTexto = (a, b) =>
  String(a ?? '').localeCompare(String(b ?? ''), 'es', { numeric: true, sensitivity: 'base' })

/**
 * Orden por columnas.
 * const o = useOrden('equipos', { codigo: (a, b) => …, lectura: … }, { col: 'codigo', asc: true })
 * o.aplicar(lista) → lista ordenada · o.th('lectura', 'Lectura') → <th> que ordena al hacer clic
 */
export function useOrden(clave, comparadores, defecto) {
  const [orden, setOrden] = useRecordado('orden:' + clave, defecto)

  const ordenar = (col) => setOrden({ col, asc: orden.col === col ? !orden.asc : true })

  const aplicar = (lista) => {
    const cmp = comparadores[orden.col] || comparadores[defecto.col]
    const desempate = comparadores[defecto.col]
    return [...lista].sort((a, b) => {
      const r = cmp(a, b) || desempate(a, b)
      return orden.asc ? r : -r
    })
  }

  const th = (col, texto, props = {}) => {
    const activo = orden.col === col
    return (
      <th
        key={col}
        {...props}
        className={`th-sort ${activo ? 'active' : ''} ${props.className || ''}`}
        onClick={() => ordenar(col)}
        title="Ordenar"
        aria-sort={activo ? (orden.asc ? 'ascending' : 'descending') : 'none'}
      >
        {texto}
        <span className="sort-arrow">{activo ? (orden.asc ? '▲' : '▼') : '↕'}</span>
      </th>
    )
  }

  const fijar = (col, asc) => setOrden({ col, asc })

  return { orden, ordenar, fijar, aplicar, th, firma: `${orden.col}:${orden.asc}` }
}

/**
 * Selector "Ordenar por" (complementa los encabezados clicables; útil en pantallas chicas).
 * opciones: [['codigo', true, 'Código A → Z'], ['stock', false, 'Mayor stock'], …]
 */
export function SelectOrden({ orden: o, opciones }) {
  const actual = `${o.orden.col}:${o.orden.asc}`
  const conocida = opciones.some(([c, a]) => `${c}:${a}` === actual)
  return (
    <select
      value={actual}
      title="Ordenar por"
      aria-label="Ordenar por"
      onChange={(e) => {
        const [col, asc] = e.target.value.split(':')
        o.fijar(col, asc === 'true')
      }}
    >
      {!conocida && <option value={actual}>Orden: personalizado (columna)</option>}
      {opciones.map(([col, asc, texto]) => (
        <option key={`${col}:${asc}`} value={`${col}:${asc}`}>Orden: {texto}</option>
      ))}
    </select>
  )
}

/** Botón "Limpiar filtros": siempre visible, deshabilitado si no hay filtros activos */
export function BotonLimpiar({ hay, onClick }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      icon="filterX"
      iconSize={15}
      className="btn-clear"
      onClick={onClick}
      disabled={!hay}
      title="Quitar todos los filtros"
    >
      Limpiar filtros
    </Button>
  )
}

/** Filtro con su nombre arriba (más claro para el usuario que solo un placeholder) */
export function Campo({ etiqueta, children }) {
  return (
    <div className="campo-filtro">
      <span>{etiqueta}</span>
      {children}
    </div>
  )
}
