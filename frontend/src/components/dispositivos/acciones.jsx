import { useState } from 'react'
import { fmt } from '../../lib/formato'
import { dispositivosApi } from '../../services'
import { Button, Icon, useConfirmar, useRecordado, useToast } from '../ui'

/**
 * Acciones sobre un dispositivo, compartidas por la lista y la ficha:
 * simular lectura / reinicio, quitar señal / reconectar y dar de baja.
 * Guarda el último JSON recibido para la consola "Último paquete recibido".
 */
export function useAccionesDispositivo() {
  const toast = useToast()
  const confirmar = useConfirmar()
  const [ocupado, setOcupado] = useState(false)
  const [payload, setPayload] = useRecordado('dispositivos:payload', null)

  async function ejecutar(fn) {
    setOcupado(true)
    try {
      await fn()
    } catch (err) {
      toast(err.message, 'err')
    } finally {
      setOcupado(false)
    }
  }

  return {
    ocupado,
    payload,
    simular: (d) =>
      ejecutar(async () => {
        const r = await dispositivosApi.simularLectura(d.id)
        setPayload(r.payload)
        if (r.encolada) toast(`Sin señal: lectura ${fmt(r.payload.horas ?? r.payload.odometro_km)} guardada en la cola`, 'err')
        else if (r.estado && r.estado.color !== 'verde') toast(`Lectura recibida · ${r.estado.texto}`, 'err')
        else toast('Lectura recibida y registrada')
      }),
    simularReinicio: (d) =>
      ejecutar(async () => {
        const r = await dispositivosApi.simularLectura(d.id, true)
        setPayload(r.payload)
        toast(r.encolada ? 'Lectura encolada (sin señal)' : 'Lectura inconsistente detectada: se generó una alerta', 'err')
      }),
    desconectar: (d) =>
      ejecutar(async () => {
        await dispositivosApi.cambiarConexion(d.id, false)
        toast('Sin señal: las lecturas se guardarán en cola', 'err')
      }),
    reconectar: (d) =>
      ejecutar(async () => {
        const r = await dispositivosApi.cambiarConexion(d.id, true)
        toast(`Reconectado: ${r.total} lectura(s) enviadas desde la cola`)
      }),
    baja: async (d) => {
      const ok = await confirmar({
        titulo: 'Dar de baja dispositivo',
        mensaje: `¿Dar de baja el dispositivo ${d.deviceId}? Se desvinculará de su equipo.`,
        confirmar: 'Dar de baja',
        peligro: true,
      })
      if (ok) {
        await ejecutar(async () => {
          await dispositivosApi.darDeBaja(d.id)
          toast('Dispositivo dado de baja')
        })
      }
      return ok
    },
  }
}

/** Botones de simulación y conexión (Lectura · reinicio · Sin señal / Reconectar) */
export function BotonesSimulacion({ d, acc }) {
  if (!d.equipoId || d.estado === 'baja') return null
  return (
    <>
      <Button size="sm" variant="primary" icon="play" iconSize={14} disabled={acc.ocupado} onClick={() => acc.simular(d)}>
        Lectura
      </Button>{' '}
      <Button
        size="sm"
        icon="alert"
        iconSize={14}
        aria-label="Simular reinicio"
        title="Simular reinicio del horómetro (ej: de 2.000 a 3 h)"
        disabled={acc.ocupado}
        onClick={() => acc.simularReinicio(d)}
      />{' '}
      {d.estado === 'online' ? (
        <Button size="sm" icon="wifiOff" iconSize={14} disabled={acc.ocupado} onClick={() => acc.desconectar(d)}>
          Sin señal
        </Button>
      ) : (
        <Button size="sm" variant="dark" icon="wifi" iconSize={14} disabled={acc.ocupado} onClick={() => acc.reconectar(d)}>
          Reconectar
        </Button>
      )}{' '}
    </>
  )
}

/** JSON con colores para la consola (jsonColor() del prototipo) */
export function JsonColor({ datos }) {
  const lineas = JSON.stringify(datos, null, 2).split('\n')
  return lineas.map((linea, i) => {
    const m = /^(\s*)"(\w+)": (.*?)(,?)$/.exec(linea)
    if (!m) return <span key={i}>{linea}{'\n'}</span>
    const [, sangria, clave, valor, coma] = m
    const clase = valor.startsWith('"') ? 's' : /^-?[\d.]+$/.test(valor) ? 'n' : ''
    return (
      <span key={i}>
        {sangria}<span className="k">"{clave}"</span>: {clase ? <span className={clase}>{valor}</span> : valor}{coma}{'\n'}
      </span>
    )
  })
}

/** Panel "Último paquete recibido" */
export function ConsolaPaquete({ payload }) {
  return (
    <div className="panel panel-pad" style={{ marginTop: 20 }}>
      <div className="console-head">
        <h2 className="panel-title" style={{ margin: 0 }}>
          <Icon name="send" size={20} />
          Último paquete recibido
        </h2>
        <span className="mono small muted">POST /api/telemetria · JSON</span>
      </div>
      <pre className="console">
        {payload ? <JsonColor datos={payload} /> : '// Usa «Lectura» en un dispositivo para ver el JSON que envía el ESP32 o el GPS'}
      </pre>
    </div>
  )
}

export const ESTADOS_DISPOSITIVO = {
  online: { color: 'verde', texto: 'En línea', pulse: true },
  offline: { color: 'rojo', texto: 'Sin señal' },
  'sin vincular': { color: 'gris', texto: 'Sin vincular' },
  baja: { color: 'gris', texto: 'De baja' },
}
