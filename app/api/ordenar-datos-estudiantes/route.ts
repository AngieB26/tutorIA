import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const datos = body.datos; // Array de objetos con los datos del Excel
    const mapeo = body.mapeo; // Mapeo de columnas actual
    
    if (!datos || !Array.isArray(datos) || datos.length === 0) {
      return NextResponse.json({ error: 'No se proporcionaron datos válidos' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key no configurada' }, { status: 500 });
    }

    // Preparar muestra de datos para la IA (máximo 10 filas para no exceder el límite)
    const muestraDatos = datos.slice(0, 10);
    const datosTexto = JSON.stringify(muestraDatos, null, 2);

    const prompt = `Analiza estos datos de estudiantes importados desde Excel y ordénalos/limpia los datos según sea necesario.

Datos de muestra (${muestraDatos.length} de ${datos.length} filas):
${datosTexto}

Mapeo actual de columnas:
${JSON.stringify(mapeo, null, 2)}

Tareas a realizar:
1. Si hay una columna con nombre completo (nombres y apellidos juntos), separarlos en dos campos: "nombres" y "apellidos"
2. Normalizar formatos de grados (ej: "1ro", "1", "Primero" -> "1ro")
3. Normalizar formatos de secciones (ej: "A", "a", "Sección A" -> "A")
4. Limpiar espacios en blanco extra
5. Detectar y corregir errores obvios (ej: nombres en mayúsculas, formatos inconsistentes)
6. Si faltan datos obligatorios pero se pueden inferir, sugerirlos

IMPORTANTE:
- Devuelve SOLO un JSON válido con el siguiente formato:
{
  "datosOrdenados": [array de objetos con los datos procesados],
  "sugerencias": ["sugerencia 1", "sugerencia 2", ...],
  "cambiosRealizados": ["cambio 1", "cambio 2", ...]
}

- Si no hay cambios necesarios, devuelve los datos originales
- NO uses markdown, solo JSON puro
- El array "datosOrdenados" debe tener la misma estructura que los datos originales pero con los campos procesados`;

    // Intentar con múltiples modelos de Gemini
    const modelos = [
      { nombre: 'gemini-2.5-flash', version: 'v1beta' },
      { nombre: 'gemini-2.0-flash', version: 'v1beta' },
      { nombre: 'gemini-1.5-flash', version: 'v1beta' },
      { nombre: 'gemini-1.5-pro', version: 'v1beta' },
    ];

    let ultimoError: any = null;

    for (const modelo of modelos) {
      try {
        const url = `https://generativelanguage.googleapis.com/${modelo.version}/models/${modelo.nombre}:generateContent?key=${apiKey}`;
        
        const requestBody = {
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
          }
        };

        const geminiRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        if (geminiRes.ok) {
          const data = await geminiRes.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          
          if (text) {
            // Intentar extraer JSON de la respuesta
            let jsonText = text.trim();
            
            // Si la respuesta está envuelta en markdown, extraer el JSON
            const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
              jsonText = jsonMatch[1];
            }
            
            // Buscar el objeto JSON en la respuesta
            const jsonStart = jsonText.indexOf('{');
            const jsonEnd = jsonText.lastIndexOf('}');
            if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
              jsonText = jsonText.substring(jsonStart, jsonEnd + 1);
            }

            try {
              const resultado = JSON.parse(jsonText);
              
              // Si solo procesó una muestra, aplicar los mismos cambios al resto
              if (muestraDatos.length < datos.length && resultado.datosOrdenados) {
                // Aplicar la lógica de procesamiento a todos los datos
                // Por ahora, devolvemos solo la muestra procesada y sugerencias
                return NextResponse.json({
                  datosOrdenados: resultado.datosOrdenados,
                  sugerencias: resultado.sugerencias || [],
                  cambiosRealizados: resultado.cambiosRealizados || [],
                  nota: `Se procesaron ${muestraDatos.length} filas de muestra. Aplica los cambios manualmente o procesa el archivo completo.`
                });
              }

              return NextResponse.json({
                datosOrdenados: resultado.datosOrdenados || datos,
                sugerencias: resultado.sugerencias || [],
                cambiosRealizados: resultado.cambiosRealizados || []
              });
            } catch (parseError) {
              console.error('Error parseando JSON de IA:', parseError);
              ultimoError = { error: 'Error parseando respuesta de IA', modelo: modelo.nombre };
            }
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
    return NextResponse.json({ 
      error: 'No se pudo procesar con IA. Puedes importar los datos sin ordenar.',
      datosOriginales: datos
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error en ordenar-datos-estudiantes:', error);
    return NextResponse.json({ 
      error: error.message || 'Error al procesar datos con IA'
    }, { status: 500 });
  }
}

