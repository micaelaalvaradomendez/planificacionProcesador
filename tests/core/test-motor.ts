import { pruebaRapida, ejecutarTodasLasPruebas } from './tests.js';

async function main() {
  console.log('🚀 Iniciando validación del motor de simulación...\n');
  
  // Ejecutar prueba rápida primero
  const pruebaBasicaExitosa = await pruebaRapida();
  
  if (pruebaBasicaExitosa) {
    console.log('\n💡 Ejecutando suite completa de pruebas...\n');
    await ejecutarTodasLasPruebas();
  } else {
    console.log('\n⚠️  Prueba básica falló. No se ejecutarán más pruebas.');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
