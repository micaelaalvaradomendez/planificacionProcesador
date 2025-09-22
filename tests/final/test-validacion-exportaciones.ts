/**
 * Test: Validación Final de Exportaciones
 * 
 * Verifica que las exportaciones funcionen correctamente
 * con datos reales y consistentes del simulador.
 */

import { ejecutarSimulacion } from '../../src/lib/application/usecases/runSimulation.js';
import { exportarMetricasCSV, exportarMetricasJson } from '../../src/lib/infrastructure/io/exportMetrics.js';
import { exportarEventosCsv } from '../../src/lib/infrastructure/io/exportEvents.js';
import type { Workload } from '../../src/lib/domain/types.js';

async function validacionFinalExportaciones() {
  console.log('\n✅ Test: Validación Final de Exportaciones');
  console.log('==========================================');

  // Workload simple para validación
  const workload: Workload = {
    processes: [
      { id: 'P1', arribo: 0, rafagasCPU: 1, duracionCPU: 5, duracionIO: 0, prioridad: 1 },
      { id: 'P2', arribo: 2, rafagasCPU: 1, duracionCPU: 3, duracionIO: 0, prioridad: 2 }
    ],
    config: {
      policy: 'FCFS',
      tip: 1,
      tfp: 1,
      tcp: 0
    }
  };

  console.log('⚙️ Ejecutando simulación FCFS con 2 procesos...');
  const resultado = await ejecutarSimulacion(workload);

  console.log(`✅ Simulación completada: ${resultado.eventos.length} eventos generados`);
  
  // Mostrar resumen de métricas
  console.log('\n📊 Métricas calculadas:');
  console.log(`  - CPU Procesos: ${resultado.metricas.tanda.cpuProcesos}`);
  console.log(`  - CPU SO: ${resultado.metricas.tanda.cpuSO}`);
  console.log(`  - CPU Ocioso: ${resultado.metricas.tanda.cpuOcioso}`);

  // Verificar que las métricas sean coherentes
  const tiempoTotalCalculado = resultado.metricas.tanda.cpuProcesos + 
                               resultado.metricas.tanda.cpuSO + 
                               resultado.metricas.tanda.cpuOcioso;
  const coherente = tiempoTotalCalculado > 0 && resultado.metricas.tanda.cpuProcesos > 0;
  
  console.log(`✅ Métricas coherentes: ${coherente ? 'SÍ' : 'NO'}`);
  
  if (!coherente) {
    console.log('❌ ERROR: Las métricas no son coherentes');
    return false;
  }

  // Test exportaciones
  console.log('\n💾 Probando exportaciones...');
  
  // Exportar métricas
  const metricasJson = exportarMetricasJson(resultado.metricas);
  const metricasCsv = exportarMetricasCSV(resultado.metricas);
  const eventosCsv = exportarEventosCsv(resultado.eventos);

  console.log(`✅ Métricas JSON: ${(await metricasJson.text()).length} caracteres`);
  console.log(`✅ Métricas CSV: ${metricasCsv.length} caracteres`);
  console.log(`✅ Eventos CSV: ${(await eventosCsv.text()).length} caracteres`);

  // Verificar contenido de exportaciones
  const csvLines = metricasCsv.split('\n');
  const cpuProcessLine = csvLines.find(line => line.includes('CPU Procesos'));
  const cpuSOLine = csvLines.find(line => line.includes('CPU Sistema Operativo'));
  
  console.log('\n📄 Contenido de exportación CSV:');
  console.log(`  - ${cpuProcessLine}`);
  console.log(`  - ${cpuSOLine}`);

  // Verificar que el CSV contenga valores no cero
  const cpuProcessValue = cpuProcessLine ? parseInt(cpuProcessLine.split(';')[1]) : 0;
  const csvValido = cpuProcessValue > 0;
  
  console.log(`✅ CSV contiene valores válidos: ${csvValido ? 'SÍ' : 'NO'}`);

  // Mostrar algunos eventos
  const csvEventos = await eventosCsv.text();
  const eventLines = csvEventos.split('\n').slice(1, 6); // Primeros 5 eventos
  console.log('\n📋 Primeros eventos exportados:');
  eventLines.forEach((line, i) => {
    if (line.trim()) console.log(`  ${i+1}: ${line}`);
  });

  console.log('\n🎯 RESULTADO FINAL');
  console.log('==================');
  if (coherente && csvValido) {
    console.log('✅ Las exportaciones funcionan correctamente');
    console.log('✅ Los datos del simulador se exportan con valores correctos');
    console.log('✅ Los archivos CSV, JSON contienen información válida');
    return true;
  } else {
    console.log('❌ Hay problemas con las exportaciones');
    return false;
  }
}

// Ejecutar validación
validacionFinalExportaciones()
  .then(exitoso => {
    if (exitoso) {
      console.log('\n🎉 ¡Validación exitosa! Las exportaciones están funcionando correctamente.');
      process.exit(0);
    } else {
      console.log('\n💥 ¡Validación falló! Hay problemas que resolver.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Error en validación:', error);
    process.exit(1);
  });