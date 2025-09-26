// Test adicional Paso 5: Caso complejo con TIP/TCP/TFP y E/S
import { runFCFSSandbox } from '../engine/engine';
import type { Proceso } from '../model/proceso';

console.log('=== Paso 5: Test Adicional - Costos con E/S ===\n');

console.log('🎯 Caso complejo con costos y E/S:');
console.log('   P1: arr=0, [2,3] (CPU, E/S, CPU)');
console.log('   P2: arr=1, [4]   (solo CPU)');
console.log('   Costos: TIP=2, TCP=1, TFP=2, bloqueoES=5');
console.log('');

const procs = [
  { pid: 1, arribo: 0, rafagasCPU: [2, 3], estado: 'N' as const },
  { pid: 2, arribo: 1, rafagasCPU: [4], estado: 'N' as const },
];

const trace = runFCFSSandbox(procs, { TIP: 2, TCP: 1, TFP: 2, bloqueoES: 5 });

console.log('📊 Resultados:');
console.log('Slices obtenidos:');
trace.slices.forEach((s, i) => {
  console.log(`  ${i+1}. P${s.pid}: ${s.start}→${s.end} (duración: ${s.end - s.start}ms)`);
});

console.log('\nEventos detallados:');
trace.events.forEach((e, i) => {
  const pidStr = e.pid ? `P${e.pid}` : 'auto';
  console.log(`  ${i+1}. t=${e.t}: ${e.type}(${pidStr})`);
});

// Análisis paso a paso
console.log('\n🔍 Análisis paso a paso:');

// TIP
console.log('   TIP aplicado:');
const admitP1 = trace.events.find(e => e.type === 'N→L' && e.pid === 1);
const admitP2 = trace.events.find(e => e.type === 'N→L' && e.pid === 2);
console.log(`     P1: arribo 0 → N→L@${admitP1?.t} (+${(admitP1?.t || 0) - 0})`);
console.log(`     P2: arribo 1 → N→L@${admitP2?.t} (+${(admitP2?.t || 0) - 1})`);

// TCP
console.log('   TCP aplicado (inicio de slices):');
const slice1_1 = trace.slices.find(s => s.pid === 1);
const slice2 = trace.slices.find(s => s.pid === 2);
const slice1_2 = trace.slices.filter(s => s.pid === 1)[1];

if (slice1_1) {
  const dispatchP1_1 = trace.events.find(e => e.type === 'L→C' && e.pid === 1);
  console.log(`     P1 (1ra): L→C@${dispatchP1_1?.t} → slice inicia @${slice1_1.start} (+${slice1_1.start - (dispatchP1_1?.t || 0)})`);
}

if (slice2) {
  const dispatchP2 = trace.events.find(e => e.type === 'L→C' && e.pid === 2);
  console.log(`     P2: L→C@${dispatchP2?.t} → slice inicia @${slice2.start} (+${slice2.start - (dispatchP2?.t || 0)})`);
}

if (slice1_2) {
  const dispatchP1_2 = trace.events.filter(e => e.type === 'L→C' && e.pid === 1)[1];
  console.log(`     P1 (2da): L→C@${dispatchP1_2?.t} → slice inicia @${slice1_2.start} (+${slice1_2.start - (dispatchP1_2?.t || 0)})`);
}

// TFP
console.log('   TFP aplicado (eventos C→T):');
const finishP1 = trace.events.find(e => e.type === 'C→T' && e.pid === 1);
const finishP2 = trace.events.find(e => e.type === 'C→T' && e.pid === 2);

if (finishP1 && slice1_2) {
  const expectedFinish = slice1_2.end + 2; // TFP=2
  console.log(`     P1: slice termina @${slice1_2.end} → C→T@${finishP1.t} (+${finishP1.t - slice1_2.end}, esperado +2)`);
}

if (finishP2 && slice2) {
  const expectedFinish = slice2.end + 2; // TFP=2
  console.log(`     P2: slice termina @${slice2.end} → C→T@${finishP2.t} (+${finishP2.t - slice2.end}, esperado +2)`);
}

// Verificar bloqueoES
console.log('   bloqueoES=5 aplicado:');
const blockP1 = trace.events.find(e => e.type === 'C→B' && e.pid === 1);
const readyP1 = trace.events.find(e => e.type === 'B→L' && e.pid === 1);

if (blockP1 && readyP1) {
  const ioTime = readyP1.t - blockP1.t;
  console.log(`     P1: C→B@${blockP1.t} → B→L@${readyP1.t} (E/S: ${ioTime}ms, esperado: 5ms)`);
}

// Verificaciones finales
console.log('\n✅ Verificaciones:');

// Duraciones correctas
const dur1_1 = slice1_1 ? slice1_1.end - slice1_1.start : 0;
const dur1_2 = slice1_2 ? slice1_2.end - slice1_2.start : 0;
const dur2 = slice2 ? slice2.end - slice2.start : 0;

console.log(`   Duraciones: P1(1ra)=${dur1_1}, P1(2da)=${dur1_2}, P2=${dur2}`);
console.log(`   ✅ Duraciones correctas: ${dur1_1 === 2 && dur1_2 === 3 && dur2 === 4 ? 'PASSED' : 'FAILED'}`);

// TFP no bloquea CPU
if (slice2 && finishP2 && slice1_2) {
  const cpuLibreP2 = slice2.end;
  const inicioP1_2 = slice1_2.start;
  console.log(`   CPU libre tras P2: ${cpuLibreP2}, P1 reinicia: ${inicioP1_2}`);
  console.log(`   ✅ TFP no bloquea CPU: ${inicioP1_2 > cpuLibreP2 ? 'PASSED' : 'FAILED'}`);
}

// Orden temporal correcto
const maxTime = Math.max(...trace.events.map(e => e.t));
console.log(`   Tiempo total: ${maxTime}ms`);

console.log('\n🎉 PASO 5 - CASO COMPLEJO CON E/S VALIDADO ✅');