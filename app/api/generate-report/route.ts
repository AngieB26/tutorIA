import { NextRequest, NextResponse } from 'next/server';

interface IncidenciaInput {
  tipo: string;
  descripcion: string;
  fecha: string;
  profesor: string;
}

interface RequestBody {
  studentName: string;
  incidencias: IncidenciaInput[];
  isGeneral?: boolean;
  fechaInicio?: string;
  fechaFin?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { studentName, incidencias, isGeneral, fechaInicio, fechaFin } = body;

    // Validar que haya incidencias
    if (!incidencias || incidencias.length === 0) {
      return NextResponse.json(
        { error: 'No hay incidencias para analizar' },
        { status: 400 }
      );
    }

    if (!isGeneral && !studentName) {
      return NextResponse.json(
        { error: 'Nombre del estudiante es requerido para reportes individuales' },
        { status: 400 }
      );
    }

    // Validar API key de Google Gemini
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      console.error('GOOGLE_AI_API_KEY no está configurada');
      return NextResponse.json(
        { 
          error: 'Configuración de API no disponible. La variable de entorno GOOGLE_AI_API_KEY no está configurada en Vercel. Por favor, agrega esta variable en la configuración de Vercel (Settings > Environment Variables).' 
        },
        { status: 500 }
      );
    }

    // Construir prompt según tipo de reporte
    let prompt = '';
    
    if (isGeneral) {
      // Reporte general
      const incidenciasFormateadas = incidencias
        .map(
          (inc, idx) =>
            `${idx + 1}. Estudiante: ${(inc as any).studentName || 'N/A'}, Tipo: ${inc.tipo}, Fecha: ${inc.fecha}, Descripción: ${inc.descripcion}, Profesor: ${inc.profesor}`
        )
        .join('\n');

      const totalIncidencias = incidencias.length;
      const estudiantesUnicos = new Set(incidencias.map((inc: any) => inc.studentName)).size;
      const porTipo = {
        ausencia: incidencias.filter(i => i.tipo === 'ausencia').length,
        conducta: incidencias.filter(i => i.tipo === 'conducta').length,
        academica: incidencias.filter(i => i.tipo === 'academica').length,
        positivo: incidencias.filter(i => i.tipo === 'positivo').length,
      };

      prompt = `Eres un asistente educativo especializado. Analiza el siguiente reporte general del colegio:

Período analizado: ${fechaInicio} al ${fechaFin}
Total de incidencias: ${totalIncidencias}
Estudiantes involucrados: ${estudiantesUnicos}
Distribución por tipo:
- Ausencias: ${porTipo.ausencia}
- Conducta negativa: ${porTipo.conducta}
- Académicas: ${porTipo.academica}
- Comportamientos positivos: ${porTipo.positivo}

Incidencias detalladas:
${incidenciasFormateadas}

Genera un reporte ejecutivo general profesional conciso (aproximadamente 200-250 palabras) que incluya:

1. Resumen General: Visión general del período analizado
2. Tendencias Principales: Patrones y tendencias detectadas en el período
3. Áreas de Preocupación: Situaciones que requieren atención institucional
4. Aspectos Positivos: Logros y comportamientos destacables
5. Recomendaciones Institucionales: Acciones sugeridas para la dirección del colegio

IMPORTANTE: 
- Usa un tono profesional y ejecutivo
- Sé específico con fechas, números y datos
- NO uses asteriscos ni markdown
- Escribe el texto de forma clara y directa
- Enfócate en el análisis institucional, no individual`;
    } else {
      // Reporte individual
      const incidenciasFormateadas = incidencias
        .map(
          (inc, idx) =>
            `${idx + 1}. Tipo: ${inc.tipo}, Fecha: ${inc.fecha}, Descripción: ${inc.descripcion}, Profesor: ${inc.profesor}`
        )
        .join('\n');

      prompt = `Eres un asistente educativo especializado. Analiza los siguientes datos del estudiante ${studentName}:

Incidencias registradas:
${incidenciasFormateadas}

Genera un reporte ejecutivo profesional completo y detallado (aproximadamente 300-400 palabras) que incluya estas secciones:

1. Resumen General: Visión general del desempeño del estudiante
2. Patrones Detectados: Identifica tendencias en fechas, tipos de incidencias
3. Alertas: Señala comportamientos que requieren atención
4. Aspectos Positivos: Resalta logros o mejoras
5. Recomendaciones: Acciones sugeridas para el director

IMPORTANTE: 
- Usa un tono profesional pero empático
- Sé específico con fechas y datos
- NO uses asteriscos ni markdown
- Escribe el texto de forma clara y directa
- Separa las secciones con saltos de línea`;
    }

    // Llamar a Google Gemini API
    // Usar gemini-2.5-flash que está disponible y es más reciente
    const model = 'gemini-2.5-flash';
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 3000, // Aumentado para reportes más completos
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Error al generar el reporte con IA (${response.status})`;
      
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error) {
          errorMessage = errorData.error.message || errorData.error;
        }
      } catch (e) {
        errorMessage = errorText || errorMessage;
      }
      
      console.error('Error de Google Gemini API:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        model,
        apiKeyPresent: !!apiKey
      });
      
      return NextResponse.json(
        { 
          error: errorMessage,
          details: response.status === 401 ? 'API key inválida o expirada. Verifica tu GOOGLE_AI_API_KEY en Vercel.' :
                 response.status === 403 ? 'Acceso denegado. Verifica que tu API key tenga permisos para usar Gemini.' :
                 response.status === 404 ? `Modelo ${model} no encontrado. Verifica que el modelo esté disponible.` :
                 'Error desconocido al comunicarse con la API de Google Gemini.'
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Extraer texto de la respuesta de Gemini
    let reportText = '';
    let finishReason = '';
    
    if (data.candidates && data.candidates.length > 0) {
      const candidate = data.candidates[0];
      finishReason = candidate.finishReason || 'unknown';
      
      // Verificar si la respuesta fue cortada
      if (finishReason === 'MAX_TOKENS') {
        console.warn('Advertencia: La respuesta fue cortada por límite de tokens');
      }
      
      if (candidate.content && candidate.content.parts) {
        // Concatenar todas las partes del texto
        reportText = candidate.content.parts
          .map((part: any) => part.text || '')
          .join('');
      }
    }

    if (!reportText) {
      return NextResponse.json(
        { error: 'No se pudo generar el contenido del reporte' },
        { status: 500 }
      );
    }
    
    // Log para debugging
    console.log('Reporte generado:', {
      length: reportText.length,
      finishReason,
      truncated: finishReason === 'MAX_TOKENS'
    });

    return NextResponse.json({
      report: reportText,
      timestamp: new Date().toISOString(),
      truncated: finishReason === 'MAX_TOKENS', // Indicar si fue truncado
    });
  } catch (error) {
    console.error('Error en generate-report:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
