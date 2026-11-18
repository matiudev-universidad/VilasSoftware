import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import {
  BotonesSimulacion, ConsolaPaquete, ESTADOS_DISPOSITIVO, useAccionesDispositivo,
} from '../components/dispositivos/acciones'
import { ModalVincular } from '../components/dispositivos/ModalesDispositivo'
import { Button, Callout, Empty, Icon, Num, PageHead, Pager, Status, usePaginacion } from '../components/ui'
import { esGPS, fecha, fmt, unidad } from '../lib/formato'
import { dispositivosApi, useConsulta } from '../services'

/* Ficha de un dispositivo ESP32 / GPS: datos, equipo, cola, lecturas enviadas e incidencias.
   Se puede abrir en una pestaña aparte desde la lista de dispositivos. */
export default function FichaDispositivo() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { puede } = useAuth()
  const gest = puede('gestionarDispositivos')
  const acc = useAccionesDispositivo()
  const [vincular, setVincular] = useState(false)

  const { datos: d } = useConsulta(() => dispositivosApi.getDispositivo(id), [id])
  const { datos: todos } = useConsulta(() => dispositivosApi.getDispositivos())
  const pag = usePaginacion(`dispositivo:${id}`, d?.lecturas ?? [])

  if (d === undefined || !todos) return null
  if (!d) {
    return (
      <Empty icon="alert">
        Dispositivo no encontrado. <Link to="/dispositivos">Volver</Link>
      </Empty>
    )
  }

  const e = d.equipo
  const u = e ? unidad(e.unidad) : 'h'
  const st = ESTADOS_DISPOSITIVO[d.estado]
  const gps = esGPS(d)

  return (
    <>
      <PageHead
        num="06 — IoT · Ficha de dispositivo"
        titulo={d.deviceId}
        desc={`${d.tipo} · ${gps ? 'informa encendido, ubicación y km recorridos' : 'mide las horas de motor encendido'}.`}
      >
        {gest && d.estado !== 'baja' && (
          <Button icon="link" onClick={() => setVincular(true)}>Vincular</Button>
        )}
        {gest && d.estado !== 'baja' && (
          <Button variant="danger" icon="power" onClick={async () => (await acc.baja(d)) && navigate('/dispositivos')}>
            Dar de baja
          </Button>
        )}
      </PageHead>

      <div className="grid-main">
        <div className="panel panel-pad">
          <h2 className="panel-title">
            <Icon name={gps ? 'pin' : 'cpu'} size={20} />
            Datos del dispositivo
          </h2>
          <div className="spec spec-2">
            <div><span>ID</span><b className="mono">{d.deviceId}</b></div>
            <div><span>Tipo</span><b>{d.tipo}</b></div>
            <div><span>Estado</span><Status color={st.color} pulse={st.pulse}>{st.texto}</Status></div>
            <div><span>Última conexión</span><b className="mono">{fecha(d.ultimaConexion)}</b></div>
            <div><span>Lecturas enviadas</span><b className="mono">{fmt(d.totalLecturas)}</b></div>
            <div><span>Incidencias</span><b className="mono">{fmt(d.incidencias.length)}</b></div>
          </div>
          {gest && (
            <div className="disp-acciones">
              <BotonesSimulacion d={d} acc={acc} />
            </div>
          )}
        </div>

        <div className="stack">
          <div className="panel panel-pad">
            <h2 className="panel-title">
              <Icon name="truck" size={20} />
              Equipo vinculado
            </h2>
            {e ? (
              <>
                <Link to={`/equipos/${e.id}`} style={{ color: 'inherit' }}>
                  <span className="code">{e.codigo}</span> <b>{e.nombre}</b>
                </Link>
                <div className="spec spec-2" style={{ marginTop: 12 }}>
                  <div><span>Destino</span><b>{e.destino}</b></div>
                  <div><span>Cliente</span><b>{e.cliente || '—'}</b></div>
                  <div><span>Lectura actual</span><b className="mono">{fmt(e.horometro)} {u}</b></div>
                  <div><span>Estado</span><Status color={e.estado.color}>{e.estado.texto}</Status></div>
                </div>
              </>
            ) : (
              <span className="muted">Sin equipo vinculado.</span>
            )}
          </div>

          <div className="panel panel-pad">
            <h2 className="panel-title">
              <Icon name="database" size={20} />
              Cola sin señal
            </h2>
            {d.cola.length ? (
              <>
                <Callout tipo="warn" icon="wifiOff">
                  {d.cola.length} lectura(s) guardadas en el dispositivo. Se envían al reconectar.
                </Callout>
                <table>
                  <tbody>
                    {d.cola.map((c, i) => (
                      <tr key={i}>
                        <td className="mono small">{fecha(c.fecha)}</td>
                        <td><Num valor={c.valor} unidad={u} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <span className="mono small muted">SIN LECTURAS PENDIENTES</span>
            )}
          </div>
        </div>
      </div>

      {d.incidencias.length > 0 && (
        <div className="panel" style={{ marginTop: 20 }}>
          <div className="panel-head">
            <h2><Icon name="alert" size={20} />Lecturas inconsistentes</h2>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Fecha</th><th>Informó</th><th>Último valor</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {d.incidencias.map((i) => (
                  <tr key={i.id} className={i.resuelta ? '' : 'row-rojo'}>
                    <td className="mono small">{fecha(i.fecha)}</td>
                    <td><Num valor={i.valor} unidad={u} /></td>
                    <td><Num valor={i.anterior} unidad={u} /></td>
                    <td>{i.resuelta ? <Status color="gris">Revisada</Status> : <Status color="rojo" pulse>Pendiente</Status>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="panel" style={{ marginTop: 20 }}>
        <div className="panel-head">
          <h2><Icon name="gauge" size={20} />Lecturas enviadas</h2>
          <span className="mono small muted">
            {d.totalLecturas > d.lecturas.length ? `ÚLTIMAS ${d.lecturas.length} DE ${fmt(d.totalLecturas)}` : `${String(d.lecturas.length).padStart(2, '0')} LECTURAS`}
          </span>
        </div>
        {d.lecturas.length ? (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Fecha</th><th>Equipo</th><th>Valor</th><th>Origen</th></tr>
                </thead>
                <tbody>
                  {pag.items.map((l) => (
                    <tr key={l.id}>
                      <td className="mono small">{fecha(l.fecha)}</td>
                      <td className="mono small">{l.equipoId === e?.id ? e.codigo : `#${l.equipoId}`}</td>
                      <td><Num valor={l.valor} unidad={u} /></td>
                      <td><span className="tag">{l.origen}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager pag={pag} />
          </>
        ) : (
          <Empty icon="gauge" size={28}>Este dispositivo todavía no ha enviado lecturas.</Empty>
        )}
      </div>

      {gest && <ConsolaPaquete payload={acc.payload} />}

      {vincular && <ModalVincular dispositivo={d} dispositivos={todos} onClose={() => setVincular(false)} />}
    </>
  )
}
