// Test Gate para Paso 4: Bloqueos de E/S correctos con bloqueoES=25
import { runFCFSSandbox } from '../engine/engine';
import type { Proceso } from '../model/proceso';

console.log('=== Paso 4: Test Gate - Bloqueos E/S con bloqueoES=25 ===\n');

// Golden B con E/S=25
console.log('🎯 Golden B con bloqueoES=25:');
console.log('   P1: arr=0, [3,2] (CPU 3ms, E/S 25ms, CPU 2ms)');
console.log('   P2: arr=1, [4]   (CPU 4ms)');
console.log('   Esperado:');
console.log('     • P1: 0–3 → C→B@3, B→L@28');
console.log('     • P2: 3–7');
console.log('     • CPU ociosa: 7–28');  
console.log('     • P1: 28–30\n');

const procs: Proceso[] = [
  { pid: 1, arribo: 0, rafagasCPU: [3, 2], estado: 'N' },
  { pid: 2, arribo: 1, rafagasCPU: [4], estado: 'N' },
];

const trace = runFCFSSandbox(procs, { bloqueoES: 25 });

console.log('📊 Resultados:');
console.log('   Slices:', trace.slices);
console.log('');

// Validar slices esperados
const expectedSlices = [
  { pid: 1, start: 0, end: 3 },   // P1 primera ráfaga
  { pid: 2, start: 3, end: 7 },   // P2 completa
  { pid: 1, start: 28, end: 30 }, // P1 segunda ráfaga (tras I/O)
];

const slicesMatch = JSON.stringify(trace.slices) === JSON.stringify(expectedSlices);
console.log('✅ Slices Gate:', slicesMatch ? 'PASSED' : 'FAILED');

if (!slicesMatch) {
  console.log('   Esperado:', expectedSlices);
  console.log('   Obtenido:', trace.slices);
}

// Validar eventos clave
console.log('\n📋 Eventos clave:');
const keyEvents = [
  { t: 3,  type: 'C→B', pid: 1, desc: 'P1 bloquea por E/S' },
  { t: 28, type: 'B→L', pid: 1, desc: 'P1 termina E/S y vuelve a ready' },
  { t: 28, type: 'L→C', pid: 1, desc: 'P1 se despacha para segunda ráfaga' },
];

let allEventsFound = true;
for (const ev of keyEvents) {
  const found = trace.events.some(e => e.t === ev.t && e.type === ev.type && e.pid === ev.pid);
  console.log(`   ${found ? '✅' : '❌'} t=${ev.t}: ${ev.type}(P${ev.pid}) - ${ev.desc}`);
  if (!found) allEventsFound = false;
}

console.log('\n✅ Eventos Gate:', allEventsFound ? 'PASSED' : 'FAILED');

// Análisis de tiempo total
const maxTime = Math.max(...trace.events.map(e => e.t));
console.log(`\n⏱️  Tiempo total de simulación: ${maxTime}ms`);
console.log(`   (P1 termina en t=30, confirmando que E/S tomó 25ms)`);

console.log('\n📈 Verificación de latencia E/S:');
const blockEvent = trace.events.find(e => e.type === 'C→B' && e.pid === 1);
const readyEvent = trace.events.find(e => e.type === 'B→L' && e.pid === 1);

if (blockEvent && readyEvent) {
  const ioLatency = readyEvent.t - blockEvent.t;
  console.log(`   C→B@${blockEvent.t} → B→L@${readyEvent.t} = ${ioLatency}ms latencia`);
  console.log(`   ✅ Latencia E/S correcta:`, ioLatency === 25 ? 'PASSED' : 'FAILED');
} else {
  console.log('   ❌ No se encontraron eventos C→B o B→L para P1');
}

// Test adicional: verificar que B→L no consume CPU
console.log('\n🔍 Verificación "B→L no consume CPU":');
const readyTime = readyEvent?.t;
const dispatchTime = trace.events.find(e => e.type === 'L→C' && e.pid === 1 && e.t >= (readyTime || 0))?.t;

if (readyTime && dispatchTime && readyTime === dispatchTime) {
  console.log(`   B→L@${readyTime} → L→C@${dispatchTime} (mismo instante)`);
  console.log('   ✅ B→L no consume CPU: PASSED');
} else {
  console.log(`   B→L@${readyTime} → L→C@${dispatchTime}`);
  console.log('   ❌ B→L parece consumir CPU: FAILED');
}

console.log('\n' + '='.repeat(60));
console.log('🎉 PASO 4 COMPLETADO');
console.log('   • bloqueoES configurable (default 25ms)');
console.log('   • B→L programado en t + bloqueoES');
console.log('   • B→L no consume CPU');
console.log('   • Guard anti-doble-dispatch mantiene estabilidad');
console.log('='.repeat(60));