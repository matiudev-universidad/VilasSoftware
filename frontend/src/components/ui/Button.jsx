import { Icon } from './Icon'

/* Botón con las clases del prototipo.
   variant: primary | dark | ghost | danger (o vacío = botón claro por defecto)
   size: sm | lg ; block = ancho completo
   icon / iconRight: nombre de ícono a la izquierda / derecha del texto
   as: permite renderizarlo como otro elemento (ej. Link de react-router) */
export function Button({
  variant,
  size,
  block = false,
  icon,
  iconRight,
  iconSize,
  className = '',
  type = 'button',
  as: Tag = 'button',
  children,
  ...props
}) {
  const clases = [
    'btn',
    variant && `btn-${variant}`,
    size && `btn-${size}`,
    block && 'btn-block',
    className,
  ].filter(Boolean).join(' ')

  const extra = Tag === 'button' ? { type } : {}

  return (
    <Tag className={clases} {...extra} {...props}>
      {icon && <Icon name={icon} size={iconSize} />}
      {children}
      {iconRight && <Icon name={iconRight} size={iconSize} />}
    </Tag>
  )
}

/** Botón cuadrado solo con ícono (ej. cerrar sesión). Requiere label para accesibilidad. */
export function IconButton({ icon, label, className = '', ...props }) {
  return (
    <button type="button" className={`icon-btn ${className}`} title={label} aria-label={label} {...props}>
      <Icon name={icon} />
    </button>
  )
}
