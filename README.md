# VilasSoftware

Proyecto con **React + Vite** (frontend) y **Django + Django REST Framework** (backend).

## Estructura

```
VilasSoftware/
├── backend/              # Django
│   ├── config/           # Configuración del proyecto (settings, urls, wsgi/asgi)
│   ├── api/              # App de la API REST
│   ├── manage.py
│   ├── requirements.txt
│   └── .env.example
└── frontend/             # React + Vite
    ├── public/
    ├── src/
    │   ├── services/api.js   # Cliente para llamar al backend
    │   ├── App.jsx
    │   └── main.jsx
    ├── vite.config.js        # Proxy /api -> Django en desarrollo
    ├── package.json
    └── .env.example
```

## Requisitos

- Python 3.12+
- Node.js 20+

## Backend (Django)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # En Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver       # http://127.0.0.1:8000
```

Endpoint de prueba: `GET http://127.0.0.1:8000/api/health/`

Tests: `python manage.py test`

## Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev                      # http://localhost:5173
```

En desarrollo, Vite redirige todas las peticiones a `/api` hacia `http://127.0.0.1:8000`,
así que el frontend puede llamar a `fetch('/api/...')` sin problemas de CORS.
Para producción se puede definir `VITE_API_URL` con la URL pública del backend.

Otros comandos: `npm run build`, `npm run lint`, `npm run preview`.
