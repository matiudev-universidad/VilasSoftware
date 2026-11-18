import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { TablaAlertas } from '../components/alertas/TablaAlertas'
import { ModalGestion, ModalIncidencia } from '../components/alertas/ModalesAlerta'
import { ModalMantencion } from '../components/mantenciones/ModalMantencion'
import {
  BotonLimpiar, Button, Icon, PageHead, Pager, SelectOrden, compararTexto, useFiltros, useOrden, usePaginacion, useToast,
} from '../components/ui'
import { compararCodigo } from '../lib/formato'
import { alertasApi, catalogos, useConsulta } from '../services'

const CHIPS = [
  ['todas', 'Todas', () => true],
  ['rojo', 'Vencidas', (a) => a.nivel === 'rojo'],
  ['proximas', 'Por vencer', (a) => a.tipo === 'mantencion' && (a.nivel === 'naranja' || a.nivel === 'amarillo')],
  ['naranja', 'Críticas', (a) => a.nivel === 'naranja'],
  ['amarillo', 'Próximas', (a) => a.nivel === 'amarillo'],
  ['gestion', 'En gestión', (a) => !!a.gestion],
  ['sinGestion', 'Sin gestionar', (a) => a.tipo === 'mantencion' && !a.gestion],
  ['inconsistente', 'Inconsistentes', (a) => a.tipo === 'inconsistente'],
]
const NIVEL = { rojo: 0, naranja: 1, amarillo: 2 }

const COMPARAR = {
  nivel: (a, b) => NIVEL[a.nivel] - NIVEL[b.nivel] || a.estado.restante - b.estado.restante,
  codigo: (a, b) => compararCodigo(a.equipo, b.equipo),
  lectura: (a, b) => a.equipo.horometro - b.equipo.horometro,
  proxima: (a, b) => a.estado.proxima - b.estado.proxima,
  restante: (a, b) => a.estado.restante - b.estado.restante,
  categoria: (a, b) => compararTexto(a.equipo.categoria, b.equipo.categoria),
  destino: (a, b) => compararTexto(a.equipo.destino, b.equipo.destino),
}

const VACIOS = { nivel: 'todas', q: '', cat: '', dest: '' }

/* Alertas del sistema (vAlertas() del prototipo + filtros, orden y limpieza) */
export default function Alertas() {
  const { puede } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [modal, setModal] = useState(null) // { tipo: 'gestion'|'incidencia'|'mantencion', id }

  // Desde el panel llega ?nivel=rojo o ?nivel=proximas
  const f = useFiltros('alertas', VACIOS, { nivel: params.get('nivel') })
  const o = useOrden('alertas', COMPARAR, { col: 'nivel', asc: true })
  useEffect(() => {
    if (params.has('nivel')) navigate('/alertas', { replace: true })
  }, [params, navigate])

  const { datos: todas } = useConsulta(() => alertasApi.getAlertas())
  const { datos: categorias } = useConsulta(() => catalogos.getCategorias())
  const { datos: destinos } = useConsulta(() => catalogos.getDestinos())

  const { nivel, q, cat, dest } = f.filtros
  // Primero los filtros de búsqueda/categoría/destino; los chips cuentan sobre ese resultado
  const base = (todas || []).filter((a) => {
    const e = a.equipo
    const t = q.trim().toLowerCase()
    return (
      (!t || `${e.codigo} ${e.nombre} ${e.marca} ${e.modelo} ${e.cliente}`.toLowerCase().includes(t)) &&
      (!cat || e.categoria === cat) &&
      (!dest || e.destino === dest)
    )
  })
  const predicado = (CHIPS.find((c) => c[0] === nivel) || CHIPS[0])[2]
  const lista = o.aplicar(base.filter(predicado))
  const pag = usePaginacion('alertas', lista, JSON.stringify(f.filtros) + o.firma)

  if (!todas || !categorias || !destinos) return null

  async function reabrir(equipoId) {
    try {
      await alertasApi.quitarGestion(equipoId)
      toast('Alerta reabierta')
    } catch (err) {
      toast(err.message, 'err')
    }
  }

  const acciones = (a) => (
    <>
      {a.tipo === 'inconsistente' && puede('registrarLectura') && (
        <Button size="sm" variant="dark" icon="alert" iconSize={15} onClick={() => setModal({ tipo: 'incidencia', id: a.incidencia.id })}>
          Revisar
        </Button>
      )}
      {a.tipo === 'mantencion' && puede('gestionarAlertas') && (a.gestion ? (
        <Button size="sm" icon="refresh" iconSize={15} onClick={() => reabrir(a.equipo.id)}>Reabrir</Button>
      ) : (
        <Button size="sm" icon="check" iconSize={15} onClick={() => setModal({ tipo: 'gestion', id: a.equipo.id })}>En gestión</Button>
      ))}
      {a.tipo === 'mantencion' && puede('registrarMantencion') && (
        <Button size="sm" variant="primary" icon="wrench" iconSize={15} onClick={() => setModal({ tipo: 'mantencion', id: a.equipo.id })}>
          Mantención
        </Button>
      )}
    </>
  )

  const cerrar = () => setModal(null)
  const catsConAlertas = categorias.filter((c) => todas.some((a) => a.equipo.categoria === c.codigo))
  const destConAlertas = destinos.filter((d) => todas.some((a) => a.equipo.destino === d.nombre))

  return (
    <>
      <PageHead
        num="04 — Alertas"
        titulo="Alertas del sistema"
        desc="Se generan solas al comparar cada lectura con la lectura programada del equipo (umbral de aviso: 50 h maquinaria · 300 km camionetas · 1.000 km transporte). Restante positivo = lo que queda; negativo = exceso."
      />
      <div className="panel corner">
        <div className="panel-head">
          <div className="chips">
            {CHIPS.map(([k, texto, ok]) => (
              <button key={k} type="button" className={`chip ${nivel === k ? 'active' : ''}`} onClick={() => f.set('nivel', k)}>
                {texto}
                <span className="n">{base.filter(ok).length}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="panel-head">
          <div className="filters">
            <div className="input-icon">
              <span className="i"><Icon name="search" size={16} /></span>
              <input placeholder="Código, nombre, marca, cliente…" value={q} onChange={(e) => f.set('q', e.target.value)} />
            </div>
            <select value={cat} onChange={(e) => f.set('cat', e.target.value)}>
              <option value="">Todas las categorías</option>
              {catsConAlertas.map((c) => (
                <option key={c.codigo} value={c.codigo}>{c.codigo} · {c.nombre}</option>
              ))}
            </select>
            <select value={dest} onChange={(e) => f.set('dest', e.target.value)}>
              <option value="">Todos los destinos</option>
              {destConAlertas.map((d) => (
                <option key={d.nombre} value={d.nombre}>{d.nombre}</option>
              ))}
            </select>
            <SelectOrden
              orden={o}
              opciones={[
                ['nivel', true, 'más urgentes primero'],
                ['restante', true, 'menor restante'],
                ['restante', false, 'mayor restante'],
                ['codigo', true, 'código A → Z'],
                ['categoria', true, 'categoría'],
                ['destino', true, 'destino'],
              ]}
            />
            <BotonLimpiar hay={f.hay} onClick={f.limpiar} />
          </div>
          <span className="mono small muted">{String(lista.length).padStart(2, '0')} ALERTAS</span>
        </div>
        <TablaAlertas lista={pag.items} acciones={acciones} th={o.th} />
        <Pager pag={pag} />
      </div>

      {modal?.tipo === 'gestion' && <ModalGestion equipo={todas.find((a) => a.equipo.id === modal.id)?.equipo} onClose={cerrar} />}
      {modal?.tipo === 'incidencia' && <ModalIncidencia id={modal.id} onClose={cerrar} />}
      {modal?.tipo === 'mantencion' && <ModalMantencion equipoId={modal.id} onClose={cerrar} />}
    </>
  )
}
