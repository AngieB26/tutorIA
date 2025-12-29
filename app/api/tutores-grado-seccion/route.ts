import { NextRequest, NextResponse } from 'next/server';
import {
  getTutoresGradoSeccion,
  getTutorGradoSeccion,
  getSeccionByTutorId,
  setTutorGradoSeccion,
  removeTutorGradoSeccion,
  saveTutoresGradoSeccion,
} from '@/lib/db';

// GET /api/tutores-grado-seccion
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const grado = searchParams.get('grado');
    const seccion = searchParams.get('seccion');
    const tutorId = searchParams.get('tutorId');

    if (grado && seccion) {
      const asignacion = await getTutorGradoSeccion(grado, seccion);
      return NextResponse.json(asignacion || null);
    }

    if (tutorId) {
      const asignacion = await getSeccionByTutorId(tutorId);
      return NextResponse.json(asignacion || null);
    }

    const asignaciones = await getTutoresGradoSeccion();
    return NextResponse.json(asignaciones);
  } catch (error) {
    console.error('Error obteniendo tutores grado sección:', error);
    return NextResponse.json(
      { error: 'Error al obtener tutores grado sección' },
      { status: 500 }
    );
  }
}

// POST /api/tutores-grado-seccion
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === 'set' && body.grado && body.seccion && body.tutorId && body.tutorNombre) {
      await setTutorGradoSeccion(body.grado, body.seccion, body.tutorId, body.tutorNombre);
      return NextResponse.json({ success: true });
    }

    if (body.action === 'remove' && body.grado && body.seccion) {
      await removeTutorGradoSeccion(body.grado, body.seccion);
      return NextResponse.json({ success: true });
    }

    if (Array.isArray(body)) {
      await saveTutoresGradoSeccion(body);
      return NextResponse.json({ success: true, count: body.length });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    console.error('Error guardando tutores grado sección:', error);
    return NextResponse.json(
      { error: 'Error al guardar tutores grado sección' },
      { status: 500 }
    );
  }
}

