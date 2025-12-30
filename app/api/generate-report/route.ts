import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const inc = body.incidencia;
    const incidencias = body.incidencias;
    const estudiante = body.estudiante;
    
    let prompt = '';
    let reporteGeneralPrompts: { resumen: string; alertas: string; recomendaciones: string } | null = null;
    
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
      // HACER 3 LLAMADAS SEPARADAS para evitar que se mezclen las secciones
      
      if (estudiante === 'Reporte General') {
        // Calcular estadísticas adicionales para las alertas
        const estudiantesUnicos = new Set(incidencias.map((i: any) => i.studentName));
        const profesoresUnicos = new Set(incidencias.map((i: any) => i.profesor).filter(Boolean));
        const incidenciasGraves = incidencias.filter((i: any) => i.gravedad === 'grave').length;
        const porcentajeGraves = totalIncidencias > 0 ? ((incidenciasGraves / totalIncidencias) * 100).toFixed(1) : '0';
        
        // Contar incidencias por estudiante
        const porEstudiante: Record<string, number> = {};
        incidencias.forEach((inc: any) => {
          porEstudiante[inc.studentName] = (porEstudiante[inc.studentName] || 0) + 1;
        });
        const estudiantesRiesgo = Object.entries(porEstudiante)
          .filter(([_, count]) => count >= 5)
          .sort(([_, a], [__, b]) => b - a)
          .slice(0, 10);
        
        // Contar incidencias positivas por estudiante
        const porEstudiantePositivo: Record<string, number> = {};
        incidencias.forEach((inc: any) => {
          if (inc.tipo === 'positivo') {
            porEstudiantePositivo[inc.studentName] = (porEstudiantePositivo[inc.studentName] || 0) + 1;
          }
        });
        const estudiantesDestacados = Object.entries(porEstudiantePositivo)
          .sort(([_, a], [__, b]) => b - a)
          .slice(0, 10);
        
        // Contar incidencias por profesor
        const porProfesor: Record<string, number> = {};
        incidencias.forEach((inc: any) => {
          if (inc.profesor) porProfesor[inc.profesor] = (porProfesor[inc.profesor] || 0) + 1;
        });
        const promedioProfesor = profesoresUnicos.size > 0 ? totalIncidencias / profesoresUnicos.size : 0;
        const profesoresFueraPromedio = Object.entries(porProfesor)
          .filter(([_, count]) => promedioProfesor > 0 && count > promedioProfesor * 1.5)
          .sort(([_, a], [__, b]) => b - a)
          .slice(0, 5);
        
        const datosEstadisticos = `${totalIncidencias} incidencias totales | Tipos: ${Object.entries(porTipo).map(([tipo, count]) => `${tipo}:${count}`).join(', ')} | Gravedades: ${Object.entries(porGravedad).map(([grav, count]) => `${grav}:${count}`).join(', ')} | Estudiantes únicos: ${estudiantesUnicos.size} | Profesores únicos: ${profesoresUnicos.size}`;
        
        // Preparar prompts separados y guardarlos
        reporteGeneralPrompts = {
          resumen: `Genera SOLO un resumen ejecutivo (2-3 líneas) sobre el análisis general del estado de incidencias, tendencias principales y situación institucional.

Datos: ${datosEstadisticos}

IMPORTANTE: Solo genera el resumen, sin títulos, sin alertas, sin recomendaciones. Solo texto descriptivo directo.`,
          
          alertas: `Identifica y describe las alertas más importantes basándote en los datos. 

Datos específicos:
- Estudiantes con alto número de incidencias (5 o más): ${estudiantesRiesgo.length > 0 ? estudiantesRiesgo.map(([nombre, count]) => `${nombre} (${count})`).join(', ') : 'Ninguno'}
- Profesores con reportes superiores al promedio: ${profesoresFueraPromedio.length > 0 ? profesoresFueraPromedio.map(([nombre, count]) => `${nombre} (${count})`).join(', ') : 'Ninguno'}
- Porcentaje de incidencias graves: ${porcentajeGraves}% (${incidenciasGraves} de ${totalIncidencias})
- Tipo de incidencia predominante: ${Object.entries(porTipo).sort(([_, a], [__, b]) => b - a)[0]?.[0] || 'N/A'}

Datos generales: ${datosEstadisticos}

IMPORTANTE: 
- Si no hay alertas críticas, indica que el estado general es positivo y los indicadores están dentro de rangos normales
- NO uses markdown, asteriscos, guiones, ni ningún formato especial
- Solo texto plano y directo
- Describe cada alerta en una o dos líneas, de forma clara y concisa
- Sin títulos, sin resumen, sin recomendaciones`,
          
          recomendaciones: `Genera 3-4 recomendaciones breves y específicas basándote en los datos de incidencias.

Datos: ${datosEstadisticos}

IMPORTANTE: 
- Las recomendaciones "positivas" DEBEN INCREMENTARSE
- Las incidencias de "ausencia", "conducta" y "académica" se deben PREVENIR o REDUCIR
- Escribe UNA recomendación por línea
- Cada línea debe ser una recomendación completa e independiente
- NO uses números, guiones, asteriscos ni ningún marcador al inicio
- Solo texto directo, cada recomendación en su propia línea
- Sin títulos, sin resumen, sin alertas`
        };
        
        // Marcar que es reporte general para procesamiento especial
        prompt = 'REPORTE_GENERAL_SEPARADO';
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

    // Lista de modelos a probar en orden de preferencia
    const modelosAPrueba = [
      { nombre: 'gemini-2.5-flash', version: 'v1beta' },
      { nombre: 'gemini-2.0-flash', version: 'v1beta' },
      { nombre: 'gemini-2.0-flash-exp', version: 'v1beta' },
      { nombre: 'gemini-2.5-pro', version: 'v1beta' },
      { nombre: 'gemini-3-flash', version: 'v1beta' },
      { nombre: 'gemini-2.5-flash-lite', version: 'v1beta' },
      { nombre: 'gemini-2.0-flash-lite', version: 'v1beta' },
      { nombre: 'gemini-1.5-flash', version: 'v1beta' },
      { nombre: 'gemini-1.5-pro', version: 'v1beta' },
    ];

    // Log para debugging (sin mostrar la key completa por seguridad)
    console.log('🔑 API Key configurada:', geminiApiKey ? `${geminiApiKey.substring(0, 10)}...` : 'NO ENCONTRADA');
    
    // Función auxiliar para llamar a Gemini con un prompt específico
    const llamarGemini = async (promptTexto: string, maxTokens: number = 1500): Promise<{ texto: string; modelo: string } | null> => {
      const requestBody = {
        contents: [{ parts: [{ text: promptTexto }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: maxTokens,
          topP: 0.95,
          topK: 40
        }
      };

      let geminiRes: Response | null = null;
      let modeloUsado = '';
      let ultimoError: any = null;

      // Intentar cada modelo hasta que uno funcione
      for (const modelo of modelosAPrueba) {
        try {
          const url = `https://generativelanguage.googleapis.com/${modelo.version}/models/${modelo.nombre}:generateContent?key=${geminiApiKey}`;
          
          geminiRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });
          
          if (geminiRes.ok) {
            modeloUsado = modelo.nombre;
            const data = await geminiRes.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (text) {
              return { texto: text.trim(), modelo: modeloUsado };
            }
          } else {
            const errorText = await geminiRes.text();
            ultimoError = { status: geminiRes.status, text: errorText, modelo: modelo.nombre };
          }
        } catch (error) {
          ultimoError = { error, modelo: modelo.nombre };
        }
      }
      
      console.error('❌ Error en llamada a Gemini:', ultimoError);
      return null;
    };

    // Si es reporte general, hacer 3 llamadas separadas
    if (prompt === 'REPORTE_GENERAL_SEPARADO' && reporteGeneralPrompts) {
      console.log('🔄 Generando reporte general con llamadas separadas...');
      
      // Hacer las 3 llamadas en paralelo usando los prompts guardados
      const [resResumen, resAlertas, resRecomendaciones] = await Promise.all([
        llamarGemini(reporteGeneralPrompts.resumen, 500),
        llamarGemini(reporteGeneralPrompts.alertas, 1000),
        llamarGemini(reporteGeneralPrompts.recomendaciones, 800)
      ]);

      // Si todas las llamadas fallaron, retornar error
      if (!resResumen && !resAlertas && !resRecomendaciones) {
        console.error('❌ Todas las llamadas a Gemini fallaron');
        return NextResponse.json({ 
          resumen: 'Error al conectar con el servicio de IA', 
          alertas: '',
          recomendaciones: 'Por favor, intenta nuevamente más tarde.',
          error: 'API Error',
          report: 'Error al generar el análisis'
        }, { status: 200 });
      }

      // Función para limpiar markdown (definida más abajo en el código, pero la usamos aquí también)
      const cleanMarkdown = (text: string): string => {
        if (!text) return '';
        return text
          .replace(/\*\*([^*]+)\*\*/g, '$1')
          .replace(/\*([^*]+)\*/g, '$1')
          .replace(/__([^_]+)__/g, '$1')
          .replace(/_([^_]+)_/g, '$1')
          .replace(/^#+\s*/gm, '')
          .trim();
      };

      let resumen = resResumen?.texto || 'Análisis no disponible';
      let alertas = resAlertas?.texto || '';
      let recomendaciones = resRecomendaciones?.texto || 'Recomendaciones no disponibles';

      // Limpiar markdown de todas las respuestas
      resumen = cleanMarkdown(resumen);
      alertas = cleanMarkdown(alertas);
      recomendaciones = cleanMarkdown(recomendaciones);
      
      // Asegurar que las recomendaciones estén separadas por líneas
      // Si hay recomendaciones en una sola línea, intentar separarlas por puntos o números
      if (recomendaciones && !recomendaciones.includes('\n')) {
        // Intentar separar por patrones comunes
        recomendaciones = recomendaciones
          .replace(/(\d+[.)]\s*)/g, '\n$1') // Separar por números
          .replace(/([-•*]\s*)/g, '\n$1') // Separar por bullets
          .replace(/\.\s+([A-ZÁÉÍÓÚÑ])/g, '.\n$1') // Separar por puntos seguidos de mayúscula
          .trim();
      }

      console.log('✅ Resumen generado:', resumen.substring(0, 100));
      console.log('✅ Alertas generadas:', alertas.substring(0, 100));
      console.log('✅ Recomendaciones generadas:', recomendaciones.substring(0, 100));

      // Construir el reporte completo
      let reportComplete = '';
      if (resumen) reportComplete = 'RESUMEN:\n' + resumen;
      if (alertas) reportComplete += (reportComplete ? '\n\nALERTAS INTELIGENTES:\n' : '') + alertas;
      if (recomendaciones) reportComplete += (reportComplete ? '\n\nRECOMENDACIONES:\n' : '') + recomendaciones;

      return NextResponse.json({
        resumen: resumen,
        alertas: alertas,
        recomendaciones: recomendaciones,
        report: reportComplete || resumen,
        raw: `Resumen: ${resumen}\n\nAlertas: ${alertas}\n\nRecomendaciones: ${recomendaciones}`,
        truncated: false,
        timestamp: new Date().toISOString()
      });
    }

    // Para otros casos, usar el flujo original
    // Preparar el body de la solicitud
    const requestBody = {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: incidencias && Array.isArray(incidencias) 
          ? (estudiante === 'Reporte General' ? 4000 : 2500)
          : 2000,
            topP: 0.95,
            topK: 40
          }
    };

    let geminiRes: Response | null = null;
    let modeloUsado = '';
    let ultimoError: any = null;

    // Intentar cada modelo hasta que uno funcione
    for (const modelo of modelosAPrueba) {
      try {
        const url = `https://generativelanguage.googleapis.com/${modelo.version}/models/${modelo.nombre}:generateContent?key=${geminiApiKey}`;
        console.log(`📡 Intentando modelo: ${modelo.nombre} (${modelo.version})`);
        
        geminiRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });
        
        console.log(`📥 Respuesta HTTP para ${modelo.nombre}:`, geminiRes.status, geminiRes.statusText);
        
        if (geminiRes.ok) {
          modeloUsado = modelo.nombre;
          console.log(`✅ Modelo ${modelo.nombre} funcionó correctamente`);
          break; // Salir del loop si funciona
        } else {
      const errorText = await geminiRes.text();
          console.warn(`⚠️ Modelo ${modelo.nombre} falló:`, geminiRes.status, errorText.substring(0, 100));
          ultimoError = { status: geminiRes.status, text: errorText, modelo: modelo.nombre };
          // Continuar con el siguiente modelo
        }
      } catch (error) {
        console.warn(`⚠️ Error al intentar modelo ${modelo.nombre}:`, error);
        ultimoError = { error, modelo: modelo.nombre };
        // Continuar con el siguiente modelo
      }
    }

    // Si ningún modelo funcionó
    if (!geminiRes || !geminiRes.ok) {
      console.error('❌ Todos los modelos fallaron. Último error:', ultimoError);
      
      let mensajeError = 'Error al conectar con el servicio de IA';
      let recomendaciones = 'Por favor, intenta nuevamente más tarde.';
      
      if (ultimoError) {
      try {
          const errorJson = typeof ultimoError.text === 'string' ? JSON.parse(ultimoError.text) : null;
          if (errorJson?.error?.message) {
            const errorMessage = errorJson.error.message.toLowerCase();
            if (errorMessage.includes('expired') || errorMessage.includes('expirada')) {
              mensajeError = 'La API key ha expirado';
              recomendaciones = 'Por favor, genera una nueva API key en Google AI Studio.';
            } else if (errorMessage.includes('invalid') || errorMessage.includes('invalid api key')) {
              mensajeError = 'API key inválida';
              recomendaciones = 'Por favor, verifica que la API key sea correcta.';
            } else {
              mensajeError = `Error del servicio de IA: ${errorJson.error.message}`;
            }
          }
        } catch (e) {
          // Ignorar errores de parsing
        }
      }
      
      return NextResponse.json({ 
        resumen: mensajeError, 
        recomendaciones: recomendaciones,
        error: 'API Error',
        status: ultimoError?.status || 500
      }, { status: 200 });
    }
    
    console.log(`✅ Usando modelo exitoso: ${modeloUsado}`);

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
    let resumen = extractSection(text, 'RESUMEN', 'ANÁLISIS DE PATRONES|PATRONES|FORTALEZAS|RIESGOS|ALERTAS|RECOMENDACIONES|SEGUIMIENTO');
    let analisisPatrones = extractSection(text, 'ANÁLISIS DE PATRONES', 'FORTALEZAS|RIESGOS|ALERTAS|RECOMENDACIONES|SEGUIMIENTO');
    if (!analisisPatrones) analisisPatrones = extractSection(text, 'PATRONES', 'FORTALEZAS|RIESGOS|ALERTAS|RECOMENDACIONES|SEGUIMIENTO');
    
    let fortalezas = extractSection(text, 'FORTALEZAS Y ÁREAS DE MEJORA', 'RIESGOS|FACTORES|ALERTAS|RECOMENDACIONES|SEGUIMIENTO');
    if (!fortalezas) fortalezas = extractSection(text, 'FORTALEZAS Y MEJORAS', 'RIESGOS|FACTORES|ALERTAS|RECOMENDACIONES|SEGUIMIENTO');
    
    let factoresRiesgo = extractSection(text, 'FACTORES DE RIESGO', 'ALERTAS|RECOMENDACIONES|SEGUIMIENTO');
    if (!factoresRiesgo) factoresRiesgo = extractSection(text, 'RIESGOS', 'ALERTAS|RECOMENDACIONES|SEGUIMIENTO');
    
    // Extraer alertas inteligentes (especialmente para reporte general)
    let alertas = extractSection(text, 'ALERTAS INTELIGENTES', 'RECOMENDACIONES|SEGUIMIENTO');
    if (!alertas) {
      alertas = extractSection(text, 'ALERTAS', 'RECOMENDACIONES|SEGUIMIENTO');
    }
    
    // Si las alertas están mezcladas en el resumen, intentar extraerlas
    if (!alertas && resumen) {
      // Buscar si el resumen contiene texto de alertas (varios formatos posibles)
      // Formato: "ALERTAS INTELIGENTES: - Porcentaje..." o "ALERTAS INTELIGENTES: Porcentaje..."
      // Usar modo no-greedy con lookahead para capturar hasta RECOMENDACIONES o hasta el final
      // Nota: No usar flag 's' (dotAll) para compatibilidad, usar [\s\S] en su lugar
      let alertasEnResumen = resumen.match(/ALERTAS?\s*INTELIGENTES?:?\s*[-•]?\s*([\s\S]+?)(?=\s*RECOMENDACIONES|$)/i);
      
      // Si no encontró con el formato anterior, buscar sin el guión inicial
      if (!alertasEnResumen) {
        alertasEnResumen = resumen.match(/ALERTAS?\s*INTELIGENTES?:?\s*([\s\S]+?)(?=\s*RECOMENDACIONES|$)/i);
      }
      
      // Si aún no encontró, buscar desde "ALERTAS" hasta el final del texto
      if (!alertasEnResumen) {
        alertasEnResumen = resumen.match(/ALERTAS?\s*INTELIGENTES?:?\s*([\s\S]+)/i);
      }
      
      if (alertasEnResumen && alertasEnResumen[1]) {
        alertas = alertasEnResumen[1].trim();
        // Limpiar el prefijo "ALERTAS INTELIGENTES:" si quedó
        alertas = alertas.replace(/^ALERTAS?\s*INTELIGENTES?:?\s*/i, '').trim();
        // Limpiar guiones o bullets al inicio si existen
        alertas = alertas.replace(/^[-•]\s*/, '').trim();
        console.log('🔍 Alertas extraídas del resumen:', alertas.substring(0, 200));
        
        // Limpiar las alertas del resumen (remover desde "ALERTAS" hasta el final)
        // Primero intentar remover con punto antes
        resumen = resumen.replace(/\.\s*ALERTAS?\s*INTELIGENTES?:?\s*[\s\S]*$/i, '').trim();
        // Si no se removió, intentar sin punto
        if (resumen.includes('ALERTAS')) {
          resumen = resumen.replace(/ALERTAS?\s*INTELIGENTES?:?\s*[\s\S]*$/i, '').trim();
        }
        console.log('📝 Resumen después de extraer alertas:', resumen.substring(0, 150));
      }
    }
    
    // También buscar alertas en el texto completo si no se encontraron
    if (!alertas) {
      // Buscar en todo el texto, no solo después de RESUMEN
      const matchAlertas = text.match(/ALERTAS?\s*INTELIGENTES?:?\s*[-•]?\s*([\s\S]+?)(?=\s*RECOMENDACIONES|$)/i);
      if (matchAlertas && matchAlertas[1]) {
        alertas = matchAlertas[1].trim();
        // Limpiar el prefijo si quedó
        alertas = alertas.replace(/^ALERTAS?\s*INTELIGENTES?:?\s*/i, '').trim();
        alertas = alertas.replace(/^[-•]\s*/, '').trim();
        console.log('🔍 Alertas encontradas en texto completo:', alertas.substring(0, 200));
      } else {
        // Intentar sin el guión
        const matchAlertas2 = text.match(/ALERTAS?\s*INTELIGENTES?:?\s*([\s\S]+?)(?=\s*RECOMENDACIONES|$)/i);
        if (matchAlertas2 && matchAlertas2[1]) {
          alertas = matchAlertas2[1].trim();
          alertas = alertas.replace(/^ALERTAS?\s*INTELIGENTES?:?\s*/i, '').trim();
          console.log('🔍 Alertas encontradas (sin guión):', alertas.substring(0, 200));
        }
      }
    }
    
    // Limpiar el resumen de cualquier referencia a alertas que pueda haber quedado
    if (resumen) {
      const resumenAntes = resumen;
      // Remover "ALERTAS INTELIGENTES:" y todo lo que sigue
      resumen = resumen.replace(/ALERTAS?\s*INTELIGENTES?:?\s*[\s\S]*$/i, '').trim();
      // Remover punto y espacio antes de "ALERTAS" si existe
      resumen = resumen.replace(/\.\s*ALERTAS?\s*INTELIGENTES?:?\s*[\s\S]*$/i, '').trim();
      // Remover solo el texto "ALERTAS INTELIGENTES:" si está al final
      resumen = resumen.replace(/\s*ALERTAS?\s*INTELIGENTES?:?\s*$/i, '').trim();
      
      if (resumenAntes !== resumen) {
        console.log('🧹 Limpiado resumen de referencias a alertas');
        console.log('📝 Resumen después de limpieza:', resumen.substring(0, 100));
      }
    }
    
    // Log para debugging
    if (alertas) {
      console.log('✅ Alertas extraídas:', alertas.substring(0, 200));
    } else {
      console.warn('⚠️ No se encontraron alertas en la respuesta');
      console.log('📄 Texto completo para debugging:', text.substring(0, 500));
    }
    
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
    alertas = cleanMarkdown(alertas);
    recomendaciones = cleanMarkdown(recomendaciones);
    planSeguimiento = cleanMarkdown(planSeguimiento);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 Resumen:', resumen.substring(0, 100));
    console.log('🚨 Alertas:', alertas.substring(0, 100));
    console.log('🔍 Análisis de Patrones:', analisisPatrones.substring(0, 100));
    console.log('💡 Recomendaciones:', recomendaciones.substring(0, 100));
    console.log('📋 Plan de Seguimiento:', planSeguimiento.substring(0, 100));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Construir el reporte completo combinando todas las secciones
    let reportComplete = '';
    if (resumen) {
      reportComplete = 'RESUMEN:\n' + resumen;
    }
    if (alertas) {
      if (reportComplete) reportComplete += '\n\nALERTAS INTELIGENTES:\n';
      reportComplete += alertas;
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
      alertas: alertas || '',
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