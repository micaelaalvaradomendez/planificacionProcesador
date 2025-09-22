#!/usr/bin/env npx tsx

/**
 * Test específico para debuggear métricas de CPU
 */

import { AdaptadorSimuladorDominio } from '../../src/lib/core/adaptadorSimuladorDominio.js';
import type { Workload } from '../../src/lib/domain/types.js';

console.log('🧪 DEBUG: Métricas CPU');
console.log('====================');

async function testMetricasCPU() {
  console.log('\n📋 Test simple: 1 proceso, RR');
  
  const workload: Workload = {
    processes: [
      { id: 'P1', arribo: 0, rafagasCPU: 1, duracionCPU: 3, duracionIO: 0, prioridad: 1 }
    ],
    config: { policy: 'RR', tip: 0, tfp: 0, tcp: 0, quantum: 2 }
  };

  const adaptador = new AdaptadorSimuladorDominio(workload);
  const resultado = adaptador.ejecutar();
  
  console.log('\n📊 Estado final:');
  console.log(`  Tiempo total: ${resultado.estadoFinal.tiempoActual}`);
  console.log(`  Procesos en estado: ${resultado.estadoFinal.procesos.size}`);
  
  resultado.estadoFinal.procesos.forEach((proceso, nombre) => {
    console.log(`    ${nombre}: estado=${proceso.estado}, TIP=${proceso.tipCumplido}, finTFP=${proceso.finTFP}`);
  });
  
  console.log('\n📈 Contadores CPU:');
  console.log(`  CPU Procesos: ${resultado.estadoFinal.contadoresCPU.procesos}`);
  console.log(`  CPU SO: ${resultado.estadoFinal.contadoresCPU.sistemaOperativo}`);
  console.log(`  CPU Ocioso: ${resultado.estadoFinal.contadoresCPU.ocioso}`);
  
  // Calcular métricas manualmente para verificar
  const metricasCalculador = (await import('../../src/lib/domain/services/MetricsCalculator.js')).MetricsCalculator;
  const metricas = metricasCalculador.calcularMetricasCompletas(resultado.estadoFinal);
  
  console.log('\n📊 Métricas calculadas:');
  console.log(`  Procesos en métricas: ${metricas.porProceso.length}`);
  console.log(`  CPU procesos (métricas): ${metricas.tanda.cpuProcesos}`);
  
  metricas.porProceso.forEach(m => {
    console.log(`    ${m.name}: TR=${m.tiempoRetorno}, TRn=${m.tiempoRetornoNormalizado.toFixed(2)}`);
  });
  
  return { resultado, metricas };
}

async function testDosProcesosFCFS() {
  console.log('\n📋 Test comparativo: 2 procesos, FCFS');
  
  const workload: Workload = {
    processes: [
      { id: 'P1', arribo: 0, rafagasCPU: 1, duracionCPU: 2, duracionIO: 0, prioridad: 1 },
      { id: 'P2', arribo: 1, rafagasCPU: 1, duracionCPU: 3, duracionIO: 0, prioridad: 2 }
    ],
    config: { policy: 'FCFS', tip: 0, tfp: 0, tcp: 0 }
  };

  const adaptador = new AdaptadorSimuladorDominio(workload);
  const resultado = adaptador.ejecutar();
  
  console.log('\n📊 Estado final FCFS:');
  console.log(`  Tiempo total: ${resultado.estadoFinal.tiempoActual}`);
  console.log(`  Procesos en estado: ${resultado.estadoFinal.procesos.size}`);
  
  console.log('\n📈 Contadores CPU FCFS:');
  console.log(`  CPU Procesos: ${resultado.estadoFinal.contadoresCPU.procesos}`);
  console.log(`  CPU SO: ${resultado.estadoFinal.contadoresCPU.sistemaOperativo}`);
  console.log(`  CPU Ocioso: ${resultado.estadoFinal.contadoresCPU.ocioso}`);
  
  // Calcular métricas
  const metricasCalculador = (await import('../../src/lib/domain/services/MetricsCalculator.js')).MetricsCalculator;
  const metricas = metricasCalculador.calcularMetricasCompletas(resultado.estadoFinal);
  
  console.log('\n📊 Métricas FCFS:');
  console.log(`  Procesos en métricas: ${metricas.porProceso.length}`);
  console.log(`  CPU procesos (métricas): ${metricas.tanda.cpuProcesos}`);
  
  metricas.porProceso.forEach(m => {
    console.log(`    ${m.name}: TR=${m.tiempoRetorno}, TRn=${m.tiempoRetornoNormalizado.toFixed(2)}`);
  });
  
  return { resultado, metricas };
}

async function main() {
  const test1 = await testMetricasCPU();
  const test2 = await testDosProcesosFCFS();
  
  console.log('\n🎯 ANÁLISIS:');
  console.log(`  RR (1 proceso): CPU=${test1.metricas.tanda.cpuProcesos}, métricasCount=${test1.metricas.porProceso.length}`);
  console.log(`  FCFS (2 procesos): CPU=${test2.metricas.tanda.cpuProcesos}, métricasCount=${test2.metricas.porProceso.length}`);
}

main();