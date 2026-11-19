import { Fragment, useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { Button, Icon, IconButton, useConfirmar, useToast } from '../components/ui'
import { CambiarPassword } from '../components/sesion/CambiarPassword'
import { SincronizacionAuto } from '../components/telemetria/Sincronizacion'
import { iniciales } from '../lib/formato'
import { alertasApi, auth, catalogos, useConsulta } from '../services'
import { NAV, NOMBRE_RUTA } from './navegacion'

/* Estructura de la app con sesión iniciada: barra lateral + barra superior + contenido.
   Mismo marcado que #app-view del prototipo. */
export default function AppLayout() {
  const { usuario, puede, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [cambiarPass, setCambiarPass] = useState(false)

  // Al cambiar de vista se vuelve arriba (como el router del prototipo)
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  async function cerrarSesion() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <section id="app-view">
      <aside className="sidebar">
        <Link className="side-brand" to="/dashboard" title="Ir al inicio">
          <div className="logo-mark sm">VM</div>
          <div>
            <div className="brand-name">Vila's Motor</div>
            <div className="brand-sub mono">CTRL · MANTENCIONES</div>
          </div>
        </Link>
        <Menu puede={puede} />
        <div className="user-box">
          <div className="avatar">{iniciales(usuario.nombre)}</div>
          <div className="user-meta">
            <b>{usuario.nombre}</b>
            <span>{usuario.rolNombre}</span>
          </div>
          <IconButton icon="lock" label="Cambiar contraseña" onClick={() => setCambiarPass(true)} />
          <IconButton icon="logout" label="Cerrar sesión" onClick={cerrarSesion} />
        </div>
      </aside>

      <div className="main">
        <BarraSuperior />
        {/* key: al navegar se vuelve a montar el contenido y se repite la animación de entrada */}
        <main className="content" key={pathname}>
          <Outlet />
        </main>
      </div>

      {cambiarPass && <CambiarPassword onClose={() => setCambiarPass(false)} />}
      <SincronizacionAuto />
    </section>
  )
}

/* ---------------- Menú lateral ---------------- */
function Menu({ puede }) {
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  const { datos: alertas } = useConsulta(() => alertasApi.getAlertas())
  const badges = { alertas: alertas ? alertas.filter((a) => !a.gestion).length : 0 }

  // La ficha de equipo (/equipos/:id) marca "Telemetría" si se abrió desde ahí
  const activa = (ruta) => {
    if (ruta === '/telemetria' && pathname.startsWith('/equipos/') && params.get('desde') === 'telemetria') return true
    if (ruta === '/equipos' && params.get('desde') === 'telemetria') return false
    return pathname === ruta || pathname.startsWith(ruta + '/')
  }

  return (
    <nav className="nav">
      {NAV.map((g) => {
        const visibles = g.items.filter((n) => puede(n.permiso))
        if (!visibles.length) return null
        return (
          <Fragment key={g.grupo}>
            <div className="nav-label">{g.grupo}</div>
            {visibles.map((n) => {
              const b = n.badge ? badges[n.badge] : 0
              return (
                <Link key={n.ruta} to={n.ruta} className={activa(n.ruta) ? 'active' : ''}>
                  <Icon name={n.icono} size={19} />
                  <span>{n.texto}</span>
                  {b > 0 && <span className="badge">{b}</span>}
                </Link>
              )
            })}
          </Fragment>
        )
      })}
    </nav>
  )
}

/* ---------------- Barra superior ---------------- */
function BarraSuperior() {
  const { pathname, key } = useLocation()
  const navigate = useNavigate()
  // 'default' = primera página abierta en esta pestaña: no hay a dónde volver
  const hayAnterior = key !== 'default'
  const confirmar = useConfirmar()
  const toast = useToast()
  const { puede } = useAuth()
  const { datos: base } = useConsulta(() => catalogos.getBase())

  const segmento = pathname.split('/')[1] || 'dashboard'
  const esFicha = ['equipos', 'dispositivos'].includes(segmento) && pathname.split('/').length > 2
  const nombre = NOMBRE_RUTA[esFicha ? segmento.slice(0, -1) : segmento] || ''

  async function restablecer() {
    const ok = await confirmar({
      titulo: 'Restablecer datos',
      mensaje: '¿Restablecer todos los datos al estado inicial? Se perderán los cambios.',
      confirmar: 'Restablecer',
      peligro: true,
    })
    if (!ok) return
    await auth.restablecerDatos()
    toast('Datos restablecidos')
  }

  return (
    <header className="topbar">
      <div className="top-left">
        <Button
          size="sm"
          icon="arrowLeft"
          className="btn-home btn-back"
          onClick={() => navigate(-1)}
          disabled={!hayAnterior}
          title="Volver a la vista anterior"
        >
          Volver
        </Button>
        <Button as={Link} to="/dashboard" size="sm" icon="home" className="btn-home" title="Volver al panel de flota">
          Inicio
        </Button>
        <div className="crumbs mono">
          Vila's Motor &nbsp;/&nbsp; {base} &nbsp;/&nbsp; <b>{nombre}</b>
        </div>
      </div>
      <div className="top-right">
        <Reloj />
        {puede('restablecer') && (
          <Button variant="ghost" size="sm" icon="reset" onClick={restablecer} title="Vuelve a los datos iniciales">
            Restablecer datos
          </Button>
        )}
      </div>
    </header>
  )
}

function textoReloj() {
  const d = new Date()
  return (
    d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase() +
    ' · ' +
    d.toLocaleTimeString('es-CL', { hour12: false })
  )
}

function Reloj() {
  const [texto, setTexto] = useState(textoReloj)
  useEffect(() => {
    const id = setInterval(() => setTexto(textoReloj()), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="clock mono">
      <Icon name="clock" />
      <span>{texto}</span>
    </div>
  )
}
