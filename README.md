# TutorIA

**Gestión Inteligente de Incidencias Estudiantiles**

TutorIA es una plataforma que digitaliza el registro de incidencias y asistencia estudiantil en colegios. Resuelve el problema de los directores que pierden horas buscando información manual cuando un padre visita, ofreciendo digitalización + IA que genera reportes inteligentes automáticos.

🌐 **Demo en vivo**: [https://tutoria-lo5gbfvr8-angiebq26s-projects.vercel.app](https://tutoria-lo5gbfvr8-angiebq26s-projects.vercel.app)

## 🚀 Características

- **Registro Rápido**: Los profesores registran incidencias en menos de 30 segundos
- **Búsqueda Inteligente**: Los directores buscan estudiantes y ven todas sus incidencias de forma organizada
- **Reportes con IA**: Generación automática de reportes que identifican patrones y alertas usando Claude API
- **Interfaz Moderna**: Diseño profesional tipo dashboard con Tailwind CSS y shadcn/ui

## 🛠️ Stack Tecnológico

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui** para componentes UI
- **Google Gemini API** para reportes IA (gratis)
- **localStorage** para persistencia (demo hackathon)

## 📋 Requisitos Previos

- Node.js 18+ instalado
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
   GOOGLE_AI_API_KEY=tu-api-key-de-google-aqui
   ```

4. **Obtener API Key de Google Gemini (GRATIS):**
   
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

5. **Ejecutar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```

6. **Abrir en el navegador:**
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
4. Agrega la variable de entorno `ANTHROPIC_API_KEY` en la configuración
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
│   ├── api/
│   │   └── generate-report/
│   │       └── route.ts          # API route para generar reportes con Claude
│   ├── director/
│   │   └── page.tsx              # Página del director (búsqueda y reportes)
│   ├── profesor/
│   │   └── page.tsx              # Página del profesor (registro de incidencias)
│   ├── layout.tsx                # Layout principal
│   ├── page.tsx                  # Landing page (selector de roles)
│   └── globals.css               # Estilos globales
├── components/
│   ├── ui/                       # Componentes shadcn/ui
│   └── navbar.tsx                # Componente de navegación
├── lib/
│   ├── types.ts                  # Tipos TypeScript
│   ├── utils.ts                  # Utilidades y helpers
│   └── storage.ts                # Funciones para localStorage
└── package.json
```

## 🎯 Uso

### Para Profesores

1. Navega a `/profesor` o haz clic en "Soy Profesor" en la landing page
2. Completa el formulario:
   - Nombre del estudiante
   - Tipo de incidencia (Ausencia, Conducta Negativa, Académica, Comportamiento Positivo)
   - Descripción
   - Fecha
3. Haz clic en "Registrar Incidencia"
4. La incidencia se guarda en localStorage y aparece en la lista de incidencias recientes

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

## 📊 Datos de Ejemplo

La aplicación incluye datos de ejemplo que se cargan automáticamente la primera vez que se usa:

- **Juan Pérez**: 2 ausencias, 1 comportamiento positivo
- **María López**: 2 incidencias académicas
- **Carlos Ruiz**: 1 comportamiento positivo, 1 conducta negativa

Puedes buscar estos nombres en la página del director para ver los reportes.

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
- Los datos se almacenan en localStorage (solo en el navegador)
- Para producción, se recomienda usar una base de datos real
- La API key de Anthropic debe mantenerse segura y nunca compartirse

## 🚧 Próximas Mejoras

Ver [ROADMAP.md](./ROADMAP.md) para el plan completo de funcionalidades futuras.

### Prioridades Inmediatas:
- [ ] Base de datos real (PostgreSQL/MongoDB)
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

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Construye la aplicación para producción
- `npm start` - Inicia el servidor de producción
- `npm run lint` - Ejecuta el linter

## 🚀 Despliegue Rápido

### Vercel (Recomendado)

1. Conecta tu repositorio a Vercel
2. Agrega la variable de entorno `ANTHROPIC_API_KEY`
3. Deploy automático en cada push

Ver [DEPLOY.md](./DEPLOY.md) para instrucciones completas.

## 🔧 Documentación del Backend

- **[BACKEND.md](./BACKEND.md)** - Guía completa del backend y API
- **[BACKEND-CHECKLIST.md](./BACKEND-CHECKLIST.md)** - Checklist rápido para verificar que todo funciona

## 🤝 Contribuir

Este es un proyecto de hackathon. Siéntete libre de hacer fork y mejorar.

## 📄 Licencia

Este proyecto fue creado para una hackathon.

---

**Desarrollado con ❤️ para mejorar la gestión educativa**
