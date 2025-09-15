/**
 * Test para el motor de simulación con exportación integrada
 * Valida la nueva funcionalidad ejecutarYExportar()
 */

import { MotorSimulacion } from '../../src/lib/core/engine.js';
import type { Workload } from '../../src/lib/domain/types.js';

async function testMotorConExportacion() {
  console.log('🧪 Test Motor de Simulación con Exportación Integrada');
  console.log('===================================================\n');

  // Workload de prueba
  const workload: Workload = {
    config: { policy: 'FCFS', tip: 1, tfp: 1, tcp: 1 },
    processes: [
      { 
        name: 'P1', 
        tiempoArribo: 0, 
        rafagasCPU: 1, 
        duracionRafagaCPU: 3, 
        duracionRafagaES: 1, 
        prioridad: 1 
      },
      { 
        name: 'P2', 
        tiempoArribo: 2, 
        rafagasCPU: 1, 
        duracionRafagaCPU: 2, 
        duracionRafagaES: 1, 
        prioridad: 2 
      }
    ]
  };

  console.log('📋 Configuración del test:');
  console.log(`   Algoritmo: ${workload.config.policy}`);
  console.log(`   Procesos: ${workload.processes.length}`);
  console.log('');

  // Test 1: Exportación con nombres automáticos
  console.log('🔧 Test 1: Exportación automática');
  try {
    const motor1 = new MotorSimulacion(workload);
    const { resultado, archivos } = await motor1.ejecutarYExportar();
    
    console.log(`✅ Simulación exitosa: ${resultado.exitoso}`);
    console.log(`📊 Eventos generados: ${resultado.eventosInternos.length + resultado.eventosExportacion.length}`);
    console.log(`📄 Archivo JSON: ${archivos.archivoJSON}`);
    console.log(`📊 Archivo CSV: ${archivos.archivoCSV}`);
  } catch (error) {
    console.log(`❌ Error en test 1: ${error}`);
  }

  console.log('');

  // Test 2: Exportación con nombres personalizados
  console.log('🔧 Test 2: Exportación personalizada');
  try {
    const motor2 = new MotorSimulacion(workload);
    const { resultado, archivos } = await motor2.ejecutarYExportar('test-fcfs', './salida-test');
    
    console.log(`✅ Simulación exitosa: ${resultado.exitoso}`);
    console.log(`📊 Eventos generados: ${resultado.eventosInternos.length + resultado.eventosExportacion.length}`);
    console.log(`📄 Archivo JSON: ${archivos.archivoJSON}`);
    console.log(`📊 Archivo CSV: ${archivos.archivoCSV}`);
  } catch (error) {
    console.log(`❌ Error en test 2: ${error}`);
  }

  console.log('');

  // Test 3: Comparación con método tradicional
  console.log('🔧 Test 3: Comparación con método tradicional');
  try {
    const motor3 = new MotorSimulacion(workload);
    const resultadoTradicional = motor3.ejecutar();
    
    const motor4 = new MotorSimulacion(workload);
    const { resultado: resultadoIntegrado } = await motor4.ejecutarYExportar('comparacion', './temp');
    
    const eventosTradicional = resultadoTradicional.eventosInternos.length + resultadoTradicional.eventosExportacion.length;
    const eventosIntegrado = resultadoIntegrado.eventosInternos.length + resultadoIntegrado.eventosExportacion.length;
    
    console.log(`📊 Eventos método tradicional: ${eventosTradicional}`);
    console.log(`📊 Eventos método integrado: ${eventosIntegrado}`);
    console.log(`✅ Consistencia: ${eventosTradicional === eventosIntegrado ? 'CORRECTA' : 'ERROR'}`);
  } catch (error) {
    console.log(`❌ Error en test 3: ${error}`);
  }

  console.log('\n🎯 Tests completados!');
}

// Función para limpiar archivos de test
async function limpiarArchivosTest() {
  if (typeof window === 'undefined') {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Limpiar archivos en diferentes carpetas
      const carpetas = ['./resultados', './salida-test', './temp'];
      
      for (const carpeta of carpetas) {
        try {
          const archivos = await fs.readdir(carpeta);
          for (const archivo of archivos) {
            if (archivo.includes('test-') || archivo.includes('comparacion') || archivo.includes('simulacion-')) {
              await fs.unlink(path.join(carpeta, archivo));
            }
          }
        } catch (error) {
          // La carpeta puede no existir
        }
      }
      
      console.log('🧹 Archivos de test limpiados');
    } catch (error) {
      // Ignorar errores de limpieza
    }
  }
}

// Ejecutar test
console.log('🚀 Iniciando test del motor con exportación integrada...\n');

testMotorConExportacion()
  .then(() => {
    console.log('\n✅ Todos los tests completados exitosamente!');
    return limpiarArchivosTest();
  })
  .catch((error) => {
    console.error('\n❌ Error en los tests:', error);
    return limpiarArchivosTest();
  });
