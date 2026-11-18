import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { PanelMapa } from '../components/equipos/PanelMapa'
import { ModalLectura } from '../components/lecturas/ModalLectura'
import { ModalMantencion } from '../components/mantenciones/ModalMantencion'
import { TablaMantenciones } from '../components/mantenciones/TablaMantenciones'
import { BotonSync } from '../components/telemetria/Sincronizacion'
import { Button, Empty, Icon, IconoTipo, Num, Status } from '../components/ui'
import { COLOR_VAR, esGPS, fecha, fmt, fmtDec, signoRestante, unidad } from '../lib/formato'
import {
  catalogos, dispositivosApi, equiposApi, lecturasApi, mantencionesApi, telemetriaApi, useConsulta,
} from '../services'

/* Dígitos del horómetro tipo contador mecánico: ceros a la izquierda atenuados, último dígito en rojo */
function Odometro({ valor }) {
  const digitos = String(Math.max(0, Math.round(valor))).padStart(valor >= 100000 ? 6 : 5, '0').split('')
  let lead = true
  return digitos.map((d, i) => {
    if (d !== '0' || i === digitos.length - 1) lead = false
    const ultimo = i === digitos.length - 1
    return (
      <span key={i} className={`d ${lead ? 'dim' : ''} ${ultimo ? 'last' : ''}`}>
        {d}
      </span>
    )
  })
}

/* Ficha de equipo (vEquipo() del prototipo) */
export default function FichaEquipo() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const desdeTelemetria = params.get('desde') === 'telemetria'
  const { puede } = useAuth()
  const [registrar, setRegistrar] = useState(false)
  const [mantencion, setMantencion] = useState(false)

  const { datos: e, cargando } = useConsulta(() => equiposApi.getEquipo(id), [id])
  const { datos: categorias } = useConsulta(() => catalogos.getCategorias())
  const { datos: destinos } = useConsulta(() => catalogos.getDestinos())
  const { datos: dispositivos } = useConsulta(() => dispositivosApi.getDispositivos())
  const { datos: mants } = useConsulta(() => mantencionesApi.getMantenciones(id), [id])
  const { datos: lects } = useConsulta(() => lecturasApi.getLecturas(id), [id])
  const { datos: telemetria } = useConsulta(() => telemetriaApi.getTelemetria())

  if (cargando) return null
  if (!e) {
    return (
      <div className="panel empty">
        Equipo no encontrado. <Link to="/equipos">Volver</Link>
      </div>
    )
  }
  if (!categorias || !destinos || !dispositivos || !mants || !lects || !telemetria) return null

  const s = e.estado
  const u = unidad(e.unidad)
  const disp = dispositivos.find((d) => d.equipoId === e.id && d.estado !== 'baja')
  const tele = telemetria.find((x) => x.equipo.id === e.id)
  const destino = destinos.find((d) => d.nombre === e.destino)
  const categoria = categorias.find((c) => c.codigo === e.categoria)
  const pauta = s.pauta
  const peligro = s.color === 'rojo' || s.color === 'naranja'

  return (
    <>
      <div className="page-head">
        <div>
          <Link to={desdeTelemetria ? '/telemetria' : '/equipos'} className="eyebrow red" style={{ textDecoration: 'none' }}>
            <Icon name="arrowLeft" size={14} /> {desdeTelemetria ? 'Volver a telemetría' : 'Volver a equipos'}
          </Link>
          <h1>Ficha de equipo</h1>
        </div>
        <div className="head-actions">
          {puede('registrarLectura') && (
            <Button icon="gauge" onClick={() => setRegistrar(true)}>Registrar lectura</Button>
          )}
          {puede('registrarMantencion') && (
            <Button variant="primary" icon="wrench" onClick={() => setMantencion(true)}>Registrar mantención</Button>
          )}
          {puede('reportes') && (
            <Button as={Link} to={`/reportes/${e.id}`} icon="file">Reporte</Button>
          )}
          {tele && <BotonSync />}
        </div>
      </div>

      <div className="ficha">
        <div className="panel panel-pad corner">
          <div className="ficha-top">
            <div className="ficha-ico"><IconoTipo tipo={e.tipo} size={40} /></div>
            <div>
              <span className="code">{e.codigo}</span>&nbsp; <Status color={s.color} pulse={peligro}>{s.texto}</Status>
              <h2>{e.nombre}</h2>
              <div className="muted">{e.marca} {e.modelo} · {categoria?.nombre}</div>
            </div>
          </div>
          <div className="spec">
            <div><span>Destino</span><b>{e.destino}</b></div>
            <div><span>Tipo de destino</span><b>{destino?.tipo ?? '—'}</b></div>
            <div><span>Cliente actual</span><b>{e.cliente}</b></div>
            <div><span>Patente / serie</span><b className="mono">{e.patente || '—'}</b></div>
            {e.pluma && (
              <div>
                <span>Pluma montada</span>
                <b>{e.pluma.marca || e.pluma.modelo ? [e.pluma.marca, e.pluma.modelo].filter(Boolean).join(' ') : 'Sin datos de marca / modelo'}</b>
                <div className="small muted">Se controla junto al camión</div>
              </div>
            )}
            <div>
              <span>Intervalo</span>
              <b>cada {fmt(e.intervalo)} {u}</b>
              <div className="small muted">Programada: {fmt(s.proxima)} {u} (Preventiva {fmt(pauta)} {u})</div>
            </div>
            <div><span>Aviso anticipado</span><b>{fmt(e.aviso)} {u} antes</b></div>
            <div>
              <span>Ubicación GPS</span>
              <b className="mono">{e.lat != null ? `${e.lat.toFixed(2)}, ${e.lng.toFixed(2)}` : '—'}</b>
            </div>
            <div>
              <span>{esGPS(disp) ? 'Rastreador GPS' : 'Dispositivo IoT'}</span>
              <b>{disp ? <span className="mono">{disp.deviceId}</span> : 'Sin dispositivo'}</b>
              {disp && (
                <div style={{ marginTop: 3 }}>
                  <Status color={disp.estado === 'online' ? 'verde' : 'rojo'}>
                    {disp.estado === 'online' ? 'En línea' : 'Sin señal'}
                  </Status>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="panel panel-pad meter">
          <div className="eyebrow">
            <Icon name="gauge" size={14} /> {e.unidad === 'km' ? (esGPS(disp) ? 'Odómetro GPS' : 'Odómetro') : 'Horómetro'} actual
          </div>
          <div className="odo">
            <Odometro valor={e.horometro} />
            <span className="u">{u}</span>
          </div>
          {tele && (
            <div className="sub" style={{ marginBottom: 4 }}>
              Telemetría: <b className="mono" style={{ color: '#fff' }}>{fmtDec(tele.t.horas)} {u}</b> ·{' '}
              {tele.online ? (tele.t.enUso ? (tele.gps ? 'en movimiento' : 'motor encendido') : 'detenida') : 'sin señal'}
            </div>
          )}
          <div className="sub">
            Última lectura{' '}
            {lects[0]
              ? `${fecha(lects[0].fecha)} · ${lects[0].origen === 'manual' ? 'manual' : `automática (${lects[0].origen})`}`
              : '—'}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18 }} className="mono small">
            <span style={{ color: '#9a968f' }}>CICLO ACTUAL</span>
            <span>{fmt(s.usado)} / {fmt(e.intervalo)} {u}</span>
          </div>
          <div className="bar ticks">
            <span style={{ width: `${s.progreso}%`, background: COLOR_VAR[s.color] }} />
          </div>
          <div className="meter-grid">
            <div><span>Última mant.</span><b>{fmt(e.ultimaMantencion)}</b></div>
            <div><span>Programada</span><b>{fmt(s.proxima)}</b></div>
            <div><span>Restante</span><b className={s.restante <= 0 ? 'rojo' : ''}>{signoRestante(s.restante)}</b></div>
          </div>
        </div>
      </div>

      <PanelMapa equipo={e} destino={destino} tele={tele} />

      <div className="grid-eq" style={{ marginTop: 20 }}>
        <div className="panel">
          <div className="panel-head">
            <h2><Icon name="history" size={20} />Historial de mantenciones</h2>
            <span className="mono small muted">{String(mants.length).padStart(2, '0')} REGISTROS</span>
          </div>
          <TablaMantenciones lista={mants} equipos={[e]} />
        </div>
        <div className="panel">
          <div className="panel-head">
            <h2><Icon name="gauge" size={20} />Lecturas</h2>
            <span className="mono small muted">MANUAL + IoT</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Fecha</th><th>Valor</th><th>Origen</th><th>Registró</th></tr>
              </thead>
              <tbody>
                {lects.length ? (
                  lects.map((l) => (
                    <tr key={l.id}>
                      <td className="mono small">{fecha(l.fecha)}</td>
                      <td>
                        <Num valor={l.valor} unidad={u} />
                        {l.esCorreccion && (
                          <div className="small" style={{ color: 'var(--amber-text)' }}>
                            Corrección (antes {fmt(l.valorAnterior)}): {l.motivo}
                          </div>
                        )}
                      </td>
                      <td>
                        {l.origen === 'manual' ? (
                          <span className="src manual"><Icon name="user" size={12} />Manual</span>
                        ) : (
                          <span className="src esp"><Icon name={l.origen === 'GPS' ? 'pin' : 'antenna'} size={12} />{l.origen}</span>
                        )}
                      </td>
                      <td>{l.usuario}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={4}><Empty icon={null}>Sin lecturas registradas.</Empty></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {registrar && <ModalLectura equipoId={e.id} onClose={() => setRegistrar(false)} />}
      {mantencion && <ModalMantencion equipoId={e.id} onClose={() => setMantencion(false)} />}
    </>
  )
}
