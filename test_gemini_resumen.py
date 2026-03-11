import requests
import json

GEMINI_API_KEY = "AIzaSyBGqGs4YoHj9Vhw73uoR8QWWT9kiyco5m8"
GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"

prompt = (
    "Eres un asistente escolar experto. Analiza el siguiente perfil de estudiante y genera un informe profesional, claro y detallado, "
    "que incluya: resumen, hallazgos, fortalezas, áreas de mejora y una recomendación personalizada. "
    "Usa formato HTML con títulos y listas.\n\n"
    "Nombre: Juan Pérez\n"
    "Grado: 3\n"
    "Sección: A\n"
    "Asistencias: 20\n"
    "Ausencias: 2\n"
    "Tardanzas: 1\n"
    "Total de incidencias: 1\n"
    "Última incidencia: Conducta el 2025-11-10"
)

body = {
    "contents": [
        {
            "parts": [
                {"text": prompt}
            ]
        }
    ]
}

try:
    res = requests.post(GEMINI_API_URL, headers={"Content-Type": "application/json"}, data=json.dumps(body))
    print(res.status_code)
    print(res.text)
except Exception as e:
    print("Error:", e)
