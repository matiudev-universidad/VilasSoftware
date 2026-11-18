import { IconoTipo } from '../ui'

/* Celda de tabla con ícono del tipo, código, nombre, cliente y destino (celdaEquipo() del prototipo) */
export function CeldaEquipo({ equipo: e }) {
  return (
    <div className="cell-eq">
      <span className="eq-ico">
        <IconoTipo tipo={e.tipo} size={20} />
      </span>
      <div>
        <span className="code">{e.codigo}</span> <b style={{ display: 'inline' }}>{e.nombre}</b>
        <small style={{ display: 'block' }}>
          {e.cliente} · {e.destino}
        </small>
      </div>
    </div>
  )
}
