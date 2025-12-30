import { NextResponse } from 'next/server';
import {
  getIncidenciasVistas,
  marcarIncidenciaVista,
  marcarIncidenciasVistas,
} from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const usuario = searchParams.get('usuario') || 'director';

    const vistas = await getIncidenciasVistas(usuario);
    return NextResponse.json({ ids: Array.from(vistas) });
  } catch (error) {
    console.error('Error obteniendo incidencias vistas:', error);
    return NextResponse.json(
      { error: 'Error al obtener incidencias vistas' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { incidenciaId, incidenciaIds, usuario = 'director' } = body;

    if (incidenciaIds && Array.isArray(incidenciaIds)) {
      // Marcar múltiples incidencias
      await marcarIncidenciasVistas(incidenciaIds, usuario);
      return NextResponse.json({ success: true });
    } else if (incidenciaId) {
      // Marcar una sola incidencia
      await marcarIncidenciaVista(incidenciaId, usuario);
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: incidenciaId o incidenciaIds' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error marcando incidencia como vista:', error);
    return NextResponse.json(
      { error: 'Error al marcar incidencia como vista' },
      { status: 500 }
    );
  }
}

