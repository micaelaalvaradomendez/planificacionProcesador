#!/usr/bin/env npx tsx

// Script para analizar los eventos generados en detalle
import { cargarArchivo } from './src/lib/application/usecases/parseInput';
import { runSimulationWithTimeout } from './src/lib/application/usecases/simulationRunner';
import fs from 'fs';

async function analyzeEvents() {
  console.log('🔍 ANÁLISIS DETALLADO: Eventos de simulación\n');
  
  const content = fs.readFileSync('./examples/workloads/procesos_tanda_7p.json', 'utf8');
  const file = new File([content], 'procesos_tanda_7p.json', { type: 'application/json' });
  
  const result = await cargarArchivo(file, 'json', 'FCFS', 2, 1, 1, undefined);
  if (!result.loaded || !result.workload) {
    console.error('❌ Error cargando archivo');
    return;
  }
  
  console.log('📋 Procesos cargados:');
  result.workload.processes.forEach(proc => {
    console.log(`  ${proc.name}: arribo=${proc.tiempoArribo}, ráfagas=${proc.rafagasCPU}, duración=${proc.duracionRafagaCPU}, E/S=${proc.duracionRafagaES}`);
  });
  
  console.log('\n📋 Configuración:', result.workload.config);
  
  const simResult = await runSimulationWithTimeout(result.workload);
  
  console.log('\n📅 TODOS LOS EVENTOS GENERADOS:');
  simResult.events.forEach((event, i) => {
    console.log(`${String(i+1).padStart(2, ' ')}. t=${String(event.tiempo).padStart(2, ' ')} | ${event.tipo.padEnd(25, ' ')} | ${(event.proceso || 'N/A').padEnd(4, ' ')} | ${event.extra || ''}`);
  });
  
  console.log('\n🔍 ANÁLISIS POR PROCESO:');
  result.workload.processes.forEach(proc => {
    const eventosDelProceso = simResult.events.filter(e => e.proceso === proc.name);
    console.log(`\n${proc.name}:`);
    console.log(`  Ráfagas CPU esperadas: ${proc.rafagasCPU}`);
    console.log(`  Duración ráfaga CPU: ${proc.duracionRafagaCPU}`);
    console.log(`  Duración ráfaga E/S: ${proc.duracionRafagaES}`);
    console.log(`  Eventos del proceso: ${eventosDelProceso.length}`);
    eventosDelProceso.forEach(e => {
      console.log(`    t=${e.tiempo} | ${e.tipo} | ${e.extra || ''}`);
    });
    
    // Verificar si completó todas sus ráfagas
    const finRafagasCPU = eventosDelProceso.filter(e => e.tipo === 'FIN_RAFAGA_CPU').length;
    const finES = eventosDelProceso.filter(e => e.tipo === 'FIN_ES').length;
    const esperaTerminacion = eventosDelProceso.some(e => e.tipo === 'INICIO_TERMINACION');
    const terminado = eventosDelProceso.some(e => e.tipo === 'TERMINACION_PROCESO');
    
    console.log(`    Ráfagas CPU completadas: ${finRafagasCPU}/${proc.rafagasCPU}`);
    console.log(`    Ráfagas E/S completadas: ${finES}/${Math.max(0, proc.rafagasCPU - 1)}`);
    console.log(`    Inicio terminación: ${esperaTerminacion ? '✅' : '❌'}`);
    console.log(`    Terminado: ${terminado ? '✅' : '❌'}`);
  });
  
  console.log('\n⚠️ POSIBLES PROBLEMAS:');
  const problemasEncontrados: string[] = [];
  
  // Verificar si hay procesos que no terminaron todas sus ráfagas
  result.workload.processes.forEach(proc => {
    const eventosDelProceso = simResult.events.filter(e => e.proceso === proc.name);
    const finRafagasCPU = eventosDelProceso.filter(e => e.tipo === 'FIN_RAFAGA_CPU').length;
    if (finRafagasCPU < proc.rafagasCPU) {
      problemasEncontrados.push(`${proc.name}: Solo completó ${finRafagasCPU}/${proc.rafagasCPU} ráfagas CPU`);
    }
  });
  
  if (problemasEncontrados.length === 0) {
    console.log('  ✅ Todos los procesos completaron sus ráfagas');
  } else {
    problemasEncontrados.forEach(p => console.log(`  ❌ ${p}`));
  }
}

analyzeEvents().catch(console.error);
