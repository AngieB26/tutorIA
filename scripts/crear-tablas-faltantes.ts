import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { join } from 'path';

// Cargar variables de entorno desde .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { prisma } from '../lib/prisma';

async function main() {
  console.log('🔄 Creando tablas faltantes (IncidenciaVista y PrellenadoIncidencia)...');
  
  try {
    // Leer y ejecutar script de IncidenciaVista
    const sqlIncidenciaVista = readFileSync(join(__dirname, 'crear-tabla-incidencias-vistas.sql'), 'utf-8');
    console.log('📝 Creando tabla IncidenciaVista...');
    await prisma.$executeRawUnsafe(sqlIncidenciaVista);
    console.log('✅ Tabla IncidenciaVista creada/verificada');
    
    // Leer y ejecutar script de PrellenadoIncidencia
    const sqlPrellenado = readFileSync(join(__dirname, 'crear-tabla-prellenado.sql'), 'utf-8');
    console.log('📝 Creando tabla PrellenadoIncidencia...');
    await prisma.$executeRawUnsafe(sqlPrellenado);
    console.log('✅ Tabla PrellenadoIncidencia creada/verificada');
    
    console.log('\n✅ Todas las tablas creadas/verificadas exitosamente!');
    
  } catch (error: any) {
    console.error('❌ Error creando tablas:', error.message);
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

