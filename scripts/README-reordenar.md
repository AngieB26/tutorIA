# Script de Reordenamiento de Columnas - Estudiante

Este script reordena las columnas de la tabla `Estudiante` en la base de datos para que aparezcan en el orden:
1. id
2. nombres
3. apellidos
4. grado
5. seccion
6. edad
7. ... (resto de columnas)

## ⚠️ ADVERTENCIA

Este script **recrea la tabla**, lo que significa:
- Se eliminarán temporalmente las foreign keys
- Los datos se copiarán a una nueva tabla
- La tabla original se eliminará
- Las foreign keys se recrearán

## 📋 Pasos para Ejecutar

### 1. Hacer Backup (MUY IMPORTANTE)

Antes de ejecutar el script, asegúrate de tener un backup completo de tu base de datos.

### 2. Ejecutar el Script

**Opción A: Desde Neon Console**
1. Ve a tu proyecto en Neon Console
2. Abre el SQL Editor
3. Copia y pega el contenido de `scripts/reordenar-columnas-estudiante.sql`
4. Ejecuta el script

**Opción B: Desde la línea de comandos**
```bash
# Conectar a la base de datos y ejecutar el script
psql $DATABASE_URL -f scripts/reordenar-columnas-estudiante.sql
```

### 3. Regenerar Prisma Client

Después de ejecutar el script, regenera el cliente de Prisma:

```bash
npx prisma generate
```

### 4. Verificar

1. Ve a Neon Console
2. Abre la tabla `Estudiante`
3. Verifica que las columnas estén en el orden correcto: id, nombres, apellidos, grado, seccion, edad...

## 🔄 Si algo sale mal

Si el script falla a mitad de ejecución, puedes restaurar desde el backup o ejecutar:

```sql
-- Si la tabla nueva existe pero la vieja no
DROP TABLE IF EXISTS "Estudiante_new";
ALTER TABLE "Estudiante" RENAME TO "Estudiante_old";
-- Luego restaurar desde backup
```

## ✅ Verificación Post-Migración

Después de ejecutar el script, verifica:
- ✅ Los datos están intactos
- ✅ Las foreign keys funcionan correctamente
- ✅ Las relaciones con otras tablas siguen funcionando
- ✅ El orden de columnas es el correcto en Neon Console

