#!/usr/bin/env npx tsx

// Script para probar el flujo de configuración en la UI
import { analizarTandaJson } from './src/lib/infrastructure/io/parseWorkload';
import { ejecutarSimulacionCompleta } from './src/lib/application/usecases/runSimulation';
import { calcularMetricasPorProceso } from './src/lib/core/metrics';
import fs from 'fs';

async function testConfigFlow() {
  console.log('🧪 TEST: Flujo de configuración UI\n');
  
  // 1. Simular carga de archivo (como lo hace la UI)
  const content = fs.readFileSync('./examples/workloads/procesos_tanda_7p.json', 'utf8');
  const file = new File([content], 'procesos_tanda_7p.json', { type: 'application/json' });
  
  console.log('📁 Cargando archivo con analizarTandaJson...');
  const workload = await analizarTandaJson(file);
  console.log('Config inicial del workload:', workload.config);
  console.log('Procesos cargados:', workload.processes.length);
  
  // 2. Simular configuración de UI (como updateWorkloadConfig)
  console.log('\n🔧 Aplicando configuración de UI...');
  const uiConfig = {
    policy: 'FCFS' as const,
    tip: 2,
    tfp: 1, 
    tcp: 1,
    quantum: undefined
  };
  
  // Actualizar workload config (como hace updateWorkloadConfig)
  workload.config.policy = uiConfig.policy;
  workload.config.tip = uiConfig.tip;
  workload.config.tfp = uiConfig.tfp;
  workload.config.tcp = uiConfig.tcp;
  workload.config.quantum = uiConfig.quantum;
  
  console.log('Config después de UI:', workload.config);
  
  // 3. Ejecutar simulación
  console.log('\n🚀 Ejecutando simulación...');
  const resultado = await ejecutarSimulacionCompleta(workload);
  
  if (!resultado.exitoso) {
    console.error('❌ Error en simulación:', resultado.error);
    return;
  }
  
  console.log('✅ Simulación exitosa');
  console.log('Eventos generados:', resultado.eventos.length);
  console.log('Tiempo total:', resultado.tiempoTotal);
  
  // 4. Verificar métricas
  console.log('\n📊 Verificando métricas...');
  console.log('Métricas por proceso:', resultado.metricas.porProceso.length);
  console.log('Métricas de tanda:', resultado.metricas.tanda);
  
  // 5. Verificar procesos después de simulación
  console.log('\n🔍 Procesos después de simulación:');
  workload.processes.forEach((proc, i) => {
    console.log(`${proc.name}: rafagas=${proc.rafagasCPU}, duracion=${proc.duracionRafagaCPU}`);
  });
  
  // 6. Test con config errónea (como el bug)
  console.log('\n🐛 TEST con config errónea (tip=0, tfp=0, tcp=0)...');
  const workloadBuggy = await analizarTandaJson(file);
  // No aplicar configuración UI (simular el bug)
  console.log('Config buggy:', workloadBuggy.config);
  
  const resultadoBuggy = await ejecutarSimulacionCompleta(workloadBuggy);
  if (resultadoBuggy.exitoso) {
    console.log('Eventos con config buggy:', resultadoBuggy.eventos.length);
    console.log('Métricas por proceso con config buggy:', resultadoBuggy.metricas.porProceso.length);
    console.log('Procesos con config buggy:');
    workloadBuggy.processes.forEach((proc, i) => {
      console.log(`${proc.name}: rafagas=${proc.rafagasCPU}, duracion=${proc.duracionRafagaCPU}`);
    });
  }
}

testConfigFlow().catch(console.error);
