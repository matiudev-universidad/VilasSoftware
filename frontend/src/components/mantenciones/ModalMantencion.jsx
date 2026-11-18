import { useState } from 'react'
import { compararCodigo, fmt, unidad } from '../../lib/formato'
import { catalogos, equiposApi, mantencionesApi, useConsulta } from '../../services'
import { Button, Icon, Modal, Num, SelectorEquipo, Status, useToast } from '../ui'
import { ComboInsumos } from './ComboInsumos'

const hoy = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Opciones de pauta del equipo y la sugerida según el hito programado (ej: 3.250 h → Preventiva 250 h) */
function pautasDe(e) {
  const u = unidad(e.unidad)
  const pautas = e.unidad === 'km' ? [e.intervalo] : [250, 500, 1000, 2000]
  const sugerida = e.estado.pauta // pauta del hito programado, calculada en Django
  return {
    opciones: [...pautas.map((p) => `Preventiva ${fmt(p)} ${u}`), 'Correctiva'],
    sugerida: `Preventiva ${fmt(sugerida)} ${u}`,
    pauta: sugerida,
  }
}

/**
 * Registrar mantención (modalMantencion() del prototipo).
 * - Sugiere la pauta del hito programado y propone la lectura actual.
 * - Insumos con buscador y validación de stock (bodega Softland simulada, solo lectura).
 */
export function ModalMantencion({ equipoId, onClose }) {
  const toast = useToast()
  const { datos: equipos } = useConsulta(() => equiposApi.getEquipos())
  const { datos: categorias } = useConsulta(() => catalogos.getCategorias())
  const { datos: insumos } = useConsulta(() => catalogos.getInsumos())

  const [elegido, setElegido] = useState(equipoId ?? null)
  const [form, setForm] = useState({ fecha: hoy(), ot: '', tipo: null, valor: null, responsable: '' })
  const [insumo, setInsumo] = useState(null)
  const [cantidad, setCantidad] = useState('1')
  const [filas, setFilas] = useState([])
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  const cargado = equipos && categorias && insumos
  const primero = cargado
    ? categorias.flatMap((c) => equipos.filter((e) => e.categoria === c.codigo).sort(compararCodigo))[0]
    : null
  const idActual = elegido ?? primero?.id
  const eq = cargado ? equipos.find((e) => String(e.id) === String(idActual)) : null
  const p = eq ? pautasDe(eq) : null

  // Tipo y lectura siguen al equipo hasta que el usuario los cambie (como actualizarEq() del prototipo)
  const tipo = form.tipo ?? p?.sugerida ?? ''
  const valor = form.valor ?? (eq ? String(eq.horometro) : '')
  const insumoActual = insumo ?? insumos?.[0]?.codigo ?? ''

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  function cambiarEquipo(id) {
    setElegido(id)
    setForm((f) => ({ ...f, tipo: null, valor: null }))
  }

  function agregar() {
    const ins = insumos.find((x) => x.codigo === insumoActual)
    if (!ins) return setError('Selecciona un insumo de la lista.')
    const cant = Number(cantidad)
    if (!(cant > 0)) return setError('La cantidad debe ser mayor a 0.')
    setError('')
    setFilas((fs) => [...fs, { codigo: ins.codigo, nombre: ins.nombre, cantidad: cant, unidad: ins.unidad }])
  }

  async function guardar() {
    setError('')
    setGuardando(true)
    try {
      const m = await mantencionesApi.registrarMantencion({
        equipoId: eq.id,
        fecha: form.fecha,
        ot: form.ot.trim(),
        tipo,
        valor: valor === '' ? NaN : Number(valor),
        responsable: form.responsable.trim(),
        insumos: filas,
      })
      onClose()
      toast(`Mantención registrada (${m.ot}). El ciclo del equipo se reinicia.`)
    } catch (err) {
      setError(err.message)
      setGuardando(false)
    }
  }

  return (
    <Modal
      titulo="Registrar mantención"
      onClose={onClose}
      error={error}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" icon="check" onClick={guardar} disabled={!eq || guardando}>
            Guardar mantención
          </Button>
        </>
      }
    >
      {cargado && eq && (
        <>
          <div className="form-grid">
            <div className="full">
              <label htmlFor="mm-eq">Equipo *</label>
              <SelectorEquipo id="mm-eq" equipos={equipos} categorias={categorias} value={idActual} onChange={cambiarEquipo} />
            </div>
            <div>
              <label htmlFor="mm-fecha">Fecha *</label>
              <input id="mm-fecha" type="date" value={form.fecha} onChange={set('fecha')} />
            </div>
            <div>
              <label htmlFor="mm-ot">N° OT</label>
              <input id="mm-ot" placeholder="Opcional" value={form.ot} onChange={set('ot')} />
            </div>
            <div>
              <label htmlFor="mm-tipo">Tipo de mantención *</label>
              <select id="mm-tipo" value={tipo} onChange={set('tipo')}>
                {p.opciones.map((o) => <option key={o}>{o}</option>)}
              </select>
              <div className="mono small muted" style={{ marginTop: 6 }}>
                PROGRAMADA: {fmt(eq.estado.proxima)} {unidad(eq.unidad)} · PAUTA {fmt(p.pauta)} {unidad(eq.unidad)}
              </div>
            </div>
            <div>
              <label htmlFor="mm-valor">Lectura al momento *</label>
              <input id="mm-valor" type="number" min="0" value={valor} onChange={set('valor')} />
            </div>
            <div className="full">
              <label htmlFor="mm-resp">Responsable / taller</label>
              <input id="mm-resp" placeholder="Ej: Taller Iquique" value={form.responsable} onChange={set('responsable')} />
            </div>
          </div>

          <label>Insumos utilizados · stock de bodega (solo lectura)</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <ComboInsumos insumos={insumos} value={insumoActual} onChange={setInsumo} />
            <input type="number" min="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} style={{ width: 84 }} aria-label="Cantidad" />
            <button className="btn btn-dark" type="button" title="Agregar insumo" onClick={agregar}>
              <Icon name="plus" size={15} />
            </button>
          </div>
          <div style={{ marginTop: 10 }}>
            {filas.length ? (
              <table>
                <tbody>
                  {filas.map((f, i) => {
                    const ins = insumos.find((x) => x.codigo === f.codigo)
                    return (
                      <tr key={i}>
                        <td>{f.nombre}</td>
                        <td><Num valor={f.cantidad} unidad={f.unidad} /></td>
                        <td>
                          {f.cantidad > ins.stock
                            ? <Status color="rojo">Sin stock ({ins.stock})</Status>
                            : <Status color="verde">Disponible</Status>}
                        </td>
                        <td className="actions">
                          <button
                            className="btn btn-sm btn-danger"
                            type="button"
                            title="Quitar"
                            onClick={() => setFilas((fs) => fs.filter((_, n) => n !== i))}
                          >
                            <Icon name="x" size={14} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <div className="mono small muted">SIN INSUMOS AGREGADOS</div>
            )}
          </div>
        </>
      )}
    </Modal>
  )
}
