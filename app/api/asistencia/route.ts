import { NextRequest, NextResponse } from 'next/server';
import { getAsistenciaClasesByFilters } from '@/lib/db';

// GET /api/asistencia
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const params = {
      fecha: searchParams.get('fecha') || undefined,
      claseId: searchParams.get('claseId') || undefined,
      profesor: searchParams.get('profesor') || undefined,
      grado: searchParams.get('grado') || undefined,
      seccion: searchParams.get('seccion') || undefined,
      dia: searchParams.get('dia') || undefined,
      periodo: searchParams.get('periodo') ? parseInt(searchParams.get('periodo')!) : undefined,
    };

    const registros = await getAsistenciaClasesByFilters(params);
    return NextResponse.json(registros);
  } catch (error) {
    console.error('Error obteniendo asistencia por filtros:', error);
    return NextResponse.json(
      { error: 'Error al obtener asistencia por filtros' },
      { status: 500 }
    );
  }
}

