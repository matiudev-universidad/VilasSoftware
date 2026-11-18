import { useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { TablaAlertas } from '../components/alertas/TablaAlertas'
import { ModalLectura } from '../components/lecturas/ModalLectura'
import { Button, Icon, PageHead, Segments, useRecordado } from '../components/ui'
import { COLOR_VAR } from '../lib/formato'
import { alertasApi, catalogos, dispositivosApi, equiposApi, useConsulta } from '../services'

const dos = (n) => String(n).padStart(2, '0')

/* Panel de flota (vDashboard() del prototipo) */
export default function Dashboard() {
  const { puede } = useAuth()
  const [registrar, setRegistrar] = useState(false)
  const [pestana, setPestana] = useRecordado('panel:vencimientos', 'proximos')

  const { datos: equipos } = useConsulta(() => equiposApi.getEquipos())
  const { datos: alertas } = useConsulta(() => alertasApi.getAlertas())
  const { datos: categorias } = useConsulta(() => catalogos.getCategorias())
  const { datos: dispositivos } = useConsulta(() => dispositivosApi.getDispositivos())

  if (!equipos || !alertas || !categorias || !dispositivos) return null

  const total = equipos.length
  const n = (color) => equipos.filter((e) => e.estado.color === color).length

  const disp = dispositivos.filter((d) => d.estado !== 'baja')
  const online = disp.filter((d) => d.estado === 'online').length
  const offline = disp.filter((d) => d.estado === 'offline').length
  const enCola = disp.reduce((s, d) => s + d.cola.length, 0)

  // Próximos y críticos (lo que viene, de lo más urgente a lo menos) · Vencidos (ya pasados o inconsistentes)
  const proximos = alertas
    .filter((a) => a.tipo === 'mantencion' && (a.nivel === 'naranja' || a.nivel === 'amarillo'))
    .sort((a, b) => a.estado.restante - b.estado.restante)
  const vencidos = alertas.filter((a) => a.nivel === 'rojo')
  const vista = pestana === 'vencidos' ? vencidos : proximos

  // Las métricas IoT llevan a Dispositivos filtrado; sin ese permiso, a Telemetría
  const destinoIot = puede('verDispositivos')
    ? { online: '/dispositivos?estado=online', offline: '/dispositivos?estado=offline', cola: '/dispositivos?cola=1' }
    : { online: '/telemetria', offline: '/telemetria?filtro=sinsenal', cola: '/telemetria?filtro=sinsenal' }

  return (
    <>
      <PageHead num="01 — Panel de flota" titulo="Estado de la flota" desc="Mantención preventiva según horómetro o kilometraje de cada equipo.">
        {puede('registrarLectura') && (
          <Button variant="primary" icon="gauge" onClick={() => setRegistrar(true)}>
            Registrar horómetro
          </Button>
        )}
      </PageHead>

      {/* Cada KPI lleva a la lista de equipos filtrada por ese estado */}
      <div className="kpis kpis-5">
        <Kpi clase="total" icono="truck" label="Total flota" valor={total} total={total} sub="equipos activos" />
        <Kpi clase="verde" icono="checkCircle" label="Operativos" valor={n('verde')} total={total} sub="dentro del intervalo" />
        <Kpi clase="amarillo" icono="clock" label="Próximos" valor={n('amarillo')} total={total} sub="en rango de aviso" />
        <Kpi clase="naranja" icono="alert" label="Críticos" valor={n('naranja')} total={total} sub="a punto de vencer" />
        <Kpi clase="rojo" icono="alert" label="Vencidos" valor={n('rojo')} total={total} sub="requieren acción" />
      </div>

      <div className="grid-main">
        <div className="panel corner">
          <div className="panel-head">
            <div className="panel-tabs">
              <h2>
                <Icon name="bell" size={20} />
                Vencimientos
              </h2>
              <div className="chips">
                <button type="button" className={`chip ${pestana === 'proximos' ? 'active' : ''}`} onClick={() => setPestana('proximos')}>
                  Próximos y críticos<span className="n">{proximos.length}</span>
                </button>
                <button type="button" className={`chip ${pestana === 'vencidos' ? 'active' : ''}`} onClick={() => setPestana('vencidos')}>
                  Vencidos<span className="n">{vencidos.length}</span>
                </button>
              </div>
            </div>
            <Link to={`/alertas?nivel=${pestana === 'vencidos' ? 'rojo' : 'proximas'}`} className="btn btn-sm btn-ghost">
              Ver todas <Icon name="arrowRight" size={15} />
            </Link>
          </div>
          <TablaAlertas lista={vista.slice(0, 8)} />
        </div>

        <div className="stack">
          <div className="panel panel-pad">
            <h2 className="panel-title">
              <Icon name="dashboard" size={20} />
              Estado por categoría
            </h2>
            {categorias
              .filter((c) => equipos.some((e) => e.categoria === c.codigo))
              .map((c) => (
                <FilaCategoria key={c.codigo} categoria={c} equipos={equipos.filter((e) => e.categoria === c.codigo)} />
              ))}
            <div className="legend">
              <span><i style={{ background: 'var(--green)' }} />Operativo</span>
              <span><i style={{ background: 'var(--yellow)' }} />Próximo</span>
              <span><i style={{ background: 'var(--orange)' }} />Crítico</span>
              <span><i style={{ background: 'var(--red)' }} />Vencido</span>
            </div>
          </div>

          <div className="panel panel-pad">
            <h2 className="panel-title">
              <Icon name="antenna" size={20} />
              Telemetría IoT
            </h2>
            <div className="metrics">
              <Metrica to={destinoIot.online} texto="En línea" valor={online} color="var(--green)" />
              <Metrica to={destinoIot.offline} texto="Sin señal" valor={offline} color="var(--red)" />
              <Metrica to={destinoIot.cola} texto="En cola" valor={enCola} />
            </div>
            <Link to="/telemetria" className="btn btn-sm btn-ghost" style={{ marginTop: 14 }}>
              Horómetros en faena <Icon name="arrowRight" size={15} />
            </Link>
            {puede('verDispositivos') && (
              <Link to="/dispositivos" className="btn btn-sm btn-ghost" style={{ marginTop: 14 }}>
                Gestionar dispositivos <Icon name="arrowRight" size={15} />
              </Link>
            )}
          </div>
        </div>
      </div>

      {registrar && <ModalLectura onClose={() => setRegistrar(false)} />}
    </>
  )
}

/** Métrica del bloque IoT que lleva a la lista filtrada */
function Metrica({ to, texto, valor, color }) {
  return (
    <Link to={to} title={`Ver ${texto.toLowerCase()}`}>
      <span>
        {texto}
        <span className="k-go"><Icon name="arrowRight" size={12} /></span>
      </span>
      <b style={color ? { color } : undefined}>{dos(valor)}</b>
    </Link>
  )
}

function Kpi({ clase, icono, label, valor, total, sub }) {
  const destino = clase === 'total' ? '/equipos' : `/equipos?estado=${clase}`
  return (
    <Link className={`kpi kpi-link ${clase}`} to={destino} title="Ver equipos">
      <div className="k-label">
        <Icon name={icono} size={14} />
        {label}
        <span className="k-go"><Icon name="arrowRight" size={14} /></span>
      </div>
      <div className="k-value">{dos(valor)}</div>
      <div className="k-sub">{sub}</div>
      <Segments valor={valor} total={total} />
    </Link>
  )
}

function FilaCategoria({ categoria: c, equipos }) {
  const tot = equipos.length || 1
  const tramo = (color) => (
    <span
      style={{
        width: `${(equipos.filter((e) => e.estado.color === color).length / tot) * 100}%`,
        background: COLOR_VAR[color],
      }}
    />
  )
  return (
    <div className="cat-row">
      <div className="cat-top">
        <b><span className="tag">{c.codigo}</span>&nbsp; {c.nombre}</b>
        <span className="mono small muted">{dos(equipos.length)} EQ</span>
      </div>
      <div className="stackbar">
        {tramo('verde')}
        {tramo('amarillo')}
        {tramo('naranja')}
        {tramo('rojo')}
      </div>
    </div>
  )
}
