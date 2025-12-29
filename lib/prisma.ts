import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function getPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const cleanUrl = databaseUrl.replace(/^["'\s]+|["'\s]+$/g, '').trim();
  const pool = new Pool({ connectionString: cleanUrl });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

// Inicialización lazy: solo crear el cliente cuando se necesite, no durante el build
let prismaInstance: PrismaClient | undefined = undefined;

function getPrisma(): PrismaClient {
  if (prismaInstance) {
    return prismaInstance;
  }
  
  // Solo verificar si estamos en build time, no si falta DATABASE_URL
  // porque DATABASE_URL puede no estar disponible por otras razones en runtime
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    // Crear un proxy que lanzará error si se intenta usar durante build
    return new Proxy({} as PrismaClient, {
      get() {
        throw new Error('PrismaClient cannot be used during build. DATABASE_URL is required at runtime.');
      }
    });
  }
  
  // En runtime, intentar inicializar Prisma
  // Si falta DATABASE_URL, getPrismaClient() lanzará el error apropiado
  const client = getPrismaClient();
  prismaInstance = globalForPrisma.prisma ?? client;
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prismaInstance;
  }
  return prismaInstance;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    return getPrisma()[prop as keyof PrismaClient];
  }
})

