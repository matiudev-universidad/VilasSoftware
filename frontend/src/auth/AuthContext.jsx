import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { olvidarTodo } from '../lib/memoria'
import { auth } from '../services'

/* Sesión del usuario disponible en toda la app:
   const { usuario, puede, login, logout } = useAuth() */
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [cargando, setCargando] = useState(true)

  // Al recargar la página se recupera la sesión guardada
  useEffect(() => {
    auth.usuarioActual()
      .then(setUsuario)
      .finally(() => setCargando(false))
  }, [])

  const login = useCallback(async (email, password) => {
    const u = await auth.login(email, password)
    olvidarTodo() // se parte de cero: sin filtros ni páginas de otro usuario
    setUsuario(u)
    return u
  }, [])

  const logout = useCallback(async () => {
    await auth.logout()
    olvidarTodo()
    setUsuario(null)
  }, [])

  // Los permisos del rol vienen de Django junto con el usuario
  const puede = useCallback((permiso) => !!usuario?.permisos?.includes(permiso), [usuario])

  return (
    <AuthContext.Provider value={{ usuario, cargando, login, logout, puede }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
