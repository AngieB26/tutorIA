import { NextResponse } from 'next/server';
import {
  getPrellenadoIncidencia,
  savePrellenadoIncidencia,
  deletePrellenadoIncidencia,
} from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const estudiante = searchParams.get('estudiante');

    if (!estudiante) {
      return NextResponse.json(
        { error: 'Falta el parámetro estudiante' },
        { status: 400 }
      );
    }

    const prellenado = await getPrellenadoIncidencia(estudiante);
    if (!prellenado) {
      return NextResponse.json(null, { status: 404 });
    }

    return NextResponse.json(prellenado);
  } catch (error) {
    console.error('Error obteniendo prellenado de incidencia:', error);
    return NextResponse.json(
      { error: 'Error al obtener prellenado de incidencia' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { estudiante, tipo, gravedad, profesor } = body;

    if (!estudiante) {
      return NextResponse.json(
        { error: 'Falta el campo requerido: estudiante' },
        { status: 400 }
      );
    }

    await savePrellenadoIncidencia({
      estudiante,
      tipo,
      gravedad,
      profesor,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error guardando prellenado de incidencia:', error);
    return NextResponse.json(
      { error: 'Error al guardar prellenado de incidencia' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const estudiante = searchParams.get('estudiante');

    if (!estudiante) {
      return NextResponse.json(
        { error: 'Falta el parámetro estudiante' },
        { status: 400 }
      );
    }

    await deletePrellenadoIncidencia(estudiante);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error eliminando prellenado de incidencia:', error);
    return NextResponse.json(
      { error: 'Error al eliminar prellenado de incidencia' },
      { status: 500 }
    );
  }
}

