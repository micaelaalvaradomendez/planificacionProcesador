import { runPriority } from '../src/lib/engine/engine';
import type { Proceso } from '../src/lib/model/proceso';
import type { Costos } from '../src/lib/model/costos';

// Caso de prueba diseñado para mostrar preemption por prioridad
const procesos: Proceso[] = [
  { pid: 1, arribo: 0, rafagasCPU: [10], rafagasES: [], estado: 'N', prioridadBase: 3 },  // P1: prioridad 3 (baja)
  { pid: 2, arribo: 2, rafagasCPU: [6], rafagasES: [], estado: 'N', prioridadBase: 1 },   // P2: prioridad 1 (alta)
  { pid: 3, arribo: 4, rafagasCPU: [4], rafagasES: [], estado: 'N', prioridadBase: 2 }    // P3: prioridad 2 (media)
];

const costos: Costos = { TIP: 1, TCP: 1, TFP: 1, bloqueoES: 25 };

console.log('=== PRIORITY SCHEDULING ANÁLISIS ===\n');

console.log('📋 CASO DE PRUEBA PARA PREEMPTION POR PRIORIDAD:');
console.log('  P1: arribo=0, ráfaga=10, prioridad=3 (baja)');
console.log('  P2: arribo=2, ráfaga=6, prioridad=1 (alta) → debe preemptar P1');
console.log('  P3: arribo=4, ráfaga=4, prioridad=2 (media) → NO debe preemptar P2');
console.log('  Convención: menor número = mayor prioridad\n');

const trace = runPriority(procesos, costos);

console.log('🔍 ANÁLISIS DE EVENTOS:');
trace.events.forEach(evt => {
  const dataStr = evt.data ? ` ${JSON.stringify(evt.data)}` : '';
  console.log(`  t=${evt.t}: ${evt.type} P${evt.pid}${dataStr}`);
});

console.log('\n🔍 ANÁLISIS DE SLICES:');
const sortedSlices = trace.slices.sort((a, b) => a.start - b.start);
sortedSlices.forEach(slice => {
  const proceso = procesos.find(p => p.pid === slice.pid)!;
  console.log(`  P${slice.pid} (prio=${proceso.prioridadBase}): [${slice.start}, ${slice.end}) = ${slice.end - slice.start} ticks`);
});

console.log('\n📊 VERIFICACIONES DE PREEMPTION POR PRIORIDAD:');

// Verificar preemption en t=3 cuando llega P2 (prio 1 > prio 3)
const preemptAt3 = trace.events.find(e => e.type === 'C→L' && e.t === 3 && e.data?.reason === 'preempt');
console.log(`  P2 (prio=1) preempta P1 (prio=3) en t=3: ${preemptAt3 ? '✅' : '❌'}`);

// Verificar NO preemption en t=5 cuando llega P3 (prio 2 < prio 1)
const preemptAt5 = trace.events.find(e => e.type === 'C→L' && e.t === 5 && e.data?.reason === 'preempt');
console.log(`  P3 (prio=2) NO preempta P2 (prio=1) en t=5: ${!preemptAt5 ? '✅' : '❌'}`);

// Contar total de preemptions
const totalPreempts = trace.events.filter(e => e.type === 'C→L' && e.data?.reason === 'preempt').length;
console.log(`  Total preemptions: ${totalPreempts} (esperado: 1)`);

console.log('\n📋 VERIFICACIÓN DE OVERHEADS TIP/TCP/TFP:');
const overheads = trace.overheads || [];
const tipCount = overheads.filter(oh => oh.kind === 'TIP').length;
const tcpCount = overheads.filter(oh => oh.kind === 'TCP').length;
const tfpCount = overheads.filter(oh => oh.kind === 'TFP').length;

console.log(`  TIP overheads: ${tipCount} (esperado: ${procesos.length}) ${tipCount === procesos.length ? '✅' : '❌'}`);
console.log(`  TCP overheads: ${tcpCount} ${tcpCount > 0 ? '✅' : '❌'}`);
console.log(`  TFP overheads: ${tfpCount} (esperado: ${procesos.length}) ${tfpCount === procesos.length ? '✅' : '❌'}`);

console.log('\n📋 VERIFICACIÓN DE CPU ACCOUNTING:');
for (const proceso of procesos) {
  const slicesProcess = trace.slices.filter(s => s.pid === proceso.pid);
  const totalSlices = slicesProcess.reduce((sum, s) => sum + (s.end - s.start), 0);
  const totalRafagas = proceso.rafagasCPU.reduce((sum, r) => sum + r, 0);
  const status = totalSlices === totalRafagas ? '✅' : '❌';
  console.log(`  P${proceso.pid}: slices=${totalSlices}, rafagas=${totalRafagas} ${status}`);
}

console.log('\n📋 ORDEN ESPERADO VS ACTUAL:');
console.log('  Orden esperado con Priority:');
console.log('    P1 [2, 3) = 1 tick → preempt por P2(prio=1)');
console.log('    P2 [4, 10) = 6 ticks → completa (P3 no preempta porque prio=2 < prio=1)');  
console.log('    P3 [11, 15) = 4 ticks → completa');
console.log('    P1 [16, 25) = 9 ticks → completa restante');

let timeline = '';
for (const slice of sortedSlices) {
  const proceso = procesos.find(p => p.pid === slice.pid)!;
  timeline += `P${slice.pid}(${proceso.prioridadBase})[${slice.start},${slice.end}) `;
}
console.log(`  Orden actual: ${timeline}`);

console.log('\n📊 VEREDICTO PRIORITY:');
const correctPreemptions = totalPreempts === 1;
const hasOverheads = tipCount === procesos.length && tcpCount > 0 && tfpCount === procesos.length;
const correctAccounting = procesos.every(p => {
  const actualCPU = trace.slices.filter(s => s.pid === p.pid).reduce((sum, s) => sum + (s.end - s.start), 0);
  const expectedCPU = p.rafagasCPU.reduce((sum, r) => sum + r, 0);
  return actualCPU === expectedCPU;
});

if (correctPreemptions && hasOverheads && correctAccounting) {
  console.log('🎉 PRIORITY SCHEDULING FUNCIONANDO CORRECTAMENTE');
  console.log('  ✅ Preemption por prioridad');
  console.log('  ✅ TIP/TCP/TFP aplicados');
  console.log('  ✅ Contabilidad exacta de CPU');
} else {
  console.log('❌ PRIORITY AÚN TIENE PROBLEMAS');
  console.log(`    - Preemptions correctas: ${correctPreemptions ? '✅' : '❌'}`);
  console.log(`    - Overheads aplicados: ${hasOverheads ? '✅' : '❌'}`);
  console.log(`    - CPU accounting: ${correctAccounting ? '✅' : '❌'}`);
}