/* Catálogos de solo lectura: categorías, destinos, insumos (Softland) y auditoría */
import { api } from './http'

export const getCategorias = () => api.get('/categorias/')
export const getDestinos = () => api.get('/destinos/')
export const getBase = async () => (await api.get('/base/')).base
export const getInsumos = () => api.get('/insumos/')
export const getAuditoria = () => api.get('/auditoria/')

/** Cifras de la portada del login (equipos, destinos y dispositivos IoT) */
export const getResumenLogin = () => api.get('/resumen-login/')
