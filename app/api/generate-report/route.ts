import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const inc = body.incidencia;
    const incidencias = body.incidencias;
    const estudiante = body.estudiante;
    
    let prompt = '';
    
    // Caso 1: Múltiples incidencias para un estudiante (reporte consolidado) o sin incidencias
    if (estudiante && incidencias && Array.isArray(incidencias)) {
      // Si no hay incidencias, generar un resumen positivo
      if (incidencias.length === 0) {
        prompt = `Genera un resumen breve (UNA LÍNEA) para el estudiante ${estudiante}:

El estudiante no tiene incidencias recientes registradas. Genera un resumen positivo y conciso sobre su rendimiento normal.

Formato: Solo una línea, sin encabezados, positivo y alentador.`;
      } else {
        // Para reporte general, no incluir todas las incidencias individuales, solo estadísticas
        const incidenciasTexto = estudiante === 'Reporte General' 
        ? '' // No incluir incidencias individuales para reporte general
        : incidencias.map((inc: any, idx: number) => {
            return `Inc ${idx + 1}: ${inc.tipo || 'N/A'} - ${inc.gravedad || 'N/A'} - ${(inc.descripcion || 'N/A').substring(0, 60)}`;
          }).join('\n');
      
      // Calcular estadísticas para ayudar al análisis
      const totalIncidencias = incidencias.length;
      const porTipo: Record<string, number> = {};
      const porGravedad: Record<string, number> = {};
      incidencias.forEach((inc: any) => {
        porTipo[inc.tipo || 'otro'] = (porTipo[inc.tipo || 'otro'] || 0) + 1;
        porGravedad[inc.gravedad || 'moderada'] = (porGravedad[inc.gravedad || 'moderada'] || 0) + 1;
      });
      
      // Si es reporte general (estudiante es "Reporte General"), generar análisis institucional
      if (estudiante === 'Reporte General') {
        prompt = `Genera un reporte ejecutivo breve:

RESUMEN:
[2 líneas: total de incidencias y porcentajes principales]

RECOMENDACIONES:
[3 recomendaciones breves, una por línea. IMPORTANTE: Las "positivas" DEBEN INCREMENTARSE. Las "ausencia", "conducta" y "académica" se deben PREVENIR o REDUCIR]

Datos: ${totalIncidencias} incidencias | Tipos: ${Object.entries(porTipo).map(([tipo, count]) => `${tipo}:${count}`).join(', ')} | Gravedades: ${Object.entries(porGravedad).map(([grav, count]) => `${grav}:${count}`).join(', ')} | Estudiantes: ${new Set(incidencias.map((i: any) => i.studentName)).size}

Sin asteriscos ni markdown.`;
      } else {
        // Caso con incidencias individuales (length > 0 ya verificado arriba)
        prompt = `Analiza las incidencias y genera un reporte CONCISO:

RESUMEN:
[2 líneas máximo: situación general del estudiante]

ANÁLISIS DE PATRONES:
[1-2 líneas: patrones identificados]

FORTALEZAS Y ÁREAS DE MEJORA:
[1-2 líneas: aspectos positivos y áreas a mejorar]

FACTORES DE RIESGO:
[1 línea: principales factores si existen]

RECOMENDACIONES:
[Máximo 3 recomendaciones breves, una por línea]

PLAN DE SEGUIMIENTO:
[Máximo 2 pasos específicos, uno por línea]

Estudiante: ${estudiante}
Total: ${totalIncidencias} | Tipos: ${Object.entries(porTipo).map(([tipo, count]) => `${tipo}:${count}`).join(', ')} | Gravedades: ${Object.entries(porGravedad).map(([grav, count]) => `${grav}:${count}`).join(', ')}

Incidencias:
${incidenciasTexto}

IMPORTANTE: Máximo 2 líneas por sección. Sin asteriscos ni markdown. Lenguaje directo.`;
        }
      }
    }
    // Caso 2: Una sola incidencia (análisis individual)
    else if (inc) {
      prompt = `Analiza esta incidencia y responde BREVE y DIRECTA:

RESUMEN:
[1-2 líneas: qué pasó y por qué es importante]

RECOMENDACIONES:
[Máximo 2 acciones concretas, una por línea]

Datos: Tipo: ${inc.tipo || 'No especificado'} | Estudiante: ${inc.studentName || 'No especificado'} | Profesor: ${inc.profesor || 'No especificado'} | Descripción: ${inc.descripcion || 'No especificado'} | Fecha: ${inc.fecha || 'No especificado'} | Gravedad: ${inc.gravedad || 'No especificado'} | Derivación: ${inc.derivacion || 'No especificado'}

IMPORTANTE: Máximo 2 líneas por sección. Sin asteriscos ni markdown.`;
    } else {
      console.error('No se proporcionó incidencia o incidencias en el body');
      return NextResponse.json({ error: 'No se proporcionó incidencia.' }, { status: 400 });
    }

    const geminiApiKey = process.env.GOOGLE_AI_API_KEY;
    
    if (!geminiApiKey) {
      console.error('GOOGLE_AI_API_KEY no está configurada');
      return NextResponse.json({ 
        error: 'Configuración de API no disponible',
        resumen: 'Error de configuración',
        recomendaciones: 'Por favor, contacta al administrador del sistema.'
      }, { status: 500 });
    }

    console.log('Enviando request a Gemini...');
    
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: incidencias && Array.isArray(incidencias) 
              ? (estudiante === 'Reporte General' ? 4000 : 2500) // Aumentado aún más para reporte general
              : 2000, // Tokens aumentados para evitar truncamiento
            topP: 0.95,
            topK: 40
          }
        })
      }
    );
    
    console.log('Respuesta HTTP Gemini:', geminiRes.status, geminiRes.statusText);
    
    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      console.error('Error de Gemini API:', errorText);
      
      let mensajeError = 'Error al conectar con el servicio de IA';
      let recomendaciones = 'Por favor, intenta nuevamente más tarde.';
      
      // Intentar parsear el error para dar un mensaje más específico
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error) {
          if (errorJson.error.message) {
            const errorMessage = errorJson.error.message.toLowerCase();
            // Detectar si la API key expiró
            if (errorMessage.includes('expired') || errorMessage.includes('expirada')) {
              mensajeError = 'La API key ha expirado';
              recomendaciones = 'Por favor, genera una nueva API key en Google AI Studio y actualízala en la configuración de Vercel.';
            } else if (errorMessage.includes('invalid') || errorMessage.includes('invalid api key')) {
              mensajeError = 'API key inválida';
              recomendaciones = 'Por favor, verifica que la API key sea correcta en la configuración de Vercel.';
            } else {
              mensajeError = `Error del servicio de IA: ${errorJson.error.message}`;
            }
          }
          // Errores comunes de Gemini API
          if (geminiRes.status === 400) {
            recomendaciones = 'Por favor, verifica que los datos enviados sean correctos.';
          } else if (geminiRes.status === 401 || geminiRes.status === 403) {
            if (!mensajeError.includes('expirado') && !mensajeError.includes('inválida')) {
              mensajeError = 'Error de autenticación con el servicio de IA';
              recomendaciones = 'Por favor, verifica la configuración de la API key en Vercel.';
            }
          } else if (geminiRes.status === 429) {
            mensajeError = 'Límite de solicitudes excedido';
            recomendaciones = 'Por favor, espera unos minutos antes de intentar nuevamente.';
          } else if (geminiRes.status === 500 || geminiRes.status === 503) {
            mensajeError = 'El servicio de IA no está disponible temporalmente';
            recomendaciones = 'Por favor, intenta nuevamente en unos momentos.';
          }
        }
      } catch (e) {
        // Si no se puede parsear el JSON, usar el error genérico
        console.error('No se pudo parsear el error de Gemini:', e);
      }
      
      return NextResponse.json({ 
        resumen: mensajeError, 
        recomendaciones: recomendaciones,
        error: 'API Error',
        status: geminiRes.status
      }, { status: 200 });
    }

    let data = null;
    let text = '';
    
    try {
      data = await geminiRes.json();
      console.log('Gemini API response:', JSON.stringify(data, null, 2));
      
      const finishReason = data?.candidates?.[0]?.finishReason;
      const wasTruncated = finishReason === 'MAX_TOKENS';
      
      text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      if (!text) {
        console.error('No se obtuvo texto de la respuesta de Gemini');
        return NextResponse.json({ 
          resumen: 'No se pudo generar el análisis', 
          recomendaciones: 'Por favor, intenta nuevamente.',
          raw: JSON.stringify(data),
          error: 'No text in response'
        }, { status: 200 });
      }

      if (wasTruncated) {
        console.warn('⚠️ La respuesta fue truncada por límite de tokens');
      }
      
    } catch (jsonErr) {
      const rawText = await geminiRes.text();
      console.error('Error parseando JSON de Gemini:', jsonErr, 'Body:', rawText);
      return NextResponse.json({ 
        resumen: 'Error al procesar la respuesta', 
        recomendaciones: 'Por favor, intenta nuevamente.',
        error: 'JSON Parse Error', 
        raw: rawText 
      }, { status: 200 });
    }

    // ✨ FUNCIÓN PARA LIMPIAR MARKDOWN
    function cleanMarkdown(text: string): string {
      if (!text) return '';
      return text
        // Remover asteriscos de negritas: **texto** -> texto
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        // Remover asteriscos simples: *texto* -> texto
        .replace(/\*([^*]+)\*/g, '$1')
        // Remover guiones bajos: __texto__ -> texto
        .replace(/__([^_]+)__/g, '$1')
        .replace(/_([^_]+)_/g, '$1')
        // Limpiar títulos con asteriscos
        .replace(/^#+\s*/gm, '')
        .trim();
    }

    // Parsear el texto para extraer todas las secciones
    const extractSection = (text: string, sectionName: string, nextSection?: string): string => {
      // Buscar la posición del inicio de la sección
      const sectionPattern = new RegExp(`(?:\\*\\*)?${sectionName}:?\\s*\\*\\*?`, 'i');
      const sectionMatch = text.match(sectionPattern);
      
      if (!sectionMatch) return '';
      
      const startIndex = sectionMatch.index! + sectionMatch[0].length;
      const remainingText = text.substring(startIndex).trim();
      
      // Buscar la próxima sección si se especifica
      if (nextSection) {
        const nextPattern = new RegExp(`(?:\\*\\*)?(?:${nextSection}):?\\s*\\*\\*?`, 'i');
        const nextMatch = remainingText.match(nextPattern);
        if (nextMatch) {
          return remainingText.substring(0, nextMatch.index).trim();
        }
      }
      
      // Si no hay próxima sección, devolver todo lo que queda
      return remainingText.trim();
    };

    // Extraer todas las secciones con nombres completos primero
    let resumen = extractSection(text, 'RESUMEN', 'ANÁLISIS DE PATRONES|PATRONES|FORTALEZAS|RIESGOS|RECOMENDACIONES|SEGUIMIENTO');
    let analisisPatrones = extractSection(text, 'ANÁLISIS DE PATRONES', 'FORTALEZAS|RIESGOS|RECOMENDACIONES|SEGUIMIENTO');
    if (!analisisPatrones) analisisPatrones = extractSection(text, 'PATRONES', 'FORTALEZAS|RIESGOS|RECOMENDACIONES|SEGUIMIENTO');
    
    let fortalezas = extractSection(text, 'FORTALEZAS Y ÁREAS DE MEJORA', 'RIESGOS|FACTORES|RECOMENDACIONES|SEGUIMIENTO');
    if (!fortalezas) fortalezas = extractSection(text, 'FORTALEZAS Y MEJORAS', 'RIESGOS|FACTORES|RECOMENDACIONES|SEGUIMIENTO');
    
    let factoresRiesgo = extractSection(text, 'FACTORES DE RIESGO', 'RECOMENDACIONES|SEGUIMIENTO');
    if (!factoresRiesgo) factoresRiesgo = extractSection(text, 'RIESGOS', 'RECOMENDACIONES|SEGUIMIENTO');
    
    let recomendaciones = extractSection(text, 'RECOMENDACIONES', 'PLAN DE SEGUIMIENTO|SEGUIMIENTO');
    let planSeguimiento = extractSection(text, 'PLAN DE SEGUIMIENTO');
    if (!planSeguimiento) planSeguimiento = extractSection(text, 'SEGUIMIENTO');

    // Fallback: si no se encontraron secciones con el formato esperado, intentar extraer solo resumen y recomendaciones
    if (!resumen && !recomendaciones) {
      const resumenIndex = text.search(/(?:RESUMEN|Resumen):\s*/i);
      if (resumenIndex !== -1) {
        const matchResult = text.match(/(?:RESUMEN|Resumen):\s*/i);
        const startIndex = resumenIndex + (matchResult?.[0]?.length || 0);
        const remainingText = text.substring(startIndex);
        const recomendacionesIndex = remainingText.search(/(?:RECOMENDACIONES|Recomendaciones):\s*/i);
        if (recomendacionesIndex !== -1) {
          resumen = remainingText.substring(0, recomendacionesIndex).trim();
          const recMatchResult = remainingText.match(/(?:RECOMENDACIONES|Recomendaciones):\s*/i);
          const recStart = startIndex + recomendacionesIndex + (recMatchResult?.[0]?.length || 0);
          recomendaciones = text.substring(recStart).trim();
        } else {
          resumen = remainingText.trim();
        }
      }
    }

    // Si aún no hay nada, usar todo el texto como resumen
    if (!resumen && !recomendaciones && !analisisPatrones && text) {
      resumen = text.trim();
    }

    if (resumen && !recomendaciones) {
      recomendaciones = 'Consulte con el tutor o coordinador para determinar acciones específicas.';
    }

    // Limpiar todos los textos de markdown
    resumen = cleanMarkdown(resumen);
    analisisPatrones = cleanMarkdown(analisisPatrones);
    fortalezas = cleanMarkdown(fortalezas);
    factoresRiesgo = cleanMarkdown(factoresRiesgo);
    recomendaciones = cleanMarkdown(recomendaciones);
    planSeguimiento = cleanMarkdown(planSeguimiento);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 Resumen:', resumen.substring(0, 100));
    console.log('🔍 Análisis de Patrones:', analisisPatrones.substring(0, 100));
    console.log('💡 Recomendaciones:', recomendaciones.substring(0, 100));
    console.log('📋 Plan de Seguimiento:', planSeguimiento.substring(0, 100));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Construir el reporte completo combinando todas las secciones
    let reportComplete = '';
    if (resumen) {
      reportComplete = 'RESUMEN:\n' + resumen;
    }
    if (analisisPatrones) {
      if (reportComplete) reportComplete += '\n\nPATRONES:\n';
      reportComplete += analisisPatrones;
    }
    if (fortalezas) {
      if (reportComplete) reportComplete += '\n\nFORTALEZAS Y MEJORAS:\n';
      reportComplete += fortalezas;
    }
    if (factoresRiesgo) {
      if (reportComplete) reportComplete += '\n\nRIESGOS:\n';
      reportComplete += factoresRiesgo;
    }
    if (recomendaciones) {
      if (reportComplete) reportComplete += '\n\nRECOMENDACIONES:\n';
      reportComplete += recomendaciones;
    }
    if (planSeguimiento) {
      if (reportComplete) reportComplete += '\n\nSEGUIMIENTO:\n';
      reportComplete += planSeguimiento;
    }
    
    // Si no se pudo construir con secciones separadas, usar el texto completo
    if (!reportComplete && text) {
      reportComplete = text.trim();
    }

    const response = {
      resumen: resumen || 'Análisis no disponible',
      analisisPatrones: analisisPatrones || '',
      fortalezas: fortalezas || '',
      factoresRiesgo: factoresRiesgo || '',
      recomendaciones: recomendaciones || 'Recomendaciones no disponibles',
      planSeguimiento: planSeguimiento || '',
      report: reportComplete || resumen || 'Análisis no disponible',
      raw: text || 'Sin respuesta',
      // Solo marcar como truncado si realmente falta contenido importante
      truncated: data?.candidates?.[0]?.finishReason === 'MAX_TOKENS' && (!resumen || !recomendaciones),
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response);
    
  } catch (e) {
    console.error('Error en generate-report:', e);
    return NextResponse.json({ 
      resumen: 'Error al generar el análisis', 
      recomendaciones: 'Por favor, contacta al administrador del sistema.',
      error: String(e),
      raw: '',
      truncated: false
    }, { status: 200 });
  }
}