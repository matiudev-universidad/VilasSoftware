import { fecha } from '../../lib/formato'
import { Icon } from '../ui'

/* Última ubicación del equipo en un mapa de OpenStreetMap (panelMapa() del prototipo).
   tele: fila de telemetría del equipo (si tiene), para saber de dónde viene la ubicación. */
export function PanelMapa({ equipo: e, destino, tele }) {
  if (e.lat == null) return null

  const d = 0.03
  const bbox = [e.lng - d, e.lat - d, e.lng + d, e.lat + d].join(',')
  const fuente = !tele
    ? 'Coordenadas del destino'
    : tele.online
      ? 'GPS del ' + tele.disp.deviceId
      : tele.disp
        ? 'Último GPS conocido (' + tele.disp.deviceId + ' sin señal)'
        : 'Coordenadas del destino (sin dispositivo)'
  const registrada = e.ultimaUbicacion || tele?.disp?.ultimaConexion

  return (
    <div className="panel" style={{ marginTop: 20 }}>
      <div className="panel-head">
        <h2>
          <Icon name="pin" size={20} />
          Última ubicación
        </h2>
        <span className="mono small muted">
          {e.destino.toUpperCase()} · {(destino?.tipo || '—').toUpperCase()}
        </span>
      </div>
      <div className="mapa-grid">
        <div className="mapa">
          <div className="mapa-off">
            <Icon name="pin" size={28} />
            <span>El mapa necesita conexión a internet.</span>
          </div>
          <iframe
            title={`Mapa de ${e.codigo}`}
            loading="lazy"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${e.lat},${e.lng}`}
          />
        </div>
        <div className="mapa-info">
          <div><span>Coordenadas</span><b className="mono">{e.lat.toFixed(4)}, {e.lng.toFixed(4)}</b></div>
          <div><span>Registrada</span><b className="mono">{registrada ? fecha(registrada) : '—'}</b></div>
          <div><span>Fuente</span><b>{fuente}</b></div>
          <a className="btn btn-sm" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps?q=${e.lat},${e.lng}`}>
            <Icon name="arrowRight" size={15} />
            Abrir en Google Maps
          </a>
        </div>
      </div>
    </div>
  )
}
