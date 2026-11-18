import { useState } from 'react'
import { catalogos, equiposApi, useConsulta } from '../../services'
import { Button, Callout, Modal, TIPOS_EQUIPO, useToast } from '../ui'

const VACIO = {
  codigo: '', nombre: '', tipo: 'Grúa horquilla', categoria: 'VR', marca: '', modelo: '', patente: '',
  destino: 'Base Iquique', cliente: '', horometro: 0, unidad: 'h', intervalo: 250, ultimaMantencion: 0,
}
const NUMERICOS = ['horometro', 'intervalo', 'ultimaMantencion']
// Al editar, la lectura y la última mantención no se tocan (solo cambian con registros, por trazabilidad)
const BLOQUEADOS_AL_EDITAR = ['horometro', 'ultimaMantencion']

/**
 * Alta / edición de equipo (formEquipo() + modalEquipo() del prototipo).
 * equipo: el equipo a editar; sin él, es un alta.
 */
export function ModalEquipo({ equipo, onClose }) {
  const toast = useToast()
  const { datos: categorias } = useConsulta(() => catalogos.getCategorias())
  const { datos: destinos } = useConsulta(() => catalogos.getDestinos())
  const editando = !!equipo
  const [form, setForm] = useState(() => {
    const base = equipo || VACIO
    return Object.fromEntries(Object.keys(VACIO).map((k) => [k, base[k] ?? VACIO[k]]))
  })
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  const campo = (k) => ({
    name: k,
    value: form[k],
    onChange: (e) => setForm((f) => ({ ...f, [k]: e.target.value })),
  })

  // Igual que leerForm(): números convertidos, textos sin espacios y sin los campos bloqueados
  function leerForm() {
    const d = {}
    for (const [k, v] of Object.entries(form)) {
      if (editando && BLOQUEADOS_AL_EDITAR.includes(k)) continue
      d[k] = NUMERICOS.includes(k) ? Number(v) : String(v).trim()
    }
    return d
  }

  async function guardar() {
    setError('')
    setGuardando(true)
    try {
      if (editando) {
        await equiposApi.editarEquipo(equipo.id, leerForm())
        toast('Equipo actualizado')
      } else {
        const n = await equiposApi.crearEquipo(leerForm())
        toast(`Equipo ${n.codigo} creado`)
      }
      onClose()
    } catch (err) {
      setError(err.message)
      setGuardando(false)
    }
  }

  return (
    <Modal
      titulo={editando ? `Editar ${equipo.codigo}` : 'Nuevo equipo'}
      onClose={onClose}
      error={error}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" icon="check" onClick={guardar} disabled={guardando}>
            {editando ? 'Guardar cambios' : 'Crear equipo'}
          </Button>
        </>
      }
    >
      {categorias && destinos && (
        <>
          <div className="form-grid">
            <div>
              <label htmlFor="me-codigo">Código *</label>
              <input id="me-codigo" placeholder="Ej: VG15" {...campo('codigo')} />
            </div>
            <div>
              <label htmlFor="me-categoria">Categoría *</label>
              <select id="me-categoria" {...campo('categoria')}>
                {categorias.map((c) => (
                  <option key={c.codigo} value={c.codigo}>{c.codigo} · {c.nombre}</option>
                ))}
              </select>
            </div>
            <div className="full">
              <label htmlFor="me-nombre">Nombre *</label>
              <input id="me-nombre" placeholder="Ej: Generador JCB G45QX" {...campo('nombre')} />
            </div>
            <div>
              <label htmlFor="me-tipo">Tipo</label>
              <select id="me-tipo" {...campo('tipo')}>
                {TIPOS_EQUIPO.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="me-marca">Marca</label>
              <input id="me-marca" {...campo('marca')} />
            </div>
            <div>
              <label htmlFor="me-modelo">Modelo</label>
              <input id="me-modelo" {...campo('modelo')} />
            </div>
            <div>
              <label htmlFor="me-patente">Patente / serie</label>
              <input id="me-patente" {...campo('patente')} />
            </div>
            <div>
              <label htmlFor="me-destino">Destino</label>
              <select id="me-destino" {...campo('destino')}>
                {destinos.map((d) => (
                  <option key={d.nombre} value={d.nombre}>{d.nombre} · {d.tipo}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="me-cliente">Cliente actual</label>
              <input id="me-cliente" {...campo('cliente')} />
            </div>
            <div>
              <label htmlFor="me-unidad">Unidad de medida</label>
              <select id="me-unidad" {...campo('unidad')}>
                <option value="h">Horas (horómetro)</option>
                <option value="km">Kilómetros (odómetro)</option>
              </select>
            </div>
            <div>
              <label htmlFor="me-intervalo">Intervalo de mantención *</label>
              <input id="me-intervalo" type="number" min="1" {...campo('intervalo')} />
            </div>
            <div>
              <label htmlFor="me-horometro">Lectura actual</label>
              <input id="me-horometro" type="number" min="0" disabled={editando} {...campo('horometro')} />
            </div>
            <div>
              <label htmlFor="me-ultima">Lectura en última mantención</label>
              <input id="me-ultima" type="number" min="0" disabled={editando} {...campo('ultimaMantencion')} />
            </div>
          </div>
          {editando && (
            <Callout tipo="info" icon="lock">
              La lectura y la última mantención solo cambian con lecturas y mantenciones registradas, para mantener la trazabilidad.
            </Callout>
          )}
        </>
      )}
    </Modal>
  )
}
