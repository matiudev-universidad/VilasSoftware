import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { ConfirmarProvider, ToastProvider } from './components/ui'
import AppLayout from './layout/AppLayout'
import Dashboard from './pages/Dashboard'
import Equipos from './pages/Equipos'
import FichaEquipo from './pages/FichaEquipo'
import Mantenciones from './pages/Mantenciones'
import Alertas from './pages/Alertas'
import Auditoria from './pages/Auditoria'
import Dispositivos from './pages/Dispositivos'
import FichaDispositivo from './pages/FichaDispositivo'
import Insumos from './pages/Insumos'
import Reportes from './pages/Reportes'
import Telemetria from './pages/Telemetria'
import Login from './pages/Login'

/* Solo deja pasar con sesión iniciada */
function ConSesion() {
  const { usuario, cargando } = useAuth()
  if (cargando) return null
  if (!usuario) return <Navigate to="/login" replace />
  return <Outlet />
}

/* Solo deja pasar si el rol tiene el permiso; si no, vuelve al panel */
function ConPermiso({ permiso }) {
  const { puede } = useAuth()
  return puede(permiso) ? <Outlet /> : <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <ToastProvider>
      <ConfirmarProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />

              <Route element={<ConSesion />}>
                <Route element={<AppLayout />}>
                  <Route index element={<Navigate to="/dashboard" replace />} />

                  <Route element={<ConPermiso permiso="ver" />}>
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="equipos" element={<Equipos />} />
                    <Route path="equipos/:id" element={<FichaEquipo />} />
                    <Route path="telemetria" element={<Telemetria />} />
                    <Route path="alertas" element={<Alertas />} />
                    <Route path="mantenciones" element={<Mantenciones />} />
                  </Route>
                  <Route element={<ConPermiso permiso="verDispositivos" />}>
                    <Route path="dispositivos" element={<Dispositivos />} />
                    <Route path="dispositivos/:id" element={<FichaDispositivo />} />
                  </Route>
                  <Route element={<ConPermiso permiso="verInsumos" />}>
                    <Route path="insumos" element={<Insumos />} />
                  </Route>
                  <Route element={<ConPermiso permiso="reportes" />}>
                    <Route path="reportes" element={<Reportes />} />
                    <Route path="reportes/:id" element={<Reportes />} />
                  </Route>
                  <Route element={<ConPermiso permiso="auditoria" />}>
                    <Route path="auditoria" element={<Auditoria />} />
                  </Route>

                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ConfirmarProvider>
    </ToastProvider>
  )
}
