import { NextRequest, NextResponse } from 'next/server';
import { getAsistenciaClasesByFilters, getAsistenciaClases } from '@/lib/db';
import { DiaSemana } from '@/lib/types';

// GET /api/asistencia
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    // Si no hay parámetros, devolver todas las asistencias
    const hasParams = searchParams.has('dia') || searchParams.has('fecha') || 
                      searchParams.has('claseId') || searchParams.has('profesor') || 
                      searchParams.has('grado') || searchParams.has('seccion') || 
                      searchParams.has('periodo');
    
    if (!hasParams) {
      const registros = await getAsistenciaClases();
      return NextResponse.json(registros);
    }
    
    const diaParam = searchParams.get('dia');
    const dia: DiaSemana | undefined = diaParam && ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'].includes(diaParam)
      ? (diaParam as DiaSemana)
      : undefined;

    const params = {
      fecha: searchParams.get('fecha') || undefined,
      claseId: searchParams.get('claseId') || undefined,
      profesor: searchParams.get('profesor') || undefined,
      grado: searchParams.get('grado') || undefined,
      seccion: searchParams.get('seccion') || undefined,
      dia,
      periodo: searchParams.get('periodo') ? parseInt(searchParams.get('periodo')!) : undefined,
    };

    const registros = await getAsistenciaClasesByFilters(params);
    return NextResponse.json(registros);
  } catch (error) {
    console.error('Error obteniendo asistencia:', error);
    return NextResponse.json(
      { error: 'Error al obtener asistencia' },
      { status: 500 }
    );
  }
}

