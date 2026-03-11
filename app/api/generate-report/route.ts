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
    if (!geminiApiKey) return NextResponse.json({ error: 'API Key no configurada' }, { status: 500 });

    const modelos = [
      { nombre: 'gemini-2.0-flash', version: 'v1beta' },
      { nombre: 'gemini-1.5-flash', version: 'v1' },
      { nombre: 'gemini-1.5-pro', version: 'v1' }
    ];

    const cleanMarkdown = (t: string) => t.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').replace(/^#+\s*/gm, '').trim();

    const llamarGemini = async (p: string, tokens: number = 600) => {
      for (const m of modelos) {
        try {
          const res = await fetch(`https://generativelanguage.googleapis.com/${m.version}/models/${m.nombre}:generateContent?key=${geminiApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: p }] }], generationConfig: { temperature: 0.7, maxOutputTokens: tokens } })
          });
          if (res.ok) {
            const d = await res.json();
            const text = d?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) return { texto: text.trim() };
          }
        } catch (e) {}
      }
      return null;
    };

    let resu = '', aler = '', reco = '', patr = '', fort = '', ries = '', segu = '', rawText = '';

    if (promptsSeparados) {
      const keys = Object.keys(promptsSeparados) as (keyof typeof promptsSeparados)[];
      const results = await Promise.all(keys.map(k => promptsSeparados![k] ? llamarGemini(promptsSeparados![k]!) : Promise.resolve(null)));
      results.forEach((r, i) => {
        if (r) {
          const c = cleanMarkdown(r.texto);
          const k = keys[i];
          if (k === 'resumen') resu = c;
          else if (k === 'alertas') aler = c;
          else if (k === 'recomendaciones') reco = c;
          else if (k === 'analisisPatrones') patr = c;
          else if (k === 'fortalezas') fort = c;
          else if (k === 'factoresRiesgo') ries = c;
          else if (k === 'planSeguimiento') segu = c;
        }
      });
      rawText = resu;
    } else {
      const g = await llamarGemini(prompt, 1500);
      rawText = g?.texto || '';
      resu = cleanMarkdown(rawText);
    }

    return NextResponse.json({
      resumen: resu || 'Análisis no disponible',
      alertas: aler,
      analisisPatrones: patr,
      fortalezas: fort,
      factoresRiesgo: ries,
      recomendaciones: reco || 'No se generaron recomendaciones',
      planSeguimiento: segu,
      report: rawText,
      timestamp: new Date().toISOString()
    });

  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}