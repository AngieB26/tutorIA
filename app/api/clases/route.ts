import { NextRequest, NextResponse } from 'next/server';
import {
  getClases,
  getClasesByProfesor,
  getClasesByGradoSeccion,
  saveClases,
  addClase,
} from '@/lib/db';

// GET /api/clases
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const profesor = searchParams.get('profesor');
    const grado = searchParams.get('grado');
    const seccion = searchParams.get('seccion');

    if (profesor) {
      const clases = await getClasesByProfesor(profesor);
      return NextResponse.json(clases);
    }

    if (grado && seccion) {
      const clases = await getClasesByGradoSeccion(grado, seccion);
      return NextResponse.json(clases);
    }

    const clases = await getClases();
    return NextResponse.json(clases);
  } catch (error) {
    console.error('Error obteniendo clases:', error);
    return NextResponse.json(
      { error: 'Error al obtener clases' },
      { status: 500 }
    );
  }
}

// POST /api/clases
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (Array.isArray(body)) {
      await saveClases(body);
      return NextResponse.json({ success: true, count: body.length });
    }

    // Si es un objeto, agregar nueva clase
    const nuevaClase = await addClase(body);
    return NextResponse.json(nuevaClase, { status: 201 });
  } catch (error) {
    console.error('Error guardando clase(s):', error);
    return NextResponse.json(
      { error: 'Error al guardar clase(s)' },
      { status: 500 }
    );
  }
}

