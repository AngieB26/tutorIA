# 🔧 Solución de Errores de Deploy en Vercel

## Cambios Realizados

1. **Agregado `postinstall` script** en `package.json`:
   - Genera automáticamente el cliente de Prisma después de `npm install`
   - Esto asegura que Prisma Client esté disponible durante el build

2. **Actualizado `build` script**:
   - Ahora incluye `prisma generate` antes de `next build`
   - Garantiza que el cliente de Prisma esté generado antes de compilar

3. **Mejorado `lib/prisma.ts`**:
   - Manejo mejorado de casos donde DATABASE_URL no está disponible durante el build
   - Permite que el build complete incluso si la variable no está configurada aún

## ⚙️ Configuración Requerida en Vercel

### Variables de Entorno Necesarias

Ve a tu proyecto en Vercel → **Settings** → **Environment Variables** y agrega:

1. **`DATABASE_URL`**
   - Valor: Tu cadena de conexión de Neon
   - Ejemplo: `postgresql://neondb_owner:password@ep-xxx-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require`
   - Aplicar a: Production, Preview, Development

2. **`GOOGLE_AI_API_KEY`**
   - Valor: Tu API key de Google Gemini
   - Ejemplo: `AIzaSyB7HLvf4OTWIrX26DkbFDUwkp_lTBySsN0`
   - Aplicar a: Production, Preview, Development

### Pasos para Configurar

1. **Ir a Vercel Dashboard**:
   - https://vercel.com/dashboard
   - Selecciona tu proyecto `tutorIA`

2. **Agregar Variables de Entorno**:
   - Settings → Environment Variables
   - Click en "Add New"
   - Agrega cada variable una por una
   - **IMPORTANTE**: Marca todas las opciones (Production, Preview, Development)

3. **Redeploy**:
   - Después de agregar las variables, ve a Deployments
   - Click en "Redeploy" en el último deployment
   - O simplemente haz un nuevo push a GitHub

## 🔍 Verificar el Deploy

1. **Revisar los logs del build**:
   - Ve a Deployments → Selecciona el deployment → View Build Logs
   - Deberías ver: `Running "prisma generate"` y luego `Running "next build"`

2. **Verificar que funcione**:
   - Visita tu URL de Vercel
   - Prueba buscar un estudiante en la página del director
   - Si funciona, el deploy fue exitoso

## 🐛 Errores Comunes y Soluciones

### Error: "DATABASE_URL environment variable is not set"
**Solución**: Agrega la variable `DATABASE_URL` en Vercel Settings → Environment Variables

### Error: "PrismaClient needs to be constructed"
**Solución**: Asegúrate de que `postinstall` script esté en package.json y que Prisma esté instalado

### Error: "Module not found: @prisma/client"
**Solución**: El script `postinstall` debería generar el cliente automáticamente. Si no, verifica que `prisma` esté en dependencies

### Build falla en "prisma generate"
**Solución**: 
- Verifica que `prisma.config.ts` esté presente
- Verifica que `prisma/schema.prisma` esté presente
- Revisa los logs de build para ver el error específico

## ✅ Checklist de Deploy

- [ ] Variables de entorno `DATABASE_URL` configurada en Vercel
- [ ] Variables de entorno `GOOGLE_AI_API_KEY` configurada en Vercel
- [ ] Variables aplicadas a Production, Preview y Development
- [ ] `package.json` tiene el script `postinstall`
- [ ] `package.json` tiene `prisma generate` en el script `build`
- [ ] `lib/prisma.ts` está actualizado
- [ ] Se hizo push de los cambios a GitHub
- [ ] Vercel detectó el push y está haciendo deploy
- [ ] El build se completa sin errores
- [ ] La aplicación funciona en producción

## 📝 Notas Adicionales

- El script `postinstall` se ejecuta automáticamente después de `npm install`
- Esto asegura que Prisma Client esté generado antes de cualquier build
- En Vercel, las variables de entorno están disponibles durante el build y runtime
- Si el build falla, revisa los logs en Vercel Dashboard para ver el error específico

