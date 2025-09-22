/**
 * Test: Diagnóstico de Exportaciones
 * 
 * Verifica paso a paso qué está pasando con las métricas
 */

import { AdaptadorSimuladorDominio } from '../../src/lib/core/adaptadorSimuladorDominio.js';
import { MetricsCalculator } from '../../src/lib/domain/services/MetricsCalculator.js';
import { exportarMetricasCSV, exportarMetricasJson } from '../../src/lib/infrastructure/io/exportMetrics.js';
import type { Workload } from '../../src/lib/domain/types.js';

async function diagnosticoExportaciones() {
  console.log('\n🔍 Diagnóstico: Datos de simulación para exportaciones');
  console.log('=====================================================');

  const workload: Workload = {
    processes: [
      { id: 'P1', arribo: 0, rafagasCPU: 1, duracionCPU: 5, duracionIO: 0, prioridad: 1 }
    ],
    config: {
      policy: 'FCFS',
      tip: 1,
      tfp: 1,
      tcp: 0
    }
  };

  // Paso 1: Ejecutar con adaptador directo
  console.log('⚙️ Paso 1: Ejecutar simulación con adaptador...');
  const adaptador = new AdaptadorSimuladorDominio(workload);
  const resultado = adaptador.ejecutar();

  console.log(`  Estado final: tiempo=${resultado.estadoFinal.tiempoActual}`);
  console.log(`  Eventos internos: ${resultado.eventosInternos.length}`);
  console.log(`  Eventos exportación: ${resultado.eventosExportacion.length}`);

  // Paso 2: Examinar contadores de CPU
  console.log('\n📊 Paso 2: Contadores de CPU en estado final');
  console.log(`  CPU Procesos: ${resultado.estadoFinal.contadoresCPU.procesos}`);
  console.log(`  CPU SO: ${resultado.estadoFinal.contadoresCPU.sistemaOperativo}`);
  console.log(`  CPU Ocioso: ${resultado.estadoFinal.contadoresCPU.ocioso}`);

  // Paso 3: Examinar procesos
  console.log('\n👥 Paso 3: Estado de procesos');
  resultado.estadoFinal.procesos.forEach((proceso, nombre) => {
    console.log(`  ${nombre}: estado=${proceso.estado}, TIP=${proceso.tipCumplido}, finTFP=${proceso.finTFP}`);
  });

  // Paso 4: Calcular métricas manualmente
  console.log('\n📈 Paso 4: Calcular métricas usando MetricsCalculator');
  const metricas = MetricsCalculator.calcularMetricasCompletas(resultado.estadoFinal);

  console.log(`  Procesos en métricas: ${metricas.porProceso.length}`);
  console.log(`  CPU procesos (métricas): ${metricas.tanda.cpuProcesos}`);
  console.log(`  CPU SO (métricas): ${metricas.tanda.cpuSO}`);
  console.log(`  CPU Ocioso (métricas): ${metricas.tanda.cpuOcioso}`);
  console.log(`  Tiempo retorno tanda: ${metricas.tanda.tiempoRetornoTanda}`);

  metricas.porProceso.forEach(m => {
    console.log(`    ${m.name}: TR=${m.tiempoRetorno}, TRn=${m.tiempoRetornoNormalizado.toFixed(2)}, TL=${m.tiempoEnListo}`);
  });

  // Paso 5: Probar exportaciones
  console.log('\n💾 Paso 5: Probar exportaciones');
  
  const metricasJson = exportarMetricasJson(metricas);
  const metricasCsv = exportarMetricasCSV(metricas);

  console.log(`  JSON generado: ${(await metricasJson.text()).length} chars`);
  console.log(`  CSV generado: ${metricasCsv.length} chars`);

  // Mostrar muestra de exportaciones
  console.log('\n📄 Muestra de CSV:');
  metricasCsv.split('\n').slice(0, 10).forEach((linea, i) => {
    console.log(`    ${i+1}: ${linea}`);
  });

  console.log('\n✅ Diagnóstico completado');
}

async function compararConFuncionAplicacion() {
  console.log('\n🔄 Comparación: Adaptador vs Función de Aplicación');
  console.log('==================================================');

  const workload: Workload = {
    processes: [
      { id: 'P1', arribo: 0, rafagasCPU: 1, duracionCPU: 5, duracionIO: 0, prioridad: 1 }
    ],
    config: {
      policy: 'FCFS',
      tip: 1,
      tfp: 1,
      tcp: 0
    }
  };

  // Comparar con función de aplicación
  console.log('🔄 Ejecutando con función de aplicación...');
  const { ejecutarSimulacion } = await import('../../src/lib/application/usecases/runSimulation.js');
  const resultadoApp = await ejecutarSimulacion(workload);

  console.log('\n📊 Comparación de métricas:');
  console.log(`  App - CPU Procesos: ${resultadoApp.metricas.tanda.cpuProcesos}`);
  console.log(`  App - CPU SO: ${resultadoApp.metricas.tanda.cpuSO}`);
  console.log(`  App - CPU Ocioso: ${resultadoApp.metricas.tanda.cpuOcioso}`);
  console.log(`  App - Eventos: ${resultadoApp.eventos.length}`);

  resultadoApp.metricas.porProceso.forEach(m => {
    console.log(`    App ${m.name}: TR=${m.tiempoRetorno}, TL=${m.tiempoEnListo}`);
  });

  console.log('\n✅ Comparación completada');
}

// Ejecutar diagnósticos
diagnosticoExportaciones()
  .then(() => compararConFuncionAplicacion())
  .catch(error => {
    console.error('❌ Error en diagnóstico:', error);
    process.exit(1);
  });