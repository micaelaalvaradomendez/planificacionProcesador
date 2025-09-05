/**
 * Script simple para probar el parser JSON
 */
console.log('🔍 Verificando archivo JSON de la UI...');

// Simulamos el contenido del archivo que está usando la UI
const archivoJSON = `[
  {
    "nombre": "P1",
    "tiempo_arribo": 0,
    "cantidad_rafagas_cpu": 2,
    "duracion_rafaga_cpu": 5,
    "duracion_rafaga_es": 3,
    "prioridad_externa": 2
  },
  {
    "nombre": "P2", 
    "tiempo_arribo": 1,
    "cantidad_rafagas_cpu": 3,
    "duracion_rafaga_cpu": 6,
    "duracion_rafaga_es": 4,
    "prioridad_externa": 1
  }
]`;

console.log('📄 Archivo JSON raw:');
console.log(archivoJSON);

console.log('\n🔧 Parseando JSON...');
const data = JSON.parse(archivoJSON);

console.log('✅ JSON parseado:', data);
console.log('Tipo:', Array.isArray(data) ? 'Array' : 'Object');
console.log('Primer proceso:');
console.log('  nombre:', data[0].nombre);
console.log('  tiempo_arribo:', data[0].tiempo_arribo);
console.log('  cantidad_rafagas_cpu:', data[0].cantidad_rafagas_cpu);

console.log('\n🎯 DIAGNÓSTICO: El archivo JSON usa campos en ESPAÑOL');
console.log('   El parser debe mapear estos campos a campos en INGLÉS');
console.log('   Necesitamos verificar que el mapeo funcione correctamente');
