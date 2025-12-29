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
      const incidencias = await getIncidenciasCompletasByStudent(studentName);
      return NextResponse.json(incidencias);
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    console.error('Error en helpers de incidencias:', error);
    return NextResponse.json(
      { error: 'Error en helpers de incidencias' },
      { status: 500 }
    );
  }
}

