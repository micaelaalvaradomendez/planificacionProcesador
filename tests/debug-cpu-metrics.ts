// Debug para CPU ociosa
import { runRR, runFCFS } from '../src/lib/engine/engine';
import { MetricsBuilder } from '../src/lib/metrics/metricas';
import type { Proceso } from '../src/lib/model/proceso';
import type { Costos } from '../src/lib/model/costos';

const procesosSimple: Proceso[] = [
  { pid: 1, arribo: 0, rafagasCPU: [3], estado: 'N', prioridadBase: 1 },
  { pid: 2, arribo: 2, rafagasCPU: [2], estado: 'N', prioridadBase: 2 }
];

const costos: Costos = {
  TCP: 1,
  TIP: 1, 
  TFP: 1,
  bloqueoES: 1
};

console.log('🔍 DEBUG CPU OCIOSA\n');

const trace = runFCFS(procesosSimple, costos);

console.log('=== ANÁLISIS DEL TRACE ===');
console.log('Slices CPU:');
trace.slices.forEach(s => console.log(`  P${s.pid}: ${s.start}-${s.end} (${s.end - s.start})`));

console.log('\nOverheads:');
(trace.overheads || []).forEach(o => console.log(`  ${o.kind} P${o.pid}: ${o.t0}-${o.t1} (${o.t1 - o.t0})`));

console.log('\nEventos:');
trace.events.forEach(e => console.log(`  ${e.t}: ${e.type} (pid=${e.pid})`));

// Calcular manualmente
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

console.log('\n=== CÁLCULOS MANUALES ===');
console.log(`Tiempo máximo: ${maxT}`);
console.log(`CPU busy (slices): ${cpuBusy}`);
console.log(`Overhead CPU (TCP+TFP): ${overheadCPU}`);
console.log(`CPU total ocupada: ${cpuBusy + overheadCPU}`);
console.log(`CPU ociosa: ${maxT - cpuBusy - overheadCPU}`);
console.log(`% Utilización: ${((cpuBusy + overheadCPU) / maxT * 100).toFixed(2)}%`);

// Comparar con métricas
const metricas = MetricsBuilder.build(trace, procesosSimple);
const global = MetricsBuilder.buildGlobal(metricas, trace);

console.log('\n=== MÉTRICAS CALCULADAS ===');
console.log(`Tiempo total: ${global.tiempoTotalSimulacion}`);
console.log(`CPU ociosa: ${global.cpuOciosa}`);
console.log(`% CPU ociosa: ${global.cpuOciosaPorc.toFixed(2)}%`);
console.log(`% Utilización CPU: ${global.utilizacionCPU.toFixed(2)}%`);
console.log(`% Utilización CPU busy: ${global.utilizacionCPUBusy.toFixed(2)}%`);

// Detectar el problema
if (global.utilizacionCPU > 100) {
  console.log('\n❌ PROBLEMA DETECTADO: Utilización > 100%');
  console.log('Posibles causas:');
  console.log('- Sobreconteo de overheads');
  console.log('- Tiempo total mal calculado');
  console.log('- Overlapping de actividades');
}