import requests
import json

GEMINI_API_KEY = "AIzaSyBGqGs4YoHj9Vhw73uoR8QWWT9kiyco5m8"
GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"

body = {
    "contents": [
        {
            "parts": [
                {"text": "¿Cuál es la capital de Francia?"}
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
