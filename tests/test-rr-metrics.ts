import { runRR } from '../src/lib/engine/engine';
import { MetricsBuilder } from '../src/lib/metrics/metricas';
import type { Proceso } from '../src/lib/model/proceso';
import type { Costos } from '../src/lib/model/costos';

// Procesos de prueba para validar métricas
const procesos: Proceso[] = [
  { pid: 1, arribo: 0, rafagasCPU: [10], rafagasES: [], estado: 'N' },
  { pid: 2, arribo: 2, rafagasCPU: [8], rafagasES: [], estado: 'N' }
];

const costos: Costos = { TIP: 0, TCP: 0, TFP: 0, bloqueoES: 25 };
const quantum = 6;

console.log('=== VERIFICACIÓN MÉTRICAS RR ===\n');

const trace = runRR(procesos, costos, quantum);
const processMetrics = MetricsBuilder.build(trace, procesos);
const globalMetrics = MetricsBuilder.buildGlobal(processMetrics, trace);

console.log('📊 MÉTRICAS GLOBALES:');
console.log(`  Expropiaciones: ${globalMetrics.expropiaciones}`);
console.log(`  Cambios de contexto: ${globalMetrics.cambiosDeContexto}`);
console.log(`  Throughput: ${globalMetrics.throughput}`);

console.log('\n🔍 ANÁLISIS DE EXPROPIACIONES:');
const preemptEvents = trace.events.filter(e => e.type === 'C→L');
const quantumPreempts = preemptEvents.filter(e => e.data?.reason === 'quantum');
const otherPreempts = preemptEvents.filter(e => e.data?.reason === 'preempt');

console.log(`  Total eventos C→L: ${preemptEvents.length}`);
console.log(`  Por quantum: ${quantumPreempts.length}`);
console.log(`  Por preempt: ${otherPreempts.length}`);
console.log(`  Calculado en métricas: ${globalMetrics.expropiaciones}`);

const status = globalMetrics.expropiaciones === preemptEvents.length ? '✅' : '❌';
console.log(`  Contador correcto: ${status}`);

if (globalMetrics.expropiaciones !== preemptEvents.length) {
  console.log(`  ❌ ERROR: Esperado ${preemptEvents.length}, obtenido ${globalMetrics.expropiaciones}`);
}

console.log('\n📋 EVENTOS DETALLADOS:');
preemptEvents.forEach(evt => {
  console.log(`  t=${evt.t}: C→L P${evt.pid} {reason:"${evt.data?.reason}"}`);
});

console.log('\n📋 VERIFICACIÓN FINAL:');
console.log(`  Procesos con rBurst > quantum deben preemptar:`);
console.log(`    P1: 10 ticks > 6 quantum → debe preemptar ✅`);
console.log(`    P2: 8 ticks > 6 quantum → debe preemptar ✅`);
console.log(`  Total preempts esperados: 2`);
console.log(`  Total preempts medidos: ${globalMetrics.expropiaciones}`);

const finalStatus = globalMetrics.expropiaciones === 2 ? '✅ CORRECTO' : '❌ ERROR';
console.log(`  VEREDICTO: ${finalStatus}`);