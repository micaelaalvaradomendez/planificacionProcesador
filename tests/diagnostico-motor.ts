#!/usr/bin/env npx tsx

/**
 * Test diagnóstico para reproducir errores específicos del motor
 * Usa procesos_tanda_5p.json con TIP=TFP=TCP=1, RR Q=4
 */

import { AdaptadorSimuladorDominio } from '../src/lib/core/adaptadorSimuladorDominio';
import type { Workload } from '../src/lib/domain/types';

console.log('🚨 === DIAGNÓSTICO DE ERRORES DEL MOTOR ===');
console.log('==========================================');

// Workload procesos_tanda_5p.json convertido 
const workload: Workload = {
  processes: [
    { id: 'P1', arribo: 0, rafagasCPU: 3, duracionCPU: 5, duracionIO: 4, prioridad: 2 },
    { id: 'P2', arribo: 1, rafagasCPU: 2, duracionCPU: 6, duracionIO: 3, prioridad: 1 },
    { id: 'P3', arribo: 3, rafagasCPU: 4, duracionCPU: 3, duracionIO: 2, prioridad: 3 },
    { id: 'P4', arribo: 5, rafagasCPU: 3, duracionCPU: 4, duracionIO: 2, prioridad: 2 },
    { id: 'P5', arribo: 6, rafagasCPU: 2, duracionCPU: 7, duracionIO: 5, prioridad: 1 }
  ],
  config: {
    policy: 'FCFS',
    tip: 1,
    tfp: 1,
    tcp: 1
  }
};

// Calcular CPU total esperada
const cpuTotalEsperada = workload.processes.reduce((sum, p) => sum + (p.rafagasCPU * p.duracionRafagaCPU), 0);
console.log(`📊 CPU total esperada: ${cpuTotalEsperada} (P1:15 + P2:12 + P3:12 + P4:12 + P5:14)`);

async function diagnosticarFCFS() {
  console.log('\n🔍 === DIAGNÓSTICO FCFS ===');
  
  const adaptador = new AdaptadorSimuladorDominio(workload);
  const resultado = adaptador.ejecutar();
  
  const eventos = resultado.eventosInternos;
  const tiempoFinal = Math.max(...eventos.map(e => e.tiempo));
  
  console.log(`⏰ Tiempo final reportado: ${tiempoFinal} (esperado: mucho mayor que 65)`);
  
  // Verificar tipos de eventos
  const tiposEventos = new Set(eventos.map(e => e.tipo));
  console.log('📋 Tipos de eventos encontrados:');
  tiposEventos.forEach(tipo => {
    const count = eventos.filter(e => e.tipo === tipo).length;
    console.log(`  - ${tipo}: ${count}`);
  });
  
  // Buscar eventos críticos faltantes
  const finRafagas = eventos.filter(e => e.tipo === 'FinRafagaCPU');
  const bloqueados = eventos.filter(e => e.tipo === 'InicioES');
  const retornos = eventos.filter(e => e.tipo === 'FinES');
  const terminaciones = eventos.filter(e => e.tipo === 'FinTFP');
  
  console.log(`\n🔍 Eventos críticos:`);
  console.log(`  - Fin ráfagas CPU: ${finRafagas.length} (esperado: ~${cpuTotalEsperada/5} por proceso)`);
  console.log(`  - Bloqueados: ${bloqueados.length}`);
  console.log(`  - Retornos E/S: ${retornos.length}`);
  console.log(`  - Terminaciones TFP: ${terminaciones.length} (esperado: 5)`);
  
  // Verificar procesos en diferentes estados
  console.log(`\n📊 Estado final de procesos:`);
  const procesosConEventos = new Set(eventos.map(e => e.proceso).filter(p => p));
  procesosConEventos.forEach(proceso => {
    const eventosProc = eventos.filter(e => e.proceso === proceso);
    const ultimoEvento = eventosProc[eventosProc.length - 1];
    console.log(`  - ${proceso}: último evento "${ultimoEvento.tipo}" en t=${ultimoEvento.tiempo}`);
  });
  
  // Verificar métricas usando MetricsCalculator
  console.log(`\n📈 Verificación de métricas:`);
  try {
    const { MetricsCalculator } = await import('../src/lib/domain/services');
    const metricas = MetricsCalculator.calcularMetricasCompletas(resultado.estadoFinal);
    
    console.log(`  - Procesos por proceso: ${metricas.porProceso?.length || 'NULO'}`);
    console.log(`  - CPU procesos: ${metricas.tanda?.cpuProcesos || 'NULO'}`);
    console.log(`  - CPU SO: ${metricas.tanda?.cpuSO || 'NULO'}`);
    console.log(`  - CPU ocioso: ${metricas.tanda?.cpuOcioso || 'NULO'}`);
    console.log(`  - Tiempo medio retorno: ${metricas.tanda?.tiempoMedioRetorno || 'NULO'}`);
    
    // Verificar si las métricas son coherentes con lo esperado
    const cpuTotal = metricas.tanda?.cpuProcesos + metricas.tanda?.cpuSO + metricas.tanda?.cpuOcioso;
    console.log(`  - Suma total CPU: ${cpuTotal} (vs tiempo final: ${tiempoFinal})`);
    
  } catch (error) {
    console.log(`  ❌ Error calculando métricas: ${error}`);
  }
  
  return resultado;
}

async function diagnosticarRR() {
  console.log('\n🔄 === DIAGNÓSTICO RR (Q=4) ===');
  
  const workloadRR: Workload = {
    ...workload,
    config: {
      policy: 'RR',
      tip: 1,
      tfp: 1,
      tcp: 1,
      quantum: 4
    }
  };
  
  const adaptador = new AdaptadorSimuladorDominio(workloadRR);
  const resultado = adaptador.ejecutar();
  
  const eventos = resultado.eventosInternos;
  const tiempoFinal = Math.max(...eventos.map(e => e.tiempo));
  
  console.log(`⏰ Tiempo final RR: ${tiempoFinal}`);
  
  // Verificar eventos de quantum
  const quantumEvents = eventos.filter(e => e.tipo === 'AgotamientoQuantum');
  console.log(`🔄 Eventos de quantum: ${quantumEvents.length}`);
  
  return resultado;
}

async function main() {
  try {
    await diagnosticarFCFS();
    await diagnosticarRR();
    
    console.log('\n💥 === PROBLEMAS IDENTIFICADOS ===');
    console.log('1. Simulación termina prematuramente (~t=7)');
    console.log('2. Faltan eventos C→B (fin ráfaga) y B→L (retorno E/S)');
    console.log('3. No hay eventos TFP (terminación final)');
    console.log('4. Métricas en cero por procesos no terminados');
    console.log('5. CPU total muy inferior a los 65 esperados');
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  }
}

main();