# expo-registro — Backend

API REST para la gestión de exposiciones académicas: materias, grupos, alumnos, equipos, exposiciones y evaluaciones con rúbrica.

**Stack:** Node.js 20 · Fastify 4 · TypeScript · Supabase (PostgreSQL) · JWT  
**Deploy:** Railway — `https://expo-registro-back-production.up.railway.app`

---

## Instalación local

```bash
# 1. Clonar e instalar dependencias
git clone https://github.com/junior-cemelle/expo-registro-back
cd expo-registro-back
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de Supabase

# 3. Iniciar en modo desarrollo
npm run dev
```

La API queda disponible en `http://localhost:8080`.

### Variables de entorno (`.env`)

| Variable | Descripción | Dónde obtenerla |
|---|---|---|
| `SUPABASE_URL` | URL del proyecto Supabase | Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio (acceso total) | Dashboard → Settings → API → service_role |
| `JWT_SECRET` | Secreto para firmar tokens JWT | Cadena aleatoria ≥ 32 chars |
| `JWT_EXPIRES_IN` | Vigencia del token en segundos | `86400` (24 h) |
| `PORT` | Puerto del servidor | `8080` |
| `FRONTEND_URL` | URL del frontend para CORS | `http://localhost:3000` en dev |

---

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor con hot-reload (tsx watch) |
| `npm run build` | Compilar TypeScript → `dist/` |
| `npm start` | Ejecutar build compilado |

---

## Autenticación

Todos los endpoints (excepto `/` y `POST /api/v1/auth/login`) requieren el header:

```
Authorization: Bearer <token>
```

El token se obtiene en el login y expira en 24 horas.

---

## Endpoints

Base URL: `/api/v1`

### Health check

#### `GET /`
Verifica que el servidor y la base de datos están operativos. No requiere autenticación.

**Respuesta 200**
```json
{
  "status": "ok",
  "timestamp": "2025-11-15T10:00:00.000Z",
  "version": "1.0.0",
  "database": "ok"
}
```

**Respuesta 503** (si la BD no responde)
```json
{
  "status": "degraded",
  "database": "error",
  "database_error": "mensaje del error"
}
```

---

### Auth

#### `POST /api/v1/auth/login`
Autentica un usuario y retorna un token JWT.

**Body**
```json
{
  "email": "admin@mail.com",
  "password": "123456"
}
```

**Respuesta 200**
```json
{
  "token": "eyJhbGci...",
  "expiresIn": 86400,
  "tipo": "Bearer",
  "id_alumno": 7,
  "rol": "admin"
}
```

**Respuesta 401** — credenciales inválidas

---

#### `GET /api/v1/auth/me`
Retorna los datos del usuario autenticado.

**Respuesta 200**
```json
{
  "id_alumno": 7,
  "numero_control": "D20230001",
  "nombre": "Admin",
  "apellido": "Sistema",
  "email": "admin@mail.com",
  "rol": "admin"
}
```

---

### Materias

#### `GET /api/v1/materias`
Lista paginada de materias.

**Query params**
| Parámetro | Tipo | Descripción |
|---|---|---|
| `page` | integer | Página base 0 (default: 0) |
| `size` | integer | Registros por página (default: 10, max: 100) |
| `nombre` | string | Filtro parcial insensible a mayúsculas |

**Respuesta 200**
```json
{
  "content": [
    { "id_materia": 1, "clave_materia": "PROG-01", "nombre_materia": "Programación Web" }
  ],
  "page": 0,
  "size": 10,
  "totalElements": 3,
  "totalPages": 1
}
```

---

#### `POST /api/v1/materias`
Crea una nueva materia.

**Body**
```json
{
  "clave_materia": "PROG-01",
  "nombre_materia": "Programación Web"
}
```

**Respuesta 201** — objeto `Materia` creado  
**Respuesta 409** — clave duplicada

---

#### `GET /api/v1/materias/:id`
**Respuesta 200** — objeto `Materia`  
**Respuesta 404** — no encontrada

---

#### `PUT /api/v1/materias/:id`
**Body** — igual que POST  
**Respuesta 200** — objeto `Materia` actualizado

---

#### `DELETE /api/v1/materias/:id`
**Respuesta 204** — eliminada  
**Respuesta 409** — tiene grupos asociados (no se puede eliminar)

---

### Grupos

#### `GET /api/v1/grupos`
**Query params:** `page`, `size`, `id_materia`, `ciclo_escolar`

**Respuesta 200**
```json
{
  "content": [
    {
      "id_grupo": 1,
      "nombre_grupo": "Grupo A",
      "ciclo_escolar": "2025-A",
      "id_materia": 1,
      "nombre_materia": "Programación Web"
    }
  ],
  "page": 0, "size": 10, "totalElements": 1, "totalPages": 1
}
```

#### `POST /api/v1/grupos`
```json
{ "nombre_grupo": "Grupo A", "ciclo_escolar": "2025-A", "id_materia": 1 }
```

#### `GET /api/v1/grupos/:id` · `PUT /api/v1/grupos/:id` · `DELETE /api/v1/grupos/:id`

---

#### `GET /api/v1/grupos/:id/alumnos`
Lista los alumnos asignados al grupo.

**Respuesta 200** — array de objetos `Alumno`

---

#### `POST /api/v1/grupos/:id/alumnos`
Asigna un alumno al grupo. Un alumno no puede estar en más de un grupo por materia (RN-02).

**Body**
```json
{ "id_alumno": 5 }
```

**Respuesta 201** — asignado  
**Respuesta 409** — el alumno ya pertenece a un grupo de esta materia

---

### Alumnos

#### `GET /api/v1/alumnos`
**Query params:** `page`, `size`, `nombre` (busca en nombre y apellido), `rol` (`admin` | `docente` | `alumno`)

**Respuesta 200**
```json
{
  "content": [
    {
      "id_alumno": 1,
      "numero_control": "A20220001",
      "nombre": "Juan",
      "apellido": "Pérez García",
      "email": "juan.perez@mail.com",
      "rol": "alumno"
    }
  ],
  "page": 0, "size": 10, "totalElements": 6, "totalPages": 1
}
```

#### `POST /api/v1/alumnos`
```json
{
  "numero_control": "A20220001",
  "nombre": "Juan",
  "apellido": "Pérez García",
  "email": "juan.perez@mail.com",
  "password": "Segura123!",
  "rol": "alumno"
}
```
> La contraseña se almacena hasheada con bcrypt. El campo `password` nunca se retorna en las respuestas.

**Respuesta 201** — objeto `Alumno` (sin password)  
**Respuesta 409** — numero_control o email duplicado

#### `GET /api/v1/alumnos/:id` · `PUT /api/v1/alumnos/:id` · `DELETE /api/v1/alumnos/:id`

---

### Equipos

#### `GET /api/v1/equipos`
**Query params:** `page`, `size`, `id_grupo`

**Respuesta 200**
```json
{
  "content": [
    {
      "id_equipo": 1,
      "nombre_equipo": "Equipo Alpha",
      "id_grupo": 1,
      "nombre_grupo": "Grupo A",
      "alumnos": [
        { "id_alumno": 1, "nombre": "Juan", "apellido": "Pérez García", ... }
      ]
    }
  ],
  "page": 0, "size": 10, "totalElements": 1, "totalPages": 1
}
```

#### `POST /api/v1/equipos`
```json
{ "nombre_equipo": "Equipo Alpha", "id_grupo": 1 }
```

#### `GET /api/v1/equipos/:id` · `PUT /api/v1/equipos/:id` · `DELETE /api/v1/equipos/:id`

---

#### `POST /api/v1/equipos/:id/alumnos`
Asigna un alumno al equipo. Un alumno no puede estar en más de un equipo por grupo (RN-03).

**Body**
```json
{ "id_alumno": 3 }
```

**Respuesta 201** — asignado  
**Respuesta 409** — el alumno ya pertenece a otro equipo en este grupo

---

### Exposiciones

#### `GET /api/v1/exposiciones`
**Query params:** `page`, `size`, `id_equipo`

**Respuesta 200**
```json
{
  "content": [
    {
      "id_exposicion": 1,
      "tema": "Introducción a REST y OpenAPI",
      "fecha": "2025-11-15",
      "id_equipo": 1,
      "nombre_equipo": "Equipo Alpha"
    }
  ],
  "page": 0, "size": 10, "totalElements": 1, "totalPages": 1
}
```

#### `POST /api/v1/exposiciones`
```json
{ "tema": "Arquitecturas de Microservicios", "fecha": "2025-11-15", "id_equipo": 2 }
```

#### `GET /api/v1/exposiciones/:id` · `PUT /api/v1/exposiciones/:id` · `DELETE /api/v1/exposiciones/:id`

---

#### `GET /api/v1/exposiciones/:id/evaluaciones`
Lista todas las evaluaciones registradas para la exposición.

**Respuesta 200** — array de objetos `Evaluacion` (ver formato en sección Evaluaciones)

---

### Criterios

#### `GET /api/v1/criterios`
**Query params:** `page`, `size`

**Respuesta 200**
```json
{
  "content": [
    {
      "id_criterio": 1,
      "nombre_criterio": "Dominio del tema",
      "descripcion": "El equipo demuestra conocimiento profundo del tema",
      "puntaje_maximo": 10
    }
  ],
  "page": 0, "size": 10, "totalElements": 4, "totalPages": 1
}
```

#### `POST /api/v1/criterios`
```json
{
  "nombre_criterio": "Dominio del tema",
  "descripcion": "El equipo demuestra conocimiento profundo del tema",
  "puntaje_maximo": 10
}
```

#### `GET /api/v1/criterios/:id` · `PUT /api/v1/criterios/:id` · `DELETE /api/v1/criterios/:id`

---

### Evaluaciones

#### `GET /api/v1/evaluaciones`
**Query params:** `page`, `size`, `id_alumno_evaluador`

**Respuesta 200**
```json
{
  "content": [
    {
      "id_evaluacion": 1,
      "id_exposicion": 1,
      "id_alumno_evaluador": 3,
      "fecha_evaluacion": "2025-11-15T10:30:00",
      "detalles": [
        { "id_criterio": 1, "nombre_criterio": "Dominio del tema", "calificacion": 9.0 },
        { "id_criterio": 2, "nombre_criterio": "Claridad expositiva", "calificacion": 8.5 }
      ],
      "promedio": 8.75
    }
  ],
  "page": 0, "size": 10, "totalElements": 1, "totalPages": 1
}
```

---

#### `POST /api/v1/evaluaciones`
Registra la evaluación completa de un alumno sobre una exposición.

**Reglas de negocio:**
- RN-04: Un alumno no puede evaluar la misma exposición dos veces
- RN-05: El evaluador no puede pertenecer al equipo que expone

**Body**
```json
{
  "id_exposicion": 2,
  "id_alumno_evaluador": 5,
  "detalles": [
    { "id_criterio": 1, "calificacion": 9.0 },
    { "id_criterio": 2, "calificacion": 8.5 },
    { "id_criterio": 3, "calificacion": 7.0 },
    { "id_criterio": 4, "calificacion": 8.0 }
  ]
}
```

**Respuesta 201** — objeto `Evaluacion` completo con `promedio` calculado  
**Respuesta 409** — evaluación duplicada o evaluador en el equipo que expone

---

#### `GET /api/v1/evaluaciones/:id`
**Respuesta 200** — objeto `Evaluacion` con detalles y promedio

#### `DELETE /api/v1/evaluaciones/:id`
**Respuesta 204** — eliminada (elimina también todos sus detalles en cascada)

---

## Respuesta de error (formato uniforme)

Todos los errores retornan la misma estructura:

```json
{
  "timestamp": "2025-11-15T10:00:00.000Z",
  "status": 404,
  "error": "Not Found",
  "message": "Recurso con id 99 no encontrado",
  "path": "/api/v1/materias/99"
}
```

| Código | Significado |
|---|---|
| 400 | Datos de entrada inválidos |
| 401 | Token ausente, inválido o expirado |
| 404 | Recurso no encontrado |
| 409 | Conflicto: duplicado o dependencias |
| 503 | Base de datos no disponible |

---

## Esquema de base de datos

```
materia
  id_materia      PK
  clave_materia   UNIQUE
  nombre_materia

alumno
  id_alumno       PK
  numero_control  UNIQUE
  nombre
  apellido
  email           UNIQUE
  password        (hash bcrypt)
  rol             ENUM: admin | docente | alumno

grupo
  id_grupo        PK
  nombre_grupo
  ciclo_escolar
  id_materia      FK → materia

grupo_alumno      (N:M grupo ↔ alumno)
  id_grupo        FK → grupo   (CASCADE)
  id_alumno       FK → alumno  (CASCADE)
  UNIQUE(id_grupo, id_alumno)
  TRIGGER: un alumno no puede estar en más de un grupo por materia (RN-02)

equipo
  id_equipo       PK
  nombre_equipo
  id_grupo        FK → grupo

equipo_alumno     (N:M equipo ↔ alumno)
  id_equipo       FK → equipo  (CASCADE)
  id_alumno       FK → alumno  (CASCADE)
  UNIQUE(id_equipo, id_alumno)
  TRIGGER: un alumno no puede estar en más de un equipo por grupo (RN-03)

criterio
  id_criterio     PK
  nombre_criterio
  descripcion
  puntaje_maximo  DECIMAL (1–10)

exposicion
  id_exposicion   PK
  tema
  fecha           DATE
  id_equipo       FK → equipo

evaluacion
  id_evaluacion   PK
  id_exposicion   FK → exposicion  (RESTRICT)
  id_alumno_evaluador FK → alumno  (CASCADE)
  fecha_evaluacion
  UNIQUE(id_exposicion, id_alumno_evaluador)  ← RN-04

detalle_evaluacion
  id_detalle      PK
  id_evaluacion   FK → evaluacion  (CASCADE)
  id_criterio     FK → criterio    (RESTRICT)
  calificacion    DECIMAL 0–10
  UNIQUE(id_evaluacion, id_criterio)
```

### Diagrama de relaciones

```
materia ──< grupo ──< grupo_alumno >── alumno
                │                        │
                └──< equipo ──< equipo_alumno
                        │
                        └──< exposicion ──< evaluacion ──< detalle_evaluacion
                                                               │
                                          criterio ───────────┘
```

### Vistas disponibles en Supabase

| Vista | Descripción |
|---|---|
| `vista_resumen_evaluacion` | Promedio por evaluación individual |
| `vista_promedio_exposicion` | Promedio general recibido por cada exposición |

---

## Roles y permisos

| Rol | Permisos |
|---|---|
| `admin` | CRUD completo sobre todos los recursos |
| `docente` | Gestión de grupos, equipos, exposiciones y criterios |
| `alumno` | Consulta y registro de evaluaciones propias |

> La validación de roles se implementa en el frontend. El backend valida autenticación (JWT) en todos los endpoints pero no restringe por rol en esta versión.
