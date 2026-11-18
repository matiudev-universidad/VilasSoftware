import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { ModalEquipo } from '../components/equipos/ModalEquipo'
import {
  BotonLimpiar, Button, Empty, Icon, IconoTipo, Num, PageHead, Pager, Status, useConfirmar, usePaginacion, useToast,
} from '../components/ui'
import { compararCodigo, ORDEN_ESTADO, unidad } from '../lib/formato'
import { catalogos, equiposApi, useConsulta } from '../services'

/* Filtros y orden se recuerdan mientras dure la sesión (igual que el prototipo):
   al volver de una ficha, la tabla sigue como estaba. */
const SIN_FILTROS = { q: '', cat: '', dest: '', est: '' }
let filtrosGuardados = { ...SIN_FILTROS }
let ordenGuardado = { col: 'codigo', asc: true }

const COMPARAR = {
  codigo: compararCodigo,
  categoria: (a, b) => a.categoria.localeCompare(b.categoria),
  destino: (a, b) => a.destino.localeCompare(b.destino),
  lectura: (a, b) => a.horometro - b.horometro,
  proxima: (a, b) => a.estado.restante - b.estado.restante,
  estado: (a, b) => ORDEN_ESTADO[a.estado.color] - ORDEN_ESTADO[b.estado.color],
}

const ESTADOS = [
  { v: '', t: 'Todos los estados' },
  { v: 'verde', t: 'Operativo' },
  { v: 'amarillo', t: 'Próximo' },
  { v: 'naranja', t: 'Crítico' },
  { v: 'rojo', t: 'Vencido' },
]

/* Equipos (vEquipos() del prototipo) */
export default function Equipos() {
  const { puede } = useAuth()
  const toast = useToast()
  const confirmar = useConfirmar()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const { datos: equipos } = useConsulta(() => equiposApi.getEquipos())
  const { datos: categorias } = useConsulta(() => catalogos.getCategorias())
  const { datos: destinos } = useConsulta(() => catalogos.getDestinos())
  const { datos: base } = useConsulta(() => catalogos.getBase())

  // Desde un KPI del panel (?estado=rojo): se parte solo con ese filtro
  const estadoUrl = params.get('estado')
  const [filtros, setFiltrosState] = useState(() =>
    estadoUrl != null ? { ...SIN_FILTROS, est: estadoUrl } : filtrosGuardados,
  )
  const [orden, setOrdenState] = useState(ordenGuardado)
  const [modal, setModal] = useState(null) // null | { equipo?: ... }

  const lista = (equipos || [])
    .filter((e) => {
      const q = filtros.q.toLowerCase()
      return (
        (!q || `${e.codigo} ${e.nombre} ${e.cliente} ${e.marca} ${e.modelo} ${e.patente}`.toLowerCase().includes(q)) &&
        (!filtros.cat || e.categoria === filtros.cat) &&
        (!filtros.dest || e.destino === filtros.dest) &&
        (!filtros.est || e.estado.color === filtros.est)
      )
    })
    .sort((a, b) => {
      const r = COMPARAR[orden.col](a, b) || compararCodigo(a, b)
      return orden.asc ? r : -r
    })
  const pag = usePaginacion('equipos', lista)

  // Al llegar con ?estado= se guarda el filtro y se limpia la URL
  useEffect(() => {
    if (estadoUrl != null) {
      filtrosGuardados = { ...SIN_FILTROS, est: estadoUrl }
      pag.reiniciar()
      navigate('/equipos', { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setFiltro = (k, v) => {
    const nuevos = { ...filtros, [k]: v }
    filtrosGuardados = nuevos
    setFiltrosState(nuevos)
    pag.reiniciar()
  }
  const limpiar = () => {
    filtrosGuardados = { ...SIN_FILTROS }
    setFiltrosState(filtrosGuardados)
    pag.reiniciar()
  }
  const ordenar = (col) => {
    const nuevo = { col, asc: orden.col === col ? !orden.asc : true }
    ordenGuardado = nuevo
    setOrdenState(nuevo)
    pag.reiniciar()
  }

  async function darDeBaja(e) {
    const ok = await confirmar({
      titulo: 'Dar de baja',
      mensaje: `¿Dar de baja el equipo ${e.codigo}? Se conservará su historial.`,
      confirmar: 'Dar de baja',
      peligro: true,
    })
    if (!ok) return
    try {
      await equiposApi.eliminarEquipo(e.id)
      toast(`Equipo ${e.codigo} dado de baja`)
    } catch (err) {
      toast(err.message, 'err')
    }
  }

  if (!equipos || !categorias || !destinos) return null

  const hayFiltros = Object.values(filtros).some(Boolean)
  const nDestinos = new Set(equipos.map((e) => e.destino)).size

  const th = (col, texto) => {
    const activo = orden.col === col
    return (
      <th key={col} className={`th-sort ${activo ? 'active' : ''}`} onClick={() => ordenar(col)} title="Ordenar">
        {texto}
        <span className="sort-arrow">{activo ? (orden.asc ? '▲' : '▼') : '↕'}</span>
      </th>
    )
  }

  return (
    <>
      <PageHead
        num="02 — Flota"
        titulo="Equipos"
        desc={`${equipos.length} equipos activos de la base ${base ?? ''}, distribuidos en ${nDestinos} destinos.`}
      >
        {puede('crudEquipos') && (
          <Button variant="primary" icon="plus" onClick={() => setModal({})}>
            Nuevo equipo
          </Button>
        )}
      </PageHead>

      <div className="panel">
        <div className="panel-head">
          <div className="filters">
            <div className="input-icon">
              <span className="i"><Icon name="search" size={16} /></span>
              <input placeholder="Código, nombre, marca, modelo…" value={filtros.q} onChange={(e) => setFiltro('q', e.target.value)} />
            </div>
            <select value={filtros.cat} onChange={(e) => setFiltro('cat', e.target.value)}>
              <option value="">Todas las categorías</option>
              {categorias.map((c) => (
                <option key={c.codigo} value={c.codigo}>{c.codigo} · {c.nombre}</option>
              ))}
            </select>
            <select value={filtros.dest} onChange={(e) => setFiltro('dest', e.target.value)}>
              <option value="">Todos los destinos</option>
              {destinos.map((d) => (
                <option key={d.nombre} value={d.nombre}>{d.nombre} · {d.tipo}</option>
              ))}
            </select>
            <select value={filtros.est} onChange={(e) => setFiltro('est', e.target.value)}>
              {ESTADOS.map((o) => <option key={o.v} value={o.v}>{o.t}</option>)}
            </select>
            <BotonLimpiar hay={hayFiltros} onClick={limpiar} />
          </div>
          <span className="mono small muted">{String(lista.length).padStart(2, '0')} RESULTADOS</span>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {th('codigo', 'Equipo')}
                {th('categoria', 'Cat.')}
                {th('destino', 'Destino')}
                {th('lectura', 'Lectura actual')}
                {th('proxima', 'Lectura programada')}
                {th('estado', 'Estado')}
                <th />
              </tr>
            </thead>
            <tbody>
              {lista.length ? (
                pag.items.map((e) => {
                  const u = unidad(e.unidad)
                  return (
                    <tr
                      key={e.id}
                      className={`row-${e.estado.color} row-link`}
                      tabIndex={0}
                      title="Ver ficha del equipo"
                      onClick={(ev) => !ev.target.closest('a, button') && navigate(`/equipos/${e.id}`)}
                      onKeyDown={(ev) => ev.key === 'Enter' && ev.target === ev.currentTarget && navigate(`/equipos/${e.id}`)}
                    >
                      <td>
                        <div className="cell-eq">
                          <span className="eq-ico"><IconoTipo tipo={e.tipo} size={20} /></span>
                          <div>
                            <span className="code">{e.codigo}</span> <b style={{ display: 'inline' }}>{e.nombre}</b>
                            <small style={{ display: 'block' }}>
                              {e.marca} {e.modelo}
                              {e.patente && e.patente !== '—' ? ' · ' + e.patente : ''}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td><span className="tag">{e.categoria}</span></td>
                      <td>
                        {e.destino}
                        <div className="small muted">{e.cliente}</div>
                      </td>
                      <td><Num valor={e.horometro} unidad={u} /></td>
                      <td><Num valor={e.estado.proxima} unidad={u} /></td>
                      <td><Status color={e.estado.color}>{e.estado.texto}</Status></td>
                      <td className="actions">
                        <Link className="btn btn-sm" to={`/equipos/${e.id}`} title="Ver ficha">
                          <Icon name="eye" size={15} />
                        </Link>
                        {puede('crudEquipos') && (
                          <>
                            <button type="button" className="btn btn-sm" title="Editar" onClick={() => setModal({ equipo: e })}>
                              <Icon name="edit" size={15} />
                            </button>
                            <button type="button" className="btn btn-sm btn-danger" title="Dar de baja" onClick={() => darDeBaja(e)}>
                              <Icon name="trash" size={15} />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7}>
                    <Empty icon="search" size={28}>No hay equipos que coincidan con los filtros.</Empty>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pager pag={pag} />
      </div>

      {modal && <ModalEquipo equipo={modal.equipo} onClose={() => setModal(null)} />}
    </>
  )
}
