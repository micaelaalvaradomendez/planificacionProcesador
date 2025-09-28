// src/lib/test/test-priority-preemption.ts
import { runPriority } from '../../src/lib/engine/engine';
import type { Proceso } from '../../src/lib/model/proceso';
import { MetricsBuilder } from '../../src/lib/metrics/metricas';

/**
 * Test específico para validar expropiación con telemetría refinada
 * Verifica que C→L con reason='preempt' se cuente correctamente
 */

console.log('  Test Priority - Expropiación con Telemetría');

// Caso: P1 (prioridad 2) llega, P2 (prioridad 1) llega y debe expropiar
const procesos: Proceso[] = [
  { pid: 1, arribo: 0, rafagasCPU: [5], estado: 'N' },  // prioridad 2 (menor)
  { pid: 2, arribo: 2, rafagasCPU: [3], estado: 'N' }   // prioridad 1 (mayor)
];

const prioridades = { 1: 2, 2: 1 }; // P2 > P1
const costos = { TIP: 0, TCP: 0, TFP: 0, bloqueoES: 0 };

console.log('📋 Escenario:');
console.log('   P1: arribo=0, CPU=5, prioridad=2 (menor)');
console.log('   P2: arribo=2, CPU=3, prioridad=1 (MAYOR → debe expropiar)');

const trace = runPriority(procesos, prioridades, costos);

console.log('\n Trace generado:');
console.log(`   Slices: ${trace.slices.length}`);
trace.slices.forEach(s => {
  console.log(`   - P${s.pid}: ${s.start}→${s.end} (CPU: ${s.end - s.start})`);
});

console.log(`   Eventos: ${trace.events.length}`);
trace.events.forEach(e => {
  const dataStr = e.data ? ` ${JSON.stringify(e.data)}` : '';
  console.log(`   - t=${e.t}: ${e.type} P${e.pid}${dataStr}`);
});

// Validar expropiación
const eventosPreempt = trace.events.filter(e => 
  e.type === 'C→L' && e.data?.reason === 'preempt'
);

console.log('\n Validación expropiación:');
console.log(`   Eventos C→L con reason='preempt': ${eventosPreempt.length}`);
eventosPreempt.forEach(e => {
  console.log(`   - t=${e.t}: P${e.pid} expropiado por prioridad`);
});

// Métricas con contador refinado
const metricasPorProceso = MetricsBuilder.build(trace, procesos);
const metricasGlobales = MetricsBuilder.buildGlobal(metricasPorProceso, trace);

console.log('\n📈 Métricas:');
console.log(`   Cambios contexto: ${metricasGlobales.cambiosDeContexto}`);
console.log(`   Expropiaciones: ${metricasGlobales.expropiaciones}`);

// Validaciones
const esperado = eventosPreempt.length;
const obtenido = metricasGlobales.expropiaciones;

if (obtenido === esperado) {
  console.log(`    Contador refinado: ${obtenido} expropiaciones reales`);
} else {
  console.log(`   ❌ Error: esperado ${esperado}, obtenido ${obtenido}`);
}

console.log('\n   Test expropiación completado');