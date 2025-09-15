/**
 * Test para verificar la exportación de archivos de eventos
 * Valida que se puedan exportar eventos a archivos JSON y CSV
 */

import { MotorSimulacion } from '../../src/lib/core/engine.js';
import { 
  combinarEventos, 
  exportarEventosAArchivoJSON,
  exportarEventosAArchivoCSV,
  exportarEventosAArchivos
} from '../../src/lib/infrastructure/io/eventLogger.js';
import type { Workload } from '../../src/lib/domain/types.js';

async function testExportacionArchivos() {
  console.log('🧪 Test Exportación de Archivos de Eventos');
  console.log('===========================================\n');

  // Workload de ejemplo
  const workload: Workload = {
    config: { policy: 'RR', quantum: 2, tip: 1, tfp: 1, tcp: 1 },
    processes: [
      { 
        name: 'P1', 
        tiempoArribo: 0, 
        rafagasCPU: 2, 
        duracionRafagaCPU: 3, 
        duracionRafagaES: 1, 
        prioridad: 1 
      },
      { 
        name: 'P2', 
        tiempoArribo: 1, 
        rafagasCPU: 1, 
        duracionRafagaCPU: 2, 
        duracionRafagaES: 1, 
        prioridad: 2 
      }
    ]
  };

  console.log('📋 Ejecutando simulación...');
  const motor = new MotorSimulacion(workload);
  const resultado = motor.ejecutar();
  
  const eventos = combinarEventos(resultado.eventosInternos, resultado.eventosExportacion);
  console.log(`✅ Simulación completada: ${eventos.length} eventos generados\n`);

  // Test 1: Exportar a JSON
  console.log('📝 Test 1: Exportación a JSON');
  try {
    await exportarEventosAArchivoJSON(eventos, 'test-eventos.json');
    console.log('✅ Archivo JSON exportado correctamente: test-eventos.json');
  } catch (error) {
    console.log(`❌ Error al exportar JSON: ${error}`);
  }

  // Test 2: Exportar a CSV
  console.log('\n📊 Test 2: Exportación a CSV');
  try {
    await exportarEventosAArchivoCSV(eventos, 'test-eventos.csv');
    console.log('✅ Archivo CSV exportado correctamente: test-eventos.csv');
  } catch (error) {
    console.log(`❌ Error al exportar CSV: ${error}`);
  }

  // Test 3: Exportar ambos formatos
  console.log('\n💾 Test 3: Exportación dual (JSON + CSV)');
  try {
    const archivos = await exportarEventosAArchivos(eventos, 'simulacion-completa', './salida');
    console.log(`✅ Archivos exportados correctamente:`);
    console.log(`   📄 JSON: ${archivos.archivoJSON}`);
    console.log(`   📊 CSV: ${archivos.archivoCSV}`);
  } catch (error) {
    console.log(`❌ Error al exportar archivos: ${error}`);
  }

  // Test 4: Verificar contenido de archivos (solo en Node.js)
  if (typeof window === 'undefined') {
    console.log('\n🔍 Test 4: Verificación de contenido de archivos');
    try {
      const fs = await import('fs/promises');
      
      // Verificar JSON
      const jsonContent = await fs.readFile('test-eventos.json', 'utf-8');
      const jsonData = JSON.parse(jsonContent);
      const jsonValido = jsonData.metadata && jsonData.eventos && jsonData.eventos.length > 0;
      console.log(`✅ JSON válido: ${jsonValido} (${jsonData.eventos.length} eventos)`);

      // Verificar CSV
      const csvContent = await fs.readFile('test-eventos.csv', 'utf-8');
      const csvLines = csvContent.split('\n');
      const csvValido = csvLines[0].includes('Tiempo,Tipo,Proceso') && csvLines.length > 1;
      console.log(`✅ CSV válido: ${csvValido} (${csvLines.length - 1} líneas de datos)`);

      // Mostrar muestra del CSV
      console.log('\n📋 Muestra del CSV generado (primeras 5 líneas):');
      console.log(csvLines.slice(0, 5).join('\n'));

    } catch (error) {
      console.log(`❌ Error al verificar archivos: ${error}`);
    }
  } else {
    console.log('\n🌐 Ejecutando en navegador - archivos descargados automáticamente');
  }

  console.log('\n🎯 Test de exportación completado!');
}

// Función para limpiar archivos de test
async function limpiarArchivosTest() {
  if (typeof window === 'undefined') {
    try {
      const fs = await import('fs/promises');
      await Promise.allSettled([
        fs.unlink('test-eventos.json'),
        fs.unlink('test-eventos.csv'),
        fs.unlink('./salida/simulacion-completa.json'),
        fs.unlink('./salida/simulacion-completa.csv')
      ]);
      console.log('🧹 Archivos de test limpiados');
    } catch (error) {
      // Los archivos pueden no existir
    }
  }
}

// Ejecutar test
console.log('🚀 Iniciando test de exportación de archivos...\n');

testExportacionArchivos()
  .then(() => {
    console.log('\n✅ Test completado exitosamente!');
    return limpiarArchivosTest();
  })
  .catch((error) => {
    console.error('\n❌ Error en el test:', error);
    return limpiarArchivosTest();
  });
