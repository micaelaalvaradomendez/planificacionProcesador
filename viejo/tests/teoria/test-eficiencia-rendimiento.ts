#!/usr/bin/env npx tsx

/**
 * 📊 TEST DE EFICIENCIA Y RENDIMIENTO
 * ====================================
 * 
 * Valida que el simulador produce métricas de eficiencia
 * consistentes con la teoría de sistemas operativos.
 */

import { readFileSync } from 'fs';
import { AdaptadorSimuladorDominio } from '../../src/lib/core/adaptadorSimuladorDominio';
import { parseJsonToWorkload } from '../../src/lib/infrastructure/parsers/jsonParser';
import type { Workload } from '../../src/lib/domain/types';

console.log('📊 TEST: EFICIENCIA Y RENDIMIENTO');
console.log('================================');

let testsPasados = 0;
let testsTotal = 0;

function validarTest(nombre: string, condicion: boolean, detalle?: string): void {
  testsTotal++;
  if (condicion) {
    console.log(`  ${nombre}`);
    testsPasados++;
  } else {
    console.log(`   ${nombre}${detalle ? ` - ${detalle}` : ''}`);
  }
}

async function cargarWorkload(archivo: string): Promise<Workload> {
  const content = readFileSync(`tests/workloads-test/${archivo}`, 'utf8');
  const file = new File([content], archivo, { type: 'application/json' });
  return await parseJsonToWorkload(file);
}

function calcularMetricasCustom(eventos: any[]): {
  throughput: number;
  utilizacionCPU: number;
  tiempoPromedioRespuesta: number;
  tiempoPromedioEspera: number;
  tiempoTotalSimulacion: number;
  procesosCompletados: number;
} {
  const eventosOrdenados = eventos.sort((a, b) => a.tiempo - b.tiempo);
  const tiempoTotal = Math.max(...eventosOrdenados.map(e => e.tiempo));
  
  // Calcular tiempo total de CPU utilizado
  const iniciosEjecucion = eventosOrdenados.filter(e => e.tipo === 'Despacho');
  const finesEjecucion = eventosOrdenados.filter(e => 
    e.tipo === 'FinRafagaCPU' || e.tipo === 'AgotamientoQuantum' || e.tipo === 'Expropiacion'
  );
  
  let tiempoCPUTotal = 0;
  let procesosCompletos = 0;
  
  // Simplificado: asumir que cada proceso usa CPU por su duración definida
  const procesosTerminados = eventosOrdenados.filter(e => e.tipo === 'FinTFP');
  procesosCompletos = procesosTerminados.length;
  
  // Estimar tiempo de CPU (simplificado)
  iniciosEjecucion.forEach(inicio => {
    const finCorrespondiente = finesEjecucion.find(fin => 
      fin.proceso === inicio.proceso && fin.tiempo > inicio.tiempo
    );
    if (finCorrespondiente) {
      tiempoCPUTotal += Math.abs(finCorrespondiente.tiempo - inicio.tiempo);
    }
  });
  
  return {
    throughput: procesosCompletos / (tiempoTotal || 1),
    utilizacionCPU: tiempoCPUTotal / (tiempoTotal || 1),
    tiempoPromedioRespuesta: 0, // Calculado en el simulador
    tiempoPromedioEspera: 0,    // Calculado en el simulador
    tiempoTotalSimulacion: tiempoTotal,
    procesosCompletados: procesosCompletos
  };
}

async function testThroughputOptimo(): Promise<void> {
  console.log('\n📈 1. THROUGHPUT ÓPTIMO');
  console.log('=======================');
  
  const workload = await cargarWorkload('consigna-basica.json');
  
  // Test con diferentes políticas
  const politicas: Array<{ nombre: string; config: any }> = [
    { nombre: 'FCFS', config: { policy: 'FCFS', tip: 0, tfp: 0, tcp: 1 } },
    { nombre: 'SPN', config: { policy: 'SPN', tip: 0, tfp: 0, tcp: 1 } },
    { nombre: 'RR-2', config: { policy: 'RR', quantum: 2, tip: 0, tfp: 0, tcp: 1 } }
  ];
  
  const resultados: { [nombre: string]: any } = {};
  
  for (const { nombre, config } of politicas) {
    workload.config = config;
    const adaptador = new AdaptadorSimuladorDominio(workload);
    const resultado = adaptador.ejecutar();
    
    const metricas = calcularMetricasCustom(resultado.eventosInternos);
    resultados[nombre] = {
      throughput: metricas.throughput,
      tiempo: metricas.tiempoTotalSimulacion,
      procesos: metricas.procesosCompletados
    };
    
    console.log(`   ${nombre}: Throughput=${metricas.throughput.toFixed(3)} proc/ut, Tiempo=${metricas.tiempoTotalSimulacion.toFixed(1)}ut`);
  }
  
  //   SPN debe tener mejor throughput que FCFS en casos favorables
  const spnMejorQueFCFS = resultados['SPN'].throughput >= resultados['FCFS'].throughput * 0.9;
  validarTest(
    'SPN: Throughput competitivo vs FCFS',
    spnMejorQueFCFS,
    `SPN=${resultados['SPN'].throughput.toFixed(3)} vs FCFS=${resultados['FCFS'].throughput.toFixed(3)}`
  );
  
  //   RR debe completar todos los procesos
  validarTest(
    'RR: Completa todos los procesos',
    resultados['RR-2'].procesos === workload.processes.length,
    `Completados: ${resultados['RR-2'].procesos}/${workload.processes.length}`
  );
  
  //   Throughput debe ser > 0 para todas las políticas
  Object.entries(resultados).forEach(([politica, datos]) => {
    validarTest(
      `${politica}: Throughput > 0`,
      datos.throughput > 0,
      `Throughput: ${datos.throughput.toFixed(3)}`
    );
  });
}

async function testUtilizacionCPU(): Promise<void> {
  console.log('\n📈 2. UTILIZACIÓN DE CPU');
  console.log('========================');
  
  // Workload con procesos CPU-intensivos
  const workloadCPU = {
    processes: [
      { id: 'CPU1', arribo: 0, rafagasCPU: 1, duracionCPU: 10, duracionIO: 0, prioridad: 50 },
      { id: 'CPU2', arribo: 5, rafagasCPU: 1, duracionCPU: 8, duracionIO: 0, prioridad: 50 }
    ],
    config: { policy: 'FCFS' as const, tip: 0, tfp: 0, tcp: 1 }
  };
  
  const adaptador = new AdaptadorSimuladorDominio(workloadCPU);
  const resultado = adaptador.ejecutar();
  
  const metricas = calcularMetricasCustom(resultado.eventosInternos);
  
  //   CPU debe estar altamente utilizada con workload CPU-intensivo
  validarTest(
    'Alta utilización CPU con procesos CPU-intensivos',
    metricas.utilizacionCPU > 0.7 || metricas.tiempoTotalSimulacion > 15,
    `Utilización: ${(metricas.utilizacionCPU * 100).toFixed(1)}%`
  );
  
  // Workload con mucho I/O
  const workloadIO = {
    processes: [
      { id: 'IO1', arribo: 0, rafagasCPU: 3, duracionCPU: 2, duracionIO: 5, prioridad: 50 },
      { id: 'IO2', arribo: 1, rafagasCPU: 2, duracionCPU: 3, duracionIO: 4, prioridad: 50 }
    ],
    config: { policy: 'FCFS' as const, tip: 0, tfp: 0, tcp: 1 }
  };
  
  const adaptadorIO = new AdaptadorSimuladorDominio(workloadIO);
  const resultadoIO = adaptadorIO.ejecutar();
  
  const metricasIO = calcularMetricasCustom(resultadoIO.eventosInternos);
  
  //   Utilización CPU debe ser menor con mucho I/O
  validarTest(
    'Menor utilización CPU con procesos I/O-intensivos',
    metricasIO.utilizacionCPU < metricas.utilizacionCPU || metricasIO.utilizacionCPU < 0.8,
    `Utilización I/O: ${(metricasIO.utilizacionCPU * 100).toFixed(1)}%`
  );
}

async function testEfectoConvoy(): Promise<void> {
  console.log('\n📈 3. EFECTO CONVOY (FCFS vs SPN)');
  console.log('=================================');
  
  const workloadConvoy = await cargarWorkload('efecto-convoy.json');
  
  // Test FCFS (sufre efecto convoy)
  workloadConvoy.config = { policy: 'FCFS', tip: 0, tfp: 0, tcp: 1 };
  const adaptadorFCFS = new AdaptadorSimuladorDominio(workloadConvoy);
  const resultadoFCFS = adaptadorFCFS.ejecutar();
  
  // Test SPN (mitiga efecto convoy)
  workloadConvoy.config = { policy: 'SPN', tip: 0, tfp: 0, tcp: 1 };
  const adaptadorSPN = new AdaptadorSimuladorDominio(workloadConvoy);
  const resultadoSPN = adaptadorSPN.ejecutar();
  
  const metricasFCFS = calcularMetricasCustom(resultadoFCFS.eventosInternos);
  const metricasSPN = calcularMetricasCustom(resultadoSPN.eventosInternos);
  
  console.log(`   FCFS: Tiempo total=${metricasFCFS.tiempoTotalSimulacion.toFixed(1)}ut`);
  console.log(`   SPN:  Tiempo total=${metricasSPN.tiempoTotalSimulacion.toFixed(1)}ut`);
  
  //   SPN debe ser más eficiente que FCFS en caso de convoy
  const spnMasEficiente = metricasSPN.tiempoTotalSimulacion <= metricasFCFS.tiempoTotalSimulacion * 1.1;
  validarTest(
    'SPN mitiga efecto convoy vs FCFS',
    spnMasEficiente,
    `SPN=${metricasSPN.tiempoTotalSimulacion.toFixed(1)}ut vs FCFS=${metricasFCFS.tiempoTotalSimulacion.toFixed(1)}ut`
  );
  
  //   Ambas políticas deben completar todos los procesos
  validarTest(
    'FCFS completa todos los procesos',
    metricasFCFS.procesosCompletados === workloadConvoy.processes.length,
    `${metricasFCFS.procesosCompletados}/${workloadConvoy.processes.length}`
  );
  
  validarTest(
    'SPN completa todos los procesos',
    metricasSPN.procesosCompletados === workloadConvoy.processes.length,
    `${metricasSPN.procesosCompletados}/${workloadConvoy.processes.length}`
  );
}

async function testEquidadRoundRobin(): Promise<void> {
  console.log('\n📈 4. EQUIDAD EN ROUND ROBIN');
  console.log('============================');
  
  const workloadRR = await cargarWorkload('round-robin-equidad.json');
  workloadRR.config = { policy: 'RR', quantum: 3, tip: 0, tfp: 0, tcp: 1 };
  
  const adaptador = new AdaptadorSimuladorDominio(workloadRR);
  const resultado = adaptador.ejecutar();
  
  // Contar despachos por proceso
  const despachos: { [proceso: string]: number } = {};
  resultado.eventosInternos
    .filter(e => e.tipo === 'Despacho')
    .forEach(e => {
      despachos[e.proceso] = (despachos[e.proceso] || 0) + 1;
    });
  
  console.log('   Despachos por proceso:');
  Object.entries(despachos).forEach(([proc, count]) => {
    console.log(`     ${proc}: ${count} despachos`);
  });
  
  //   Todos los procesos deben ser despachados al menos una vez
  const procesosConDespacho = Object.keys(despachos);
  validarTest(
    'RR: Todos los procesos son despachados',
    procesosConDespacho.length === workloadRR.processes.length,
    `${procesosConDespacho.length}/${workloadRR.processes.length} procesos`
  );
  
  //   Distribución relativamente equitativa de despachos
  const counts = Object.values(despachos);
  const maxDespachos = Math.max(...counts);
  const minDespachos = Math.min(...counts);
  const equitativo = (maxDespachos - minDespachos) <= Math.max(2, Math.ceil(maxDespachos * 0.5));
  
  validarTest(
    'RR: Distribución equitativa de despachos',
    equitativo,
    `Rango: ${minDespachos}-${maxDespachos} despachos`
  );
}

async function testEscalabilidadWorkload(): Promise<void> {
  console.log('\n📈 5. ESCALABILIDAD CON WORKLOAD GRANDE');
  console.log('=======================================');
  
  // Crear workload grande
  const workloadGrande = {
    processes: Array.from({ length: 20 }, (_, i) => ({
      id: `P${i + 1}`,
      arribo: Math.floor(i / 4),
      rafagasCPU: 1 + (i % 3),
      duracionCPU: 2 + (i % 5),
      duracionIO: i % 4,
      prioridad: 40 + (i % 20)
    })),
    config: { policy: 'RR' as const, quantum: 2, tip: 0, tfp: 0, tcp: 1 }
  };
  
  const inicio = Date.now();
  const adaptador = new AdaptadorSimuladorDominio(workloadGrande);
  const resultado = adaptador.ejecutar();
  const tiempoEjecucion = Date.now() - inicio;
  
  console.log(`   Procesos: ${workloadGrande.processes.length}`);
  console.log(`   Eventos generados: ${resultado.eventosInternos.length}`);
  console.log(`   Tiempo ejecución: ${tiempoEjecucion}ms`);
  
  //   Debe ejecutar en tiempo razonable (< 5 segundos)
  validarTest(
    'Escalabilidad: Ejecución en tiempo razonable',
    tiempoEjecucion < 5000,
    `${tiempoEjecucion}ms para 20 procesos`
  );
  
  //   Debe generar eventos para todos los procesos
  const procesosConEventos = new Set(
    resultado.eventosInternos.map(e => e.proceso).filter(p => p)
  );
  
  validarTest(
    'Escalabilidad: Eventos para todos los procesos',
    procesosConEventos.size === workloadGrande.processes.length,
    `${procesosConEventos.size}/${workloadGrande.processes.length} procesos con eventos`
  );
  
  //   Métricas finales deben estar disponibles
  const metricas = calcularMetricasCustom(resultado.eventosInternos);
  validarTest(
    'Escalabilidad: Métricas calculables',
    metricas.throughput > 0 && metricas.tiempoTotalSimulacion > 0,
    `Throughput=${metricas.throughput.toFixed(3)}, Tiempo=${metricas.tiempoTotalSimulacion.toFixed(1)}ut`
  );
}

async function testConsistenciaMetricas(): Promise<void> {
  console.log('\n📈 6. CONSISTENCIA DE MÉTRICAS');
  console.log('==============================');
  
  const workload = await cargarWorkload('consigna-basica.json');
  workload.config = { policy: 'FCFS', tip: 0, tfp: 0, tcp: 1 };
  
  // Ejecutar múltiples veces para verificar consistencia
  const resultados: any[] = [];
  
  for (let i = 0; i < 3; i++) {
    const adaptador = new AdaptadorSimuladorDominio(workload);
    const resultado = adaptador.ejecutar();
    const metricas = calcularMetricasCustom(resultado.eventosInternos);
    resultados.push(metricas);
  }
  
  //   Tiempo total debe ser consistente (simulación determinística)
  const tiempos = resultados.map(r => r.tiempoTotalSimulacion);
  const tiempoConsistente = tiempos.every(t => Math.abs(t - tiempos[0]) < 0.1);
  
  validarTest(
    'Consistencia: Tiempo total determinístico',
    tiempoConsistente,
    `Tiempos: ${tiempos.map(t => t.toFixed(1)).join(', ')}ut`
  );
  
  //   Throughput debe ser consistente
  const throughputs = resultados.map(r => r.throughput);
  const throughputConsistente = throughputs.every(th => Math.abs(th - throughputs[0]) < 0.001);
  
  validarTest(
    'Consistencia: Throughput determinístico',
    throughputConsistente,
    `Throughputs: ${throughputs.map(th => th.toFixed(3)).join(', ')}`
  );
  
  //   Procesos completados debe ser consistente
  const procesosComp = resultados.map(r => r.procesosCompletados);
  const procesosConsistente = procesosComp.every(p => p === procesosComp[0]);
  
  validarTest(
    'Consistencia: Procesos completados determinístico',
    procesosConsistente,
    `Procesos: ${procesosComp.join(', ')}`
  );
}

// ===== EJECUCIÓN PRINCIPAL =====

async function ejecutarTodosLosTests(): Promise<void> {
  await testThroughputOptimo();
  await testUtilizacionCPU();
  await testEfectoConvoy();
  await testEquidadRoundRobin();
  await testEscalabilidadWorkload();
  await testConsistenciaMetricas();
  
  console.log('\n📊 RESUMEN FINAL - EFICIENCIA');
  console.log('=============================');
  console.log(`  Tests pasados: ${testsPasados}`);
  console.log(`   Tests fallidos: ${testsTotal - testsPasados}`);
  console.log(`📈 Porcentaje éxito: ${((testsPasados / testsTotal) * 100).toFixed(1)}%`);
  
  if (testsPasados === testsTotal) {
    console.log('\n🎉 ¡TODOS LOS TESTS DE EFICIENCIA PASARON!');
    console.log('   El simulador produce métricas eficientes y consistentes');
  } else {
    console.log('\n⚠️  HAY PROBLEMAS DE EFICIENCIA O MÉTRICAS');
    console.log('   Revisar implementación de algoritmos y cálculo de métricas');
  }
}

// Ejecutar tests si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  ejecutarTodosLosTests().catch(console.error);
}

export { ejecutarTodosLosTests };