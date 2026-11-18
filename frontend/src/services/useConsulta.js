import { useEffect, useState, useSyncExternalStore } from 'react'
import { suscribir, versionDatos } from './cambios'

/**
 * Ejecuta una consulta de servicio y la repite sola cuando los datos cambian
 * (después de crear, editar, registrar, restablecer, etc.).
 *
 *   const { datos: equipos, cargando, error } = useConsulta(() => equiposApi.getEquipos())
 *   const { datos: eq } = useConsulta(() => equiposApi.getEquipo(id), [id])
 *
 * La "versión" sube después de cada petición que modifica datos (ver http.js),
 * así todas las vistas abiertas se actualizan solas.
 */
export function useConsulta(consulta, deps = []) {
  const version = useSyncExternalStore(suscribir, versionDatos)
  const [estado, setEstado] = useState({ datos: undefined, cargando: true, error: null })

  useEffect(() => {
    let vigente = true
    consulta()
      .then((datos) => vigente && setEstado({ datos, cargando: false, error: null }))
      .catch((error) => vigente && setEstado((prev) => ({ ...prev, cargando: false, error })))
    return () => { vigente = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, ...deps])

  return estado
}
