/**
 * Script temporal para buscar el ID de un estudiante por nombre
 * Uso: node scripts/find-student-id.js "Andres Pepe"
 * 
 * Este script usa la API del servidor en lugar de Prisma directamente
 */

const http = require('http');

function findStudentId(nombreCompleto) {
  return new Promise((resolve, reject) => {
    const nombreEncoded = encodeURIComponent(nombreCompleto);
    const url = `http://localhost:3000/api/estudiantes?nombre=${nombreEncoded}`;
    
    console.log(`🔍 Buscando estudiante: "${nombreCompleto}"`);
    console.log(`📡 URL: ${url}\n`);
    
    http.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          if (res.statusCode === 404) {
            console.log('❌ Estudiante no encontrado en la base de datos.');
            console.log('\n💡 Intentando buscar en todos los estudiantes...\n');
            
            // Buscar en todos los estudiantes
            http.get('http://localhost:3000/api/estudiantes', (res2) => {
              let data2 = '';
              res2.on('data', (chunk) => { data2 += chunk; });
              res2.on('end', () => {
                try {
                  const estudiantes = JSON.parse(data2);
                  const nombreLower = nombreCompleto.toLowerCase();
                  
                  // Buscar coincidencias parciales
                  const encontrados = estudiantes.filter(est => {
                    const nombreEst = (est.nombre || '').toLowerCase();
                    const nombresEst = (est.nombres || '').toLowerCase();
                    const apellidosEst = (est.apellidos || '').toLowerCase();
                    return nombreEst.includes(nombreLower) || 
                           nombresEst.includes(nombreLower) || 
                           apellidosEst.includes(nombreLower);
                  });
                  
                  if (encontrados.length > 0) {
                    console.log(`\n✅ Se encontraron ${encontrados.length} estudiante(s) con coincidencias:\n`);
                    encontrados.forEach(est => {
                      console.log(`   ID: ${est.id || 'N/A'}`);
                      console.log(`   Nombre completo: ${est.nombre || 'N/A'}`);
                      console.log(`   Nombres: ${est.nombres || 'N/A'}`);
                      console.log(`   Apellidos: ${est.apellidos || 'N/A'}`);
                      console.log(`   Grado: ${est.grado || 'N/A'}`);
                      console.log(`   Sección: ${est.seccion || 'N/A'}`);
                      console.log('');
                    });
                    
                    if (encontrados.length === 1 && encontrados[0].id) {
                      resolve(encontrados[0].id);
                    } else {
                      resolve(null);
                    }
                  } else {
                    console.log('❌ No se encontró ningún estudiante con ese nombre.');
                    resolve(null);
                  }
                } catch (err) {
                  console.error('❌ Error parseando respuesta:', err);
                  reject(err);
                }
              });
            }).on('error', reject);
            
            return;
          }
          
          if (res.statusCode !== 200) {
            console.error(`❌ Error HTTP: ${res.statusCode}`);
            reject(new Error(`HTTP ${res.statusCode}`));
            return;
          }
          
          const estudiante = JSON.parse(data);
          
          console.log('✅ Estudiante encontrado:');
          console.log(`   ID: ${estudiante.id || 'N/A'}`);
          console.log(`   Nombre completo: ${estudiante.nombre || 'N/A'}`);
          console.log(`   Nombres: ${estudiante.nombres || 'N/A'}`);
          console.log(`   Apellidos: ${estudiante.apellidos || 'N/A'}`);
          console.log(`   Grado: ${estudiante.grado || 'N/A'}`);
          console.log(`   Sección: ${estudiante.seccion || 'N/A'}\n`);
          
          resolve(estudiante.id || null);
        } catch (err) {
          console.error('❌ Error parseando respuesta:', err);
          reject(err);
        }
      });
    }).on('error', (err) => {
      console.error('❌ Error de conexión:', err.message);
      console.error('\n💡 Asegúrate de que el servidor esté corriendo en http://localhost:3000');
      reject(err);
    });
  });
}

// Obtener el nombre del argumento de línea de comandos
const nombre = process.argv[2] || 'Andres Pepe';

console.log(`\n📋 Buscando ID para: "${nombre}"\n`);
findStudentId(nombre).then(id => {
  if (id) {
    console.log(`\n🎯 ID del estudiante "${nombre}": ${id}`);
  } else {
    console.log(`\n⚠️  No se pudo obtener el ID del estudiante "${nombre}"`);
  }
  process.exit(id ? 0 : 1);
}).catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});

