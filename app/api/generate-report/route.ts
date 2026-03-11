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
            resumen: `Resumen ejecutivo de 2 líneas sobre el estado institucional. Enfócate en problemas (NEGATIVOS).\n\n${stats}`,
            alertas: `Identifica 2 alertas críticas basadas en incidencias NEGATIVAS.\n\n${stats}`,
            recomendaciones: `3 recomendaciones institucionales para reducir problemas. Una por línea.\n\n${stats}`
          };
          prompt = 'REPORTE_GENERAL_SEPARADO';
        } else {
          const context = `Estudiante: ${estudiante} | Total: ${totalIncidencias}\n\nIncidencias:\n${incidenciasTexto}`;
          promptsSeparados = {
            resumen: `Resumen de 2 líneas sobre la situación de ${estudiante}.\n\n${context}`,
            analisisPatrones: `Identifica 2 tendencias en la conducta de ${estudiante}.\n\n${context}`,
            fortalezas: `Destaca fortalezas o áreas de mejora para ${estudiante}.\n\n${context}`,
            factoresRiesgo: `Riesgos críticos para ${estudiante} o estado estable. Máximo 2 líneas.\n\n${context}`,
            recomendaciones: `3 claves para ${estudiante}. Una por línea.\n\n${context}`,
            planSeguimiento: `2 pasos de seguimiento con ${estudiante}.\n\n${context}`
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

    const cleanMarkdown = (t: string) => t.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([Expert^*]+)\*/g, '$1').replace(/^#+\s*/gm, '').trim();

    const llamarGemini = async (p: string, field: string, tokens: number = 600) => {
      console.log(`📡 [${field}] Iniciando llamada a Gemini...`);
      for (const m of modelos) {
        try {
          const url = `https://generativelanguage.googleapis.com/${m.version}/models/${m.nombre}:generateContent?key=${geminiApiKey}`;
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              contents: [{ parts: [{ text: p }] }], 
              generationConfig: { temperature: 0.7, maxOutputTokens: tokens } 
            }),
            signal: AbortSignal.timeout(15000) // Timeout de 15 segundos
          });

          if (res.ok) {
            const d = await res.json();
            const text = d?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              console.log(`✅ [${field}] Éxito con ${m.nombre}`);
              return { texto: text.trim() };
            }
          } else {
            const errText = await res.text();
            console.warn(`⚠️ [${field}] Error con ${m.nombre} (${res.status}): ${errText.substring(0, 100)}...`);
          }
        } catch (e: any) {
          console.error(`❌ [${field}] Excepción con ${m.nombre}: ${e.message}`);
        }
      }
      console.error(`🔴 [${field}] Todos los modelos fallaron.`);
      return null;
    };

    let resu = '', aler = '', reco = '', patr = '', fort = '', ries = '', segu = '', rawText = '';

    if (promptsSeparados) {
      console.log('🚀 Procesando campos separados...');
      const keys = Object.keys(promptsSeparados) as (keyof typeof promptsSeparados)[];
      
      // Ejecutamos uno por uno para evitar rate limit si es una cuenta free
      for (const key of keys) {
        const p = promptsSeparados[key];
        if (p) {
          const res = await llamarGemini(p, key);
          if (res) {
            const cleaned = cleanMarkdown(res.texto);
            if (key === 'resumen') resu = cleaned;
            else if (key === 'alertas') aler = cleaned;
            else if (key === 'recomendaciones') reco = cleaned;
            else if (key === 'analisisPatrones') patr = cleaned;
            else if (key === 'fortalezas') fort = cleaned;
            else if (key === 'factoresRiesgo') ries = cleaned;
            else if (key === 'planSeguimiento') segu = cleaned;
          }
        }
      }
      rawText = resu;
    } else {
      const g = await llamarGemini(prompt, 'reporte_unico', 1500);
      rawText = g?.texto || '';
      resu = cleanMarkdown(rawText);
    }

    const response = {
      resumen: resu || 'Resumen no disponible por el momento.',
      alertas: aler,
      analisisPatrones: patr,
      fortalezas: fort,
      factoresRiesgo: ries,
      recomendaciones: reco || 'No se pudieron generar recomendaciones específicas.',
      planSeguimiento: segu,
      report: rawText || resu || 'Información no disponible.',
      timestamp: new Date().toISOString()
    };

    console.log('📤 Enviando respuesta final...');
    return NextResponse.json(response);

  } catch (e: any) {
    console.error('🔥 Error crítico en generate-report:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}