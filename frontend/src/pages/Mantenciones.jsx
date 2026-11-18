import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { ModalMantencion } from '../components/mantenciones/ModalMantencion'
import { TablaMantenciones } from '../components/mantenciones/TablaMantenciones'
import {
  BotonLimpiar, Button, Campo, Icon, PageHead, Pager, SelectOrden, compararTexto, useFiltros, useOrden, usePaginacion,
} from '../components/ui'
import { catalogos, equiposApi, mantencionesApi, useConsulta } from '../services'

const VACIOS = { q: '', cat: '', tipo: '', desde: '', hasta: '' }

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const haceDias = (n) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return iso(d)
}
/* Períodos rápidos: ponen "Desde" y "Hasta" con un clic */
const PERIODOS = [
  ['30 días', () => ({ desde: haceDias(30), hasta: '' })],
  ['3 meses', () => ({ desde: haceDias(91), hasta: '' })],
  ['12 meses', () => ({ desde: haceDias(365), hasta: '' })],
  ['Este año', () => ({ desde: `${new Date().getFullYear()}-01-01`, hasta: '' })],
]

/* "Preventiva 500 h" y "Correctiva" quedan agrupados para elegirlos de una lista */
const familia = (tipo) => (/^preventiva/i.test(tipo) ? 'Preventivas' : /^correctiva/i.test(tipo) ? 'Correctivas' : 'Otras')

/* Mantenciones (vMantenciones() del prototipo, con filtros más claros y orden por columnas) */
export default function Mantenciones() {
  const { puede } = useAuth()
  const [registrar, setRegistrar] = useState(false)

  const { datos: mants } = useConsulta(() => mantencionesApi.getMantenciones())
  // Incluye equipos dados de baja: su historial se conserva y debe poder mostrarse
  const { datos: equipos } = useConsulta(() => equiposApi.getEquipos({ incluirBajas: true }))
  const { datos: categorias } = useConsulta(() => catalogos.getCategorias())

  const porId = new Map((equipos || []).map((e) => [e.id, e]))
  const f = useFiltros('mantenciones', VACIOS)
  const o = useOrden(
    'mantenciones',
    {
      fecha: (a, b) => compararTexto(a.fecha, b.fecha) || a.id - b.id,
      equipo: (a, b) => compararTexto(porId.get(a.equipoId)?.codigo, porId.get(b.equipoId)?.codigo),
      ot: (a, b) => compararTexto(a.ot, b.ot),
      tipo: (a, b) => compararTexto(a.tipo, b.tipo),
      valor: (a, b) => a.valor - b.valor,
    },
    { col: 'fecha', asc: false },
  )

  const { q, cat, tipo, desde, hasta } = f.filtros
  const lista = o.aplicar(
    (mants || []).filter((m) => {
      const e = porId.get(m.equipoId)
      const t = q.trim().toLowerCase()
      return (
        (!t || `${e?.codigo ?? ''} ${e?.nombre ?? ''} ${m.ot} ${m.responsable}`.toLowerCase().includes(t)) &&
        (!cat || e?.categoria === cat) &&
        (!tipo || (tipo.startsWith('familia:') ? familia(m.tipo) === tipo.slice(8) : m.tipo === tipo)) &&
        (!desde || m.fecha >= desde) &&
        (!hasta || m.fecha <= hasta)
      )
    }),
  )
  const pag = usePaginacion('mantenciones', lista, JSON.stringify(f.filtros) + o.firma)

  if (!mants || !equipos || !categorias) return null

  // Tipos que existen en el historial, agrupados (Preventivas / Correctivas / Otras)
  const tipos = [...new Set(mants.map((m) => m.tipo))].sort(compararTexto)
  const familias = ['Preventivas', 'Correctivas', 'Otras'].map((fam) => [fam, tipos.filter((t) => familia(t) === fam)]).filter(([, ts]) => ts.length)
  const periodoActivo = PERIODOS.find(([, p]) => {
    const v = p()
    return v.desde === desde && v.hasta === hasta
  })?.[0]

  return (
    <>
      <PageHead num="05 — Historial" titulo="Mantenciones" desc="Registro centralizado de todas las intervenciones de la flota.">
        {puede('registrarMantencion') && (
          <Button variant="primary" icon="plus" onClick={() => setRegistrar(true)}>
            Registrar mantención
          </Button>
        )}
      </PageHead>

      <div className="panel">
        <div className="panel-head">
          <div className="filters con-etiquetas">
            <Campo etiqueta="Buscar">
              <div className="input-icon">
                <span className="i"><Icon name="search" size={16} /></span>
                <input placeholder="Equipo, OT o responsable…" value={q} onChange={(e) => f.set('q', e.target.value)} />
              </div>
            </Campo>
            <Campo etiqueta="Categoría">
              <select value={cat} onChange={(e) => f.set('cat', e.target.value)}>
                <option value="">Todas</option>
                {categorias.map((c) => (
                  <option key={c.codigo} value={c.codigo}>{c.codigo} · {c.nombre}</option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Tipo de mantención">
              <select value={tipo} onChange={(e) => f.set('tipo', e.target.value)}>
                <option value="">Todos los tipos</option>
                {familias.map(([fam, ts]) => (
                  <optgroup key={fam} label={fam}>
                    {fam !== 'Otras' && <option value={`familia:${fam}`}>Todas las {fam.toLowerCase()}</option>}
                    {ts.map((t) => <option key={t} value={t}>{t}</option>)}
                  </optgroup>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Desde">
              <input type="date" value={desde} max={hasta || undefined} onChange={(e) => f.set('desde', e.target.value)} />
            </Campo>
            <Campo etiqueta="Hasta">
              <input type="date" value={hasta} min={desde || undefined} onChange={(e) => f.set('hasta', e.target.value)} />
            </Campo>
            <Campo etiqueta="Período rápido">
              <div className="chips periodos">
                {PERIODOS.map(([texto, p]) => (
                  <button key={texto} type="button" className={`chip ${periodoActivo === texto ? 'active' : ''}`} onClick={() => f.cambiar(p())}>
                    {texto}
                  </button>
                ))}
              </div>
            </Campo>
            <Campo etiqueta="Orden">
              <SelectOrden
                orden={o}
                opciones={[
                  ['fecha', false, 'más recientes'],
                  ['fecha', true, 'más antiguas'],
                  ['equipo', true, 'equipo'],
                  ['valor', false, 'mayor lectura'],
                  ['tipo', true, 'tipo'],
                ]}
              />
            </Campo>
            <BotonLimpiar hay={f.hay} onClick={f.limpiar} />
          </div>
          <span className="mono small muted">{String(lista.length).padStart(2, '0')} REGISTROS</span>
        </div>
        <TablaMantenciones lista={pag.items} equipos={equipos} conEquipo th={o.th} />
        <Pager pag={pag} />
      </div>

      {registrar && <ModalMantencion onClose={() => setRegistrar(false)} />}
    </>
  )
}
