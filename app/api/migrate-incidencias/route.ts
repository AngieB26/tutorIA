import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Ruta API para migrar incidencias existentes para agregar studentId
 * POST /api/migrate-incidencias
 */
export async function POST(req: NextRequest) {
  try {
    console.log('🔄 Iniciando migración de incidencias para agregar studentId...');
    
    // Obtener todas las incidencias sin estudianteId
    const incidenciasSinId = await prisma.incidencia.findMany({
      where: {
        estudianteId: null
      }
    });
    
    console.log(`📊 Encontradas ${incidenciasSinId.length} incidencias sin estudianteId`);
    
    if (incidenciasSinId.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No hay incidencias que migrar',
        actualizadas: 0,
        noEncontradas: 0
      });
    }
    
    // Obtener todos los estudiantes para crear un mapa
    const todosEstudiantes = await prisma.estudiante.findMany();
    const mapEstudianteId = new Map<string, string>();
    
    todosEstudiantes.forEach(est => {
      const nombreCompleto = `${est.nombres} ${est.apellidos}`.trim();
      mapEstudianteId.set(nombreCompleto, est.id);
      // También agregar variaciones comunes
      mapEstudianteId.set(nombreCompleto.toLowerCase(), est.id);
      mapEstudianteId.set(est.nombres.toLowerCase(), est.id);
      mapEstudianteId.set(est.apellidos.toLowerCase(), est.id);
    });
    
    let actualizadas = 0;
    let noEncontradas = 0;
    const estudiantesNoEncontrados: string[] = [];
    
    // Actualizar cada incidencia
    for (const incidencia of incidenciasSinId) {
      const studentName = incidencia.studentName?.trim();
      
      if (!studentName) {
        console.log(`⚠️ Incidencia ${incidencia.id} no tiene studentName`);
        noEncontradas++;
        continue;
      }
      
      // Buscar estudiante por nombre exacto
      let estudianteId = mapEstudianteId.get(studentName);
      
      // Si no se encuentra, buscar por coincidencia parcial
      if (!estudianteId) {
        const estudiante = todosEstudiantes.find(est => {
          const nombreCompleto = `${est.nombres} ${est.apellidos}`.trim();
          return nombreCompleto.toLowerCase() === studentName.toLowerCase() ||
                 est.nombres.toLowerCase().includes(studentName.toLowerCase()) ||
                 est.apellidos.toLowerCase().includes(studentName.toLowerCase()) ||
                 studentName.toLowerCase().includes(est.nombres.toLowerCase()) ||
                 studentName.toLowerCase().includes(est.apellidos.toLowerCase());
        });
        
        if (estudiante) {
          estudianteId = estudiante.id;
        }
      }
      
      if (estudianteId) {
        // Actualizar la incidencia con el estudianteId
        await prisma.incidencia.update({
          where: { id: incidencia.id },
          data: { estudianteId: estudianteId }
        });
        actualizadas++;
        console.log(`✅ Actualizada incidencia ${incidencia.id}: "${studentName}" -> ID: ${estudianteId}`);
      } else {
        noEncontradas++;
        estudiantesNoEncontrados.push(studentName);
        console.log(`⚠️ No se encontró estudiante para: "${studentName}" (incidencia ${incidencia.id})`);
      }
    }
    
    console.log(`✅ Migración completada: ${actualizadas} actualizadas, ${noEncontradas} no encontradas`);
    
    return NextResponse.json({
      success: true,
      message: `Migración completada: ${actualizadas} incidencias actualizadas, ${noEncontradas} no encontradas`,
      actualizadas,
      noEncontradas,
      estudiantesNoEncontrados: estudiantesNoEncontrados.slice(0, 10) // Solo los primeros 10 para no sobrecargar
    });
    
  } catch (error: any) {
    console.error('❌ Error en migración:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Error al migrar incidencias' 
      },
      { status: 500 }
    );
  }
}

