import { useEffect, useState, useSyncExternalStore } from 'react'
import { mmss } from '../../lib/formato'
import { telemetriaApi } from '../../services'
import { suscribir, versionDatos } from '../../services/cambios'
import { Button, useToast } from '../ui'

const CONSULTA_MS = 15000 // cada cuánto se pregunta a Django el estado real

/**
 * Estado de la sincronización: { ultima, proximaAuto, cooldown, tocaAuto }.
 * Se pide a Django al montar, cada 15 s y tras cualquier cambio de datos;
 * entre medio las cuentas regresivas se descuentan localmente cada segundo.
 */
export function useEstadoSync() {
  const version = useSyncExternalStore(suscribir, versionDatos)
  const [base, setBase] = useState(null) // { estado, recibido }
  const [ahora, setAhora] = useState(() => Date.now())

  useEffect(() => {
    let vigente = true
    const leer = () =>
      telemetriaApi.getEstadoSync()
        .then((estado) => vigente && setBase({ estado, recibido: Date.now() }))
        .catch(() => {})
    leer()
    const id = setInterval(leer, CONSULTA_MS)
    return () => {
      vigente = false
      clearInterval(id)
    }
  }, [version])

  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  if (!base) return null
  const pasado = Math.max(0, ahora - base.recibido)
  return {
    ...base.estado,
    proximaAuto: Math.max(0, base.estado.proximaAuto - pasado),
    cooldown: Math.max(0, base.estado.cooldown - pasado),
    tocaAuto: base.estado.tocaAuto || base.estado.proximaAuto - pasado <= 0,
  }
}

/** Botón "Sincronizar horómetros": luego queda deshabilitado 2 min mostrando la cuenta regresiva */
export function BotonSync() {
  const toast = useToast()
  const s = useEstadoSync()
  const cooldown = s?.cooldown ?? 0

  async function sincronizar() {
    try {
      const r = await telemetriaApi.sincronizarTelemetria()
      toast(`Horómetros sincronizados · ${r.actualizados} equipo(s) en uso actualizados`)
    } catch (err) {
      toast(err.message, 'err')
    }
  }

  return (
    <Button variant="primary" icon="refresh" onClick={sincronizar} disabled={!s || cooldown > 0}>
      <span>{cooldown ? `Disponible en ${mmss(cooldown)}` : 'Sincronizar horómetros'}</span>
    </Button>
  )
}

/** Sincronización automática cada 5 min mientras hay sesión (se monta una vez en AppLayout) */
export function SincronizacionAuto() {
  const s = useEstadoSync()
  const toca = !!s?.tocaAuto

  useEffect(() => {
    if (toca) telemetriaApi.sincronizarAuto().catch(() => {})
  }, [toca])

  return null
}
