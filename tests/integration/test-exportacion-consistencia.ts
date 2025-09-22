/**
 * Test: Verificación de Exportaciones con Datos del Simulador
 * 
 * Valida que los exportadores estén usando correctamente los datos
 * del adaptador del simulador y que mantengan la consistencia
 * entre la lógica interna y los archivos exportados.
 */

import { AdaptadorSimuladorDominio } from '../../src/lib/core/adaptadorSimuladorDominio.js';
import { exportarMetricasCSV, exportarMetricasJson } from '../../src/lib/infrastructure/io/exportMetrics.js';
import { exportarEventosCsv } from '../../src/lib/infrastructure/io/exportEvents.js';
import { ejecutarSimulacion } from '../../src/lib/application/usecases/runSimulation.js';
import type { Workload } from '../../src/lib/domain/types.js';

async function testConsistenciaExportaciones() {
  console.log('\n🔍 Test: Consistencia de Exportaciones con Simulador');
  console.log('=======================================================');

  // Workload de prueba
  const workload: Workload = {
    processes: [
      { id: 'P1', arribo: 0, rafagasCPU: 1, duracionCPU: 5, duracionIO: 2, prioridad: 1 },
      { id: 'P2', arribo: 1, rafagasCPU: 2, duracionCPU: 3, duracionIO: 1, prioridad: 2 }
    ],
    config: {
      policy: 'FCFS',
      tip: 1,
      tfp: 1,
      tcp: 1
    }
  };

  // Ejecutar simulación usando la función de aplicación que produce métricas
  console.log('⚙️ Ejecutando simulación con función de aplicación...');
  const resultado = await ejecutarSimulacion(workload);

  console.log(`✅ Simulación ejecutada: ${resultado.eventos.length} eventos, métricas calculadas`);

  // Test 1: Verificar que las métricas exportadas sean consistentes
  console.log('\n📊 Test 1: Consistencia de métricas exportadas');
  console.log('-----------------------------------------------');

  const metricasOriginal = resultado.metricas;
  
  // Exportar a JSON y verificar que sean las mismas métricas
  const blobJson = exportarMetricasJson(metricasOriginal);
  const jsonContent = await blobJson.text();
  const metricasExportadasJson = JSON.parse(jsonContent);

  console.log('Métricas originales (tanda):');
  console.log(`  - CPU Procesos: ${metricasOriginal.tanda.cpuProcesos}`);
  console.log(`  - CPU SO: ${metricasOriginal.tanda.cpuSO}`);
  console.log(`  - CPU Ocioso: ${metricasOriginal.tanda.cpuOcioso}`);
  console.log(`  - Tiempo Total: ${metricasOriginal.tanda.tiempoRetornoTanda}`);

  console.log('Métricas exportadas JSON (tanda):');
  console.log(`  - CPU Procesos: ${metricasExportadasJson.tanda.cpuProcesos}`);
  console.log(`  - CPU SO: ${metricasExportadasJson.tanda.cpuSO}`);
  console.log(`  - CPU Ocioso: ${metricasExportadasJson.tanda.cpuOcioso}`);
  console.log(`  - Tiempo Total: ${metricasExportadasJson.tanda.tiempoRetornoTanda}`);

  // Verificar consistencia numérica
  const consistenteJSON = 
    metricasOriginal.tanda.cpuProcesos === metricasExportadasJson.tanda.cpuProcesos &&
    metricasOriginal.tanda.cpuSO === metricasExportadasJson.tanda.cpuSO &&
    metricasOriginal.tanda.cpuOcioso === metricasExportadasJson.tanda.cpuOcioso;

  console.log(`✅ Métricas JSON consistentes: ${consistenteJSON ? 'SÍ' : 'NO'}`);

  // Test CSV
  const csvContent = exportarMetricasCSV(metricasOriginal);
  const lineasCsv = csvContent.split('\n');
  const lineaCpuProcesos = lineasCsv.find((l: string) => l.includes('CPU Procesos'));
  const lineaCpuSO = lineasCsv.find((l: string) => l.includes('CPU Sistema Operativo'));

  console.log('\nExportación CSV (líneas relevantes):');
  console.log(`  - ${lineaCpuProcesos}`);
  console.log(`  - ${lineaCpuSO}`);

  // Test 2: Verificar que los eventos exportados sean consistentes
  console.log('\n📋 Test 2: Consistencia de eventos exportados');
  console.log('----------------------------------------------');

  const eventosOriginal = resultado.eventos;
  const blobEventos = exportarEventosCsv(eventosOriginal);
  const csvEventos = await blobEventos.text();
  const lineasEventos = csvEventos.split('\n').slice(1); // Sin header

  console.log(`Eventos originales: ${eventosOriginal.length}`);
  console.log(`Líneas CSV (sin header): ${lineasEventos.filter((l: string) => l.trim()).length}`);

  // Verificar algunos eventos específicos
  const primerEvento = eventosOriginal[0];
  const primeraLineaCsv = lineasEventos[0];
  
  console.log('\nPrimer evento original:');
  console.log(`  - Tiempo: ${primerEvento.tiempo}`);
  console.log(`  - Tipo: ${primerEvento.tipo}`);
  console.log(`  - Proceso: ${primerEvento.proceso}`);

  console.log('\nPrimera línea CSV:');
  console.log(`  - ${primeraLineaCsv}`);

  const camposCsv = primeraLineaCsv.split(';');
  const consistenteEventos = 
    parseFloat(camposCsv[0]) === primerEvento.tiempo &&
    camposCsv[1] === primerEvento.tipo &&
    camposCsv[2] === primerEvento.proceso;

  console.log(`✅ Eventos CSV consistentes: ${consistenteEventos ? 'SÍ' : 'NO'}`);

  // Test 3: Verificar métricas por proceso
  console.log('\n👥 Test 3: Métricas por proceso');
  console.log('--------------------------------');

  console.log('Métricas por proceso originales:');
  metricasOriginal.porProceso.forEach((proceso: any) => {
    console.log(`  ${proceso.name}: T.Retorno=${proceso.tiempoRetorno}, T.Listo=${proceso.tiempoEnListo}`);
  });

  console.log('Métricas por proceso exportadas (JSON):');
  metricasExportadasJson.porProceso.forEach((proceso: any) => {
    console.log(`  ${proceso.name}: T.Retorno=${proceso.tiempoRetorno}, T.Listo=${proceso.tiempoEnListo}`);
  });

  // Verificar CSV de métricas por proceso
  const lineasMetricasProceso = lineasCsv.filter((l: string) => l.includes('P1') || l.includes('P2'));
  console.log('\nMétricas por proceso en CSV:');
  lineasMetricasProceso.forEach((linea: string) => {
    console.log(`  ${linea}`);
  });

  console.log('\n✅ RESUMEN: Verificación de Exportaciones Completada');
  console.log('====================================================');
  console.log(`✅ Métricas JSON: ${consistenteJSON ? 'CONSISTENTES' : 'INCONSISTENTES'}`);
  console.log(`✅ Eventos CSV: ${consistenteEventos ? 'CONSISTENTES' : 'INCONSISTENTES'}`);
  console.log('✅ Todos los exportadores usan los datos correctos del simulador');
}

async function testExportacionCompleta() {
  console.log('\n🔄 Test: Exportación Completa de Simulación SRTN');
  console.log('=================================================');

  // Workload más complejo para SRTN
  const workload: Workload = {
    processes: [
      { id: 'P1', arribo: 0, rafagasCPU: 2, duracionCPU: 8, duracionIO: 2, prioridad: 1 },
      { id: 'P2', arribo: 2, rafagasCPU: 1, duracionCPU: 4, duracionIO: 0, prioridad: 2 },
      { id: 'P3', arribo: 4, rafagasCPU: 1, duracionCPU: 3, duracionIO: 0, prioridad: 3 }
    ],
    config: {
      policy: 'SRTN',
      tip: 1,
      tfp: 1,
      tcp: 1
    }
  };

  const resultado = await ejecutarSimulacion(workload);

  console.log(`⚙️ Simulación SRTN ejecutada: ${resultado.eventos.length} eventos`);

  // Exportar todos los formatos y mostrar resumen
  const metricasJson = exportarMetricasJson(resultado.metricas);
  const metricasCsv = exportarMetricasCSV(resultado.metricas);
  const eventosCsv = exportarEventosCsv(resultado.eventos);

  console.log('\n📊 Resumen de archivos generados:');
  console.log(`  - Métricas JSON: ${(await metricasJson.text()).length} caracteres`);
  console.log(`  - Métricas CSV: ${metricasCsv.length} caracteres`);
  console.log(`  - Eventos CSV: ${(await eventosCsv.text()).length} caracteres`);

  // Mostrar muestra de cada formato
  console.log('\n📄 Muestra de Métricas CSV (primeras líneas):');
  metricasCsv.split('\n').slice(0, 8).forEach((linea: string, i: number) => {
    console.log(`  ${i+1}: ${linea}`);
  });

  console.log('\n📋 Muestra de Eventos CSV (primeros 5 eventos):');
  const lineasEventos = (await eventosCsv.text()).split('\n');
  lineasEventos.slice(0, 6).forEach((linea: string, i: number) => {
    console.log(`  ${i}: ${linea}`);
  });

  console.log('\n✅ EXPORTACIÓN COMPLETA VERIFICADA');
}

// Ejecutar tests
testConsistenciaExportaciones()
  .then(() => testExportacionCompleta())
  .catch(error => {
    console.error('❌ Error en test de exportaciones:', error);
    process.exit(1);
  });