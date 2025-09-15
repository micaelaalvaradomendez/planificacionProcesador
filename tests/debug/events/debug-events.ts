#!/usr/bin/env npx tsx

// Script para analizar eventos y estados de procesos
import { parseJsonToWorkload } from "../../src/lib/infrastructure/parsers/jsonParser"';
import { ejecutarSimulacionCompleta } from '../../../src/lib/application/usecases/runSimulation';
import fs from 'fs';

async function analyzeEvents() {
  console.log('🔍 ANÁLISIS: Eventos y estados de procesos\n');
  
  const content = fs.readFileSync('../../../examples/workloads/procesos_tanda_7p.json', 'utf8');
  const file = new File([content], 'procesos_tanda_7p.json', { type: 'application/json' });
  
  const workload = await parseJsonToWorkload(file);
  
  // Aplicar configuración correcta
  workload.config.policy = 'FCFS';
  workload.config.tip = 2;
  workload.config.tfp = 1;
  workload.config.tcp = 1;
  workload.config.quantum = undefined;
  
  console.log('📋 Configuración aplicada:', workload.config);
  console.log('📋 Procesos iniciales:');
  workload.processes.forEach(proc => {
    console.log(`  ${proc.name}: arribo=${proc.tiempoArribo}, rafagas=${proc.rafagasCPU}, duracion=${proc.duracionRafagaCPU}, prioridad=${proc.prioridad}`);
  });
  
  console.log('\n🚀 Ejecutando simulación...');
  const resultado = await ejecutarSimulacionCompleta(workload);
  
  if (!resultado.exitoso) {
    console.error('❌ Error:', resultado.error);
    return;
  }
  
  console.log('\n📅 EVENTOS GENERADOS:');
  resultado.eventos.forEach((event, i) => {
    console.log(`${i+1}. t=${event.tiempo} | ${event.tipo} | Proceso: ${event.proceso || 'N/A'} | Extra: ${event.extra || 'N/A'}`);
  });
  
  console.log('\n📊 ESTADO FINAL DE PROCESOS:');
  workload.processes.forEach(proc => {
    // Buscar último evento de este proceso
    const ultimoEvento = resultado.eventos
      .filter(e => e.proceso === proc.name)
      .pop();
    
    console.log(`${proc.name}:`);
    console.log(`  Último evento: ${ultimoEvento?.tipo} en t=${ultimoEvento?.tiempo}`);
    
    // Verificar si tiene estado y finTFP en la copia que maneja la simulación
    const procEnSimulacion = (workload.processes as any[]).find((p: any) => p.name === proc.name);
    if (procEnSimulacion) {
      console.log(`  Estado: ${(procEnSimulacion as any).estado || 'undefined'}`);
      console.log(`  finTFP: ${(procEnSimulacion as any).finTFP || 'undefined'}`);
    }
  });
  
  console.log('\n📈 MÉTRICAS GENERADAS:');
  console.log('Por proceso:', resultado.metricas.porProceso.length);
  console.log('Tanda:', resultado.metricas.tanda);
  
  if (resultado.metricas.porProceso.length > 0) {
    resultado.metricas.porProceso.forEach(m => {
      console.log(`  ${m.name}: TR=${m.tiempoRetorno}, TRn=${m.tiempoRetornoNormalizado}, EnListo=${m.tiempoEnListo}`);
    });
  } else {
    console.log('❌ No hay métricas por proceso - investigando...');
    
    // Verificar eventos TERMINACION_PROCESO
    const eventosTerminacion = resultado.eventos.filter(e => e.tipo === 'TERMINACION_PROCESO');
    console.log(`Eventos TERMINACION_PROCESO encontrados: ${eventosTerminacion.length}`);
    eventosTerminacion.forEach(e => {
      console.log(`  ${e.proceso} finalizó en t=${e.tiempo}`);
    });
  }
}

analyzeEvents().catch(console.error);