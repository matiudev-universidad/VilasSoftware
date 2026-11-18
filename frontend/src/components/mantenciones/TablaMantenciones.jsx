import { Link } from 'react-router'
import { fecha, unidad } from '../../lib/formato'
import { Empty, Num } from '../ui'

/**
 * Tabla de mantenciones (tablaMantenciones() del prototipo).
 * - lista: mantenciones a mostrar
 * - equipos: lista de equipos para resolver código, nombre y unidad de cada mantención
 * - conEquipo: agrega la columna Equipo (vista Mantenciones); en la ficha va sin ella
 * - th(col, texto): encabezados ordenables (useOrden). Sin él, los encabezados son fijos.
 */
export function TablaMantenciones({ lista, equipos, conEquipo = false, th }) {
  const cab = (col, texto) => (th ? th(col, texto) : <th key={col}>{texto}</th>)
  if (!lista.length) return <Empty icon="wrench" size={28}>Sin mantenciones registradas.</Empty>

  const porId = new Map(equipos.map((e) => [e.id, e]))

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {conEquipo && cab('equipo', 'Equipo')}
            {cab('fecha', 'Fecha')}
            {cab('ot', 'OT')}
            {cab('tipo', 'Tipo')}
            {cab('valor', 'Lectura')}
            <th>Insumos</th>
          </tr>
        </thead>
        <tbody>
          {lista.map((m) => {
            const e = porId.get(m.equipoId)
            return (
              <tr key={m.id}>
                {conEquipo && (
                  <td>
                    {e && (
                      <Link to={`/equipos/${e.id}`} className="cell-eq" style={{ minWidth: 0, color: 'inherit' }}>
                        <span className="code">{e.codigo}</span>
                        <span>{e.nombre}</span>
                      </Link>
                    )}
                  </td>
                )}
                <td className="mono small">{fecha(m.fecha)}</td>
                <td className="mono small">{m.ot}</td>
                <td><b>{m.tipo}</b></td>
                <td><Num valor={m.valor} unidad={unidad(e?.unidad)} /></td>
                <td className="small">
                  {m.insumos.length ? (
                    m.insumos.map((i, n) => (
                      <span key={n}>
                        {n > 0 && <br />}
                        <span className="num">{i.cantidad}</span> {i.unidad} · {i.nombre}
                      </span>
                    ))
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
