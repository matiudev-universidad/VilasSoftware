import {
  BotonLimpiar, Empty, Icon, Num, PageHead, SelectOrden, Status, compararTexto, useFiltros, useOrden,
} from '../components/ui'
import { catalogos, useConsulta } from '../services'

const estadoDe = (i) => (i.stock === 0 ? 'rojo' : i.stock <= 2 ? 'amarillo' : 'verde')
const TEXTO = { rojo: 'Sin stock', amarillo: 'Stock bajo', verde: 'Disponible' }
const ORDEN_ESTADO = { rojo: 0, amarillo: 1, verde: 2 }

const COMPARAR = {
  codigo: (a, b) => compararTexto(a.codigo, b.codigo),
  nombre: (a, b) => compararTexto(a.nombre, b.nombre),
  stock: (a, b) => a.stock - b.stock,
  estado: (a, b) => ORDEN_ESTADO[estadoDe(a)] - ORDEN_ESTADO[estadoDe(b)],
}
const VACIOS = { q: '', estado: '', unidad: '' }

/* Stock de insumos, solo lectura (vInsumos() del prototipo + filtros, orden y limpieza) */
export default function Insumos() {
  const { datos: todos } = useConsulta(() => catalogos.getInsumos())
  const f = useFiltros('insumos', VACIOS)
  const o = useOrden('insumos', COMPARAR, { col: 'codigo', asc: true })

  if (!todos) return null

  const { q, estado, unidad } = f.filtros
  const lista = o.aplicar(
    todos.filter((i) => {
      const t = q.trim().toLowerCase()
      return (
        (!t || `${i.codigo} ${i.nombre}`.toLowerCase().includes(t)) &&
        (!estado || estadoDe(i) === estado) &&
        (!unidad || i.unidad === unidad)
      )
    }),
  )
  const max = Math.max(1, ...todos.map((i) => i.stock))
  const unidades = [...new Set(todos.map((i) => i.unidad))].sort(compararTexto)
  const cuenta = (c) => todos.filter((i) => estadoDe(i) === c).length

  return (
    <>
      <PageHead
        num="07 — Bodega"
        titulo="Stock de insumos"
        desc="Consulta de solo lectura al sistema de bodega (simulación de Softland). Planificación no modifica el stock."
      />
      <div className="panel">
        <div className="panel-head">
          <div className="filters">
            <div className="input-icon">
              <span className="i"><Icon name="search" size={16} /></span>
              <input placeholder="Código o nombre del insumo…" value={q} onChange={(e) => f.set('q', e.target.value)} />
            </div>
            <select value={estado} onChange={(e) => f.set('estado', e.target.value)}>
              <option value="">Todos los estados</option>
              {['verde', 'amarillo', 'rojo'].map((c) => (
                <option key={c} value={c}>{TEXTO[c]} ({cuenta(c)})</option>
              ))}
            </select>
            <select value={unidad} onChange={(e) => f.set('unidad', e.target.value)}>
              <option value="">Todas las unidades</option>
              {unidades.map((u) => <option key={u}>{u}</option>)}
            </select>
            <SelectOrden
              orden={o}
              opciones={[
                ['codigo', true, 'código'],
                ['nombre', true, 'nombre A → Z'],
                ['stock', true, 'menor stock'],
                ['stock', false, 'mayor stock'],
                ['estado', true, 'sin stock primero'],
              ]}
            />
            <BotonLimpiar hay={f.hay} onClick={f.limpiar} />
          </div>
          <span className="mono small muted">{String(lista.length).padStart(2, '0')} INSUMOS</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {o.th('codigo', 'Código')}
                {o.th('nombre', 'Insumo')}
                {o.th('stock', 'Stock', { style: { width: '30%' } })}
                {o.th('estado', 'Estado')}
              </tr>
            </thead>
            <tbody>
              {lista.length ? (
                lista.map((i) => {
                  const c = estadoDe(i)
                  return (
                    <tr key={i.codigo} className={c === 'verde' ? '' : `row-${c}`}>
                      <td className="mono small">{i.codigo}</td>
                      <td><b>{i.nombre}</b></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Num valor={i.stock} unidad={i.unidad} />
                          <div className="bar" style={{ flex: 1 }}>
                            <span style={{ width: `${(i.stock / max) * 100}%`, background: 'var(--ink)' }} />
                          </div>
                        </div>
                      </td>
                      <td><Status color={c}>{TEXTO[c]}</Status></td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={4}>
                    <Empty icon="search" size={28}>No hay insumos que coincidan con los filtros.</Empty>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
