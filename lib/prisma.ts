import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function getPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    // En build time, DATABASE_URL puede no estar disponible, usar cliente sin adapter
    if (process.env.NODE_ENV === 'production' && !databaseUrl) {
      console.warn('DATABASE_URL not set during build, using PrismaClient without adapter');
      return new PrismaClient();
    }
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const cleanUrl = databaseUrl.replace(/^["'\s]+|["'\s]+$/g, '').trim();
  const pool = new Pool({ connectionString: cleanUrl });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? getPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

