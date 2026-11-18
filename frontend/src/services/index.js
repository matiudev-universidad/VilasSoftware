/* ==========================================================================
   CAPA DE SERVICIOS — único punto de acceso a los datos desde la interfaz.
   Cada función llama a la API de Django (ver http.js) y devuelve una promesa.
   Si la API rechaza la operación, lanzan Error con un mensaje listo para mostrar.
   ========================================================================== */
export * as auth from './auth'
export * as catalogos from './catalogos'
export * as equiposApi from './equipos'
export * as lecturasApi from './lecturas'
export * as mantencionesApi from './mantenciones'
export * as alertasApi from './alertas'
export * as dispositivosApi from './dispositivos'
export * as telemetriaApi from './telemetria'
export { useConsulta } from './useConsulta'
