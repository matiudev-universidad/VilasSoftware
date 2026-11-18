import { useState } from 'react'
import { alertasApi, lecturasApi } from '../../services'
import { Button, Callout, Modal, useToast } from '../ui'

/** Marcar una alerta "en gestión" (modalGestion() del prototipo) */
export function ModalGestion({ equipo, onClose }) {
  const toast = useToast()
  const [nota, setNota] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function guardar() {
    setGuardando(true)
    try {
      await alertasApi.marcarEnGestion(equipo.id, nota.trim())
      onClose()
      toast('Alerta marcada en gestión')
    } catch (err) {
      setError(err.message)
      setGuardando(false)
    }
  }

  if (!equipo) return null
  return (
    <Modal
      titulo={`Alerta en gestión · ${equipo.codigo}`}
      onClose={onClose}
      error={error}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" icon="check" onClick={guardar} disabled={guardando}>Marcar en gestión</Button>
        </>
      }
    >
      <p className="muted">Indica que ya se coordinó con bodega o taller. La alerta sigue visible hasta registrar la mantención.</p>
      <label htmlFor="mg-nota">Nota (opcional)</label>
      <textarea
        id="mg-nota"
        placeholder="Ej: insumos confirmados, taller agendado para el jueves"
        value={nota}
        onChange={(e) => setNota(e.target.value)}
      />
    </Modal>
  )
}

/** Revisar una lectura inconsistente informada por un dispositivo (modalIncidencia() del prototipo) */
export function ModalIncidencia({ id, onClose }) {
  const toast = useToast()
  const [nota, setNota] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function guardar() {
    setGuardando(true)
    try {
      await lecturasApi.resolverIncidencia(id, nota.trim())
      onClose()
      toast('Incidencia revisada')
    } catch (err) {
      setError(err.message)
      setGuardando(false)
    }
  }

  return (
    <Modal
      titulo="Lectura inconsistente"
      onClose={onClose}
      error={error}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" icon="check" onClick={guardar} disabled={guardando}>Marcar como revisada</Button>
        </>
      }
    >
      <Callout tipo="err" icon="alert">
        El dispositivo informó menos horas que la última lectura. Puede ser un reinicio o falla del horómetro: coordina el cambio con el
        cliente. El horómetro del sistema <b>no</b> se modificó.
      </Callout>
      <label htmlFor="mi-nota">Nota de revisión</label>
      <textarea
        id="mi-nota"
        placeholder="Ej: horómetro reemplazado; se registrará corrección manual"
        value={nota}
        onChange={(e) => setNota(e.target.value)}
      />
    </Modal>
  )
}
