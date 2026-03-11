
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const geminiApiKey = process.env.GOOGLE_AI_API_KEY;

if (!geminiApiKey) {
  console.error('❌ GOOGLE_AI_API_KEY no encontrada en .env');
  process.exit(1);
}

const modelos = [
  { nombre: 'gemini-1.5-flash', version: 'v1beta' },
  { nombre: 'gemini-pro', version: 'v1beta' }
];

async function llamarGemini(p: string, field: string, tokens: number = 600) {
  console.log(`📡 [${field}] Probando con Gemini...`);
  for (const m of modelos) {
    try {
      const url = `https://generativelanguage.googleapis.com/${m.version}/models/${m.nombre}:generateContent?key=${geminiApiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents: [{ parts: [{ text: p }] }], 
          generationConfig: { temperature: 0.7, maxOutputTokens: tokens } 
        })
      });

      if (res.ok) {
        const d = await res.json() as any;
        const text = d?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          console.log(`✅ [${field}] Éxito con ${m.nombre}`);
          return text.trim();
        }
      } else {
        const errText = await res.text();
        console.warn(`⚠️ [${field}] Error con ${m.nombre} (${res.status}): ${errText}`);
      }
    } catch (e: any) {
      console.error(`❌ [${field}] Excepción con ${m.nombre}: ${e.message}`);
    }
  }
  return null;
}

async function test() {
  const estudiante = "Juan Perez";
  const context = `Estudiante: ${estudiante} | Total: 2
Incidencias:
Inc 1: conducta - grave - El estudiante gritó en clase.
Inc 2: asistencia - leve - Llegó 5 minutos tarde.`;

  const prompts = {
    resumen: `Resumen de 2 líneas sobre la situación de ${estudiante}.\n\n${context}`,
    recomendaciones: `3 claves para ${estudiante}. Una por línea.\n\n${context}`
  };

  console.log('--- INICIANDO TEST DE CONECTIVIDAD ---');
  
  for (const [key, p] of Object.entries(prompts)) {
    const start = Date.now();
    const result = await llamarGemini(p, key);
    const end = Date.now();
    console.log(`⏱️ Tiempo para ${key}: ${((end - start) / 1000).toFixed(2)}s`);
    if (result) {
      console.log(`📄 Resultado [${key}]:\n${result}\n`);
    } else {
      console.error(`🔴 Falló la generación para ${key}`);
    }
  }
  
  console.log('--- TEST FINALIZADO ---');
}

test();
