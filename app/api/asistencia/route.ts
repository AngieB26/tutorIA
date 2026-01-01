import { NextRequest, NextResponse } from 'next/server';
import { 
  getAsistenciaClasesByFilters, 
  getAsistenciaClases,
  addRegistroAsistenciaClase,
  saveAsistenciaClases,
  findRegistroAsistencia,
  actualizarContadoresAsistencia
} from '@/lib/db';
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

// POST /api/asistencia - Agregar o actualizar un registro de asistencia
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const registro = await addRegistroAsistenciaClase(body);
    return NextResponse.json(registro, { status: 201 });
  } catch (error) {
    console.error('Error guardando asistencia:', error);
    return NextResponse.json(
      { error: 'Error al guardar asistencia', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PUT /api/asistencia - Guardar múltiples registros (reemplazo completo)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    await saveAsistenciaClases(body);
    return NextResponse.json({ success: true, count: body.length });
  } catch (error) {
    console.error('Error guardando asistencias:', error);
    return NextResponse.json(
      { error: 'Error al guardar asistencias', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PATCH /api/asistencia?action=recalcular - Recalcular contadores de asistencia
export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    
    if (action === 'recalcular') {
      await actualizarContadoresAsistencia();
      return NextResponse.json({ success: true, message: 'Contadores de asistencia recalculados correctamente' });
    }
    
    return NextResponse.json(
      { error: 'Acción no válida. Use ?action=recalcular' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error recalculando contadores:', error);
    return NextResponse.json(
      { error: 'Error al recalcular contadores', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

