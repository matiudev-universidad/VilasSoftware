import { Link } from 'react-router'
import { fmt, signoRestante, unidad } from '../../lib/formato'
import { Empty, Icon, Num, Status } from '../ui'
import { CeldaEquipo } from '../equipos/CeldaEquipo'

/**
 * Tabla de alertas (tablaAlertas() del prototipo).
 * - lista: resultado de alertasApi.getAlertas() (ya recortado/paginado por quien la usa)
 * - acciones(a): botones extra por fila (vista Alertas). En el panel no se pasan (versión compacta).
 * - th(col, texto): encabezados ordenables (useOrden). Sin él, los encabezados son fijos.
 */
export function TablaAlertas({ lista, acciones, th }) {
  const cab = (col, texto, props) => (th ? th(col, texto, props) : <th key={col} {...props}>{texto}</th>)
  if (!lista.length) return <Empty icon="checkCircle">Sin alertas en esta vista.</Empty>

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {cab('codigo', 'Equipo')}
            {cab('lectura', 'Lectura')}
            {cab('proxima', 'Lectura programada', { className: 'th-wrap' })}
            {cab('restante', 'Restante')}
            {cab('nivel', 'Estado')}
            <th />
          </tr>
        </thead>
        <tbody>
          {lista.map((a) => {
            const e = a.equipo
            const u = unidad(e.unidad)
            const inconsistente = a.tipo === 'inconsistente'
            return (
              <tr key={e.id} className={`row-${a.nivel}`}>
                <td><CeldaEquipo equipo={e} /></td>
                <td><Num valor={e.horometro} unidad={u} /></td>
                <td><Num valor={a.estado.proxima} unidad={u} /></td>
                <td>
                  {inconsistente ? (
                    <span className="small">
                      IoT informó <span className="num"><b>{fmt(a.incidencia.valor)}</b></span> · último {fmt(a.incidencia.anterior)}
                    </span>
                  ) : (
                    <>
                      <span className={`restante ${a.nivel}`}>{signoRestante(a.estado.restante)}</span>
                      <span className="unit">{u}</span>
                    </>
                  )}
                </td>
                <td>
                  {inconsistente ? (
                    <Status color="rojo" pulse>Lectura inconsistente</Status>
                  ) : (
                    <Status color={a.nivel} pulse={a.nivel === 'rojo' || a.nivel === 'naranja'}>
                      {a.estado.texto}
                    </Status>
                  )}
                  {a.gestion && (
                    <div>
                      <span className="chip-gestion">
                        <Icon name="check" size={12} />
                        En gestión
                      </span>
                    </div>
                  )}
                </td>
                <td className="actions">
                  <Link className="btn btn-sm" to={`/equipos/${e.id}`} title="Ver ficha">
                    <Icon name="eye" size={15} />
                    Ver
                  </Link>
                  {acciones?.(a)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
