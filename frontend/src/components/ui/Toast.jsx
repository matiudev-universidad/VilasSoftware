import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { Icon } from './Icon'

/* Avisos flotantes abajo a la derecha (máx. 3 a la vez, duran 4 s).
   Uso: const toast = useToast(); toast('Equipo creado'); toast('Sin stock', 'err') */
const ToastContext = createContext(() => {})

export function ToastProvider({ children }) {
  const [avisos, setAvisos] = useState([])
  const siguienteId = useRef(0)

  const toast = useCallback((msg, tipo = 'ok') => {
    const id = ++siguienteId.current
    setAvisos((prev) => [...prev, { id, msg, tipo }].slice(-3))
    setTimeout(() => setAvisos((prev) => prev.filter((a) => a.id !== id)), 4000)
  }, [])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div id="toast">
        {avisos.map((a) => (
          <div key={a.id} className={`toast ${a.tipo}`}>
            <Icon name={a.tipo === 'err' ? 'alert' : 'checkCircle'} size={18} />
            <span>{a.msg}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
