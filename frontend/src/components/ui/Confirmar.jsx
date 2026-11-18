import { createContext, useCallback, useContext, useState } from 'react'
import { Button } from './Button'
import { Modal } from './Modal'

/* Reemplaza window.confirm() por un modal con el diseño del sistema.
   Uso:
     const confirmar = useConfirmar()
     if (await confirmar({ titulo: 'Dar de baja', mensaje: '¿Dar de baja el equipo VR005? Se conservará su historial.',
                           confirmar: 'Dar de baja', peligro: true })) { ... }
   También acepta solo el texto: await confirmar('¿Restablecer todos los datos?') */
const ConfirmarContext = createContext(async () => false)

export function ConfirmarProvider({ children }) {
  const [pedido, setPedido] = useState(null)

  const confirmar = useCallback(
    (opciones) =>
      new Promise((resolver) => {
        const o = typeof opciones === 'string' ? { mensaje: opciones } : opciones
        setPedido({ ...o, resolver })
      }),
    [],
  )

  const responder = (si) => {
    pedido?.resolver(si)
    setPedido(null)
  }

  return (
    <ConfirmarContext.Provider value={confirmar}>
      {children}
      {pedido && (
        <Modal
          small
          titulo={pedido.titulo || 'Confirmar'}
          onClose={() => responder(false)}
          footer={
            <>
              <Button onClick={() => responder(false)}>{pedido.cancelar || 'Cancelar'}</Button>
              <Button
                variant={pedido.peligro ? 'primary' : 'dark'}
                icon={pedido.peligro ? 'alert' : 'check'}
                onClick={() => responder(true)}
                autoFocus
              >
                {pedido.confirmar || 'Confirmar'}
              </Button>
            </>
          }
        >
          <p>{pedido.mensaje}</p>
        </Modal>
      )}
    </ConfirmarContext.Provider>
  )
}

export const useConfirmar = () => useContext(ConfirmarContext)
