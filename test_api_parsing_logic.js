
/**
 * Test script to verify the parsing logic in app/api/generate-report/route.ts
 */

// Simulated parsing logic from route.ts
const ALL_HEADERS = 'RESUMEN|ANÁLISIS DE PATRONES|PATRONES|FORTALEZAS Y ÁREAS DE MEJORA|FORTALEZAS Y MEJORAS|FORTALEZAS|ÁREAS DE MEJORA|PUNTOS FUERTES|FACTORES DE RIESGO|RIESGOS|ALERTAS INTELIGENTES|ALERTAS|RECOMENDACIONES|PLAN DE SEGUIMIENTO|SEGUIMIENTO';
const SUB_HEADERS = 'ANÁLISIS DE PATRONES|PATRONES|FORTALEZAS Y ÁREAS DE MEJORA|FORTALEZAS Y MEJORAS|FORTALEZAS|ÁREAS DE MEJORA|PUNTOS FUERTES|FACTORES DE RIESGO|RIESGOS|ALERTAS INTELIGENTES|ALERTAS|RECOMENDACIONES|PLAN DE SEGUIMIENTO|SEGUIMIENTO';

function extractSection(text, sectionName, nextSection) {
  const sectionPattern = new RegExp(`(?:\\*+)?\\s*${sectionName}:?\\s*(?:\\*+)?`, 'i');
  const sectionMatch = text.match(sectionPattern);

  let startIndex = 0;
  let content = '';

  if (sectionMatch) {
    startIndex = sectionMatch.index + sectionMatch[0].length;
  } else if (sectionName.toUpperCase() === 'RESUMEN') {
    startIndex = 0;
  } else {
    return '';
  }

  const remainingText = text.substring(startIndex).trim();

  if (nextSection) {
    const nextPattern = new RegExp(`(?:\\*+)?\\s*(?:${nextSection}):?\\s*(?:\\*+)?`, 'i');
    const nextMatch = remainingText.match(nextPattern);
    if (nextMatch) {
      content = remainingText.substring(0, nextMatch.index).trim();
    } else {
      content = remainingText;
    }
  } else {
    content = remainingText;
  }

  return content;
}

function removeHeaders(text) {
  if (!text) return '';
  let cleaned = text;
  const headerPatterns = ALL_HEADERS.split('|');
  headerPatterns.forEach(header => {
    const regex = new RegExp(`(?:^|\\n)\\s*[-•*]?\\s*(?:\\*+)?\\s*${header}:?\\s*(?:\\*+)?\\s*`, 'gi');
    cleaned = cleaned.replace(regex, '\n');
  });
  return cleaned.trim();
}

// SIMULATED RAW AI RESPONSE (Problematic case from screenshot)
const rawResponse = `Diego Fernán presenta tres incidencias, dos de asistencia y una de conducta. Dos son graves y una moderada, señalando desafíos significativos. **ANÁLISIS DE PATRONES**: El patrón principal son las incidencias de asistencia, con dos casos, uno de ellos grave. También se registra una incidencia de conducta grave. **FORTALEZAS Y ÁREAS DE MEJORA**: No se observan fortalezas específicas. Las áreas críticas de mejora son la asistencia regular y el comportamiento. **FACTORES DE RIESGO**: La inasistencia crónica y problemas de conducta graves son los principales factores de riesgo. **RECOMENDACIONES**:
- Investigar las causas de la inasistencia y conducta.
- Establecer un plan de mejora de asistencia y conducta.
- Comunicar la situación urgentemente con la familia.
**PLAN DE SEGUIMIENTO**:
- Reunión con el estudiante y su familia en los próximos días.
- Monitoreo diario de asistencia y comportamiento en clase.`;

console.log("--- STARTING PARSING TEST ---");

let resumen = extractSection(rawResponse, 'RESUMEN', SUB_HEADERS);
let patterns = extractSection(rawResponse, 'ANÁLISIS DE PATRONES', ALL_HEADERS);
let strengths = extractSection(rawResponse, 'FORTALEZAS Y ÁREAS DE MEJORA', ALL_HEADERS);
let risks = extractSection(rawResponse, 'FACTORES DE RIESGO', ALL_HEADERS);
let recommendations = extractSection(rawResponse, 'RECOMENDACIONES', ALL_HEADERS);
let followUp = extractSection(rawResponse, 'PLAN DE SEGUIMIENTO', ALL_HEADERS);

// Clean them
resumen = removeHeaders(resumen);
patterns = removeHeaders(patterns);
strengths = removeHeaders(strengths);
risks = removeHeaders(risks);
recommendations = removeHeaders(recommendations);
followUp = removeHeaders(followUp);

console.log("\n[RESUMEN]:");
console.log(resumen);
console.log("\n[ANÁLISIS DE PATRONES]:");
console.log(patterns);
console.log("\n[FORTALEZAS]:");
console.log(strengths);
console.log("\n[FACTORES DE RIESGO]:");
console.log(risks);
console.log("\n[RECOMENDACIONES]:");
console.log(recommendations);
console.log("\n[PLAN DE SEGUIMIENTO]:");
console.log(followUp);

// VERIFY NO LEAKS
if (resumen.includes("PATRONES") || resumen.includes("FORTALEZAS") || resumen.includes("RIESGO")) {
    console.error("\n❌ FAIL: Resumen still contains other headers!");
} else if (!patterns) {
    console.error("\n❌ FAIL: Patterns section is empty!");
} else {
    console.log("\n✅ SUCCESS: Sections are correctly isolated!");
}
