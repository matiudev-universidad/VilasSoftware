import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { auth } from '../../services'
import { Button, Icon, Modal } from '../ui'

const DIGITOS = 6
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

/**
 * Paso 2 del inicio de sesión: código de 6 dígitos enviado al correo.
 * SIMULACIÓN: no hay servicio de correo, así que el correo que llegaría se muestra
 * dentro de la ventana (el código es aleatorio y cambia en cada intento o reenvío).
 *
 * desafio: { correo, codigoSimulado, venceEn, reenviarEn } (respuesta del paso 1)
 * onListo(usuario) · onCancelar(mensajeOpcional)
 */
export function VerificarCodigo({ desafio: inicial, onListo, onCancelar }) {
  const { verificar } = useAuth()
  const [desafio, setDesafio] = useState(inicial)
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [desde, setDesde] = useState(() => Date.now())
  const [ahora, setAhora] = useState(() => Date.now())

  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const pasados = Math.floor((ahora - desde) / 1000)
  const vence = Math.max(0, desafio.venceEn - pasados)
  const reenviarEn = Math.max(0, desafio.reenviarEn - pasados)

  // Se cancela de verdad en el servidor: el código pendiente deja de servir
  const cancelar = (mensaje) => {
    auth.logout().catch(() => {})
    onCancelar(mensaje)
  }

  async function enviar(valor = codigo) {
    if (valor.length !== DIGITOS) return setError(`Ingresa los ${DIGITOS} dígitos del código.`)
    setEnviando(true)
    try {
      onListo(await verificar(valor))
    } catch (err) {
      if (err.status === 409) return onCancelar(err.message) // código anulado: volver a la contraseña
      setError(err.message)
      setCodigo('')
      setEnviando(false)
    }
  }

  async function reenviar() {
    try {
      const nuevo = await auth.reenviarCodigo()
      setDesafio(nuevo)
      setDesde(Date.now())
      setAhora(Date.now())
      setCodigo('')
      setError('')
    } catch (err) {
      if (err.status === 409) return onCancelar(err.message)
      setError(err.message)
    }
  }

  return (
    <Modal
      small
      titulo="Verificación en dos pasos"
      onClose={() => cancelar()}
      error={error}
      footer={
        <>
          <Button onClick={() => cancelar()}>Cancelar</Button>
          <Button variant="primary" onClick={() => enviar()} disabled={enviando || vence === 0}>
            {enviando ? <><span className="spinner" />Verificando…</> : <><Icon name="check" />Verificar</>}
          </Button>
        </>
      }
    >
      <p className="muted">
        Enviamos un código de {DIGITOS} dígitos a <b>{desafio.correo}</b>. Ingrésalo para terminar de iniciar sesión.
      </p>

      <div className="correo-simulado" aria-live="polite">
        <div className="cs-head">
          <Icon name="mail" size={16} />
          <span>Correo simulado</span>
          <span className="cs-tag mono">SIN SERVICIO DE EMAIL</span>
        </div>
        <div className="cs-meta mono">
          <div><span>De:</span> no-responder@vilasmotors.cl</div>
          <div><span>Para:</span> {desafio.correo}</div>
          <div><span>Asunto:</span> Código de verificación</div>
        </div>
        <p className="cs-texto">Tu código para iniciar sesión es:</p>
        <div className="cs-codigo mono">{desafio.codigoSimulado}</div>
        <p className="cs-nota">Este recuadro reemplaza al correo que llegaría a tu bandeja de entrada.</p>
      </div>

      <label htmlFor="codigo-2fa">Código de verificación</label>
      <input
        id="codigo-2fa"
        className="input-codigo mono"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={DIGITOS}
        placeholder="••••••"
        value={codigo}
        disabled={enviando || vence === 0}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, '').slice(0, DIGITOS)
          setCodigo(v)
          setError('')
          if (v.length === DIGITOS) enviar(v) // al completar los 6 dígitos se verifica solo
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            enviar()
          }
        }}
      />

      <div className="codigo-pie small">
        <span className={vence === 0 ? 'txt-rojo' : 'muted'}>
          <Icon name="clock" size={14} /> {vence > 0 ? `Vence en ${mmss(vence)}` : 'El código venció'}
        </span>
        <button type="button" className="link-btn" onClick={reenviar} disabled={reenviarEn > 0}>
          {reenviarEn > 0 ? `Reenviar código (${reenviarEn} s)` : 'Reenviar código'}
        </button>
      </div>
    </Modal>
  )
}
