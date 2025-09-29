import { runRR, runSRTN } from '../src/lib/engine/engine';
import type { Proceso } from '../src/lib/model/proceso';
import type { Costos } from '../src/lib/model/costos';

// Procesos diseñados específicamente para generar eventos stale
// P1 tiene ráfaga larga que será preemptada múltiples veces
// P2 llega casi inmediatamente y tiene ráfaga muy corta (causará preemptions)
const procesos: Proceso[] = [
  { pid: 1, arribo: 0, rafagasCPU: [20], rafagasES: [], estado: 'N' },
  { pid: 2, arribo: 1, rafagasCPU: [3], rafagasES: [], estado: 'N' },
  { pid: 3, arribo: 2, rafagasCPU: [5], rafagasES: [], estado: 'N' }
];

const costos: Costos = { TIP: 0, TCP: 0, TFP: 0, bloqueoES: 25 };
const quantum = 4; // Quantum pequeño para forzar muchas preemptions en RR

console.log('🧪 TEST ESPECÍFICO: EVENTOS STALE Y GENERATION TRACKING\n');

console.log('=== CASO CRÍTICO: RR CON QUANTUM PEQUEÑO ===');
const traceRR = runRR(procesos, costos, quantum);

// Simular manualmente lo que pasaría SIN generation tracking:
// 1. P1 ejecuta por 4 ticks, se programa CPU_DONE@t=4 con generation=0
// 2. Llega PREEMPT@t=4, P1 es preemptado, generation++ -> 1
// 3. El CPU_DONE@t=4 con generation=0 debería ser ignorado
// 4. Si no se ignora, P1 perdería ticks de CPU

console.log('Verificando integridad del CPU accounting en RR intensivo:');
let totalCPUUsed = 0;
let expectedCPU = 0;

for (const proceso of procesos) {
  const sliceCPU = traceRR.slices
    .filter(s => s.pid === proceso.pid)
    .reduce((sum, s) => sum + (s.end - s.start), 0);
  const rafagaCPU = proceso.rafagasCPU.reduce((sum, r) => sum + r, 0);
  
  totalCPUUsed += sliceCPU;
  expectedCPU += rafagaCPU;
  
  console.log(`  P${proceso.pid}: slices=${sliceCPU} ticks, rafagas=${rafagaCPU} ticks`);
  
  if (sliceCPU !== rafagaCPU) {
    console.log(`    ❌ DIFERENCIA! P${proceso.pid} perdió/ganó ${sliceCPU - rafagaCPU} ticks`);
  } else {
    console.log(`    ✅ Perfecto accounting`);
  }
}

console.log(`\nTotales: usado=${totalCPUUsed}, esperado=${expectedCPU}`);
if (totalCPUUsed === expectedCPU) {
  console.log('✅ Generation tracking previno eventos stale correctamente');
} else {
  console.log('❌ Hay pérdida/ganancia de CPU - eventos stale no bloqueados');
}

// Verificar que los quantum preempts están bien contados
const quantumPreempts = traceRR.events.filter(e => 
  e.type === 'C→L' && e.data?.reason === 'quantum'
).length;

console.log(`\nQuantum preemptions: ${quantumPreempts}`);
console.log('Detalles de preemptions:');
traceRR.events
  .filter(e => e.type === 'C→L')
  .forEach(e => {
    console.log(`  t=${e.t}: P${e.pid} C→L (${e.data?.reason || 'unknown'})`);
  });

console.log('\n=== CASO CRÍTICO: SRTN CON ARRIVALS SOLAPADOS ===');
const traceSRTN = runSRTN(procesos, costos);

console.log('Verificando que preemptions SRTN no causan doble-descuento:');
for (const proceso of procesos) {
  const sliceCPU = traceSRTN.slices
    .filter(s => s.pid === proceso.pid)
    .reduce((sum, s) => sum + (s.end - s.start), 0);
  const rafagaCPU = proceso.rafagasCPU.reduce((sum, r) => sum + r, 0);
  
  console.log(`  P${proceso.pid}: slices=${sliceCPU}, rafagas=${rafagaCPU}`);
  
  if (sliceCPU > rafagaCPU) {
    console.log(`    ❌ CPU DUPLICADO! P${proceso.pid} ejecutó ${sliceCPU - rafagaCPU} ticks extra`);
  } else if (sliceCPU < rafagaCPU) {
    console.log(`    ❌ CPU PERDIDO! P${proceso.pid} perdió ${rafagaCPU - sliceCPU} ticks`);
  } else {
    console.log(`    ✅ Accounting correcto`);
  }
}

// Verificar eventos de preemption en SRTN
const srtnPreempts = traceSRTN.events.filter(e => 
  e.type === 'C→L' && e.data?.reason === 'preempt'
).length;

console.log(`\nSRTN preemptions: ${srtnPreempts}`);
console.log('Timeline crítica de eventos:');
traceSRTN.events
  .sort((a, b) => a.t - b.t)
  .slice(0, 15) // Primeros 15 eventos
  .forEach(e => {
    const data = e.data ? ` (${JSON.stringify(e.data)})` : '';
    console.log(`  t=${e.t}: ${e.type} P${e.pid}${data}`);
  });

console.log('\n🎯 CONCLUSIÓN DEL TEST CRÍTICO:');
const rrAccountingPerfect = traceRR.slices.reduce((sum, s) => sum + (s.end - s.start), 0) === expectedCPU;
const srtnAccountingPerfect = traceSRTN.slices.reduce((sum, s) => sum + (s.end - s.start), 0) === expectedCPU;

if (rrAccountingPerfect && srtnAccountingPerfect) {
  console.log('🏆 GENERATION TRACKING FUNCIONA PERFECTAMENTE');
  console.log('   ✅ RR: Sin pérdida de CPU en preemptions por quantum');
  console.log('   ✅ SRTN: Sin doble-descuento en preemptions concurrentes');
} else {
  console.log('⚠️  PROBLEMAS DETECTADOS EN GENERATION TRACKING');
  console.log(`   RR accounting: ${rrAccountingPerfect ? '✅' : '❌'}`);
  console.log(`   SRTN accounting: ${srtnAccountingPerfect ? '✅' : '❌'}`);
}