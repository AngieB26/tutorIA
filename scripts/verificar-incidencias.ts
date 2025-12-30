import { config } from 'dotenv';
import { prisma } from '../lib/prisma';

// Cargar variables de entorno
config();

async function verificarIncidencias() {
  try {
    console.log('🔍 Buscando estudiante "Naty Jiménez"...\n');
    
    // Buscar estudiante
    const estudiante = await prisma.estudiante.findFirst({
      where: {
        OR: [
          { nombres: { contains: 'Naty', mode: 'insensitive' } },
          { apellidos: { contains: 'Jiménez', mode: 'insensitive' } }
        ]
      }
    });

    if (!estudiante) {
      console.log('❌ Estudiante "Naty Jiménez" no encontrado en la base de datos');
      return;
    }

    console.log('✅ Estudiante encontrado:');
    console.log(`   ID: ${estudiante.id}`);
    console.log(`   Nombres: ${estudiante.nombres}`);
    console.log(`   Apellidos: ${estudiante.apellidos}`);
    console.log(`   Nombre completo: ${estudiante.nombres} ${estudiante.apellidos}`);
    console.log(`   Grado: ${estudiante.grado}`);
    console.log(`   Sección: ${estudiante.seccion}\n`);

    // Buscar incidencias por estudianteId
    console.log('🔍 Buscando incidencias por estudianteId...');
    const incidenciasPorId = await prisma.incidencia.findMany({
      where: { estudianteId: estudiante.id }
    });
    console.log(`📊 Incidencias encontradas por estudianteId: ${incidenciasPorId.length}`);

    // Buscar incidencias por nombre
    const nombreCompleto = `${estudiante.nombres} ${estudiante.apellidos}`.trim();
    console.log(`\n🔍 Buscando incidencias por nombre: "${nombreCompleto}"...`);
    const incidenciasPorNombre = await prisma.incidencia.findMany({
      where: { studentName: nombreCompleto }
    });
    console.log(`📊 Incidencias encontradas por nombre exacto: ${incidenciasPorNombre.length}`);

    // Buscar incidencias por contains
    console.log(`\n🔍 Buscando incidencias por contains (Naty o Jiménez)...`);
    const incidenciasPorContains = await prisma.incidencia.findMany({
      where: {
        OR: [
          { studentName: { contains: 'Naty', mode: 'insensitive' } },
          { studentName: { contains: 'Jiménez', mode: 'insensitive' } }
        ]
      }
    });
    console.log(`📊 Incidencias encontradas por contains: ${incidenciasPorContains.length}`);

    // Mostrar todas las incidencias encontradas
    const todasIncidencias = new Map();
    [...incidenciasPorId, ...incidenciasPorNombre, ...incidenciasPorContains].forEach(inc => {
      todasIncidencias.set(inc.id, inc);
    });

    console.log(`\n📋 Total de incidencias únicas encontradas: ${todasIncidencias.size}\n`);

    if (todasIncidencias.size > 0) {
      console.log('📝 Detalles de las incidencias:');
      Array.from(todasIncidencias.values()).forEach((inc, index) => {
        console.log(`\n   Incidencia ${index + 1}:`);
        console.log(`   - ID: ${inc.id}`);
        console.log(`   - studentName: "${inc.studentName}"`);
        console.log(`   - estudianteId: ${inc.estudianteId || 'null'}`);
        console.log(`   - Tipo: ${inc.tipo}`);
        console.log(`   - Gravedad: ${inc.gravedad}`);
        console.log(`   - Fecha: ${inc.fecha}`);
        console.log(`   - Descripción: ${inc.descripcion}`);
        console.log(`   - Estado: ${inc.estado}`);
      });
    } else {
      console.log('⚠️ No se encontraron incidencias para este estudiante');
    }

    // También mostrar todas las incidencias en la BD para referencia
    console.log('\n\n🔍 Verificando todas las incidencias en la base de datos...');
    const todasLasIncidencias = await prisma.incidencia.findMany({
      take: 20,
      orderBy: { timestamp: 'desc' }
    });
    console.log(`📊 Total de incidencias en BD (primeras 20): ${todasLasIncidencias.length}`);
    if (todasLasIncidencias.length > 0) {
      console.log('\n📝 Primeras incidencias en BD:');
      todasLasIncidencias.forEach((inc, index) => {
        console.log(`\n   ${index + 1}. studentName: "${inc.studentName}", estudianteId: ${inc.estudianteId || 'null'}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verificarIncidencias();

