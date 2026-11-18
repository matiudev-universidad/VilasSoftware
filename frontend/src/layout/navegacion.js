/* Menú lateral y nombres de ruta (igual que NAV y NOMBRE_RUTA del prototipo).
   permiso: el menú solo muestra lo que el rol puede ver. */
export const NAV = [
  {
    grupo: 'Operación',
    items: [
      { ruta: '/dashboard', texto: 'Panel de flota', icono: 'dashboard', permiso: 'ver' },
      { ruta: '/equipos', texto: 'Equipos', icono: 'truck', permiso: 'ver' },
      { ruta: '/telemetria', texto: 'Telemetría y horómetros', icono: 'gauge', permiso: 'ver' },
      { ruta: '/alertas', texto: 'Alertas', icono: 'bell', permiso: 'ver', badge: 'alertas' },
      { ruta: '/mantenciones', texto: 'Mantenciones', icono: 'wrench', permiso: 'ver' },
    ],
  },
  {
    grupo: 'Recursos',
    items: [
      { ruta: '/dispositivos', texto: 'Dispositivos IoT', icono: 'antenna', permiso: 'verDispositivos' },
      { ruta: '/insumos', texto: 'Insumos bodega', icono: 'package', permiso: 'verInsumos' },
    ],
  },
  {
    grupo: 'Gestión',
    items: [
      { ruta: '/reportes', texto: 'Reportes', icono: 'file', permiso: 'reportes' },
      { ruta: '/auditoria', texto: 'Auditoría', icono: 'shield', permiso: 'auditoria' },
    ],
  },
]

/** Nombre que aparece en las migas de la barra superior, según el primer segmento de la ruta */
export const NOMBRE_RUTA = {
  dashboard: 'Panel de flota',
  equipos: 'Equipos',
  equipo: 'Ficha de equipo',
  telemetria: 'Telemetría y horómetros',
  alertas: 'Alertas',
  mantenciones: 'Mantenciones',
  dispositivos: 'Dispositivos IoT',
  dispositivo: 'Ficha de dispositivo',
  insumos: 'Insumos',
  reportes: 'Reportes',
  auditoria: 'Auditoría',
}
