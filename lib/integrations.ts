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

  if (!webhookUrl || webhookUrl.includes('tu-webhook-aqui')) {
    console.warn('⚠️ Make Webhook URL no configurado en .env.local');
    return null;
  }

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
      console.error(`❌ Error al enviar a Make: ${response.status} ${response.statusText}`);
      return null;
    }

    console.log(`✅ Evento '${event}' enviado exitosamente a Make`);
    return await response.text();
  } catch (error) {
    console.error('❌ Error de red al conectar con Make:', error);
    return null;
  }
}
