import { useState } from 'react'
import { compararCodigo } from '../../lib/formato'
import { Icon } from './Icon'

const textoBusqueda = (e) =>
  `${e.codigo} ${e.nombre} ${e.marca} ${e.modelo} ${e.patente}`.toLowerCase()

/**
 * Buscador + <select> de equipos agrupados por categoría y ordenados por código.
 * Equivale a buscadorEquipos() + opcionesEquipos() + conectarBuscador() del prototipo.
 *
 * Props:
 * - equipos, categorias: listas de la capa de datos
 * - value / onChange(id): id del equipo seleccionado (controlado)
 * - extra(e) → { texto, disabled }: texto añadido a la opción o deshabilitarla
 * - id, placeholder: para el <label htmlFor> y la opción vacía (opcional)
 */
export function SelectorEquipo({ equipos, categorias, value, onChange, extra, id, placeholder }) {
  const [q, setQ] = useState('')

  const coincide = (e) => !q.trim() || textoBusqueda(e).includes(q.trim().toLowerCase())

  const grupos = categorias
    .map((c) => ({
      categoria: c,
      equipos: equipos
        .filter((e) => e.categoria === c.codigo && coincide(e))
        .sort(compararCodigo),
    }))
    .filter((g) => g.equipos.length)

  // Al escribir: si el seleccionado quedó fuera del filtro, se elige el primero que coincida
  const alBuscar = (texto) => {
    setQ(texto)
    const t = texto.trim().toLowerCase()
    const actual = equipos.find((e) => String(e.id) === String(value))
    if (actual && (!t || textoBusqueda(actual).includes(t))) return
    const primero = equipos
      .filter((e) => (!t || textoBusqueda(e).includes(t)) && !extra?.(e)?.disabled)
      .sort(compararCodigo)
      .find((e) => categorias.some((c) => c.codigo === e.categoria))
    if (primero) onChange(primero.id)
  }

  // El seleccionado se mantiene visible aunque no coincida (para que el <select> no quede en blanco)
  const seleccionado = equipos.find((e) => String(e.id) === String(value))
  const seleccionadoOculto = seleccionado && !coincide(seleccionado)

  const opcion = (e) => {
    const x = extra ? extra(e) || {} : {}
    return (
      <option key={e.id} value={e.id} disabled={x.disabled}>
        {e.codigo} · {e.nombre}
        {x.texto || ''}
      </option>
    )
  }

  return (
    <>
      <div className="input-icon eq-search">
        <span className="i">
          <Icon name="search" size={16} />
        </span>
        <input
          value={q}
          onChange={(ev) => alBuscar(ev.target.value)}
          placeholder="Buscar por código, nombre, marca o modelo…"
          autoComplete="off"
        />
      </div>
      <select id={id} value={value ?? ''} onChange={(ev) => onChange(ev.target.value)}>
        {placeholder && <option value="">{placeholder}</option>}
        {seleccionadoOculto && opcion(seleccionado)}
        {grupos.map((g) => (
          <optgroup key={g.categoria.codigo} label={`${g.categoria.codigo} · ${g.categoria.nombre}`}>
            {g.equipos.map(opcion)}
          </optgroup>
        ))}
      </select>
    </>
  )
}

/** Solo las <optgroup>/<option> de equipos por categoría (para filtros con <select> simple) */
export function OpcionesEquipos({ equipos, categorias }) {
  return categorias.map((c) => {
    const eqs = equipos.filter((e) => e.categoria === c.codigo).sort(compararCodigo)
    if (!eqs.length) return null
    return (
      <optgroup key={c.codigo} label={`${c.codigo} · ${c.nombre}`}>
        {eqs.map((e) => (
          <option key={e.id} value={e.id}>
            {e.codigo} · {e.nombre}
          </option>
        ))}
      </optgroup>
    )
  })
}
