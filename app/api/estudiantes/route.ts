import { NextRequest, NextResponse } from 'next/server';
import {
  getEstudiantesInfo,
  getEstudianteInfo,
  saveEstudianteInfo,
  saveEstudiantesInfo,
  getEstudiantesByGrado,
} from '@/lib/db';

// GET /api/estudiantes
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const grado = searchParams.get('grado') || undefined;
    const nombre = searchParams.get('nombre') || undefined;

    if (nombre) {
      const estudiante = await getEstudianteInfo(nombre);
      if (!estudiante) {
        return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 });
      }
      return NextResponse.json(estudiante);
    }

    const estudiantes = grado
      ? await getEstudiantesByGrado(grado)
      : await getEstudiantesInfo();

    return NextResponse.json(estudiantes);
  } catch (error) {
    console.error('Error obteniendo estudiantes:', error);
    return NextResponse.json(
      { error: 'Error al obtener estudiantes' },
      { status: 500 }
    );
  }
}

// POST /api/estudiantes
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Si es un array, usar saveEstudiantesInfo
    if (Array.isArray(body)) {
      await saveEstudiantesInfo(body);
      return NextResponse.json({ success: true, count: body.length });
    }

    // Si es un objeto, usar saveEstudianteInfo
    await saveEstudianteInfo(body);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error guardando estudiante(s):', error);
    return NextResponse.json(
      { error: 'Error al guardar estudiante(s)' },
      { status: 500 }
    );
  }
}

