import { NextRequest, NextResponse } from 'next/server';
import {
  getEstudiantesInfo,
  getEstudianteInfo,
  getEstudianteInfoById,
  saveEstudianteInfo,
  saveEstudiantesInfo,
  getEstudiantesByGrado,
  deleteEstudiante,
} from '@/lib/db';

// GET /api/estudiantes
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const grado = searchParams.get('grado') || undefined;
    const nombre = searchParams.get('nombre') || undefined;
    const id = searchParams.get('id') || undefined;

    // Priorizar búsqueda por ID (más confiable)
    if (id) {
      const estudiante = await getEstudianteInfoById(id);
      if (!estudiante) {
        return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 });
      }
      return NextResponse.json(estudiante);
    }

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
    const { searchParams } = new URL(req.url);
    const estudianteId = searchParams.get('estudianteId') || undefined;
    const nombreOriginal = searchParams.get('nombreOriginal') || undefined; // Mantener para compatibilidad
    const body = await req.json();

    // Si es un array, usar saveEstudiantesInfo
    if (Array.isArray(body)) {
      await saveEstudiantesInfo(body);
      return NextResponse.json({ success: true, count: body.length });
    }

    // Priorizar estudianteId sobre nombreOriginal (más confiable)
    const idToUse = estudianteId || (body.id ? body.id : undefined);
    await saveEstudianteInfo(body, idToUse);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error guardando estudiante(s):', error);
    return NextResponse.json(
      { error: 'Error al guardar estudiante(s)' },
      { status: 500 }
    );
  }
}

// DELETE /api/estudiantes
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const nombre = searchParams.get('nombre');
    
    if (!nombre) {
      return NextResponse.json(
        { error: 'Nombre del estudiante es requerido' },
        { status: 400 }
      );
    }

    await deleteEstudiante(nombre);
    return NextResponse.json({ success: true, message: `Estudiante ${nombre} eliminado exitosamente` });
  } catch (error) {
    console.error('Error eliminando estudiante:', error);
    return NextResponse.json(
      { error: 'Error al eliminar estudiante' },
      { status: 500 }
    );
  }
}

