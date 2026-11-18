import { useState } from 'react'
import { catalogos, dispositivosApi, equiposApi, useConsulta } from '../../services'
import { Button, Modal, SelectorEquipo, useToast } from '../ui'

/** Vincular un dispositivo a un equipo (modalVincular() del prototipo) */
export function ModalVincular({ dispositivo: d, dispositivos, onClose }) {
  const toast = useToast()
  const { datos: equipos } = useConsulta(() => equiposApi.getEquipos())
  const { datos: categorias } = useConsulta(() => catalogos.getCategorias())
  const [equipoId, setEquipoId] = useState(d.equipoId ?? '')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  // Equipos que ya tienen otro dispositivo activo
  const ocupados = new Set(
    dispositivos.filter((x) => x.equipoId && x.id !== d.id && x.estado !== 'baja').map((x) => x.equipoId),
  )
  const extra = (e) => (ocupados.has(e.id) ? { texto: ' (ya tiene dispositivo)', disabled: true } : {})

  async function guardar() {
    setGuardando(true)
    try {
      await dispositivosApi.vincularDispositivo(d.id, equipoId)
      onClose()
      toast('Vinculación actualizada')
    } catch (err) {
      setError(err.message)
      setGuardando(false)
    }
  }

  return (
    <Modal
      titulo={`Vincular ${d.deviceId}`}
      onClose={onClose}
      error={error}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" icon="link" onClick={guardar} disabled={guardando}>Guardar</Button>
        </>
      }
    >
      {equipos && categorias && (
        <>
          <label htmlFor="mv-eq">Equipo</label>
          <SelectorEquipo
            id="mv-eq"
            equipos={equipos}
            categorias={categorias}
            value={equipoId}
            onChange={setEquipoId}
            extra={extra}
            placeholder="— Sin equipo —"
          />
        </>
      )}
    </Modal>
  )
}

const TIPOS = ['ESP32 + módulo 4G', 'ESP32 WiFi (prototipo)', 'Rastreador GPS 4G', 'PLC industrial']

/** Registrar un dispositivo nuevo (modalNuevoDispositivo() del prototipo) */
export function ModalNuevoDispositivo({ dispositivos, onClose }) {
  const toast = useToast()
  // siguiente ID libre según el prefijo (ESP32-000 o GPS-000)
  const siguiente = (pref) =>
    `${pref}-${String(
      dispositivos
        .filter((d) => d.deviceId.startsWith(pref + '-'))
        .reduce((m, d) => Math.max(m, Number(d.deviceId.split('-')[1]) || 0), 0) + 1,
    ).padStart(3, '0')}`

  const [tipo, setTipo] = useState(TIPOS[0])
  const [deviceId, setDeviceId] = useState(() => siguiente('ESP32'))
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  function cambiarTipo(t) {
    setTipo(t)
    setDeviceId(siguiente(/GPS/.test(t) ? 'GPS' : 'ESP32'))
  }

  async function guardar() {
    setGuardando(true)
    try {
      await dispositivosApi.registrarDispositivo(deviceId.trim(), tipo)
      onClose()
      toast('Dispositivo registrado')
    } catch (err) {
      setError(err.message)
      setGuardando(false)
    }
  }

  return (
    <Modal
      titulo="Registrar dispositivo"
      onClose={onClose}
      error={error}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" icon="plus" onClick={guardar} disabled={guardando}>Registrar</Button>
        </>
      }
    >
      <label htmlFor="nd-tipo">Tipo</label>
      <select id="nd-tipo" value={tipo} onChange={(e) => cambiarTipo(e.target.value)}>
        {TIPOS.map((t) => <option key={t}>{t}</option>)}
      </select>
      <label htmlFor="nd-id">ID del dispositivo *</label>
      <input id="nd-id" value={deviceId} onChange={(e) => setDeviceId(e.target.value)} />
      <div className="mono small muted" style={{ marginTop: 6 }}>
        GPS: para equipos sin horómetro (camas bajas, ramplas). Informa encendido, ubicación y km.
      </div>
    </Modal>
  )
}
