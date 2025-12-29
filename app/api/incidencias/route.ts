import { NextRequest, NextResponse } from 'next/server';
import {
  getIncidencias,
  addIncidencia,
  getIncidenciasByStudent,
  getIncidenciasByDateRange,
  getIncidenciasByGravedad,
  getIncidenciasByFiltros,
  getIncidenciasDerivadas,
  getIncidenciasCompletasByStudent,
  cambiarEstadoIncidencia,
  marcarIncidenciaResuelta,
  saveIncidencias,
} from '@/lib/db';
import { Incidencia } from '@/lib/types';

// GET /api/incidencias
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentName = searchParams.get('studentName');
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');
    const gravedad = searchParams.get('gravedad') as 'grave' | 'moderada' | 'leve' | 'todas' | null;
    const tipo = searchParams.get('tipo') as 'ausencia' | 'tardanza' | 'conducta' | 'academica' | 'positivo' | 'todas' | null;
    const tipoDerivacion = searchParams.get('tipoDerivacion');
    const completas = searchParams.get('completas') === 'true';

    // Filtros específicos
    if (completas && studentName) {
      const incidencias = await getIncidenciasCompletasByStudent(studentName);
      return NextResponse.json(incidencias);
    }

    if (studentName) {
      const incidencias = await getIncidenciasByStudent(studentName);
      return NextResponse.json(incidencias);
    }

    if (fechaInicio && fechaFin) {
      const incidencias = await getIncidenciasByDateRange(fechaInicio, fechaFin);
      return NextResponse.json(incidencias);
    }

    if (tipoDerivacion) {
      const incidencias = await getIncidenciasDerivadas(tipoDerivacion as any);
      return NextResponse.json(incidencias);
    }

    if (gravedad || tipo) {
      const incidencias = await getIncidenciasByFiltros(
        gravedad || 'todas',
        tipo || 'todas'
      );
      return NextResponse.json(incidencias);
    }

    if (gravedad) {
      const incidencias = await getIncidenciasByGravedad(gravedad);
      return NextResponse.json(incidencias);
    }

    // Sin filtros: retornar todas
    const incidencias = await getIncidencias();
    console.log(`📊 GET /api/incidencias: Retornando ${incidencias.length} incidencias desde la base de datos`);
    return NextResponse.json(incidencias);
  } catch (error) {
    console.error('❌ Error obteniendo incidencias:', error);
    return NextResponse.json(
      { error: 'Error al obtener incidencias', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/incidencias
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Si es un array, usar saveIncidencias (reemplazo completo)
    if (Array.isArray(body)) {
      await saveIncidencias(body);
      return NextResponse.json({ success: true, count: body.length });
    }

    // Si es un objeto, agregar nueva incidencia
    console.log('📝 POST /api/incidencias: Guardando nueva incidencia en la base de datos:', {
      estudiante: body.studentName,
      tipo: body.tipo,
      derivacion: body.derivacion
    });
    const nuevaIncidencia = await addIncidencia(body);
    console.log('✅ POST /api/incidencias: Incidencia guardada exitosamente:', nuevaIncidencia.id);
    return NextResponse.json(nuevaIncidencia, { status: 201 });
  } catch (error) {
    console.error('❌ Error guardando incidencia(s):', error);
    return NextResponse.json(
      { error: 'Error al guardar incidencia(s)', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PATCH /api/incidencias?id=...
export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const body = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'ID de incidencia requerido' }, { status: 400 });
    }

    // Cambiar estado
    if (body.nuevoEstado && body.usuario) {
      await cambiarEstadoIncidencia(id, body.nuevoEstado, body.usuario);
      return NextResponse.json({ success: true });
    }

    // Marcar como resuelta
    if (body.resuelta && body.resueltaPor) {
      await marcarIncidenciaResuelta(id, body.resueltaPor);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Operación no válida' }, { status: 400 });
  } catch (error) {
    console.error('Error actualizando incidencia:', error);
    return NextResponse.json(
      { error: 'Error al actualizar incidencia' },
      { status: 500 }
    );
  }
}

