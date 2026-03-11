import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const inc = body.incidencia;
    const incidencias = body.incidencias;
    const estudiante = body.estudiante;

    let prompt = '';
    let promptsSeparados: {
      resumen?: string;
      alertas?: string;
      recomendaciones?: string;
      analisisPatrones?: string;
      fortalezas?: string;
      factoresRiesgo?: string;
      planSeguimiento?: string;
    } | null = null;

    // Caso 1: Múltiples incidencias para un estudiante (reporte consolidado) o sin incidencias
    if (estudiante && incidencias && Array.isArray(incidencias)) {
      if (incidencias.length === 0) {
        prompt = `Genera un resumen positivo y breve para ${estudiante} indicando que no tiene incidencias recientes. Solo una línea.`;
      } else {
        const incidenciasTexto = estudiante === 'Reporte General' ? '' : incidencias.map((i: any, idx: number) => 
          `Inc ${idx + 1}: ${i.tipo} - ${i.gravedad} - ${i.descripcion?.substring(0, 100)}`
        ).join('\n');

        const totalIncidencias = incidencias.length;
        const porTipo: Record<string, number> = {};
        incidencias.forEach((i: any) => { porTipo[i.tipo || 'otro'] = (porTipo[i.tipo || 'otro'] || 0) + 1; });

        if (estudiante === 'Reporte General') {
          const neg = incidencias.filter((i: any) => i.tipo !== 'positivo').length;
          const pos = incidencias.filter((i: any) => i.tipo === 'positivo').length;
          const graves = incidencias.filter((i: any) => i.tipo !== 'positivo' && i.gravedad === 'grave').length;
          const stats = `Total: ${totalIncidencias} (${pos} pos, ${neg} neg). Graves: ${graves}.`;

          promptsSeparados = {
            resumen: `Resumen ejecutivo de MÁXIMO 40 palabras sobre el estado institucional. Enfócate solo en lo más crítico (NEGATIVOS).\n\n${stats}`,
            alertas: `Identifica ÚNICAMENTE 2 alertas críticas en formato lista de puntos cortos. No repitas lo dicho en el resumen.\n\n${stats}`,
            recomendaciones: `Proporciona 3 recomendaciones estratégicas BREVES. Una por línea. Máximo 15 palabras cada una.\n\n${stats}`
          };
          prompt = 'REPORTE_GENERAL_SEPARADO';
        } else {
          const context = `Estudiante: ${estudiante} | Total: ${totalIncidencias}\n\nIncidencias:\n${incidenciasTexto}`;
          promptsSeparados = {
            resumen: `Describe la situación actual de ${estudiante} en MÁXIMO 2 líneas. Sé directo.\n\n${context}`,
            analisisPatrones: `Identifica los 2 comportamientos más recurrentes. Prohibido repetir el resumen. Usa puntos cortos.\n\n${context}`,
            fortalezas: `Menciona 1 fortaleza O área de mejora prioritaria. Máximo 20 palabras.\n\n${context}`,
            factoresRiesgo: `¿Cuál es el riesgo principal aquí? Responde en UNA SOLA FRASE de máximo 15 palabras.\n\n${context}`,
            recomendaciones: `3 acciones concretas para este caso. Máximo 10 palabras por acción. Una por línea.\n\n${context}`,
            planSeguimiento: `Define 2 pasos de seguimiento inmediatos. Formato lista de puntos, máximo 12 palabras por punto.\n\n${context}`
          };
          prompt = 'REPORTE_ESTUDIANTE_SEPARADO';
        }
      }
    } else if (inc) {
      const context = `Incidencia: ${inc.tipo} | Estudiante: ${inc.studentName} | Descripción: ${inc.descripcion}`;
      promptsSeparados = {
        resumen: `Analiza esta incidencia en 2 líneas.\n\n${context}`,
        recomendaciones: `2 acciones recomendadas. Una por línea.\n\n${context}`
      };
      prompt = 'REPORTE_INCIDENCIA_SEPARADO';
    } else {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }

    const geminiApiKey = process.env.GOOGLE_AI_API_KEY;
    if (!geminiApiKey) {
      console.error('❌ GOOGLE_AI_API_KEY no encontrada');
      return NextResponse.json({ error: 'API Key no configurada' }, { status: 500 });
    }

    const modelos = [
      { nombre: 'gemini-1.5-flash', version: 'v1' },
      { nombre: 'gemini-1.5-pro', version: 'v1' },
      { nombre: 'gemini-2.0-flash', version: 'v1beta' }
    ];

    const cleanMarkdown = (t: string) => {
      if (!t) return '';
      return t
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/^#+\s*/gm, '')
        // Eliminar introducciones típicas de IA
        .replace(/^(Aquí tienes|A continuación|Basado en|Según|He analizado|Claves para|Pasos de seguimiento|Resumen de|Como analista).+?:\s*/i, '')
        .trim();
    };

    const llamarGemini = async (p: string, field: string, tokens: number = 800) => {
      console.log(`📡 [${field}] Solicitando...`);
      // Instrucción de sistema para forzar formato directo e impedir el "No se encontró" si hay datos
      const completePrompt = `Actúa como un psicólogo educativo experto. 
INSTRUCCIÓN CRÍTICA: Responde ÚNICAMENTE con el contenido solicitado. 
PROHIBIDO: Introducciones ("Aquí tienes..."), saludos o conclusiones.
Si no hay datos suficientes para un patrón o fortaleza, describe brevemente la situación actual basada en lo que ves.
NUNCA respondas que no encontraste nada si hay al menos una incidencia.\n\n${p}`;

      for (const m of modelos) {
        try {
          const res = await fetch(`https://generativelanguage.googleapis.com/${m.version}/models/${m.nombre}:generateContent?key=${geminiApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              contents: [{ parts: [{ text: completePrompt }] }], 
              generationConfig: { temperature: 0.6, maxOutputTokens: tokens } 
            }),
            signal: AbortSignal.timeout(20000)
          });

          if (res.ok) {
            const d = await res.json();
            const text = d?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              console.log(`✅ [${field}] OK (${m.nombre})`);
              return { texto: text.trim() };
            }
          }
        } catch (e: any) {
          console.error(`⚠️ [${field}] Error con ${m.nombre}: ${e.message}`);
        }
      }
      return null;
    };

    let resu = '', aler = '', reco = '', patr = '', fort = '', ries = '', segu = '', rawText = '';

    if (promptsSeparados) {
      const keys = Object.keys(promptsSeparados) as (keyof typeof promptsSeparados)[];
      
      // Ejecutamos en paralelo para mayor velocidad, ya que la API Key parece estar activa
      const results = await Promise.all(keys.map(key => {
        const p = promptsSeparados![key];
        return p ? llamarGemini(p, key) : Promise.resolve(null);
      }));

      results.forEach((res, i) => {
        if (res) {
          const cleaned = cleanMarkdown(res.texto);
          const key = keys[i];
          if (key === 'resumen') resu = cleaned;
          else if (key === 'alertas') aler = cleaned;
          else if (key === 'recomendaciones') reco = cleaned;
          else if (key === 'analisisPatrones') patr = cleaned;
          else if (key === 'fortalezas') fort = cleaned;
          else if (key === 'factoresRiesgo') ries = cleaned;
          else if (key === 'planSeguimiento') segu = cleaned;
        }
      });
      rawText = resu;
    } else {
      const g = await llamarGemini(prompt, 'reporte_unico', 1500);
      rawText = g?.texto || '';
      resu = cleanMarkdown(rawText);
    }

    return NextResponse.json({
      resumen: resu || 'Situación bajo observación.',
      alertas: aler,
      analisisPatrones: patr || 'Se requiere más tiempo para identificar un patrón claro.',
      fortalezas: fort || 'Enfocarse en reforzar conductas positivas básicas.',
      factoresRiesgo: ries || 'Situación estable por el momento.',
      recomendaciones: reco || 'Continuar con el monitoreo preventivo.',
      planSeguimiento: segu || 'Mantener registro diario de incidencias.',
      report: rawText,
      timestamp: new Date().toISOString()
    });

  } catch (e: any) {
    console.error('🔥 Error crítico:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}