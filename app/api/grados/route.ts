import { NextRequest, NextResponse } from 'next/server';
import { getGrados, saveGrados } from '@/lib/db';

// GET /api/grados
export async function GET(req: NextRequest) {
  try {
    const grados = await getGrados();
    return NextResponse.json(grados);
  } catch (error) {
    console.error('Error obteniendo grados:', error);
    return NextResponse.json(
      { error: 'Error al obtener grados' },
      { status: 500 }
    );
  }
}

// POST /api/grados
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const grados = Array.isArray(body) ? body : [body];
    await saveGrados(grados);
    return NextResponse.json({ success: true, count: grados.length });
  } catch (error) {
    console.error('Error guardando grados:', error);
    return NextResponse.json(
      { error: 'Error al guardar grados' },
      { status: 500 }
    );
  }
}

