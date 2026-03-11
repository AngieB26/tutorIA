
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const geminiApiKey = process.env.GOOGLE_AI_API_KEY;

async function listModels() {
  console.log('--- LISTANDO MODELOS DISPONIBLES ---');
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`;
    const res = await fetch(url);
    const data = await res.json() as any;
    
    if (res.ok) {
      console.log('✅ Conexión exitosa. Modelos disponibles:');
      data.models?.forEach((m: any) => {
        console.log(`- ${m.name} (${m.supportedGenerationMethods.join(', ')})`);
      });
    } else {
      console.error('❌ Error al listar modelos:', JSON.stringify(data, null, 2));
    }
  } catch (e: any) {
    console.error('❌ Excepción:', e.message);
  }
}

listModels();
