# 🎨 CanvaInejoma - Pizarra Interactiva para Aula Local

**CanvaInejoma** es una aplicación web inspirada en Excalidraw, diseñada especialmente para entornos educativos y aulas de informática sin dependencia de una conexión a internet externa. Permite al profesor transmitir sus explicaciones y dibujos en un lienzo infinito en tiempo real a las pantallas de sus estudiantes a través de la red local (LAN).

---

## 🚀 Características Principales

### 👨‍🏫 Panel del Profesor (Administrador)
- **Autenticación Segura:** Ruta `/login` protegida para el profesor.
- **Creación de Admin por Seed:** Script de inicio (`seed`) para crear el usuario administrador inicial en la base de datos.
- **Gestión de Lienzos:** 
  - Nombrado de clase al iniciar lienzo.
  - Generación automática de un enlace/código corto único de **4 caracteres** (combinación de mayúsculas y minúsculas, ej: `aK3x`).
- **Herramientas de Dibujo Completa:**
  - Lápiz de trazado libre.
  - Ajuste de grosor de trazo y paleta de colores.
  - Borrador dinámico (con ajuste de tamaño).
  - Figuras geométricas (rectángulos, círculos, líneas, flechas).
  - Herramienta de selección, traslación y cambio de escala de objetos.
  - **Importación de imágenes:** Posibilidad de cargar imágenes (ej. diagramas matemáticos, mapas, gráficos) al lienzo para explicarlas en tiempo real.
- **Almacenamiento y Exportación:**
  - Guardado del estado vectorial de la clase (JSON) en la base de datos PostgreSQL.
  - Exportación de la pizarra final como imagen (PNG/SVG) para compartir con los alumnos.
- **Control de Sesión:**
  - Botón **"Finalizar Sesión"**: Desactiva e invalida inmediatamente el enlace de 4 caracteres para los estudiantes.
  - **Historial de Clases:** Conserva las clases pasadas en el panel del profesor para consulta, re-edición o exportación posterior.

### 👩‍🎓 Vista de los Estudiantes
- **Acceso Directo:** Sin necesidad de registro ni inicio de sesión; basta con ingresar el código de 4 caracteres o escanear el enlace.
- **Modo Solo Lectura:** Los estudiantes observan en tiempo real lo que el profesor dibuja y explica en el lienzo.
- **Ultraligero:** Transmisión eficiente por WebSockets optimizada para red local.

---

## 🛠️ Arquitectura y Tecnologías

El proyecto está diseñado bajo una arquitectura de microservicios contenerizada con Docker, optimizada para bajo consumo de recursos en hardware escolar modesto.

```
                  +-----------------------------------+
                  |           Nginx (Proxy)           |
                  |     Puerto 80 / Servidor Web      |
                  +-----------------+-----------------+
                                    |
          +-------------------------+-------------------------+
          |                                                   |
          v                                                   v
+-------------------+                               +-------------------+
|  React (Frontend) |                               |  Rust Backend     |
|   Lienzo Canvas   | <=== WebSocket / Rest API ===>|   (Axum/Rocket)   |
+-------------------+                               +---------+---------+
                                                              |
                                                              v
                                                    +-------------------+
                                                    |    PostgreSQL     |
                                                    |  Base de Datos    |
                                                    +-------------------+
```

- **Frontend:** React + Fabric.js / Konva.js (Manejo vectorial del lienzo infinito) + Nginx.
- **Backend:** Rust (`Axum` o `Rocket`) con soporte para WebSockets y Tokio (Ultra bajo consumo de memoria RAM y CPU).
- **Base de Datos:** PostgreSQL.
- **Comunicación en Tiempo Real:** WebSockets (difusión Pub/Sub de eventos del lienzo del profesor a los estudiantes).
- **Contenerización:** Docker & Docker Compose.

---

## 📂 Estructura del Proyecto

```bash
CanvaInejoma/
├── docker-compose.yml
├── README.md
├── backend/
│   ├── Cargo.toml
│   ├── Dockerfile
│   └── src/
│       ├── main.rs
│       ├── models/
│       ├── routes/
│       ├── websockets/
│       └── db/
│           └── seed.rs       # Script para crear usuario admin
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   └── src/
│       ├── components/
│       │   ├── Canvas/
│       │   ├── Toolbar/
│       │   └── History/
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── TeacherCanvas.jsx
│       │   └── StudentView.jsx
│       └── App.jsx
└── scripts/
    └── run-seed.sh
```

---

## 🗄️ Modelo de Datos (PostgreSQL)

### Tabla `users` (Profesores/Admins)
| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID / SERIAL | Identificador único |
| `username` | VARCHAR(50) | Nombre de usuario |
| `password_hash` | TEXT | Contraseña cifrada (Argon2 / bcrypt) |
| `created_at` | TIMESTAMP | Fecha de creación |

### Tabla `sessions` (Clases / Salones)
| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Identificador de la clase |
| `title` | VARCHAR(100) | Nombre de la clase/tema |
| `code` | VARCHAR(4) | Código de acceso corto (ej. `aK3x`) |
| `is_active` | BOOLEAN | Estado de la sesión (`true` activa, `false` al finalizar) |
| `canvas_data` | JSONB | Estado vectorial completo de la pizarra |
| `user_id` | FK(users.id) | Profesor propietario |
| `created_at` | TIMESTAMP | Fecha de inicio |
| `ended_at` | TIMESTAMP | Fecha de finalización |

---

## 🔤 Algoritmo de Generación de Código Corto (4 Caracteres)

Al presionar "Iniciar Lienzo":
1. Se genera una cadena aleatoria de 4 caracteres combinando letras mayúsculas y minúsculas (`[a-z, A-Z]`, base 52).
2. Se verifica la unicidad en la tabla de `sessions` activas.
3. El enlace resultante es distribuido a los estudiantes (ej: `http://192.168.1.100/r/aK3x`).

---

## ⚡ Despliegue con Docker

### Requisitos Previos
- Docker Engine y Docker Compose instalados en el servidor local de la escuela.

### Pasos para Ejecutar

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/tu-usuario/CanvaInejoma.git
   cd CanvaInejoma
   ```

2. **Crear archivo de variables de entorno `.env`:**
   ```env
   POSTGRES_USER=canvas_admin
   POSTGRES_PASSWORD=super_secret_password
   POSTGRES_DB=canva_inejoma
   DATABASE_URL=postgres://canvas_admin:super_secret_password@db:5432/canva_inejoma
   JWT_SECRET=tu_clave_secreta_jwt
   PORT=8000
   ```

3. **Iniciar los servicios en segundo plano:**
   ```bash
   docker-compose up -d --build
   ```

4. **Ejecutar el script de Seed (Crear Admin):**
   ```bash
   docker-compose exec backend cargo run --bin seed
   ```
   > **Nota:** El script creará el usuario `admin` con las credenciales por defecto configuradas en el script o variables de entorno.

5. **Acceso al Aplicativo:**
   - **Profesor (Login):** `http://<IP-LOCAL-SERVIDOR>/login`
   - **Estudiantes:** `http://<IP-LOCAL-SERVIDOR>/r/<CODIGO_4_CARACTERES>`

---

## 🎨 Diagrama de Flujo de Datos en Tiempo Real

```
[Profesor dibuja en Canvas]
           │
           ▼ (Evento Canvas: object:added / object:modified)
[Frontend React (Teacher)]
           │
           ▼ (WebSocket Message: Send stroke data)
[Backend Rust (Axum/Rocket)]
           │
           ├──► [Guarda/Actualiza Buffer de Sesión]
           │
           ▼ (WebSocket Broadcast a la Sala)
[Frontend React (Estudiantes en /r/:code)]
           │
           ▼ (Renderiza objeto en Canvas solo-lectura)
[Estudiante ve el trazo en pantalla]
```

---

## 📝 Licencia

Este proyecto fue desarrollado para el ámbito educativo en entornos de aula local bajo la licencia MIT.
