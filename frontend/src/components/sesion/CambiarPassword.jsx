import { useState } from 'react'
import { auth } from '../../services'
import { Button, Callout, Modal, useToast } from '../ui'

// Política de contraseñas (la valida Django; aquí solo se informa)
const PASS_MIN = 12

/* Cambio de contraseña (botón del candado junto a "Cerrar sesión") */
export function CambiarPassword({ onClose }) {
  const toast = useToast()
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [repetir, setRepetir] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function guardar() {
    setGuardando(true)
    try {
      await auth.cambiarPassword(actual, nueva, repetir)
      onClose()
      toast('Contraseña actualizada')
    } catch (err) {
      setError(err.message)
      setGuardando(false)
    }
  }

  return (
    <Modal
      titulo="Cambiar contraseña"
      onClose={onClose}
      error={error}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" icon="check" onClick={guardar} disabled={guardando}>
            Guardar
          </Button>
        </>
      }
    >
      <Callout tipo="info" icon="lock">
        Mínimo <b>{PASS_MIN} caracteres</b> y al menos <b>un carácter especial</b> (ej: # $ % &amp; * !). Django la guarda solo como hash con sal.
      </Callout>
      <label htmlFor="cp-actual">Contraseña actual</label>
      <input id="cp-actual" type="password" autoComplete="current-password" value={actual} onChange={(e) => setActual(e.target.value)} />
      <label htmlFor="cp-nueva">Nueva contraseña</label>
      <input id="cp-nueva" type="password" autoComplete="new-password" value={nueva} onChange={(e) => setNueva(e.target.value)} />
      <label htmlFor="cp-repetir">Repetir nueva contraseña</label>
      <input id="cp-repetir" type="password" autoComplete="new-password" value={repetir} onChange={(e) => setRepetir(e.target.value)} />
    </Modal>
  )
}
