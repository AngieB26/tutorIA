/**
 * Integraciones externas (Make, Slack, etc.)
 */

/**
 * Envía datos a un webhook de Make (Integromat)
 * @param event Nombre del evento (incidencia_creada, asistencia_registrada, etc.)
 * @param payload Datos a enviar
 */
export async function sendToMake(event: string, payload: any) {
  const webhookUrl = process.env.MAKE_WEBHOOK_URL;

  console.log(`[Make Integration] Intentando enviar evento: ${event}`);

  if (!webhookUrl || webhookUrl.includes('tu-webhook-aqui')) {
    console.warn('⚠️ [Make Integration] URL no configurada o usa placeholder');
    return null;
  }

  console.log(`[Make Integration] URL destino: ${webhookUrl}`);

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        data: payload
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [Make Integration] Error ${response.status}: ${errorText}`);
      return null;
    }

    const result = await response.text();
    console.log(`✅ [Make Integration] Éxito: ${result}`);
    return result;
  } catch (error) {
    console.error('❌ [Make Integration] Error de conexión:', error);
    return null;
  }
}
