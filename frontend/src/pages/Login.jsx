import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { Icon, useToast } from '../components/ui'
import { RecuperarPassword } from '../components/sesion/RecuperarPassword'
import { catalogos, useConsulta } from '../services'

const relleno = (n, largo) => (n == null ? '—' : String(n).padStart(largo, '0'))

export default function Login() {
  const { usuario, login } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const { datos: resumen } = useConsulta(() => catalogos.getResumenLogin())

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [recuperar, setRecuperar] = useState(false)

  if (usuario) return <Navigate to="/dashboard" replace />

  async function alEnviar(e) {
    e.preventDefault()
    setEnviando(true)
    try {
      const u = await login(email, password)
      setError('')
      toast(`Sesión iniciada como ${u.rolNombre}`)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setPassword('')
      setEnviando(false)
    }
  }

  return (
    <section id="login-view">
      <div className="login-brand">
        <div className="contours" aria-hidden="true" />
        <div className="brand-row">
          <div className="logo-mark">VM</div>
          <div>
            <div className="brand-name">Vila's Motor</div>
            <div className="brand-sub">Arriendo de maquinaria · Iquique</div>
          </div>
        </div>

        <div className="login-hero">
          <div className="eyebrow">Proyecto Integrado · Prototipo v0.2</div>
          <h1>
            Control de
            <br />
            <span>mantenciones</span>
            <br />
            de flota
          </h1>
          <p>Horómetros centralizados, alertas preventivas y lecturas automáticas desde cada equipo en faena.</p>
        </div>

        <div className="login-readout">
          <div>
            <span className="ro-label">Equipos en flota</span>
            <span className="ro-value">{relleno(resumen?.equipos, 3)}</span>
          </div>
          <div>
            <span className="ro-label">Destinos</span>
            <span className="ro-value">{relleno(resumen?.destinos, 2)}</span>
          </div>
          <div>
            <span className="ro-label">Dispositivos IoT</span>
            <span className="ro-value">{relleno(resumen?.dispositivos, 2)}</span>
          </div>
        </div>
        <div className="hazard" aria-hidden="true" />
      </div>

      <div className="login-form-wrap">
        <form className="login-card" autoComplete="off" noValidate onSubmit={alEnviar}>
          <div className="eyebrow red">Acceso</div>
          <h2>Iniciar sesión</h2>
          <p className="muted">Ingresa con tu correo corporativo.</p>

          <label htmlFor="login-email">Correo</label>
          <div className="input-icon">
            <span className="i"><Icon name="mail" /></span>
            <input
              id="login-email"
              type="email"
              placeholder="usuario@vilasmotors.cl"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <label htmlFor="login-pass">Contraseña</label>
          <div className="input-icon">
            <span className="i"><Icon name="lock" /></span>
            <input
              id="login-pass"
              type="password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="login-forgot">
            <button type="button" className="link-btn" onClick={() => setRecuperar(true)}>
              ¿Olvidaste tu contraseña?
            </button>
          </div>
          <div className="form-error">{error}</div>
          <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={enviando}>
            <span>Ingresar</span>
            <Icon name="arrowRight" />
          </button>
        </form>
        <div className="login-foot mono">INACAP · Asencio · García · Gonzales · Pavez</div>
      </div>

      {recuperar && <RecuperarPassword correoInicial={email.trim()} onClose={() => setRecuperar(false)} />}
    </section>
  )
}
