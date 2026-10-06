import { useEffect, useState } from 'react'
import { apiGet } from './services/api'
import './App.css'

function App() {
  const [status, setStatus] = useState('Conectando con el backend...')

  useEffect(() => {
    apiGet('/health/')
      .then((data) => setStatus(data.message))
      .catch(() => setStatus('No se pudo conectar con el backend'))
  }, [])

  return (
    <main>
      <h1>VilasSoftware</h1>
      <p>React + Vite + Django</p>
      <p className="status">{status}</p>
    </main>
  )
}

export default App
