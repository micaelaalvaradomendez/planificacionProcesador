// src/lib/test/test-integration-tanda5p.ts
import { runSimulationFromTanda, type SimulationConfig } from '../stores/simulacion';

console.log('🧪 Test Integración - Tanda 5 Procesos Real');

// Cargar datos simulando la estructura real de procesos_tanda_5p.json
const tanda5p = [
  {
    "nombre": "P1",
    "tiempo_arribo": 0,
    "cantidad_rafagas_cpu": 3,
    "duracion_rafaga_cpu": 5,
    "duracion_rafaga_es": 10,
    "prioridad_externa": 2
  },
  {
    "nombre": "P2",
    "tiempo_arribo": 1,
    "cantidad_rafagas_cpu": 2,
    "duracion_rafaga_cpu": 4,
    "duracion_rafaga_es": 10,
    "prioridad_externa": 1
  },
  {
    "nombre": "P3",
    "tiempo_arribo": 3,
    "cantidad_rafagas_cpu": 1,
    "duracion_rafaga_cpu": 6,
    "duracion_rafaga_es": 10,
    "prioridad_externa": 3
  },
  {
    "nombre": "P4",
    "tiempo_arribo": 5,
    "cantidad_rafagas_cpu": 2,
    "duracion_rafaga_cpu": 3,
    "duracion_rafaga_es": 10,
    "prioridad_externa": 1
  },
  {
    "nombre": "P5",
    "tiempo_arribo": 7,
    "cantidad_rafagas_cpu": 1,
    "duracion_rafaga_cpu": 2,
    "duracion_rafaga_es": 10,
    "prioridad_externa": 4
  }
];

console.log('🔧 Test 1: FCFS con tanda completa');
{
  const cfg: SimulationConfig = {
    politica: 'FCFS',
    costos: { TIP: 1, TCP: 1, TFP: 1 } // bloqueoES se extraerá automáticamente
  };
  
  const result = runSimulationFromTanda(cfg, tanda5p);
  
  console.log(`📊 Resultado FCFS:`);
  console.log(`   Procesos: ${result.metricas.porProceso.length}`);
  console.log(`   Slices: ${result.trace.slices.length}`);
  console.log(`   Eventos: ${result.trace.events.length}`);
  console.log(`   TRp promedio: ${result.metricas.global.TRpPromedio.toFixed(2)}`);
  console.log(`   Throughput: ${result.metricas.global.throughput.toFixed(4)}`);
  console.log(`   Cambios contexto: ${result.metricas.global.cambiosDeContexto}`);
  
  if (result.warnings?.length) {
    console.log(`⚠️  Warnings: ${result.warnings.join(', ')}`);
  }
  
  console.log('✅ Test 1 OK - FCFS ejecutado');
}

console.log('🔧 Test 2: RR con quantum=4');
{
  const cfg: SimulationConfig = {
    politica: 'RR',
    quantum: 4,
    costos: { TIP: 0, TCP: 1, TFP: 0, bloqueoES: 10 }
  };
  
  const result = runSimulationFromTanda(cfg, tanda5p);
  
  console.log(`📊 Resultado RR (q=4):`);
  console.log(`   Procesos: ${result.metricas.porProceso.length}`);
  console.log(`   Slices: ${result.trace.slices.length}`);
  console.log(`   Eventos: ${result.trace.events.length}`);
  console.log(`   TRp promedio: ${result.metricas.global.TRpPromedio.toFixed(2)}`);
  console.log(`   Cambios contexto: ${result.metricas.global.cambiosDeContexto}`);
  
  console.log('✅ Test 2 OK - RR ejecutado');
}

console.log('🔧 Test 3: PRIORITY con aging');
{
  const cfg: SimulationConfig = {
    politica: 'PRIORITY',
    aging: { step: 1, quantum: 5 },
    costos: { TIP: 0, TCP: 1, TFP: 0, bloqueoES: 10 }
  };
  
  const result = runSimulationFromTanda(cfg, tanda5p);
  
  console.log(`📊 Resultado PRIORITY (aging):`);
  console.log(`   Procesos: ${result.metricas.porProceso.length}`);
  console.log(`   Slices: ${result.trace.slices.length}`);
  console.log(`   Eventos: ${result.trace.events.length}`);
  console.log(`   TRp promedio: ${result.metricas.global.TRpPromedio.toFixed(2)}`);
  console.log(`   Expropiaciones: ${result.metricas.global.expropiaciones}`);
  
  // Mostrar orden de ejecución por prioridad
  console.log(`📋 Prioridades importadas:`);
  result.metricas.porProceso.forEach(p => {
    const proceso = tanda5p.find(t => t.nombre === `P${p.pid}`);
    console.log(`   P${p.pid}: prioridad=${proceso?.prioridad_externa}, TRp=${p.TRp}`);
  });
  
  console.log('✅ Test 3 OK - PRIORITY ejecutado');
}

console.log('🔧 Test 4: Comparación SPN vs SRTN');
{
  const cfgSPN: SimulationConfig = {
    politica: 'SPN',
    costos: { TIP: 0, TCP: 0, TFP: 0, bloqueoES: 0 }
  };
  
  const cfgSRTN: SimulationConfig = {
    politica: 'SRTN', 
    costos: { TIP: 0, TCP: 0, TFP: 0, bloqueoES: 0 }
  };
  
  const resultSPN = runSimulationFromTanda(cfgSPN, tanda5p);
  const resultSRTN = runSimulationFromTanda(cfgSRTN, tanda5p);
  
  console.log(`📊 Comparación SPN vs SRTN:`);
  console.log(`   SPN  - TRp: ${resultSPN.metricas.global.TRpPromedio.toFixed(2)}, Cambios: ${resultSPN.metricas.global.cambiosDeContexto}`);
  console.log(`   SRTN - TRp: ${resultSRTN.metricas.global.TRpPromedio.toFixed(2)}, Cambios: ${resultSRTN.metricas.global.cambiosDeContexto}`);
  
  console.log('✅ Test 4 OK - SPN vs SRTN comparados');
}

console.log('\n🎯 Test integración tanda 5p completado exitosamente!');