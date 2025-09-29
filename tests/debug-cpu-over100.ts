// Debug específico para encontrar casos con >100% utilización
import { runRR, runFCFS, runSPN, runSRTN, runPriority } from '../src/lib/engine/engine';
import { MetricsBuilder } from '../src/lib/metrics/metricas';
import { parseTandaJSON } from '../src/lib/io/parser';

// Cargar tanda real que podría causar el problema
const tandaReal = [
  {
    "nombre": "P1",
    "tiempo_arribo": 0,
    "cantidad_rafagas_cpu": 4,
    "duracion_rafaga_cpu": 3,
    "duracion_rafaga_es": 2,
    "prioridad_externa": 3
  },
  {
    "nombre": "P2",
    "tiempo_arribo": 1,
    "cantidad_rafagas_cpu": 2,
    "duracion_rafaga_cpu": 8,
    "duracion_rafaga_es": 5,
    "prioridad_externa": 1
  },
  {
    "nombre": "P3",
    "tiempo_arribo": 3,
    "cantidad_rafagas_cpu": 3,
    "duracion_rafaga_cpu": 4,
    "duracion_rafaga_es": 3,
    "prioridad_externa": 2
  }
];

const procesos = parseTandaJSON(tandaReal);
const costos = { TCP: 1, TIP: 1, TFP: 2, bloqueoES: 5 };

console.log('🔍 BUSCANDO CASOS CON >100% UTILIZACIÓN\n');

const algoritmos = [
  { name: 'FCFS', runner: runFCFS },
  { name: 'RR q=4', runner: (ps: any, c: any) => runRR(ps, c, 4) },
  { name: 'SPN', runner: runSPN },
  { name: 'SRTN', runner: runSRTN }
];

for (const { name, runner } of algoritmos) {
  console.log(`=== ${name} ===`);
  
  try {
    const trace = runner(procesos, costos);
    const metricas = MetricsBuilder.build(trace, procesos);
    const global = MetricsBuilder.buildGlobal(metricas, trace);
    
    console.log(`Tiempo total: ${global.tiempoTotalSimulacion}`);
    console.log(`CPU ociosa: ${global.cpuOciosa} (${global.cpuOciosaPorc.toFixed(1)}%)`);
    console.log(`Utilización CPU: ${global.utilizacionCPU.toFixed(2)}% (con overheads)`);
    console.log(`Utilización CPU busy: ${global.utilizacionCPUBusy.toFixed(2)}% (solo trabajo)`);
    
    if (global.utilizacionCPU > 100) {
      console.log('❌ PROBLEMA ENCONTRADO!');
      
      // Debug detallado
      const maxT = Math.max(
        0,
        ...trace.slices.map(s => s.end),
        ...trace.events.map(e => e.t),
        ...(trace.overheads || []).map(o => o.t1)
      );
      
      const cpuBusy = trace.slices.reduce((sum, s) => sum + (s.end - s.start), 0);
      const overheadCPU = (trace.overheads || [])
        .filter(o => o.kind === 'TCP' || o.kind === 'TFP')
        .reduce((sum, o) => sum + (o.t1 - o.t0), 0);
      
      console.log(`  Max tiempo de trace: ${maxT}`);
      console.log(`  Tiempo total métricas: ${global.tiempoTotalSimulacion}`);
      console.log(`  CPU busy: ${cpuBusy}`);
      console.log(`  Overhead CPU: ${overheadCPU}`);
      console.log(`  Total ocupado: ${cpuBusy + overheadCPU}`);
      
      // Mostrar overheads detallados
      console.log('  Overheads detallados:');
      (trace.overheads || []).forEach(o => {
        console.log(`    ${o.kind} P${o.pid}: ${o.t0}-${o.t1} (${o.t1 - o.t0})`);
      });
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error}`);
  }
  
  console.log('');
}