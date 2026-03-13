
async function testApi() {
    console.log('📡 Enviando incidencia de prueba a la API local...');
    try {
        const response = await fetch('http://localhost:3000/api/incidencias', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                profesor: 'Test Antigravity',
                studentName: 'Estudiante Prueba',
                tipo: 'conducta',
                gravedad: 'leve',
                descripcion: 'Prueba de integración con Make desde Antigravity',
                fecha: new Date().toISOString().split('T')[0]
            })
        });
        
        const data = await response.json();
        console.log('✅ Respuesta de la API:', response.status, data);
    } catch (e) {
        console.error('❌ Error al llamar a la API:', e);
    }
}

testApi();
