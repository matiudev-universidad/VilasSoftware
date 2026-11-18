import { useEffect, useRef, useState } from 'react'
import { EMAIL_RE } from '../../lib/formato'
import { Button, Icon, Modal } from '../ui'

/* Recuperar contraseña (simulado: no se envía ningún correo).
   Con Django se conectará al flujo de restablecimiento por correo. */
export function RecuperarPassword({ correoInicial = '', onClose }) {
  const [correo, setCorreo] = useState(correoInicial)
  const [error, setError] = useState('')
  const [invalido, setInvalido] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const temporizador = useRef(null)

  useEffect(() => () => clearTimeout(temporizador.current), [])

  function enviar() {
    const c = correo.trim()
    if (!c) {
      setInvalido(true)
      return setError('Ingresa tu correo.')
    }
    if (!EMAIL_RE.test(c)) {
      setInvalido(true)
      return setError('El formato del correo no es válido (ej: usuario@vilasmotors.cl).')
    }
    setEnviando(true)
    temporizador.current = setTimeout(() => setEnviado(true), 1100)
  }

  if (enviado) {
    return (
      <Modal
        small
        titulo="Recuperar contraseña"
        onClose={onClose}
        footer={
          <Button variant="primary" block icon="arrowLeft" onClick={onClose}>
            Volver al inicio de sesión
          </Button>
        }
      >
        <div className="mail-sent">
          <svg className="check-anim" viewBox="0 0 52 52" aria-hidden="true">
            <circle cx="26" cy="26" r="24" />
            <path d="M15 27l7 7 15-15" />
          </svg>
          <h3>Correo enviado</h3>
          <p>
            Si <b>{correo.trim()}</b> está registrado, recibirás un enlace para restablecer tu contraseña en los próximos minutos.
          </p>
          <p className="muted">Revisa también tu carpeta de spam.</p>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      small
      titulo="Recuperar contraseña"
      onClose={onClose}
      error={error}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={enviar} disabled={enviando}>
            {enviando ? (
              <>
                <span className="spinner" />
                Enviando…
              </>
            ) : (
              <>
                <Icon name="send" />
                Restablecer
              </>
            )}
          </Button>
        </>
      }
    >
      <p className="muted">
        Ingresa el correo asociado a tu cuenta y te enviaremos un enlace para restablecer tu contraseña.
      </p>
      <label htmlFor="fp-email">Correo</label>
      <div className="input-icon">
        <span className="i"><Icon name="mail" /></span>
        <input
          id="fp-email"
          type="email"
          placeholder="usuario@vilasmotors.cl"
          autoComplete="email"
          className={invalido ? 'invalid' : ''}
          value={correo}
          onChange={(e) => {
            setCorreo(e.target.value)
            setInvalido(false)
            setError('')
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              enviar()
            }
          }}
        />
      </div>
    </Modal>
  )
}
