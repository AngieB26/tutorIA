import { config } from 'dotenv';
import { resolve } from 'path';

// Cargar variables de entorno desde .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { prisma } from '../lib/prisma';
import { readFileSync } from 'fs';
import { join } from 'path';

async function main() {
  console.log('🔄 Iniciando reordenamiento de columnas de la tabla Estudiante...');
  console.log('⚠️  ADVERTENCIA: Este script recreará la tabla. Asegúrate de tener un backup.');
  
  try {
    // Leer el script SQL
    const sqlPath = join(__dirname, 'reordenar-columnas-estudiante.sql');
    let sql = readFileSync(sqlPath, 'utf-8');
    
    // Remover comentarios (líneas que empiezan con --)
    sql = sql.split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');
    
    // Ejecutar el SQL completo como una transacción
    console.log('📝 Ejecutando script SQL completo...');
    await prisma.$executeRawUnsafe(sql);
    
    console.log('\n✅ Reordenamiento completado exitosamente!');
    console.log('📋 Las columnas ahora están en el orden: id, nombres, apellidos, grado, seccion, edad...');
    console.log('\n⚠️  IMPORTANTE: Ejecuta "npx prisma generate" para regenerar el cliente de Prisma');
    
  } catch (error: any) {
    console.error('❌ Error ejecutando el script:', error.message);
    if (error.meta?.driverAdapterError) {
      console.error('Detalles:', error.meta.driverAdapterError);
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });

