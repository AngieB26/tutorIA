import { NextRequest, NextResponse } from 'next/server';
import {
  getNotas,
  getNotasByStudent,
  saveNotas,
} from '@/lib/db';

// GET /api/notas
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentName = searchParams.get('studentName');

    if (studentName) {
      const notas = await getNotasByStudent(studentName);
      return NextResponse.json(notas);
    }

    const notas = await getNotas();
    return NextResponse.json(notas);
  } catch (error) {
    console.error('Error obteniendo notas:', error);
    return NextResponse.json(
      { error: 'Error al obtener notas' },
      { status: 500 }
    );
  }
}

// POST /api/notas
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Se espera un array de notas' },
        { status: 400 }
      );
    }

    await saveNotas(body);
    return NextResponse.json({ success: true, count: body.length });
  } catch (error) {
    console.error('Error guardando notas:', error);
    return NextResponse.json(
      { error: 'Error al guardar notas' },
      { status: 500 }
    );
  }
}

