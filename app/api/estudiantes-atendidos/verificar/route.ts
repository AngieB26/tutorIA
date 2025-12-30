import { NextResponse } from 'next/server';
import { esEstudianteAtendido } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nombre = searchParams.get('nombre');
    const profesor = searchParams.get('profesor');
    const fecha = searchParams.get('fecha');

    if (!nombre || !profesor) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: nombre, profesor' },
        { status: 400 }
      );
    }

    const atendido = await esEstudianteAtendido(nombre, profesor, fecha || undefined);
    return NextResponse.json({ atendido });
  } catch (error) {
    console.error('Error verificando si estudiante está atendido:', error);
    return NextResponse.json(
      { error: 'Error al verificar si estudiante está atendido' },
      { status: 500 }
    );
  }
}

