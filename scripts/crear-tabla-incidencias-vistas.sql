-- Script para crear la tabla IncidenciaVista si no existe

CREATE TABLE IF NOT EXISTS "IncidenciaVista" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "incidenciaId" TEXT NOT NULL,
  "usuario" TEXT NOT NULL DEFAULT 'director',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "IncidenciaVista_incidenciaId_usuario_key" UNIQUE ("incidenciaId", "usuario")
);

-- Crear índices si no existen
CREATE INDEX IF NOT EXISTS "IncidenciaVista_incidenciaId_idx" ON "IncidenciaVista"("incidenciaId");
CREATE INDEX IF NOT EXISTS "IncidenciaVista_usuario_idx" ON "IncidenciaVista"("usuario");

