// Test completo para verificar E/S, Gantt y métricas mejoradas
import { runRR } from '../src/lib/engine/engine';
import { MetricsBuilder } from '../src/lib/metrics/metricas';
import { GanttBuilder } from '../src/lib/gantt/builder';
import type { Proceso } from '../src/lib/model/proceso';
import type { Costos } from '../src/lib/model/costos';

// Proceso con E/S para test
const procesosConES: Proceso[] = [
  { 
    pid: 1, 
    arribo: 0, 
    rafagasCPU: [2, 3], 
    rafagasES: [4],      // 1 E/S entre las 2 ráfagas CPU
    estado: 'N', 
    prioridadBase: 1 
  },
  { 
    pid: 2, 
    arribo: 1, 
    rafagasCPU: [1, 2], 
    rafagasES: [3],      // 1 E/S entre las 2 ráfagas CPU
    estado: 'N', 
    prioridadBase: 2 
  }
];

const costosConES: Costos = {
  TCP: 1,
  TIP: 1, 
  TFP: 2,
  bloqueoES: 5  // Fallback si no hay suficientes rafagasES
};

console.log('🧪 TEST COMPLETO: E/S + GANTT + MÉTRICAS\n');

const trace = runRR(procesosConES, costosConES, 3);

console.log('=== EVENTOS (deberían incluir C→B y B→L) ===');
trace.events.forEach(e => {
  console.log(`${e.t}: ${e.type} (pid=${e.pid})`);
});

console.log('\n=== MÉTRICAS COMPLETAS ===');
const metricas = MetricsBuilder.build(trace, procesosConES);
const global = MetricsBuilder.buildGlobal(metricas, trace);

metricas.forEach(m => {
  console.log(`P${m.pid}:`);
  console.log(`  Servicio CPU: ${m.servicioCPU}`);
  console.log(`  Tiempo E/S: ${m.tiempoES}`);
  console.log(`  Tiempo Espera: ${m.tiempoEspera}`);
  console.log(`  Overheads: ${m.overheads}`);
  console.log(`  TRp: ${m.TRp}, TE: ${m.TE}, TRn: ${m.TRn.toFixed(2)}`);
  console.log('');
});

console.log('=== MÉTRICAS GLOBALES ===');
console.log(`Tiempo total: ${global.tiempoTotalSimulacion}`);
console.log(`CPU ociosa: ${global.cpuOciosa} (${global.cpuOciosaPorc.toFixed(1)}%)`);
console.log(`Utilización CPU: ${global.utilizacionCPU.toFixed(1)}% (con overheads)`);
console.log(`Utilización CPU busy: ${global.utilizacionCPUBusy.toFixed(1)}% (solo trabajo)`);
console.log(`Throughput: ${global.throughput.toFixed(3)}`);

console.log('\n=== GANTT (debe incluir segmentos io) ===');
const gantt = GanttBuilder.build(trace);
gantt.tracks.forEach(track => {
  console.log(`P${track.pid}:`);
  track.segments.forEach(seg => {
    const tipo = seg.type || 'cpu';
    console.log(`  ${seg.start}-${seg.end}: ${tipo} (duración: ${seg.end - seg.start})`);
  });
  console.log('');
});

// Detectar si hay segmentos de E/S
const segmentosIO = gantt.tracks.flatMap(t => t.segments).filter(s => s.type === 'io');
console.log(`Segmentos de E/S detectados: ${segmentosIO.length}`);
if (segmentosIO.length > 0) {
  console.log('✅ E/S correctamente agregada al Gantt');
} else {
  console.log('⚠️  No se detectaron segmentos de E/S en el Gantt');
}