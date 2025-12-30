import 'dotenv/config';
import { prisma } from '../lib/prisma';

async function migrateNombresApellidos() {
  try {
    console.log('🔄 Iniciando migración de nombres y apellidos...');

    // Obtener todos los estudiantes donde nombres o apellidos son NULL
    const estudiantes = await prisma.estudiante.findMany({
      where: {
        OR: [
          { nombres: null },
          { apellidos: null }
        ]
      }
    });

    console.log(`📊 Encontrados ${estudiantes.length} estudiantes para migrar`);

    for (const estudiante of estudiantes) {
      let nombres = estudiante.nombres;
      let apellidos = estudiante.apellidos;

      // Si no tiene nombres o apellidos, intentar separarlos del nombre
      if ((!nombres || !apellidos) && estudiante.nombre) {
        const partes = estudiante.nombre.trim().split(/\s+/);
        if (partes.length > 1) {
          apellidos = partes[partes.length - 1];
          nombres = partes.slice(0, -1).join(' ');
        } else {
          nombres = estudiante.nombre;
          apellidos = '';
        }
      }

      // Actualizar el estudiante
      await prisma.estudiante.update({
        where: { id: estudiante.id },
        data: {
          nombres: nombres || '',
          apellidos: apellidos || '',
        }
      });

      console.log(`✅ Actualizado: ${estudiante.nombre} -> nombres: "${nombres}", apellidos: "${apellidos}"`);
    }

    console.log('✅ Migración completada exitosamente');
  } catch (error) {
    console.error('❌ Error en la migración:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateNombresApellidos();

