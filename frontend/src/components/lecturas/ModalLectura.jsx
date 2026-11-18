import { useState } from 'react'
import { compararCodigo, fmt, unidad } from '../../lib/formato'
import { catalogos, equiposApi, lecturasApi, useConsulta } from '../../services'
import { Button, Callout, Modal, SelectorEquipo, useToast } from '../ui'

/**
 * Registrar lectura de horómetro / km (modalLectura() del prototipo).
 * - equipoId: equipo preseleccionado (desde la ficha). Sin él, se elige el primero de la lista.
 * - Si el valor es menor al último, exige motivo (corrección con trazabilidad).
 */
export function ModalLectura({ equipoId, onClose }) {
  const toast = useToast()
  const { datos: equipos } = useConsulta(() => equiposApi.getEquipos())
  const { datos: categorias } = useConsulta(() => catalogos.getCategorias())

  const [elegido, setElegido] = useState(equipoId ?? null)
  const [valor, setValor] = useState('')
  const [motivo, setMotivo] = useState('')
  const [pedirMotivo, setPedirMotivo] = useState(false)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  const cargado = equipos && categorias
  // Por defecto, el primer equipo de la primera categoría ordenado por código (como el <select> del prototipo)
  const primero = cargado
    ? categorias.flatMap((c) => equipos.filter((e) => e.categoria === c.codigo).sort(compararCodigo))[0]
    : null
  const idActual = elegido ?? primero?.id
  const eq = cargado ? equipos.find((e) => String(e.id) === String(idActual)) : null

  const esMenor = eq && valor !== '' && Number(valor) < eq.horometro
  const mostrarMotivo = esMenor || pedirMotivo

  async function guardar() {
    setError('')
    try {
      if (valor === '') throw new Error('Ingresa el valor de la lectura.')
      setGuardando(true)
      const r = await lecturasApi.registrarLectura(eq.id, valor, motivo.trim())
      if (r.requiereMotivo) {
        setPedirMotivo(true)
        throw new Error('Indica el motivo de la corrección.')
      }
      onClose()
      const verde = r.estado.color === 'verde'
      toast(verde ? 'Lectura registrada' : `Lectura registrada · ${r.estado.texto}`, verde ? 'ok' : 'err')
    } catch (err) {
      setError(err.message)
      setGuardando(false)
    }
  }

  return (
    <Modal
      titulo="Registrar lectura"
      onClose={onClose}
      error={error}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" icon="check" onClick={guardar} disabled={!eq || guardando}>
            Guardar lectura
          </Button>
        </>
      }
    >
      {cargado && (
        <>
          <label htmlFor="ml-eq">Equipo</label>
          <SelectorEquipo
            id="ml-eq"
            equipos={equipos}
            categorias={categorias}
            value={idActual}
            onChange={(id) => setElegido(id)}
            extra={(e) => ({ texto: ` (${fmt(e.horometro)} ${unidad(e.unidad)})` })}
          />
          <label htmlFor="ml-valor">Nueva lectura (horómetro / km)</label>
          <input id="ml-valor" type="number" min="0" placeholder="Ej: 3420" value={valor} onChange={(e) => setValor(e.target.value)} />
          {eq && (
            <div className="mono small muted" style={{ marginTop: 8 }}>
              ÚLTIMA: {fmt(eq.horometro)} {unidad(eq.unidad)} · PRÓXIMA MANTENCIÓN: {fmt(eq.estado.proxima)} {unidad(eq.unidad)}
            </div>
          )}
          {mostrarMotivo && (
            <div>
              <Callout tipo="warn" icon="alert">
                El valor es <b>menor</b> al último registrado. Solo se acepta como <b>corrección</b> con motivo, y queda en la auditoría.
              </Callout>
              <label htmlFor="ml-motivo">Motivo de la corrección *</label>
              <textarea
                id="ml-motivo"
                placeholder="Ej: horómetro reemplazado por falla, dato mal ingresado…"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              />
            </div>
          )}
        </>
      )}
    </Modal>
  )
}
