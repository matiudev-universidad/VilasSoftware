# VilasSoftware · Sistema de Control de Mantenciones

Sistema web para controlar las mantenciones preventivas de la flota de **Vila's Motor (base Iquique)**:
horómetros, alertas por semáforo, registro de mantenciones e insumos, dispositivos IoT (ESP32 / GPS),
telemetría, reportes y auditoría.

- **Frontend:** React 19 + Vite
- **Backend:** Django 6 + Django REST Framework
- **Base de datos:** SQLite (se crea sola, no hay que instalar nada)

---

## 1. Requisitos

Instala esto antes de empezar:

| Programa | Versión | Para qué | Cómo comprobarlo |
|---|---|---|---|
| [Python](https://www.python.org/downloads/) | **3.12 o superior** | Backend (Django) | `python --version` |
| [Node.js](https://nodejs.org/) | **20 o superior** (trae `npm`) | Frontend (React) | `node --version` |
| [Git](https://git-scm.com/) | cualquiera | Descargar el proyecto | `git --version` |

> **Windows:** al instalar Python marca la casilla **"Add Python to PATH"**.
> **macOS / Linux:** si `python` no existe, usa `python3` en todos los comandos.

---

## 2. Descargar el proyecto

```bash
git clone https://github.com/matiudev-universidad/VilasSoftware.git
cd VilasSoftware
```

El sistema necesita **dos terminales abiertas al mismo tiempo**: una para el backend y otra para el frontend.

---

## 3. Backend (Django) · Terminal 1

Todos los comandos se ejecutan dentro de la carpeta `backend`.

**3.1. Entrar a la carpeta**

```bash
cd backend
```

**3.2. Crear el entorno virtual** (solo la primera vez)

```bash
python -m venv .venv
```

**3.3. Activar el entorno virtual** (cada vez que abras una terminal nueva)

| Sistema | Comando |
|---|---|
| Windows (PowerShell) | `.venv\Scripts\Activate.ps1` |
| Windows (CMD) | `.venv\Scripts\activate.bat` |
| macOS / Linux | `source .venv/bin/activate` |

Cuando está activo, la terminal muestra `(.venv)` al inicio de la línea.

> Si PowerShell dice que *la ejecución de scripts está deshabilitada*, ejecuta una vez
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` y vuelve a intentar.

**3.4. Instalar dependencias** (solo la primera vez)

```bash
pip install -r requirements.txt
```

**3.5. Crear el archivo de configuración `.env`** (solo la primera vez)

| Sistema | Comando |
|---|---|
| Windows | `copy .env.example .env` |
| macOS / Linux | `cp .env.example .env` |

Los valores por defecto sirven para probar el sistema en el computador local; no hay que cambiar nada.

**3.6. Crear la base de datos** (solo la primera vez)

```bash
python manage.py migrate
```

Crea el archivo `db.sqlite3` con todas las tablas.

**3.7. Cargar los datos iniciales** (solo la primera vez)

```bash
python manage.py cargar_datos
```

Carga los usuarios de prueba, las categorías, los destinos, los insumos de bodega y la flota real de Iquique.
Debe terminar con un mensaje como:

```
Datos cargados: 384 equipos, 390 mantenciones, 377 lecturas, 208 dispositivos, 5 usuarios.
```

> ⚠️ **Sin este paso la base queda vacía y no se puede iniciar sesión.**

**3.8. Levantar el servidor**

```bash
python manage.py runserver
```

El backend queda en **http://127.0.0.1:8000**. Deja esta terminal abierta.
Para comprobarlo, abre http://127.0.0.1:8000/api/health/; debe responder `{"status": "ok", ...}`.

---

## 4. Frontend (React) · Terminal 2

Abre **otra** terminal en la carpeta del proyecto.

**4.1. Entrar a la carpeta e instalar dependencias** (solo la primera vez)

```bash
cd frontend
npm install
```

**4.2. Levantar el frontend**

```bash
npm run dev
```

Abre **http://localhost:5173** en el navegador.

En desarrollo, Vite redirige todas las peticiones a `/api` hacia Django (`http://127.0.0.1:8000`),
así que no hay que configurar CORS ni URLs.

---

## 5. Cómo entrar al sistema

Inicia sesión en http://localhost:5173 con el **correo** de uno de estos usuarios de prueba.

> 🔑 **La contraseña de los usuarios de prueba se entrega en el informe final del proyecto**
> (no se publica en el repositorio por seguridad).

| Usuario | Correo | Rol | Qué puede hacer |
|---|---|---|---|
| Rodrigo Soto | `admin@vilasmotors.cl` | Administrador del sistema | Todo: equipos, lecturas, mantenciones, alertas, reportes, dispositivos, auditoría y restablecer datos |
| James Ramírez | `james@vilasmotors.cl` | Encargada de Planificación | Equipos (crear, editar, dar de baja), lecturas, mantenciones, alertas, reportes y ver dispositivos |
| Camila Rojas | `asistente@vilasmotors.cl` | Asistente de Planificación | Registrar y corregir lecturas, registrar mantenciones y ver insumos |
| Marcelo Henríquez | `ti@vilasmotors.cl` | TI · Soporte de sistemas | Gestionar dispositivos IoT (ESP32 / GPS) y ver la auditoría |
| Diego Muñoz | `practicante@vilasmotors.cl` | Practicante | Solo lectura |

Recomendamos entrar primero como **administrador** para recorrer todos los módulos.

**Verificación en dos pasos (código al correo)**

1. Ingresa el correo y la contraseña y presiona **Ingresar**.
2. Se abre la ventana **"Verificación en dos pasos"**. Como el proyecto no tiene un servicio de correo,
   el correo que llegaría se **simula dentro de la misma ventana** ("Correo simulado") y muestra el código.
3. Escribe ese código de 6 dígitos (se verifica solo al completar los 6) y entras al sistema.

Reglas del código:

- Es **aleatorio y distinto en cada inicio de sesión**; en la base de datos solo se guarda cifrado.
- **Vence en 5 minutos** y sirve **una sola vez**.
- Con **5 códigos incorrectos** se anula y hay que volver a ingresar la contraseña.
- **"Reenviar código"** genera uno nuevo (anula el anterior) y se habilita después de 30 segundos.
- El "correo" también aparece en la terminal donde corre `python manage.py runserver`.

**Seguridad del inicio de sesión**

- Tras **5 intentos fallidos** la cuenta se bloquea **5 minutos**.
- Al cambiar la contraseña (botón del candado 🔒 junto al nombre del usuario, abajo en el menú lateral) se exigen **12 caracteres o más y al menos un carácter especial**.
- Las contraseñas se guardan cifradas (PBKDF2-SHA256), nunca en texto plano.

**Panel de administración de Django**

El administrador también puede entrar a **http://127.0.0.1:8000/admin/** con las mismas credenciales
para revisar o corregir datos directamente en las tablas.

---

## 6. Uso diario (después de la primera vez)

Solo hay que levantar los dos servidores:

**Terminal 1 (backend):**

```bash
cd backend
```

Activa el entorno virtual (paso 3.3) y luego:

```bash
python manage.py runserver
```

**Terminal 2 (frontend):**

```bash
cd frontend
npm run dev
```

---

## 7. Volver a los datos iniciales

- **Desde el sistema:** como administrador, botón **"Restablecer datos"** en la barra superior.
- **Desde la terminal** (backend con el entorno virtual activo):

```bash
python manage.py cargar_datos --reset
```

Después de hacer `git pull`, ejecuta `python manage.py migrate` por si llegaron cambios en la base de datos.

---

## 8. Problemas frecuentes

| Problema | Solución |
|---|---|
| `python` no se reconoce | Reinstala Python marcando *Add Python to PATH*, o usa `py` (Windows) / `python3` (macOS/Linux). |
| `No module named django` | El entorno virtual no está activo: repite el paso 3.3. |
| No puedo iniciar sesión / "Correo o contraseña incorrectos" | Revisa que hayas ejecutado `python manage.py cargar_datos` (paso 3.7) y que uses el correo completo. |
| "Cuenta bloqueada temporalmente" | Hubo 5 intentos fallidos: espera 5 minutos. |
| "El código venció" o "Demasiados códigos incorrectos" | Usa **Reenviar código** o vuelve a ingresar correo y contraseña. |
| La página carga pero no muestra datos o da error de red | El backend no está corriendo: revisa la Terminal 1 (`python manage.py runserver`). |
| `Port 8000 is already in use` | Ya hay un servidor abierto. Ciérralo, o usa `python manage.py runserver 8001` y cambia el puerto en `frontend/vite.config.js`. |
| `no such table` | Falta crear la base: `python manage.py migrate`. |

---

## 9. Otros comandos

| Dónde | Comando | Qué hace |
|---|---|---|
| `backend` | `python manage.py test` | Ejecuta las pruebas del backend |
| `frontend` | `npm run build` | Genera la versión de producción en `frontend/dist` |
| `frontend` | `npm run lint` | Revisa el código del frontend |
| `frontend` | `npm run preview` | Sirve la versión de producción generada |

Para producción, `VITE_API_URL` (en `frontend/.env`) define la URL pública del backend, y en `backend/.env`
hay que poner `DJANGO_DEBUG=False`, una `DJANGO_SECRET_KEY` propia y el dominio en `DJANGO_ALLOWED_HOSTS`.

---

## 10. Estructura del proyecto

```
VilasSoftware/
├── backend/                     # Django + Django REST Framework
│   ├── config/                  # settings.py, urls.py, wsgi/asgi
│   ├── api/                     # App principal
│   │   ├── models.py            # Modelos de la base de datos
│   │   ├── views.py             # Endpoints de la API REST (/api/...)
│   │   ├── urls.py              # Rutas de la API
│   │   ├── logica.py            # Reglas de negocio con base de datos (permisos, auditoría)
│   │   ├── reglas.py            # Reglas puras: roles y permisos, semáforo, aviso anticipado
│   │   ├── serial.py            # Conversión de modelos a JSON
│   │   ├── migrations/          # Historial de cambios de la base de datos
│   │   ├── datos/               # Datos iniciales (semilla.py y flota.json)
│   │   └── management/commands/cargar_datos.py
│   ├── manage.py
│   ├── requirements.txt
│   └── .env.example
└── frontend/                    # React + Vite
    ├── src/
    │   ├── pages/               # Pantallas (Dashboard, Equipos, Mantenciones, Alertas…)
    │   ├── components/          # Componentes reutilizables (ui/, modales por módulo)
    │   ├── services/            # Llamadas a la API (http.js y un archivo por módulo)
    │   ├── auth/                # Sesión y permisos del usuario
    │   ├── layout/              # Menú lateral y barra superior
    │   └── main.jsx, App.jsx
    ├── vite.config.js           # Proxy /api → Django en desarrollo
    ├── package.json
    └── .env.example
```
