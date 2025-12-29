import { NextRequest, NextResponse } from 'next/server';
import {
  getTutores,
  saveTutores,
  deleteTutor,
} from '@/lib/db';

// GET /api/tutores
export async function GET() {
  try {
    const tutores = await getTutores();
    return NextResponse.json(tutores);
  } catch (error) {
    console.error('Error obteniendo tutores:', error);
    return NextResponse.json(
      { error: 'Error al obtener tutores' },
      { status: 500 }
    );
  }
}

// POST /api/tutores
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Se espera un array de tutores' },
        { status: 400 }
      );
    }

    await saveTutores(body);
    return NextResponse.json({ success: true, count: body.length });
  } catch (error) {
    console.error('Error guardando tutores:', error);
    return NextResponse.json(
      { error: 'Error al guardar tutores' },
      { status: 500 }
    );
  }
}

// DELETE /api/tutores
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID del tutor es requerido' },
        { status: 400 }
      );
    }

    await deleteTutor(id);
    return NextResponse.json({ success: true, message: `Tutor ${id} eliminado exitosamente` });
  } catch (error) {
    console.error('Error eliminando tutor:', error);
    return NextResponse.json(
      { error: 'Error al eliminar tutor' },
      { status: 500 }
    );
  }
}

