import { NextRequest, NextResponse } from 'next/server';
import { corregirIncidenciasEstudiantes } from '@/lib/db';

// POST /api/incidencias/corregir
export async function POST(req: NextRequest) {
  try {
    console.log('🔧 Iniciando corrección de incidencias desde API...');
    const resultado = await corregirIncidenciasEstudiantes();
    return NextResponse.json({
      success: true,
      ...resultado,
      message: `Corrección completada: ${resultado.actualizadas} incidencias actualizadas, ${resultado.errores} errores`
    });
  } catch (error) {
    console.error('❌ Error en corrección de incidencias:', error);
    return NextResponse.json(
      { 
        error: 'Error al corregir incidencias',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

