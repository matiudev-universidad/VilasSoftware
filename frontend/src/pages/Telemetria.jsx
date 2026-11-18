import { useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { CeldaEquipo } from '../components/equipos/CeldaEquipo'
import { BotonSync, useEstadoSync } from '../components/telemetria/Sincronizacion'
import {
  BotonLimpiar, Empty, Icon, PageHead, Pager, Segments, SelectOrden, Status, compararTexto, useFiltros, useOrden, usePaginacion,
} from '../components/ui'
import { compararCodigo, fecha, fmtDec, mmss, unidad } from '../lib/formato'
import { telemetriaApi, useConsulta } from '../services'

/* Estado de uso: '' (todos) | uso | detenido | sinsenal (también se elige con los cuadros) */
const FILTROS = {
  uso: { texto: 'En uso', ok: (x) => x.online && x.t.enUso },
  detenido: { texto: 'Detenidos', ok: (x) => x.online && !x.t.enUso },
  sinsenal: { texto: 'Sin señal', ok: (x) => !x.online },
}
const USO = (x) => (!x.online ? 2 : x.t.enUso ? 0 : 1)

const COMPARAR = {
  codigo: (a, b) => compararCodigo(a.equipo, b.equipo),
  destino: (a, b) => compararTexto(a.equipo.destino, b.equipo.destino),
  horas: (a, b) => a.t.horas - b.t.horas,
  uso: (a, b) => USO(a) - USO(b),
  dispositivo: (a, b) => compararTexto(a.disp?.deviceId ?? '~', b.disp?.deviceId ?? '~'),
  conexion: (a, b) => compararTexto(a.disp?.ultimaConexion ?? '', b.disp?.ultimaConexion ?? ''),
}

const VACIOS = { estado: '', q: '', dest: '', tipo: '' }

/* Telemetría y horómetros en faena (vTelemetria() del prototipo + filtros, orden y limpieza) */
export default function Telemetria() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const f = useFiltros('telemetria', VACIOS, { estado: params.get('filtro') })
  const o = useOrden('telemetria', COMPARAR, { col: 'codigo', asc: true })
  useEffect(() => {
    if (params.has('filtro')) navigate('/telemetria', { replace: true })
  }, [params, navigate])

  const { datos: todos } = useConsulta(() => telemetriaApi.getTelemetria())
  const s = useEstadoSync()

  const { estado, q, dest, tipo } = f.filtros
  const lista = o.aplicar(
    (todos || []).filter((x) => {
      const e = x.equipo
      const t = q.trim().toLowerCase()
      return (
        (!estado || FILTROS[estado].ok(x)) &&
        (!t || `${e.codigo} ${e.nombre} ${e.cliente} ${x.disp?.deviceId ?? ''}`.toLowerCase().includes(t)) &&
        (!dest || e.destino === dest) &&
        (!tipo || (tipo === 'gps' ? x.gps : tipo === 'esp32' ? x.disp && !x.gps : !x.disp))
      )
    }),
  )
  const pag = usePaginacion('telemetria', lista, JSON.stringify(f.filtros) + o.firma)

  if (!todos) return null

  const enUso = todos.filter(FILTROS.uso.ok).length
  const sinSenal = todos.filter(FILTROS.sinsenal.ok).length
  const destinos = [...new Set(todos.map((x) => x.equipo.destino))].sort(compararTexto)

  const kpi = (cls, ic, label, valor, sub, k) => (
    <button
      type="button"
      className={`kpi kpi-link ${cls} ${estado === k ? 'selected' : ''}`}
      onClick={() => f.set('estado', estado === k ? '' : k)}
      aria-pressed={estado === k}
      title={k ? 'Filtrar la tabla' : 'Mostrar todos'}
    >
      <div className="k-label">
        <Icon name={ic} size={14} />
        {label}
      </div>
      <div className="k-value">{String(valor).padStart(2, '0')}</div>
      <div className="k-sub">{sub}</div>
      <Segments valor={valor} total={todos.length} />
    </button>
  )

  return (
    <>
      <PageHead
        num="03 — Faenas y GPS"
        titulo="Telemetría y horómetros"
        desc="Equipos en destinos mineros (ESP32) y equipos sin horómetro con rastreador GPS, como camas bajas y ramplas, que informan encendido, ubicación y km recorridos. Se actualizan solos cada 5 minutos; la sincronización manual queda disponible de nuevo tras 2 minutos."
      >
        <BotonSync />
      </PageHead>

      <div className="kpis">
        {kpi('total', 'truck', 'Con telemetría', todos.length, 'faenas mineras + GPS', '')}
        {kpi('verde', 'play', 'En uso', enUso, 'encendidos / en movimiento', 'uso')}
        {kpi('amarillo', 'power', 'Detenidos', todos.length - enUso - sinSenal, 'con señal, sin uso', 'detenido')}
        {kpi('rojo', 'wifiOff', 'Sin señal', sinSenal, 'muestra el último valor', 'sinsenal')}
      </div>

      <div className="panel corner">
        <div className="panel-head">
          <h2>
            <Icon name="gauge" size={20} />
            Horómetros en faena
            {estado && (
              <span className="filter-pill">
                {FILTROS[estado].texto} · {lista.length}
                <button type="button" onClick={() => f.set('estado', '')} title="Quitar filtro" aria-label="Quitar filtro">
                  <Icon name="x" size={13} />
                </button>
              </span>
            )}
          </h2>
          <span className="mono small muted">
            ÚLTIMA SYNC {s?.ultima ? new Date(s.ultima).toLocaleTimeString('es-CL', { hour12: false }) : '—'} · PRÓXIMA AUTOMÁTICA EN{' '}
            <b>{s ? mmss(s.proximaAuto) : '—'}</b>
          </span>
        </div>
        <div className="panel-head">
          <div className="filters">
            <div className="input-icon">
              <span className="i"><Icon name="search" size={16} /></span>
              <input placeholder="Código, nombre, cliente o dispositivo…" value={q} onChange={(e) => f.set('q', e.target.value)} />
            </div>
            <select value={estado} onChange={(e) => f.set('estado', e.target.value)}>
              <option value="">Todos los estados</option>
              {Object.entries(FILTROS).map(([k, v]) => <option key={k} value={k}>{v.texto}</option>)}
            </select>
            <select value={dest} onChange={(e) => f.set('dest', e.target.value)}>
              <option value="">Todos los destinos</option>
              {destinos.map((d) => <option key={d}>{d}</option>)}
            </select>
            <select value={tipo} onChange={(e) => f.set('tipo', e.target.value)}>
              <option value="">Todos los dispositivos</option>
              <option value="esp32">ESP32 (horas de motor)</option>
              <option value="gps">GPS (km recorridos)</option>
              <option value="ninguno">Sin dispositivo</option>
            </select>
            <SelectOrden
              orden={o}
              opciones={[
                ['codigo', true, 'código A → Z'],
                ['horas', false, 'mayor horómetro'],
                ['horas', true, 'menor horómetro'],
                ['uso', true, 'en uso primero'],
                ['conexion', false, 'conexión más reciente'],
                ['destino', true, 'destino'],
              ]}
            />
            <BotonLimpiar hay={f.hay} onClick={f.limpiar} />
          </div>
          <span className="mono small muted">{String(lista.length).padStart(2, '0')} EQUIPOS</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {o.th('codigo', 'Equipo')}
                {o.th('destino', 'Destino')}
                {o.th('horas', 'Horómetro / km')}
                {o.th('uso', 'Uso')}
                {o.th('dispositivo', 'Dispositivo')}
                <th>Última ubicación</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lista.length ? (
                pag.items.map(({ equipo: e, t, disp, online }) => {
                  const u = unidad(e.unidad)
                  const abrir = () => navigate(`/equipos/${e.id}?desde=telemetria`)
                  return (
                    <tr
                      key={e.id}
                      className="row-link"
                      tabIndex={0}
                      title="Abrir ficha del equipo"
                      onClick={(ev) => !ev.target.closest('a, button') && abrir()}
                      onKeyDown={(ev) => ev.key === 'Enter' && ev.target === ev.currentTarget && abrir()}
                    >
                      <td><CeldaEquipo equipo={e} /></td>
                      <td>
                        {e.destino}
                        <div className="small muted">{e.cliente}</div>
                      </td>
                      <td>
                        <span className="num"><b>{fmtDec(t.horas)}</b></span>
                        <span className="unit">{u}</span>
                        {online && t.enUso && t.delta ? (
                          <div className="small" style={{ color: 'var(--green)' }}>
                            +{fmtDec(t.delta)} {u} desde la sync anterior
                          </div>
                        ) : null}
                      </td>
                      <td>
                        {!online ? (
                          <Status color="rojo">Sin señal</Status>
                        ) : t.enUso ? (
                          <Status color="verde" pulse>En uso</Status>
                        ) : (
                          <Status color="gris">Detenida</Status>
                        )}
                      </td>
                      <td>
                        {disp ? (
                          <>
                            <span className="mono small">{disp.deviceId}</span>
                            <div className="small muted">{disp.ultimaConexion ? fecha(disp.ultimaConexion) : '—'}</div>
                          </>
                        ) : (
                          <span className="muted">Sin dispositivo</span>
                        )}
                      </td>
                      <td className="mono small">{e.lat != null ? `${e.lat.toFixed(3)}, ${e.lng.toFixed(3)}` : '—'}</td>
                      <td className="actions">
                        <Link className="btn btn-sm" to={`/equipos/${e.id}?desde=telemetria`}>
                          <Icon name="eye" size={15} />
                          Abrir
                        </Link>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7}>
                    <Empty icon="truck" size={28}>{f.hay ? 'No hay equipos que coincidan con los filtros.' : 'No hay equipos con telemetría.'}</Empty>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pager pag={pag} />
      </div>
    </>
  )
}
