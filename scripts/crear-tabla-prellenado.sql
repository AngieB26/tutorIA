-- Script para crear la tabla PrellenadoIncidencia si no existe

CREATE TABLE IF NOT EXISTS "PrellenadoIncidencia" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "estudiante" TEXT NOT NULL,
  "tipo" TEXT,
  "gravedad" TEXT,
  "profesor" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL
);

-- Crear índices si no existen
CREATE INDEX IF NOT EXISTS "PrellenadoIncidencia_estudiante_idx" ON "PrellenadoIncidencia"("estudiante");
CREATE INDEX IF NOT EXISTS "PrellenadoIncidencia_createdAt_idx" ON "PrellenadoIncidencia"("createdAt");

