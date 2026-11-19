import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { olvidarTodo } from '../lib/memoria'
import { auth } from '../services'

/* Sesión del usuario disponible en toda la app:
   const { usuario, puede, login, verificar, logout } = useAuth()
   Inicio de sesión en dos pasos: login(correo, contraseña) → código al correo → verificar(código). */
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

  // Paso 1: devuelve los datos del código enviado (la sesión aún no se abre)
  const login = useCallback((email, password) => auth.login(email, password), [])

  // Paso 2: con el código correcto se abre la sesión. Se parte de cero: sin filtros ni páginas de otro usuario.
  const verificar = useCallback(async (codigo) => {
    const u = await auth.verificarCodigo(codigo)
    olvidarTodo()
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
    <AuthContext.Provider value={{ usuario, cargando, login, verificar, logout, puede }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
