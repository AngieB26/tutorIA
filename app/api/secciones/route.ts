import { NextRequest, NextResponse } from 'next/server';
import { getSecciones, saveSecciones } from '@/lib/db';

// GET /api/secciones
export async function GET(req: NextRequest) {
  try {
    const secciones = await getSecciones();
    return NextResponse.json(secciones);
  } catch (error) {
    console.error('Error obteniendo secciones:', error);
    return NextResponse.json(
      { error: 'Error al obtener secciones' },
      { status: 500 }
    );
  }
}

// POST /api/secciones
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const secciones = Array.isArray(body) ? body : [body];
    await saveSecciones(secciones);
    return NextResponse.json({ success: true, count: secciones.length });
  } catch (error) {
    console.error('Error guardando secciones:', error);
    return NextResponse.json(
      { error: 'Error al guardar secciones' },
      { status: 500 }
    );
  }
}

