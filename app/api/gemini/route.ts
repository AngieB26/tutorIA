// Simple proxy API route for Gemini requests (Next.js Edge API Route)
// Place this file in /app/api/gemini/route.ts

export async function POST(req: Request) {
  // Plantilla recomendada para el prompt Gemini
  // Puedes usar esta constante en el frontend o backend para asegurar el formato correcto
  //
  // Eres un experto en psicopedagogía escolar. Analiza la siguiente incidencia y responde SIEMPRE con este formato exacto:
  //
  // RESUMEN:
  // [Escribe aquí un resumen breve de la situación.]
  //
  // RECOMENDACIONES:
  // [Escribe aquí recomendaciones rápidas de acción para el director o tutor, usando bullets simples (no numeración, solo '-').]
  //
  // Si algún dato falta, inventa un ejemplo realista y útil.
  //
  // Datos de la incidencia:
  // Tipo: ...
  // Estudiante: ...
  // ...
  const { prompt } = await req.json();
  const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY;

  if (!GEMINI_API_KEY) {
    console.error('GOOGLE_AI_API_KEY no está configurada');
    return new Response(JSON.stringify({ error: true, message: 'Configuración de API no disponible' }), { status: 500 });
  }

  const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;


  const body = {
    contents: [
      {
        parts: [
          { text: prompt }
        ]
      }
    ]
  };

  try {
    const res = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      let errorText = await res.text();
      console.error('Gemini API error:', res.status, errorText);
      return new Response(JSON.stringify({ error: true, status: res.status, message: errorText }), { status: 500 });
    }
    const data = await res.json();
    const fullText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No se pudo generar el análisis.";

    // Parser para separar resumen y recomendaciones
    let resumen = '';
    let recomendaciones = '';
    // Busca los encabezados
    const resumenMatch = fullText.match(/RESUMEN:?\s*([\s\S]*?)(?=RECOMENDACIONES:|$)/i);
    if (resumenMatch) {
      resumen = resumenMatch[1].trim();
    }
    const recomendacionesMatch = fullText.match(/RECOMENDACIONES:?\s*([\s\S]*)/i);
    if (recomendacionesMatch) {
      recomendaciones = recomendacionesMatch[1].trim();
    }
    // Si no se encuentra, fallback: primer párrafo es resumen, resto recomendaciones
    if (!resumen && !recomendaciones) {
      const parts = fullText.split(/\n\n+/);
      resumen = parts[0]?.trim() || '';
      recomendaciones = parts.slice(1).join('\n').trim();
    }

    return new Response(
      JSON.stringify({ resumen, recomendaciones, raw: fullText, result: fullText, data }),
      { status: 200 }
    );

  } catch (e) {
    let errorMsg = 'Error desconocido';
    if (e instanceof Error) {
      errorMsg = e.message;
    } else if (typeof e === 'string') {
      errorMsg = e;
    } else if (e && typeof e === 'object' && 'message' in e) {
      errorMsg = (e as any).message;
    }
    console.error('Error in Gemini proxy route:', e);
    return new Response(JSON.stringify({ error: true, message: errorMsg }), { status: 500 });
  }
}





