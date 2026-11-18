import { useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { TablaMantenciones } from '../components/mantenciones/TablaMantenciones'
import {
  BotonLimpiar, Button, Callout, Empty, Icon, PageHead, Status, useFiltros,
} from '../components/ui'
import { compararCodigo, fmt, unidad } from '../lib/formato'
import { catalogos, equiposApi, mantencionesApi, useConsulta } from '../services'

const VACIOS = { q: '', cat: '', dest: '', est: '' }
const ESTADOS = [['verde', 'Operativo'], ['amarillo', 'Próximo'], ['naranja', 'Crítico'], ['rojo', 'Vencido']]

/* Reportes de mantenciones por equipo, imprimibles a PDF.
   Se eligen uno o varios equipos con buscador y filtros; cada equipo sale en su propia hoja.
   La selección vive en la URL (/reportes?ids=3,15,40) para poder compartirla o recargar. */
export default function Reportes() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const f = useFiltros('reportes', VACIOS)

  // /reportes/15 (botón "Reporte" de la ficha) → /reportes?ids=15
  useEffect(() => {
    if (id) navigate(`/reportes?ids=${id}`, { replace: true })
  }, [id, navigate])

  const { datos: equipos } = useConsulta(() => equiposApi.getEquipos({ incluirBajas: true }))
  const { datos: categorias } = useConsulta(() => catalogos.getCategorias())
  const { datos: destinos } = useConsulta(() => catalogos.getDestinos())
  const { datos: mants } = useConsulta(() => mantencionesApi.getMantenciones())

  if (!equipos || !categorias || !destinos || !mants) return null

  const ids = new Set((params.get('ids') || id || '').split(',').filter(Boolean).map(Number))
  const guardar = (nuevos) => {
    const lista = [...nuevos]
    setParams(lista.length ? { ids: lista.join(',') } : {}, { replace: true })
  }
  const alternar = (eqId) => {
    const s = new Set(ids)
    if (s.has(eqId)) s.delete(eqId)
    else s.add(eqId)
    guardar(s)
  }

  const { q, cat, dest, est } = f.filtros
  const filtrados = equipos
    .filter((e) => {
      const t = q.trim().toLowerCase()
      return (
        e.activo &&
        (!t || `${e.codigo} ${e.nombre} ${e.marca} ${e.modelo} ${e.patente} ${e.cliente}`.toLowerCase().includes(t)) &&
        (!cat || e.categoria === cat) &&
        (!dest || e.destino === dest) &&
        (!est || e.estado.color === est)
      )
    })
    .sort(compararCodigo)
  const seleccionados = equipos.filter((e) => ids.has(e.id)).sort(compararCodigo)
  const todosFiltradosElegidos = filtrados.length > 0 && filtrados.every((e) => ids.has(e.id))

  const mantsDe = (eqId) => mants.filter((m) => m.equipoId === eqId)

  return (
    <>
      <div className="no-print">
        <PageHead
          num="08 — Documentos"
          titulo="Reportes por equipo"
          desc="Busca y marca uno o varios equipos: cada uno sale en su propia hoja. «Exportar PDF» abre la impresión: elige «Guardar como PDF»."
        >
          {seleccionados.length > 0 && (
            <Button variant="primary" icon="download" onClick={() => window.print()}>
              Exportar PDF ({seleccionados.length})
            </Button>
          )}
        </PageHead>
      </div>

      <div className="panel no-print" style={{ marginBottom: 20 }}>
        <div className="panel-head">
          <div className="filters">
            <div className="input-icon">
              <span className="i"><Icon name="search" size={16} /></span>
              <input placeholder="Código, nombre, marca, patente, cliente…" value={q} onChange={(e) => f.set('q', e.target.value)} />
            </div>
            <select value={cat} onChange={(e) => f.set('cat', e.target.value)}>
              <option value="">Todas las categorías</option>
              {categorias.map((c) => <option key={c.codigo} value={c.codigo}>{c.codigo} · {c.nombre}</option>)}
            </select>
            <select value={dest} onChange={(e) => f.set('dest', e.target.value)}>
              <option value="">Todos los destinos</option>
              {destinos.map((d) => <option key={d.nombre} value={d.nombre}>{d.nombre}</option>)}
            </select>
            <select value={est} onChange={(e) => f.set('est', e.target.value)}>
              <option value="">Todos los estados</option>
              {ESTADOS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
            </select>
            <BotonLimpiar hay={f.hay} onClick={f.limpiar} />
          </div>
          <span className="mono small muted">{String(filtrados.length).padStart(2, '0')} EQUIPOS</span>
        </div>
        <div className="panel-pad" style={{ paddingTop: 0 }}>
          <div className="rep-lista">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input
                      type="checkbox"
                      aria-label="Marcar todos los filtrados"
                      title="Marcar / desmarcar todos los filtrados"
                      checked={todosFiltradosElegidos}
                      onChange={() => {
                        const s = new Set(ids)
                        filtrados.forEach((e) => (todosFiltradosElegidos ? s.delete(e.id) : s.add(e.id)))
                        guardar(s)
                      }}
                    />
                  </th>
                  <th>Equipo</th>
                  <th>Cat.</th>
                  <th>Destino</th>
                  <th>Mantenciones</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.length ? (
                  filtrados.map((e) => (
                    <tr key={e.id} onClick={() => alternar(e.id)} className={ids.has(e.id) ? 'row-amarillo' : ''}>
                      <td>
                        <input type="checkbox" checked={ids.has(e.id)} onChange={() => alternar(e.id)} onClick={(ev) => ev.stopPropagation()} aria-label={`Incluir ${e.codigo}`} />
                      </td>
                      <td><span className="code">{e.codigo}</span> {e.nombre}</td>
                      <td><span className="tag">{e.categoria}</span></td>
                      <td>{e.destino}</td>
                      <td className="mono small">{mantsDe(e.id).length}</td>
                      <td><Status color={e.estado.color}>{e.estado.texto}</Status></td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6}><Empty icon="search" size={28}>No hay equipos que coincidan con los filtros.</Empty></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="rep-barra">
            <span className="mono small grow">
              <b>{seleccionados.length}</b> EQUIPO(S) SELECCIONADO(S)
              {seleccionados.length > 0 && ` · ${seleccionados.map((e) => e.codigo).slice(0, 12).join(', ')}${seleccionados.length > 12 ? '…' : ''}`}
            </span>
            <Button size="sm" icon="x" iconSize={14} disabled={!seleccionados.length} onClick={() => guardar(new Set())}>
              Quitar selección
            </Button>
          </div>
        </div>
      </div>

      {seleccionados.length > 30 && (
        <div className="no-print" style={{ marginBottom: 20 }}>
          <Callout tipo="warn" icon="alert">
            Seleccionaste {seleccionados.length} equipos: el PDF tendrá {seleccionados.length} hojas y puede tardar en generarse.
          </Callout>
        </div>
      )}

      {seleccionados.length ? (
        seleccionados.map((e) => <Hoja key={e.id} equipo={e} mants={mantsDe(e.id)} equipos={equipos} usuario={usuario} />)
      ) : (
        <div className="panel no-print">
          <Empty icon="file">Marca uno o más equipos en la lista para ver su reporte.</Empty>
        </div>
      )}
    </>
  )
}

const generado = () => new Date().toLocaleString('es-CL')

function Hoja({ equipo: e, mants, equipos, usuario }) {
  const s = e.estado
  const u = unidad(e.unidad)
  return (
    <div className="sheet">
      <div className="sheet-head">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className="logo-mark sm">VM</div>
          <div>
            <div className="brand-name">Vila's Motor</div>
            <div className="mono small muted">REPORTE DE MANTENCIONES POR EQUIPO</div>
          </div>
        </div>
        <div className="mono small" style={{ textAlign: 'right' }}>
          GENERADO {generado()}
          <br />
          POR {usuario.nombre.toUpperCase()}
        </div>
      </div>
      <span className="code">{e.codigo}</span>
      <h2 style={{ marginTop: 8 }}>{e.nombre}{!e.activo && ' (dado de baja)'}</h2>
      <div className="spec">
        <div><span>Marca / modelo</span><b>{e.marca} {e.modelo}</b></div>
        <div><span>Destino</span><b>{e.destino}</b></div>
        <div><span>Cliente</span><b>{e.cliente}</b></div>
        <div><span>Patente / serie</span><b className="mono">{e.patente || '—'}</b></div>
        <div><span>Lectura actual</span><b className="mono">{fmt(e.horometro)} {u}</b></div>
        <div><span>Lectura programada</span><b className="mono">{fmt(s.proxima)} {u}</b></div>
        <div><span>Intervalo</span><b>cada {fmt(e.intervalo)} {u}</b></div>
        <div><span>Estado</span><Status color={s.color}>{s.texto}</Status></div>
      </div>
      <h3>Historial de mantenciones ({mants.length})</h3>
      <TablaMantenciones lista={mants} equipos={equipos} />
    </div>
  )
}
