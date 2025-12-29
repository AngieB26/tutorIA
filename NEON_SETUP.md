# Configuración de Neon Database

## Pasos para configurar Neon

### 1. Crear cuenta en Neon
1. Ve a [neon.tech](https://neon.tech)
2. Crea una cuenta (puedes usar GitHub)
3. Crea un nuevo proyecto

### 2. Obtener la cadena de conexión (Connection String)
1. En el dashboard de Neon, ve a tu proyecto
2. Haz clic en "Connection Details" o "Connection String"
3. Copia la cadena de conexión (debe verse algo como):
   ```
   postgresql://user:password@ep-xxx-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require
   ```

### 3. Configurar variables de entorno

#### Localmente (.env.local)
Crea un archivo `.env.local` en la raíz del proyecto:

```env
DATABASE_URL="postgresql://user:password@ep-xxx-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require"
GOOGLE_AI_API_KEY="tu-api-key-de-google-aqui"
```

#### En Vercel
1. Ve a tu proyecto en Vercel
2. Ve a Settings → Environment Variables
3. Agrega las siguientes variables:
   - **Name**: `DATABASE_URL`
     - **Value**: La cadena de conexión de Neon
   - **Name**: `GOOGLE_AI_API_KEY`
     - **Value**: Tu API key de Google Gemini (obténla en [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey))

### 4. Generar el cliente de Prisma

```bash
npm run db:generate
```

### 5. Crear las tablas en Neon

**Opción A: Usar db:push (recomendado para desarrollo)**
```bash
npm run db:push
```

**Opción B: Usar migraciones (para producción)**
```bash
npm run db:migrate
```

Esto creará todas las tablas en tu base de datos Neon.

### 6. (Opcional) Ver tus datos con Prisma Studio

```bash
npm run db:studio
```

Esto abrirá una interfaz web donde puedes ver y editar tus datos.

## Notas importantes

- La cadena de conexión incluye credenciales sensibles, nunca la subas a Git
- El archivo `.env.local` ya está en `.gitignore`
- Neon ofrece un plan gratuito generoso (0.5 GB de almacenamiento)
- La base de datos es serverless, se escala automáticamente

