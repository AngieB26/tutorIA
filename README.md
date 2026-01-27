# TutorIA

**Gestión Inteligente de Incidencias Estudiantiles**

TutorIA es una plataforma que digitaliza el registro de incidencias y asistencia estudiantil en colegios. Resuelve el problema de los directores que pierden horas buscando información manual cuando un padre visita, ofreciendo digitalización + IA que genera reportes inteligentes automáticos.

🌐 **Demo en vivo**: [https://tutor-ia-iota.vercel.app](https://tutor-ia-iota.vercel.app)

## 🚀 Características

- **Registro Rápido**: Los profesores registran incidencias en menos de 30 segundos
- **Búsqueda Inteligente**: Los directores buscan estudiantes y ven todas sus incidencias de forma organizada
- **Reportes con IA**: Generación automática de reportes que identifican patrones y alertas usando Google Gemini API
- **Gestión de Asistencia**: Registro de asistencia por clase con seguimiento detallado
- **Gestión de Notas**: Registro y seguimiento de calificaciones por materia
- **Gestión de Clases**: Organización de clases por grado, sección y profesor
- **Sistema de Tutores**: Asignación de tutores a grados y secciones
- **Interfaz Moderna**: Diseño profesional tipo dashboard con Tailwind CSS y shadcn/ui

## 🛠️ Stack Tecnológico

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui** para componentes UI
- **PostgreSQL** con **Prisma ORM** para base de datos
- **Google Gemini API** para reportes IA (gratis)

## 📋 Requisitos Previos

- Node.js 18+ instalado
- Base de datos PostgreSQL (recomendamos [Neon](https://neon.tech) - gratis)
- Cuenta de Google (gratis) para obtener API key de Gemini

## 🔧 Instalación Local

1. **Clonar o descargar el proyecto**

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno:**
   
   Crea un archivo `.env.local` en la raíz del proyecto:
   ```bash
   # Base de datos PostgreSQL (Neon, Supabase, etc.)
   DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"
   
   # API Key de Google Gemini
   GOOGLE_AI_API_KEY=tu-api-key-de-google-aqui
   ```
   
   📖 **Guía completa de configuración de base de datos**: Ver [NEON_SETUP.md](./NEON_SETUP.md)

4. **Configurar la base de datos:**
   
   ```bash
   # Generar el cliente de Prisma
   npm run db:generate
   
   # Crear las tablas en la base de datos (desarrollo)
   npm run db:push
   
   # O usar migraciones (producción)
   npm run db:migrate
   ```
   
   💡 **Recomendación**: Usa [Neon](https://neon.tech) para una base de datos PostgreSQL gratuita y serverless.

5. **Poblar la base de datos con datos de ejemplo:**
   
   ```bash
   # Ejecutar el script de seed para crear datos de prueba
   npm run db:seed
   ```
   
   Esto creará:
   - 20 estudiantes de ejemplo (1ro a 5to grado)
   - 6 tutores/profesores
   - 7 incidencias de ejemplo
   - 18 notas de ejemplo
   - 5 clases de ejemplo

6. **Obtener API Key de Google Gemini (GRATIS):**
   
   **Resumen rápido:**
   - Ve a [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
   - Inicia sesión con tu cuenta de Google
   - Haz clic en **"Create API Key"** o **"Get API Key"**
   - Copia la clave (empieza con `AIza...`)
   - Pégala en tu archivo `.env.local` como `GOOGLE_AI_API_KEY=...`
   
   **Ventajas de Gemini:**
   - ✅ **GRATIS** - Tier gratuito generoso (15 requests/min, 1,500/día)
   - ✅ No requiere tarjeta de crédito
   - ✅ Fácil de obtener (solo cuenta de Google)
   - ✅ Perfecto para hackathons

7. **Ejecutar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```

8. **Abrir en el navegador:**
   ```
   http://localhost:3000
   ```

## 🌐 Despliegue en Vercel

Para desplegar la aplicación en Vercel (recomendado para hackathons):

📖 **Guía completa**: Ver archivo [DEPLOY.md](./DEPLOY.md) para instrucciones detalladas paso a paso.

**Resumen rápido:**
1. Sube tu código a GitHub/GitLab/Bitbucket
2. Ve a [vercel.com](https://vercel.com) e inicia sesión
3. Importa tu repositorio
4. Agrega las variables de entorno:
   - `DATABASE_URL` (tu conexión a PostgreSQL)
   - `GOOGLE_AI_API_KEY` (tu API key de Gemini)
5. Haz clic en "Deploy"
6. ¡Listo! Tu app estará en línea en minutos

## 🔑 Cómo Obtener la API Key de Google Gemini

### Paso a Paso Detallado:

1. **Acceder a Google AI Studio:**
   - Visita [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
   - Inicia sesión con tu cuenta de Google (cualquier cuenta funciona)

2. **Obtener la API Key:**
   - Haz clic en **"Create API Key"** o **"Get API Key"**
   - Si te pide crear un proyecto, selecciona uno existente o crea uno nuevo
   - **La clave se genera automáticamente**
   - **⚠️ IMPORTANTE**: Copia la clave inmediatamente
     - Formato: `AIza...` (empieza con AIza)
     - Puedes verla después, pero es mejor copiarla ahora
   - Guárdala en un lugar seguro

3. **Usar la API Key:**
   - **Localmente**: Pégala en tu archivo `.env.local` como `GOOGLE_AI_API_KEY=AIza...`
   - **En Vercel**: Agrégalo en Settings → Environment Variables

### 💡 Ventajas de Google Gemini:

- ✅ **GRATIS** - Tier gratuito muy generoso
- ✅ **15 requests por minuto** (más que suficiente para hackathons)
- ✅ **1,500 requests por día** (gratis)
- ✅ **No requiere tarjeta de crédito**
- ✅ **Fácil de obtener** (solo cuenta de Google)
- ✅ **Buena calidad** de respuestas

### ⚠️ Notas Importantes:

- **Formato**: La clave siempre empieza con `AIza...`
- **Seguridad**: Nunca compartas tu API key públicamente
- **Límites**: El tier gratuito es muy generoso, suficiente para hackathons
- **Sin costo**: No hay costo oculto, es realmente gratis

## 📁 Estructura del Proyecto

```
tutorIA/
├── app/
│   ├── api/                      # API Routes de Next.js
│   │   ├── asistencia/           # Endpoints de asistencia
│   │   ├── clases/               # Endpoints de clases
│   │   ├── estudiantes/          # Endpoints de estudiantes
│   │   ├── generate-report/      # Generación de reportes con IA
│   │   ├── gemini/               # Integración con Gemini API
│   │   ├── incidencias/          # Endpoints de incidencias
│   │   ├── notas/                # Endpoints de notas
│   │   ├── tutores/              # Endpoints de tutores
│   │   └── seed/                 # Endpoint para poblar BD
│   ├── director/                 # Páginas del director
│   │   ├── login/                # Login del director
│   │   └── page.tsx              # Dashboard del director
│   ├── profesor/                 # Páginas del profesor
│   │   └── page.tsx              # Dashboard del profesor
│   ├── tutor/                    # Páginas del tutor
│   │   └── page.tsx              # Dashboard del tutor
│   ├── layout.tsx                # Layout principal
│   ├── page.tsx                  # Landing page (selector de roles)
│   └── globals.css               # Estilos globales
├── components/
│   ├── ui/                       # Componentes shadcn/ui
│   ├── Combobox.tsx              # Componente de búsqueda
│   └── navbar.tsx                # Componente de navegación
├── lib/
│   ├── api.ts                    # Funciones helper para API
│   ├── db.ts                     # Funciones de base de datos
│   ├── gemini.ts                 # Integración con Gemini
│   ├── prisma.ts                 # Cliente de Prisma
│   ├── types.ts                  # Tipos TypeScript
│   ├── utils.ts                  # Utilidades y helpers
│   ├── validation.ts             # Validaciones
│   └── storage.ts                # Funciones para localStorage
├── prisma/
│   ├── schema.prisma             # Schema de Prisma
│   └── seed.ts                   # Script de seed para datos de ejemplo
├── scripts/                      # Scripts de utilidad
└── package.json
```

## 🎯 Uso

### Para Profesores

1. Navega a `/profesor` o haz clic en "Soy Profesor" en la landing page
2. Completa el formulario:
   - Nombre del estudiante
   - Tipo de incidencia (Asistencia, Conducta, Académica, Positivo)
   - Subtipo (opcional)
   - Gravedad (Leve, Moderada, Grave)
   - Descripción
   - Fecha
   - Profesor/Tutor
   - Lugar
   - Derivación (si aplica)
3. Haz clic en "Registrar Incidencia"
4. La incidencia se guarda en la base de datos y aparece en la lista de incidencias recientes

### Para Directores

1. Navega a `/director` o haz clic en "Soy Director" en la landing page
2. Busca un estudiante por nombre en el buscador
3. Visualiza todas las incidencias del estudiante en una tabla organizada
4. Haz clic en "Generar Reporte con IA" para obtener un análisis automático que incluye:
   - Resumen general
   - Patrones detectados
   - Alertas
   - Aspectos positivos
   - Recomendaciones

### Para Tutores

1. Navega a `/tutor` o haz clic en "Soy Tutor" en la landing page
2. Gestiona las incidencias de tus estudiantes asignados
3. Registra asistencia por clase
4. Visualiza el historial completo de tus estudiantes

## 📊 Datos de Ejemplo

La aplicación incluye un script de seed que puedes ejecutar para poblar la base de datos con datos de ejemplo:

```bash
npm run db:seed
```

Esto creará:

- **20 Estudiantes** distribuidos en grados 1ro a 5to, secciones A y B
- **6 Tutores/Profesores** con información de contacto
- **7 Incidencias** de ejemplo incluyendo:
  - Juan Pérez: 2 incidencias de asistencia, 1 comportamiento positivo
  - María López: 2 incidencias académicas
  - Carlos Ruiz: 1 comportamiento positivo, 1 conducta negativa
- **18 Notas** distribuidas entre los estudiantes de ejemplo
- **5 Clases** de diferentes materias y grados

Puedes buscar estos nombres en la página del director para ver los reportes completos.

## 🎨 Diseño

- **Paleta de Colores**:
  - Primary: Indigo (#4F46E5)
  - Success: Green (#10B981)
  - Warning: Yellow (#FCD34D)
  - Danger: Red (#EF4444)
  - Background: Gris claro (#F8FAFC)

- **Tipografía**: Inter (Google Fonts)

- **Componentes**: shadcn/ui con personalización de colores

## 🔒 Notas de Seguridad

- Esta es una aplicación de demostración para hackathon
- Los datos se almacenan en PostgreSQL usando Prisma ORM
- La API key de Google Gemini debe mantenerse segura y nunca compartirse
- La URL de la base de datos contiene credenciales sensibles - nunca la subas a Git
- Asegúrate de que `.env.local` esté en tu `.gitignore`
- En producción, usa variables de entorno del proveedor de hosting (Vercel, etc.)

## 📊 Modelo de Datos

El proyecto utiliza Prisma ORM con PostgreSQL. Los modelos principales incluyen:

- **Estudiante**: Información personal, contacto, tutor, asistencia
- **Incidencia**: Registro de incidencias con tipo, gravedad, derivación, estado
- **Nota**: Calificaciones por materia y estudiante
- **Clase**: Organización de clases por grado, sección y profesor
- **Tutor**: Información de profesores/tutores
- **RegistroAsistenciaClase**: Registro de asistencia por clase
- **EstudianteAtendido**: Seguimiento de estudiantes atendidos

Ver `prisma/schema.prisma` para el schema completo.

## 🚧 Próximas Mejoras

Ver [ROADMAP.md](./ROADMAP.md) para el plan completo de funcionalidades futuras.

### Prioridades Inmediatas:
- [x] Base de datos real (PostgreSQL con Prisma) ✅
- [ ] Autenticación de usuarios
- [ ] Gestión de pagos (mensualidades, matrículas)
- [ ] Gestión de documentos (expedientes digitales)
- [ ] Comunicación con padres (notificaciones automáticas)
- [ ] Dashboard con estadísticas generales
- [ ] Exportación de reportes a PDF

### Funcionalidades Principales Planificadas:
- 💳 **Gestión de Pagos**: Automatización completa de pagos escolares
- 📄 **Gestión de Documentos**: Expedientes digitales y certificados automáticos
- 📧 **Comunicación**: Notificaciones y mensajería con padres
- 📊 **Reportes Avanzados**: Dashboard ejecutivo con estadísticas
- 📚 **Gestión Académica**: Calificaciones, boletines, asistencia
- 👥 **Gestión de Personal**: Perfiles de profesores y horarios
- 📱 **App Móvil**: Para padres, profesores y directores

## 📝 Scripts Disponibles

### Desarrollo
- `npm run dev` - Inicia el servidor de desarrollo en http://localhost:3000
- `npm run build` - Construye la aplicación para producción
- `npm start` - Inicia el servidor de producción
- `npm run lint` - Ejecuta el linter de ESLint

### Base de Datos
- `npm run db:generate` - Genera el cliente de Prisma
- `npm run db:migrate` - Ejecuta migraciones de base de datos (producción)
- `npm run db:push` - Sincroniza el schema con la base de datos (desarrollo)
- `npm run db:studio` - Abre Prisma Studio para ver/editar datos visualmente
- `npm run db:seed` - Pobla la base de datos con datos de ejemplo

### Utilidades
- `npm run reordenar-columnas` - Reordena columnas en la tabla de estudiantes
- `npm run crear-tablas-faltantes` - Crea tablas faltantes en la base de datos

## 🚀 Despliegue Rápido

### Vercel (Recomendado)

1. Conecta tu repositorio a Vercel
2. Agrega las variables de entorno:
   - `DATABASE_URL` - URL de conexión a PostgreSQL
   - `GOOGLE_AI_API_KEY` - API key de Google Gemini
3. Deploy automático en cada push

Ver [DEPLOY.md](./DEPLOY.md) para instrucciones completas.

## 🔧 Documentación Adicional

- **[API_ROUTES.md](./API_ROUTES.md)** - Documentación completa de todas las API routes
- **[BACKEND.md](./BACKEND.md)** - Guía completa del backend y API
- **[BACKEND-CHECKLIST.md](./BACKEND-CHECKLIST.md)** - Checklist rápido para verificar que todo funciona
- **[NEON_SETUP.md](./NEON_SETUP.md)** - Guía para configurar la base de datos PostgreSQL con Neon
- **[DEPLOY.md](./DEPLOY.md)** - Guía completa de despliegue en Vercel
- **[ROADMAP.md](./ROADMAP.md)** - Plan de funcionalidades futuras

## 🤝 Contribuir

Este es un proyecto de hackathon. Siéntete libre de hacer fork y mejorar.

## 📄 Licencia

Este proyecto fue creado para una hackathon.

---

**Desarrollado con ❤️ para mejorar la gestión educativa**
