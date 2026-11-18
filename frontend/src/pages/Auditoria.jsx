import { useState } from 'react'
import { Link } from 'react-router'
import { Button, Empty, Icon, Modal, PageHead, Pager, usePaginacion } from '../components/ui'
import { fecha, fmt } from '../lib/formato'
import { catalogos, equiposApi, useConsulta } from '../services'

let filtroGuardado = ''

/* Auditoría: quién hizo cada cambio y cuándo (vAuditoria() del prototipo) */
export default function Auditoria() {
  const [filtro, setFiltroState] = useState(filtroGuardado)
  const [abierto, setAbierto] = useState(null)
  const { datos: todos } = useConsulta(() => catalogos.getAuditoria())

  const q = filtro.toLowerCase()
  const lista = (todos || []).filter((a) => !q || `${a.usuario}${a.accion}${a.detalle}`.toLowerCase().includes(q))
  const pag = usePaginacion('auditoria', lista)

  if (!todos) return null

  const buscar = (texto) => {
    filtroGuardado = texto
    setFiltroState(texto)
    pag.reiniciar()
  }

  return (
    <>
      <PageHead num="09 — Trazabilidad" titulo="Auditoría" desc="Quién hizo cada cambio y cuándo. Las correcciones guardan el valor anterior." />
      <div className="panel">
        <div className="panel-head">
          <div className="filters">
            <div className="input-icon">
              <span className="i"><Icon name="search" size={16} /></span>
              <input placeholder="Usuario, acción o equipo…" value={filtro} onChange={(e) => buscar(e.target.value)} />
            </div>
          </div>
          <span className="mono small muted">{String(lista.length).padStart(2, '0')} EVENTOS</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Usuario</th>
                <th>Acción</th>
                <th>Detalle</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lista.length ? (
                pag.items.map((a, i) => (
                  <tr
                    key={pag.desde + i}
                    className="row-link"
                    tabIndex={0}
                    title="Abrir registro"
                    onClick={() => setAbierto(a)}
                    onKeyDown={(ev) => ev.key === 'Enter' && setAbierto(a)}
                  >
                    <td className="mono small" style={{ whiteSpace: 'nowrap' }}>{fecha(a.fecha)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{a.usuario}</td>
                    <td><b>{a.accion}</b></td>
                    <td>{a.detalle}</td>
                    <td className="actions">
                      <span className="btn btn-sm">
                        <Icon name="eye" size={15} />
                        Abrir
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>
                    <Empty icon="search" size={28}>No hay eventos que coincidan con la búsqueda.</Empty>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pager pag={pag} />
      </div>

      {abierto && <ModalAuditoria registro={abierto} onClose={() => setAbierto(null)} />}
    </>
  )
}

/** Detalle de un registro, con acceso a los equipos mencionados (modalAuditoria() del prototipo) */
function ModalAuditoria({ registro: a, onClose }) {
  const { datos: equipos } = useConsulta(() => equiposApi.getEquipos())
  // equipos mencionados en el detalle (ej: "VR143: 119.300 → 119.303 km")
  const eqs = (equipos || []).filter((e) => new RegExp(`\\b${e.codigo}\\b`).test(a.detalle))

  return (
    <Modal titulo="Registro de auditoría" onClose={onClose} footer={<Button onClick={onClose}>Cerrar</Button>}>
      <div className="spec spec-2">
        <div><span>Fecha y hora</span><b className="mono">{fecha(a.fecha)}</b></div>
        <div><span>Usuario</span><b>{a.usuario}</b></div>
        <div className="full"><span>Acción</span><b>{a.accion}</b></div>
        <div className="full"><span>Detalle</span><b style={{ fontWeight: 500 }}>{a.detalle}</b></div>
        {a.valorAnterior != null && (
          <div><span>Valor anterior</span><b className="mono">{fmt(a.valorAnterior)}</b></div>
        )}
      </div>
      {eqs.length > 0 && (
        <>
          <label>Equipo relacionado</label>
          <div className="aud-eqs">
            {eqs.map((e) => (
              <Link key={e.id} className="btn btn-sm" to={`/equipos/${e.id}`} onClick={onClose}>
                <Icon name="eye" size={15} />
                <span className="code">{e.codigo}</span> {e.nombre}
              </Link>
            ))}
          </div>
        </>
      )}
    </Modal>
  )
}
