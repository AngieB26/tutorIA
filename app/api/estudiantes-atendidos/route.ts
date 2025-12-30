import { NextResponse } from 'next/server';
import {
  getEstudiantesAtendidos,
  marcarEstudianteAtendido as marcarEstudianteAtendidoDB,
  getEstudiantesAtendidosByProfesor,
  esEstudianteAtendido as esEstudianteAtendidoDB,
} from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const profesor = searchParams.get('profesor');
    const fecha = searchParams.get('fecha');

    if (profesor) {
      const atendidos = await getEstudiantesAtendidosByProfesor(profesor, fecha || undefined);
      return NextResponse.json(atendidos);
    }

    const atendidos = await getEstudiantesAtendidos();
    return NextResponse.json(atendidos);
  } catch (error) {
    console.error('Error obteniendo estudiantes atendidos:', error);
    return NextResponse.json(
      { error: 'Error al obtener estudiantes atendidos' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombre, fecha, profesor } = body;

    if (!nombre || !fecha || !profesor) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: nombre, fecha, profesor' },
        { status: 400 }
      );
    }

    await marcarEstudianteAtendidoDB(nombre, fecha, profesor);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marcando estudiante como atendido:', error);
    return NextResponse.json(
      { error: 'Error al marcar estudiante como atendido' },
      { status: 500 }
    );
  }
}

