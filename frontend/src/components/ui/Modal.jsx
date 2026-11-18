import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'

/**
 * Ventana modal con el mismo marcado que el prototipo.
 * <Modal titulo="Registrar horómetro" onClose={cerrar} error={error} footer={<>botones</>}>
 *   ...campos...
 * </Modal>
 * - Se cierra con la X, clic en el fondo o Escape (mejora: el prototipo no tenía Escape).
 * - Enfoca el primer campo al abrir.
 * - small = versión angosta (.modal-sm).
 */
export function Modal({ titulo, onClose, footer, error, small = false, children }) {
  const ref = useRef(null)
  const enfocado = useRef(false)

  // Enfoca el primer campo una sola vez; si el contenido carga después (datos async), lo hace al aparecer
  useEffect(() => {
    if (enfocado.current) return
    const primero = ref.current?.querySelector(
      'input:not([type=hidden]):not(:disabled), select, textarea',
    )
    if (primero) {
      primero.focus()
      enfocado.current = true
    }
  })

  useEffect(() => {
    const alTeclear = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', alTeclear)
    return () => document.removeEventListener('keydown', alTeclear)
  }, [onClose])

  return createPortal(
    <div
      className="modal-bg"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className={`modal ${small ? 'modal-sm' : ''}`} role="dialog" aria-modal="true" ref={ref}>
        <div className="modal-head">
          <h2>{titulo}</h2>
          <button type="button" className="close-x" aria-label="Cerrar" onClick={onClose}>
            <Icon name="x" size={22} />
          </button>
        </div>
        <div className="modal-body">
          {children}
          <div className="form-error">{error}</div>
        </div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
