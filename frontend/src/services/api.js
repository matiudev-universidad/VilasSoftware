const API_URL = import.meta.env.VITE_API_URL ?? '/api'

export async function apiGet(path) {
  const response = await fetch(`${API_URL}${path}`)
  if (!response.ok) {
    throw new Error(`Error ${response.status} al llamar a ${path}`)
  }
  return response.json()
}
