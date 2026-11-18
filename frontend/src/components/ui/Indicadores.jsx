/* Piezas visuales pequeñas del panel: LED de estado, segmentos, lecturas numéricas,
   avisos, estado vacío y cabecera de página. Mismas clases que el prototipo. */
import { fmt } from '../../lib/formato'
import { Icon } from './Icon'

/** LED + texto. color: verde | amarillo | naranja | rojo | gris | azul. pulse = LED latiendo */
export function Status({ color, children, pulse = false, className = '' }) {
  return (
    <span className={`status ${color} ${pulse ? 'pulse' : ''} ${className}`}>
      <i className="led" />
      {children}
    </span>
  )
}

/** Barra de 20 segmentos: enciende valor/total. El color lo hereda del contenedor (currentColor). */
export function Segments({ valor, total }) {
  const on = total ? Math.round((valor / total) * 20) : 0
  return (
    <div className="segments">
      {Array.from({ length: 20 }, (_, i) => (
        <i key={i} className={i < on ? 'on' : ''} />
      ))}
    </div>
  )
}

/** Lectura numérica con unidad: <Num valor={3157} unidad="h" /> */
export function Num({ valor, unidad }) {
  return (
    <>
      <span className="num">{fmt(valor)}</span>
      {unidad && <span className="unit">{unidad}</span>}
    </>
  )
}

/** Aviso con borde lateral. tipo: warn | err | info */
export function Callout({ tipo = 'info', icon = 'alert', children }) {
  return (
    <div className={`callout ${tipo}`}>
      <Icon name={icon} size={18} />
      <div>{children}</div>
    </div>
  )
}

/** Estado vacío de tablas y paneles. icon={null} = sin ícono */
export function Empty({ icon = 'checkCircle', size = 32, children }) {
  return (
    <div className="empty">
      {icon && <Icon name={icon} size={size} />}
      {children}
    </div>
  )
}

/** Cabecera de cada vista: número de sección en rojo, título, descripción y acciones a la derecha */
export function PageHead({ num, titulo, desc, children }) {
  return (
    <div className="page-head">
      <div>
        <div className="eyebrow red">{num}</div>
        <h1>{titulo}</h1>
        {desc && <p>{desc}</p>}
      </div>
      {children && <div className="head-actions">{children}</div>}
    </div>
  )
}
