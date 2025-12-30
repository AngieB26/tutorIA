import { NextRequest, NextResponse } from 'next/server';
import {
  getIncidenciasDerivadas,
  getListaEstudiantes,
  getIncidenciasCompletasByStudent,
} from '@/lib/db';

// GET /api/incidencias/helpers
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get('tipo');
    const action = searchParams.get('action');
    const studentName = searchParams.get('studentName');

    if (action === 'derivadas') {
      const incidencias = await getIncidenciasDerivadas(tipo as any);
      return NextResponse.json(incidencias);
    }

    if (action === 'lista-estudiantes') {
      const lista = await getListaEstudiantes();
      return NextResponse.json(lista);
    }

    if (action === 'completas' && studentName) {
      try {
        console.log(`📥 API: Obteniendo incidencias para: "${studentName}"`);
        const incidencias = await getIncidenciasCompletasByStudent(studentName);
        console.log(`✅ API: Retornando ${incidencias.length} incidencias`);
        return NextResponse.json(incidencias);
      } catch (error) {
        console.error('❌ API: Error en getIncidenciasCompletasByStudent:', error);
        console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
        return NextResponse.json(
          { 
            error: 'Error al obtener incidencias completas del estudiante',
            details: error instanceof Error ? error.message : String(error)
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    console.error('❌ API: Error general en helpers de incidencias:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        error: 'Error en helpers de incidencias',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

