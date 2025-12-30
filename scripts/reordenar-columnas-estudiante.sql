-- Script para reordenar las columnas de la tabla Estudiante
-- Orden deseado: id, nombres, apellidos, grado, seccion, edad, ...

-- IMPORTANTE: Este script recrea la tabla, por lo que es necesario hacer backup primero
-- Ejecutar solo en desarrollo o después de hacer backup completo

BEGIN;

-- 0. Limpiar si existe una ejecución previa incompleta
DROP TABLE IF EXISTS "Estudiante_new" CASCADE;

-- 1. Crear nueva tabla con el orden correcto de columnas
CREATE TABLE "Estudiante_new" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "nombres" TEXT NOT NULL,
  "apellidos" TEXT NOT NULL,
  "grado" TEXT NOT NULL,
  "seccion" TEXT NOT NULL,
  "edad" INTEGER,
  "fechaNacimiento" TEXT,
  "fotoPerfil" TEXT,
  "contactoTelefono" TEXT,
  "contactoEmail" TEXT,
  "contactoNombre" TEXT,
  "tutorNombre" TEXT,
  "tutorTelefono" TEXT,
  "tutorEmail" TEXT,
  "apoderadoNombre" TEXT,
  "apoderadoParentesco" TEXT,
  "apoderadoTelefono" TEXT,
  "apoderadoTelefonoAlt" TEXT,
  "apoderadoEmail" TEXT,
  "apoderadoDireccion" TEXT,
  "asistencias" INTEGER DEFAULT 0,
  "ausencias" INTEGER DEFAULT 0,
  "tardanzas" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- 2. Copiar todos los datos de la tabla vieja a la nueva
INSERT INTO "Estudiante_new" (
  "id", "nombres", "apellidos", "grado", "seccion", "edad", "fechaNacimiento",
  "fotoPerfil", "contactoTelefono", "contactoEmail", "contactoNombre",
  "tutorNombre", "tutorTelefono", "tutorEmail", "apoderadoNombre",
  "apoderadoParentesco", "apoderadoTelefono", "apoderadoTelefonoAlt",
  "apoderadoEmail", "apoderadoDireccion", "asistencias", "ausencias",
  "tardanzas", "createdAt", "updatedAt"
)
SELECT 
  "id", "nombres", "apellidos", "grado", "seccion", "edad", "fechaNacimiento",
  "fotoPerfil", "contactoTelefono", "contactoEmail", "contactoNombre",
  "tutorNombre", "tutorTelefono", "tutorEmail", "apoderadoNombre",
  "apoderadoParentesco", "apoderadoTelefono", "apoderadoTelefonoAlt",
  "apoderadoEmail", "apoderadoDireccion", "asistencias", "ausencias",
  "tardanzas", "createdAt", "updatedAt"
FROM "Estudiante";

-- 3. Recrear los índices (si no existen)
CREATE INDEX IF NOT EXISTS "Estudiante_grado_seccion_idx" ON "Estudiante_new"("grado", "seccion");
CREATE INDEX IF NOT EXISTS "Estudiante_nombres_apellidos_idx" ON "Estudiante_new"("nombres", "apellidos");

-- 4. Eliminar la tabla vieja (esto eliminará automáticamente las foreign keys)
DROP TABLE "Estudiante" CASCADE;

-- 5. Renombrar la nueva tabla
ALTER TABLE "Estudiante_new" RENAME TO "Estudiante";

-- 6. Recrear las foreign keys que fueron eliminadas por CASCADE
-- Prisma genera estos nombres automáticamente, pero los recreamos explícitamente
-- Solo crear si no existen
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Incidencia_estudianteId_fkey') THEN
    ALTER TABLE "Incidencia" ADD CONSTRAINT "Incidencia_estudianteId_fkey" 
      FOREIGN KEY ("estudianteId") REFERENCES "Estudiante"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Nota_estudianteId_fkey') THEN
    ALTER TABLE "Nota" ADD CONSTRAINT "Nota_estudianteId_fkey" 
      FOREIGN KEY ("estudianteId") REFERENCES "Estudiante"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RegistroAsistenciaEntry_estudianteId_fkey') THEN
    ALTER TABLE "RegistroAsistenciaEntry" ADD CONSTRAINT "RegistroAsistenciaEntry_estudianteId_fkey" 
      FOREIGN KEY ("estudianteId") REFERENCES "Estudiante"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EstudianteAtendido_estudianteId_fkey') THEN
    ALTER TABLE "EstudianteAtendido" ADD CONSTRAINT "EstudianteAtendido_estudianteId_fkey" 
      FOREIGN KEY ("estudianteId") REFERENCES "Estudiante"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 7. Regenerar el cliente de Prisma para que reconozca el nuevo orden
-- Ejecutar después: npx prisma generate

COMMIT;

