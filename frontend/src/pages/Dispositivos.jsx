import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import {
  BotonesSimulacion, ConsolaPaquete, ESTADOS_DISPOSITIVO, useAccionesDispositivo,
} from '../components/dispositivos/acciones'
import { ModalNuevoDispositivo, ModalVincular } from '../components/dispositivos/ModalesDispositivo'
import {
  BotonLimpiar, Button, Empty, Icon, PageHead, Pager, SelectOrden, Status, compararTexto, useFiltros, useOrden, usePaginacion,
} from '../components/ui'
import { esGPS, fecha, fmt, unidad } from '../lib/formato'
import { dispositivosApi, equiposApi, useConsulta } from '../services'

const ORDEN_ESTADO = { online: 0, offline: 1, 'sin vincular': 2, baja: 3 }
const VACIOS = { q: '', estado: '', tipo: '', cola: '', vinculo: '' }

/* Dispositivos IoT (vDispositivos() del prototipo + filtros, orden, limpieza y ficha propia) */
export default function Dispositivos() {
  const { puede } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const gest = puede('gestionarDispositivos')
  const acc = useAccionesDispositivo()
  const [modal, setModal] = useState(null) // { tipo: 'vincular'|'nuevo', disp }

  // Desde el panel: ?estado=online | ?estado=offline | ?cola=1
  const f = useFiltros('dispositivos', VACIOS, { estado: params.get('estado'), cola: params.get('cola') })
  useEffect(() => {
    if (params.has('estado') || params.has('cola')) navigate('/dispositivos', { replace: true })
  }, [params, navigate])

  const { datos: disp } = useConsulta(() => dispositivosApi.getDispositivos())
  const { datos: equipos } = useConsulta(() => equiposApi.getEquipos())

  const porId = new Map((equipos || []).map((e) => [e.id, e]))
  const equipoDe = (d) => (d.equipoId ? porId.get(d.equipoId) : null)

  const o = useOrden(
    'dispositivos',
    {
      id: (a, b) => compararTexto(a.deviceId, b.deviceId),
      equipo: (a, b) => compararTexto(equipoDe(a)?.codigo ?? '~', equipoDe(b)?.codigo ?? '~'),
      estado: (a, b) => ORDEN_ESTADO[a.estado] - ORDEN_ESTADO[b.estado],
      conexion: (a, b) => compararTexto(a.ultimaConexion ?? '', b.ultimaConexion ?? ''),
      cola: (a, b) => a.cola.length - b.cola.length,
    },
    { col: 'id', asc: true },
  )

  const { q, estado, tipo, cola, vinculo } = f.filtros
  const lista = o.aplicar(
    (disp || []).filter((d) => {
      const e = equipoDe(d)
      const t = q.trim().toLowerCase()
      return (
        (!t || `${d.deviceId} ${d.tipo} ${e?.codigo ?? ''} ${e?.nombre ?? ''}`.toLowerCase().includes(t)) &&
        (!estado || d.estado === estado) &&
        (!tipo || (tipo === 'gps') === esGPS(d)) &&
        (!cola || d.cola.length > 0) &&
        (!vinculo || (vinculo === 'si') === !!d.equipoId)
      )
    }),
  )
  const pag = usePaginacion('dispositivos', lista, JSON.stringify(f.filtros) + o.firma)

  if (!disp || !equipos) return null

  const abrir = (d) => navigate(`/dispositivos/${d.id}`)

  return (
    <>
      <PageHead
        num="06 — IoT"
        titulo="Dispositivos IoT"
        desc="Cada ESP32 mide las horas de motor encendido; los rastreadores GPS (camas bajas y ramplas) informan encendido, ubicación y km recorridos. Envían por HTTP y, sin señal, guardan las lecturas en cola y las despachan al reconectar."
      >
        {gest && (
          <Button variant="primary" icon="plus" onClick={() => setModal({ tipo: 'nuevo' })}>
            Registrar dispositivo
          </Button>
        )}
      </PageHead>

      <div className="panel">
        <div className="panel-head">
          <div className="filters">
            <div className="input-icon">
              <span className="i"><Icon name="search" size={16} /></span>
              <input placeholder="ID, tipo o equipo vinculado…" value={q} onChange={(e) => f.set('q', e.target.value)} />
            </div>
            <select value={estado} onChange={(e) => f.set('estado', e.target.value)}>
              <option value="">Todos los estados</option>
              {Object.entries(ESTADOS_DISPOSITIVO).map(([k, v]) => <option key={k} value={k}>{v.texto}</option>)}
            </select>
            <select value={tipo} onChange={(e) => f.set('tipo', e.target.value)}>
              <option value="">ESP32 y GPS</option>
              <option value="esp32">Solo ESP32</option>
              <option value="gps">Solo GPS</option>
            </select>
            <select value={vinculo} onChange={(e) => f.set('vinculo', e.target.value)}>
              <option value="">Vinculados o no</option>
              <option value="si">Con equipo</option>
              <option value="no">Sin equipo</option>
            </select>
            <select value={cola} onChange={(e) => f.set('cola', e.target.value)}>
              <option value="">Cola: todas</option>
              <option value="1">Con lecturas pendientes</option>
            </select>
            <SelectOrden
              orden={o}
              opciones={[
                ['id', true, 'ID A → Z'],
                ['estado', true, 'en línea primero'],
                ['conexion', false, 'conexión más reciente'],
                ['cola', false, 'más pendientes'],
                ['equipo', true, 'equipo'],
              ]}
            />
            <BotonLimpiar hay={f.hay} onClick={f.limpiar} />
          </div>
          <span className="mono small muted">{String(lista.length).padStart(2, '0')} DISPOSITIVOS</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {o.th('id', 'Dispositivo')}
                {o.th('equipo', 'Equipo vinculado')}
                {o.th('estado', 'Estado')}
                {o.th('conexion', 'Última conexión')}
                {o.th('cola', 'Cola')}
                <th>{gest ? 'Simulación / acciones' : ''}</th>
              </tr>
            </thead>
            <tbody>
              {lista.length ? (
                pag.items.map((d) => {
                  const e = equipoDe(d)
                  const activo = d.estado !== 'baja'
                  const st = ESTADOS_DISPOSITIVO[d.estado]
                  return (
                    <tr
                      key={d.id}
                      className="row-link"
                      style={activo ? undefined : { opacity: 0.5 }}
                      tabIndex={0}
                      title="Ver ficha del dispositivo"
                      onClick={(ev) => !ev.target.closest('a, button') && abrir(d)}
                      onKeyDown={(ev) => ev.key === 'Enter' && ev.target === ev.currentTarget && abrir(d)}
                    >
                      <td>
                        <div className="cell-eq" style={{ minWidth: 170 }}>
                          <span className="eq-ico"><Icon name={esGPS(d) ? 'pin' : 'cpu'} size={20} /></span>
                          <div>
                            <b className="mono">{d.deviceId}</b>
                            <small>{d.tipo}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        {e ? (
                          <>
                            <Link to={`/equipos/${e.id}`} style={{ color: 'inherit' }}>
                              <span className="code">{e.codigo}</span> {e.nombre}
                            </Link>
                            <div className="small muted">
                              <span className="num">{fmt(e.horometro)}</span>
                              <span className="unit">{unidad(e.unidad)}</span>
                            </div>
                          </>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td><Status color={st.color} pulse={st.pulse}>{st.texto}</Status></td>
                      <td className="mono small">{fecha(d.ultimaConexion)}</td>
                      <td>
                        {d.cola.length ? (
                          <span className="status amarillo">
                            <Icon name="database" size={14} />
                            {d.cola.length} pend.
                          </span>
                        ) : (
                          <span className="mono muted">0</span>
                        )}
                      </td>
                      <td className="actions" style={{ textAlign: 'left' }}>
                        {gest && activo && (
                          <>
                            <BotonesSimulacion d={d} acc={acc} />
                            <Button size="sm" icon="link" iconSize={14} aria-label="Vincular a un equipo" title="Vincular a un equipo" onClick={() => setModal({ tipo: 'vincular', disp: d })} />{' '}
                            <Button size="sm" variant="danger" icon="power" iconSize={14} aria-label="Dar de baja" title="Dar de baja" onClick={() => acc.baja(d)} />{' '}
                          </>
                        )}
                        <a
                          className="btn btn-sm"
                          href={`/dispositivos/${d.id}`}
                          target="_blank"
                          rel="noopener"
                          title="Abrir la ficha en una pestaña nueva"
                          aria-label="Abrir en pestaña nueva"
                        >
                          <Icon name="eye" size={14} />
                        </a>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6}>
                    <Empty icon="search" size={28}>No hay dispositivos que coincidan con los filtros.</Empty>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pager pag={pag} />
      </div>

      <ConsolaPaquete payload={acc.payload} />

      {modal?.tipo === 'vincular' && <ModalVincular dispositivo={modal.disp} dispositivos={disp} onClose={() => setModal(null)} />}
      {modal?.tipo === 'nuevo' && <ModalNuevoDispositivo dispositivos={disp} onClose={() => setModal(null)} />}
    </>
  )
}
