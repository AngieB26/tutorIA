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
          // SEPARAR INCIDENCIAS POSITIVAS Y NEGATIVAS
          const incidenciasPositivas = incidencias.filter((i: any) => i.tipo === 'positivo');
          const incidenciasNegativas = incidencias.filter((i: any) => i.tipo !== 'positivo');
          const totalPositivas = incidenciasPositivas.length;
          const totalNegativas = incidenciasNegativas.length;

          // Calcular estadísticas adicionales para las alertas (SOLO incidencias negativas)
          const estudiantesUnicos = new Set(incidencias.map((i: any) => i.studentName));
          const profesoresUnicos = new Set(incidencias.map((i: any) => i.profesor).filter(Boolean));

          // Incidencias graves SOLO de las negativas (excluir positivas)
          // IMPORTANTE: Las incidencias positivas pueden tener gravedad "grave" pero NO se cuentan aquí
          // porque NO requieren atención. Solo contamos las negativas graves.
          const incidenciasGraves = incidenciasNegativas.filter((i: any) => i.gravedad === 'grave').length;
          const totalGravesIncluyendoPositivas = incidencias.filter((i: any) => i.gravedad === 'grave').length;
          // Porcentaje: (Incidencias NEGATIVAS + GRAVES) / TOTAL de incidencias (incluye positivas) × 100
          const totalIncidencias = incidencias.length;
          const porcentajeGraves = totalIncidencias > 0 ? ((incidenciasGraves / totalIncidencias) * 100).toFixed(1) : '0';

          // Log para verificación (puede ser útil para debugging)
          console.log(`📊 Incidencias graves: ${totalGravesIncluyendoPositivas} total (${incidenciasGraves} NEGATIVAS graves, ${totalGravesIncluyendoPositivas - incidenciasGraves} POSITIVAS graves que NO se cuentan)`);

          // Contar incidencias NEGATIVAS por estudiante (para alertas de riesgo)
          const porEstudianteNegativas: Record<string, number> = {};
          incidenciasNegativas.forEach((inc: any) => {
            porEstudianteNegativas[inc.studentName] = (porEstudianteNegativas[inc.studentName] || 0) + 1;
          });
          const estudiantesRiesgo = Object.entries(porEstudianteNegativas)
            .filter(([_, count]) => count >= 5)
            .sort(([_, a], [__, b]) => b - a)
            .slice(0, 10);

          // Contar incidencias POSITIVAS por estudiante (para reconocimientos)
          const porEstudiantePositivo: Record<string, number> = {};
          incidenciasPositivas.forEach((inc: any) => {
            porEstudiantePositivo[inc.studentName] = (porEstudiantePositivo[inc.studentName] || 0) + 1;
          });
          const estudiantesDestacados = Object.entries(porEstudiantePositivo)
            .sort(([_, a], [__, b]) => b - a)
            .slice(0, 10);

          // Contar incidencias por profesor (separar positivas y negativas)
          const porProfesorNegativas: Record<string, number> = {};
          const porProfesorPositivas: Record<string, number> = {};
          incidencias.forEach((inc: any) => {
            if (inc.profesor) {
              if (inc.tipo === 'positivo') {
                porProfesorPositivas[inc.profesor] = (porProfesorPositivas[inc.profesor] || 0) + 1;
              } else {
                porProfesorNegativas[inc.profesor] = (porProfesorNegativas[inc.profesor] || 0) + 1;
              }
            }
          });
          const promedioProfesor = profesoresUnicos.size > 0 ? totalNegativas / profesoresUnicos.size : 0;
          const profesoresFueraPromedio = Object.entries(porProfesorNegativas)
            .filter(([_, count]) => promedioProfesor > 0 && count > promedioProfesor * 1.5)
            .sort(([_, a], [__, b]) => b - a)
            .slice(0, 5);

          // Estadísticas por tipo (solo negativas para alertas)
          const porTipoNegativas: Record<string, number> = {};
          incidenciasNegativas.forEach((inc: any) => {
            porTipoNegativas[inc.tipo || 'otro'] = (porTipoNegativas[inc.tipo || 'otro'] || 0) + 1;
          });

          // Estadísticas por gravedad (solo negativas)
          const porGravedadNegativas: Record<string, number> = {};
          incidenciasNegativas.forEach((inc: any) => {
            porGravedadNegativas[inc.gravedad || 'moderada'] = (porGravedadNegativas[inc.gravedad || 'moderada'] || 0) + 1;
          });

          const datosEstadisticos = `Total: ${totalIncidencias} incidencias (${totalPositivas} POSITIVAS/Reconocimientos, ${totalNegativas} NEGATIVAS/Problemas) | Tipos negativas: ${Object.entries(porTipoNegativas).map(([tipo, count]) => `${tipo}:${count}`).join(', ')} | Gravedades negativas: ${Object.entries(porGravedadNegativas).map(([grav, count]) => `${grav}:${count}`).join(', ')} | Estudiantes únicos: ${estudiantesUnicos.size} | Profesores únicos: ${profesoresUnicos.size}`;

          // Preparar prompts separados y guardarlos
          reporteGeneralPrompts = {
            resumen: `REGLAS OBLIGATORIAS DE REDACCION - LEER ANTES DE ESCRIBIR:

⚠️ REGLA #1: NUNCA digas solo "incidencias graves". SIEMPRE di "incidencias NEGATIVAS graves" o "problemas graves".
⚠️ REGLA #2: NUNCA digas solo "incidencias". SIEMPRE di "incidencias POSITIVAS" o "incidencias NEGATIVAS" o "problemas".
⚠️ REGLA #3: Si mencionas tipos (asistencia, conducta, académica), SIEMPRE di "incidencias NEGATIVAS de [tipo]" o "problemas de [tipo]".
⚠️ REGLA #4: Si mencionas reconocimientos, SIEMPRE di "incidencias POSITIVAS".

EJEMPLOS OBLIGATORIOS A SEGUIR:
✅ CORRECTO: "Se detectaron 4 incidencias: 1 positiva (reconocimiento) y 3 negativas (problemas). Dos incidencias NEGATIVAS fueron catalogadas como graves, lo que sugiere la necesidad de revisar protocolos."
✅ CORRECTO: "Se registraron problemas de asistencia y conducta que requieren atención."
✅ CORRECTO: "Las incidencias NEGATIVAS graves sugieren la necesidad de revisar protocolos institucionales."
✅ CORRECTO: "Se detectaron ${totalNegativas} incidencias NEGATIVAS, principalmente de asistencia y conducta, afectando a estudiantes y requiriendo intervención. Dos incidencias NEGATIVAS fueron catalogadas como graves."

❌ INCORRECTO: "Dos incidencias fueron catalogadas como graves" (falta especificar NEGATIVAS)
❌ INCORRECTO: "Se detectaron incidencias de asistencia" (falta especificar NEGATIVAS)
❌ INCORRECTO: "El porcentaje de incidencias graves es alto" (falta especificar NEGATIVAS)
❌ INCORRECTO: "Se detectaron 4 incidencias, principalmente de asistencia y conducta. Dos incidencias fueron catalogadas como graves." (falta especificar NEGATIVAS en ambas menciones)

CONTEXTO:
- INCIDENCIAS POSITIVAS (${totalPositivas}): Son reconocimientos. NO requieren atención, son aspectos positivos.
- INCIDENCIAS NEGATIVAS (${totalNegativas}): Son problemas que SÍ requieren atención: conducta, asistencia, académica.
- El resumen debe enfocarse PRINCIPALMENTE en las incidencias NEGATIVAS (problemas que requieren atención).

Datos completos: ${datosEstadisticos}

INSTRUCCIONES FINALES:
- Genera SOLO un resumen ejecutivo (2-3 líneas) sobre el análisis general del estado de incidencias
- Enfócate en problemas que requieren atención (incidencias NEGATIVAS)
- Menciona brevemente las positivas como contexto positivo
- Sin títulos, sin alertas, sin recomendaciones
- Solo texto descriptivo directo
- RECUERDA: Cada vez que menciones "incidencias", DEBES agregar "POSITIVAS" o "NEGATIVAS" o usar "problemas"`,

            alertas: `REGLAS OBLIGATORIAS DE REDACCION - LEER ANTES DE ESCRIBIR:

⚠️ REGLA #1: NUNCA digas solo "incidencias graves". SIEMPRE di "incidencias NEGATIVAS graves" o "problemas graves".
⚠️ REGLA #2: NUNCA digas solo "incidencias". SIEMPRE di "incidencias NEGATIVAS" o "problemas".
⚠️ REGLA #3: NUNCA digas "porcentaje de incidencias". SIEMPRE di "porcentaje de incidencias NEGATIVAS" o "porcentaje de problemas".
⚠️ REGLA #4: NUNCA digas "incidencias de [tipo]". SIEMPRE di "incidencias NEGATIVAS de [tipo]" o "problemas de [tipo]".

EJEMPLOS OBLIGATORIOS A SEGUIR:
✅ CORRECTO: "El porcentaje de incidencias NEGATIVAS graves (50%) requiere atención"
✅ CORRECTO: "El alto porcentaje de problemas graves (50%) requiere atención"
✅ CORRECTO: "Las incidencias NEGATIVAS de asistencia son las más frecuentes"
✅ CORRECTO: "Los problemas de asistencia requieren atención"

❌ INCORRECTO: "El porcentaje de incidencias graves (50%) requiere atención"
❌ INCORRECTO: "Las incidencias de asistencia son las más frecuentes"
❌ INCORRECTO: "El porcentaje de incidencias requiere atención"

CONTEXTO:
- Las incidencias POSITIVAS (${totalPositivas}) son reconocimientos y NO requieren atención, por lo tanto NO generan alertas
- SOLO las incidencias NEGATIVAS (${totalNegativas}) son problemas que SÍ requieren atención y generan alertas
- Analiza ÚNICAMENTE problemas: conducta, asistencia, académica

Datos de INCIDENCIAS NEGATIVAS que requieren atención (${totalNegativas} total):
- Estudiantes con alto número de incidencias NEGATIVAS (5 o más): ${estudiantesRiesgo.length > 0 ? estudiantesRiesgo.map(([nombre, count]) => `${nombre} (${count} negativas)`).join(', ') : 'Ninguno'}
- Profesores con reportes NEGATIVOS superiores al promedio: ${profesoresFueraPromedio.length > 0 ? profesoresFueraPromedio.map(([nombre, count]) => `${nombre} (${count} negativas)`).join(', ') : 'Ninguno'}
- Incidencias NEGATIVAS GRAVES: ${incidenciasGraves} de ${totalIncidencias} incidencias totales (${porcentajeGraves}% del total)
- IMPORTANTE: Existen ${totalGravesIncluyendoPositivas} incidencias graves en total, pero SOLO ${incidenciasGraves} son NEGATIVAS graves (las que requieren atención). Las ${totalGravesIncluyendoPositivas - incidenciasGraves} incidencias POSITIVAS graves NO se cuentan porque son reconocimientos y NO requieren atención.
- Tipo de incidencia NEGATIVA predominante: ${Object.entries(porTipoNegativas).sort(([_, a], [__, b]) => b - a)[0]?.[0] || 'N/A'}

Datos generales: ${datosEstadisticos}

INSTRUCCIONES FINALES:
- Identifica y describe las alertas más importantes basándote EXCLUSIVAMENTE en las INCIDENCIAS NEGATIVAS
- Si no hay alertas críticas en las negativas, indica que el estado general es positivo
- NO uses markdown, asteriscos, guiones, ni ningún formato especial
- Solo texto plano y directo
- Describe cada alerta en una o dos líneas, de forma clara y concisa
- Sin títulos, sin resumen, sin recomendaciones
- RECUERDA: Cada vez que menciones "incidencias", DEBES agregar "NEGATIVAS" o usar "problemas"`,

            recomendaciones: `Genera 3-4 recomendaciones breves y específicas basándote en los datos.

CRÍTICO: Distingue claramente:
- INCIDENCIAS POSITIVAS (${totalPositivas}): Son reconocimientos. NO requieren atención, pero es bueno incrementarlas como práctica positiva.
- INCIDENCIAS NEGATIVAS (${totalNegativas}): Son problemas (conducta, asistencia, académica) que SÍ requieren atención y deben reducirse.

REGLAS OBLIGATORIAS DE REDACCION:
- SIEMPRE especifica el tipo: "incidencias POSITIVAS" o "incidencias NEGATIVAS" o "problemas"
- NUNCA digas solo "incidencias" sin especificar si son positivas o negativas
- Si mencionas gravedad, SIEMPRE di "incidencias NEGATIVAS graves" o "problemas graves", NUNCA solo "incidencias graves"
- Si mencionas tipos (asistencia, conducta, académica), SIEMPRE di "incidencias NEGATIVAS de [tipo]" o "problemas de [tipo]"
- Si recomiendas incrementar reconocimientos, di "incidencias POSITIVAS"
- Si recomiendas reducir problemas, di "incidencias NEGATIVAS" o "problemas"

Datos completos: ${datosEstadisticos}

IMPORTANTE: 
- El FOCO PRINCIPAL debe estar en REDUCIR las incidencias NEGATIVAS (problemas que requieren atención)
- Las incidencias POSITIVAS NO requieren atención, pero puedes recomendar incrementarlas como práctica positiva
- Prioriza recomendaciones para reducir problemas (negativas) sobre incrementar reconocimientos (positivas)
- Escribe UNA recomendación por línea
- Cada línea debe ser una recomendación completa e independiente
- NO uses números, guiones, asteriscos ni ningún marcador al inicio
- Solo texto directo, cada recomendación en su propia línea
- Sin títulos, sin resumen, sin alertas`
          };

          // Marcar que es reporte general para procesamiento especial
          prompt = 'REPORTE_GENERAL_SEPARADO';
          prompt = `Analiza las incidencias del estudiante y genera un reporte estructurado.
Es OBLIGATORIO usar exactamente estos encabezados en negritas:

**RESUMEN**:
[Situación general del estudiante en 2 líneas]

**ANÁLISIS DE PATRONES**:
[Tendencias detectadas]

**FORTALEZAS Y ÁREAS DE MEJORA**:
[Puntos positivos y qué mejorar]

**FACTORES DE RIESGO**:
[Riesgos identificados]

**RECOMENDACIONES**:
[3 puntos clave, uno por línea]

**PLAN DE SEGUIMIENTO**:
[2 pasos a seguir, uno por línea]

Estudiante: ${estudiante}
Total incidencias: ${totalIncidencias}
Desglose: ${Object.entries(porTipo).map(([tipo, count]) => `${tipo}: ${count}`).join(', ')}

Incidencias a procesar:
${incidenciasTexto}

IMPORTANTE: Responde solo con las secciones pedidas. No uses otro formato.`;
        }
      }
    }
    // Caso 2: Una sola incidencia (análisis individual)
    else if (inc) {
      prompt = `Analiza esta incidencia y genera un informe breve:

**RESUMEN**:
[Descripción de lo ocurrido y su importancia]

**RECOMENDACIONES**:
[2 acciones inmediatas]

Datos de la incidencia:
Tipo: ${inc.tipo || 'N/A'}
Estudiante: ${inc.studentName || 'N/A'}
Gravedad: ${inc.gravedad || 'N/A'}
Descripción: ${inc.descripcion || 'N/A'}
Derivación: ${inc.derivacion || 'N/A'}`;
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

    // Lista de modelos a probar en orden de preferencia (modelos reales de Google AI)
    const modelosAPrueba = [
      { nombre: 'gemini-2.0-flash', version: 'v1beta' },
      { nombre: 'gemini-1.5-flash', version: 'v1' },
      { nombre: 'gemini-1.5-pro', version: 'v1' },
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
      // Buscar la posición del inicio de la sección - Más flexible con asteriscos
      const sectionPattern = new RegExp(`(?:\\*+)?\\s*${sectionName}:?\\s*(?:\\*+)?`, 'i');
      const sectionMatch = text.match(sectionPattern);

      let startIndex = 0;
      let content = '';

      if (sectionMatch) {
        startIndex = sectionMatch.index! + sectionMatch[0].length;
      } else if (sectionName.toUpperCase() === 'RESUMEN') {
        // Fallback para RESUMEN: si no existe el encabezado, empezar desde el principio
        startIndex = 0;
      } else {
        return '';
      }

      const remainingText = text.substring(startIndex).trim();

      // Buscar la próxima sección si se especifica
      if (nextSection) {
        // Buscar el inicio de CUALQUIER otra sección que no sea la actual
        const nextPattern = new RegExp(`(?:\\*+)?\\s*(?:${nextSection}):?\\s*(?:\\*+)?`, 'i');
        const nextMatch = remainingText.match(nextPattern);
        if (nextMatch) {
          content = remainingText.substring(0, nextMatch.index).trim();
        } else {
          content = remainingText;
        }
      } else {
        content = remainingText;
      }

      return content;
    };

    // Lista de todos los posibles encabezados para limpieza
    const ALL_HEADERS = 'RESUMEN|ANÁLISIS DE PATRONES|PATRONES|FORTALEZAS Y ÁREAS DE MEJORA|FORTALEZAS Y MEJORAS|FORTALEZAS|ÁREAS DE MEJORA|PUNTOS FUERTES|FACTORES DE RIESGO|RIESGOS|ALERTAS INTELIGENTES|ALERTAS|RECOMENDACIONES|PLAN DE SEGUIMIENTO|SEGUIMIENTO';
    
    // Lista de sub-encabezados (todo menos RESUMEN) para usar como delimitadores
    const SUB_HEADERS = 'ANÁLISIS DE PATRONES|PATRONES|FORTALEZAS Y ÁREAS DE MEJORA|FORTALEZAS Y MEJORAS|FORTALEZAS|ÁREAS DE MEJORA|PUNTOS FUERTES|FACTORES DE RIESGO|RIESGOS|ALERTAS INTELIGENTES|ALERTAS|RECOMENDACIONES|PLAN DE SEGUIMIENTO|SEGUIMIENTO';

    // Función para limpiar encabezados que se hayan colado en el texto
    const removeHeaders = (text: string): string => {
      if (!text) return '';
      let cleaned = text;
      // Normalizar: remover asteriscos de negrita primero solo si envuelven un encabezado
      const headerPatterns = ALL_HEADERS.split('|');
      headerPatterns.forEach(header => {
        // Regex que busca el encabezado precedido opcionalmente por un bullet y espacios
        // y opcionalmente envuelto en asteriscos
        const regex = new RegExp(`(?:^|\\n)\\s*[-•*]?\\s*(?:\\*+)?\\s*${header}:?\\s*(?:\\*+)?\\s*`, 'gi');
        cleaned = cleaned.replace(regex, '\n');
      });
      return cleaned.trim();
    };

    // Extraer todas las secciones
    // Para el RESUMEN, usamos SUB_HEADERS como delimitador para que no se "coma" el resto del reporte
    let resumen = extractSection(text, 'RESUMEN', SUB_HEADERS);
    let analisisPatrones = extractSection(text, 'ANÁLISIS DE PATRONES', ALL_HEADERS);
    if (!analisisPatrones) analisisPatrones = extractSection(text, 'PATRONES', ALL_HEADERS);

    let fortalezas = extractSection(text, 'FORTALEZAS Y ÁREAS DE MEJORA', ALL_HEADERS);
    if (!fortalezas) fortalezas = extractSection(text, 'FORTALEZAS Y MEJORAS', ALL_HEADERS);
    if (!fortalezas) fortalezas = extractSection(text, 'FORTALEZAS', ALL_HEADERS);

    let factoresRiesgo = extractSection(text, 'FACTORES DE RIESGO', ALL_HEADERS);
    if (!factoresRiesgo) factoresRiesgo = extractSection(text, 'RIESGOS', ALL_HEADERS);

    let alertas = extractSection(text, 'ALERTAS INTELIGENTES', ALL_HEADERS);
    if (!alertas) alertas = extractSection(text, 'ALERTAS', ALL_HEADERS);

    let recomendaciones = extractSection(text, 'RECOMENDACIONES', ALL_HEADERS);
    let planSeguimiento = extractSection(text, 'PLAN DE SEGUIMIENTO', ALL_HEADERS);
    if (!planSeguimiento) planSeguimiento = extractSection(text, 'SEGUIMIENTO', ALL_HEADERS);

    // Limpiar cada sección de encabezados accidentales
    resumen = removeHeaders(resumen);
    analisisPatrones = removeHeaders(analisisPatrones);
    fortalezas = removeHeaders(fortalezas);
    factoresRiesgo = removeHeaders(factoresRiesgo);
    alertas = removeHeaders(alertas);
    recomendaciones = removeHeaders(recomendaciones);
    planSeguimiento = removeHeaders(planSeguimiento);

    // Si no se encontró nada con extractSection, intentar fallback básico
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