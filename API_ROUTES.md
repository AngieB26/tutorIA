# API Routes Documentation

Esta documentación describe todas las API routes disponibles después de la migración a Prisma/Neon.

## Base URL
Todas las rutas están bajo `/api/`

## Endpoints

### Estudiantes

#### `GET /api/estudiantes`
Obtiene todos los estudiantes o filtra por grado/nombre.

**Query Parameters:**
- `grado` (opcional): Filtra estudiantes por grado
- `nombre` (opcional): Obtiene un estudiante específico por nombre

**Ejemplo:**
```typescript
// Todos los estudiantes
GET /api/estudiantes

// Por grado
GET /api/estudiantes?grado=3ro

// Por nombre
GET /api/estudiantes?nombre=Juan Pérez
```

#### `POST /api/estudiantes`
Guarda uno o varios estudiantes.

**Body:**
- Objeto `EstudianteInfo` para guardar uno
- Array de `EstudianteInfo[]` para guardar varios

**Ejemplo:**
```typescript
POST /api/estudiantes
Content-Type: application/json

{
  "nombre": "Juan Pérez",
  "grado": "3ro",
  "seccion": "A",
  ...
}
```

---

### Incidencias

#### `GET /api/incidencias`
Obtiene incidencias con varios filtros opcionales.

**Query Parameters:**
- `studentName`: Filtra por nombre de estudiante
- `fechaInicio` y `fechaFin`: Filtra por rango de fechas
- `gravedad`: Filtra por gravedad ('grave', 'moderada', 'leve', 'todas')
- `tipo`: Filtra por tipo
- `tipoDerivacion`: Filtra por tipo de derivación
- `completas`: Si es 'true', retorna incidencias completas del estudiante

**Ejemplo:**
```typescript
GET /api/incidencias
GET /api/incidencias?studentName=Juan Pérez
GET /api/incidencias?fechaInicio=2024-01-01&fechaFin=2024-12-31
GET /api/incidencias?gravedad=grave
```

#### `POST /api/incidencias`
Agrega una nueva incidencia o guarda múltiples.

**Body:**
- Objeto `Incidencia` (sin `id` ni `timestamp`) para agregar una
- Array de `Incidencia[]` para guardar múltiples

#### `PATCH /api/incidencias?id=...`
Actualiza el estado de una incidencia.

**Query Parameters:**
- `id`: ID de la incidencia

**Body:**
```json
{
  "nuevoEstado": "Resuelta",
  "usuario": "Director"
}
```

O para marcar como resuelta:
```json
{
  "resuelta": true,
  "resueltaPor": "Director"
}
```

---

### Incidencias Helpers

#### `GET /api/incidencias/helpers`
Funciones helper para incidencias.

**Query Parameters:**
- `action`: Tipo de acción
  - `derivadas`: Obtiene incidencias derivadas
  - `lista-estudiantes`: Lista de estudiantes con conteo de incidencias
  - `completas`: Incidencias completas de un estudiante
- `tipo`: Para `action=derivadas`, el tipo de derivación
- `studentName`: Para `action=completas`, el nombre del estudiante

**Ejemplo:**
```typescript
GET /api/incidencias/helpers?action=derivadas
GET /api/incidencias/helpers?action=derivadas&tipo=director
GET /api/incidencias/helpers?action=lista-estudiantes
GET /api/incidencias/helpers?action=completas&studentName=Juan Pérez
```

---

### Tutores

#### `GET /api/tutores`
Obtiene todos los tutores.

#### `POST /api/tutores`
Guarda múltiples tutores.

**Body:** Array de `Tutor[]`

---

### Tutores Grado Sección

#### `GET /api/tutores-grado-seccion`
Obtiene asignaciones de tutores a grados/secciones.

**Query Parameters:**
- `grado` y `seccion`: Obtiene la asignación específica
- `tutorId`: Obtiene la asignación de un tutor específico

#### `POST /api/tutores-grado-seccion`
Asigna o remueve tutores de grados/secciones.

**Body para asignar:**
```json
{
  "action": "set",
  "grado": "3ro",
  "seccion": "A",
  "tutorId": "t1",
  "tutorNombre": "Prof. García"
}
```

**Body para remover:**
```json
{
  "action": "remove",
  "grado": "3ro",
  "seccion": "A"
}
```

**Body para guardar múltiples:**
Array de `TutorGradoSeccion[]`

---

### Clases

#### `GET /api/clases`
Obtiene clases con filtros opcionales.

**Query Parameters:**
- `profesor`: Filtra por profesor
- `grado` y `seccion`: Filtra por grado y sección

#### `POST /api/clases`
Guarda una o múltiples clases.

**Body:**
- Objeto `Clase` (sin `id`) para agregar una
- Array de `Clase[]` para guardar múltiples

---

### Notas

#### `GET /api/notas`
Obtiene notas.

**Query Parameters:**
- `studentName`: Filtra por nombre de estudiante

#### `POST /api/notas`
Guarda múltiples notas.

**Body:** Array de `Nota[]`

---

## Uso en el Frontend

Usa las funciones helper de `lib/api.ts` en lugar de llamar directamente a las APIs:

```typescript
import { fetchEstudiantes, fetchIncidencias, addIncidencia } from '@/lib/api';

// En un componente
const estudiantes = await fetchEstudiantes();
const incidencias = await fetchIncidencias({ studentName: 'Juan Pérez' });
await addIncidencia(nuevaIncidencia);
```

## Notas

- Todas las respuestas exitosas retornan JSON
- Los errores retornan `{ error: "mensaje" }` con el status code apropiado
- Las funciones helper manejan automáticamente los errores y lanzan excepciones
- Grados y Secciones siguen usando localStorage (son datos de configuración simples)

