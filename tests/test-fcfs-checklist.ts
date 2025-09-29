import { runFCFS } from '../src/lib/engine/engine';
import type { Proceso } from '../src/lib/model/proceso';
import type { Costos } from '../src/lib/model/costos';

// Conjunto de prueba mínimo para verificar FCFS
const procesos: Proceso[] = [
  { pid: 1, arribo: 0, rafagasCPU: [15, 12], rafagasES: [4], estado: 'N' },
  { pid: 2, arribo: 2, rafagasCPU: [8], rafagasES: [], estado: 'N' }
];

const costos: Costos = { TIP: 1, TCP: 1, TFP: 2, bloqueoES: 25 };

console.log('=== FCFS CHECKLIST DE CONSISTENCIA ===\n');

const trace = runFCFS(procesos, costos);

console.log('📋 CHECKPOINT 1: TIP/TCP/TFP trazados como overhead separado');
console.log('Overheads trazados:');
const overheads = trace.overheads || [];
overheads.forEach(oh => {
  console.log(`  ${oh.kind} P${oh.pid}: [${oh.t0}, ${oh.t1}) = ${oh.t1 - oh.t0} ticks`);
});

console.log('\n📋 CHECKPOINT 2: Slices contienen solo CPU puro');
console.log('Slices de CPU:');
trace.slices.forEach(slice => {
  console.log(`  P${slice.pid}: [${slice.start}, ${slice.end}) = ${slice.end - slice.start} ticks`);
});

console.log('\n📋 CHECKPOINT 3: C→T emitido en tEnd (fin real de CPU)');
const finishEvents = trace.events.filter(e => e.type === 'C→T');
finishEvents.forEach(evt => {
  const lastSlice = trace.slices.filter(s => s.pid === evt.pid).pop();
  if (lastSlice) {
    const status = evt.t === lastSlice.end ? '✅' : '❌';
    console.log(`  P${evt.pid}: C→T @ t=${evt.t}, último slice termina @ t=${lastSlice.end} ${status}`);
  }
});

console.log('\n📋 CHECKPOINT 4: TFP trazado DESPUÉS de C→T');
const tfpOverheads = overheads.filter(oh => oh.kind === 'TFP');
tfpOverheads.forEach(tfp => {
  const ctEvent = finishEvents.find(evt => evt.pid === tfp.pid);
  if (ctEvent) {
    const status = tfp.t0 === ctEvent.t ? '✅' : '❌';
    console.log(`  P${tfp.pid}: TFP inicia @ t=${tfp.t0}, C→T @ t=${ctEvent.t} ${status}`);
  }
});

console.log('\n📋 CHECKPOINT 5: TCP aplicado antes de cada slice');
const dispatchEvents = trace.events.filter(e => e.type === 'L→C');
dispatchEvents.forEach(dispatch => {
  const nextSlice = trace.slices.find(s => s.pid === dispatch.pid && s.start >= dispatch.t);
  if (nextSlice) {
    const expectedStart = dispatch.t + costos.TCP;
    const status = nextSlice.start === expectedStart ? '✅' : '❌';
    console.log(`  P${dispatch.pid}: L→C @ t=${dispatch.t}, slice inicia @ t=${nextSlice.start}, esperado t=${expectedStart} ${status}`);
  }
});

console.log('\n📋 CHECKPOINT 6: E/S usa rafagasES[idx] específico');
const blockEvents = trace.events.filter(e => e.type === 'C→B');
const unblockEvents = trace.events.filter(e => e.type === 'B→L');

blockEvents.forEach((block, idx) => {
  const unblock = unblockEvents.find(ub => ub.pid === block.pid && ub.t > block.t);
  if (unblock && block.pid) {
    const duracion = unblock.t - block.t;
    const proceso = procesos.find(p => p.pid === block.pid);
    const esperada = proceso?.rafagasES?.[0] ?? costos.bloqueoES;
    const status = duracion === esperada ? '✅' : '❌';
    console.log(`  P${block.pid}: C→B @ t=${block.t}, B→L @ t=${unblock.t}, duración=${duracion}, esperada=${esperada} ${status}`);
  }
});

console.log('\n📋 CHECKPOINT 7: Sin expropiaciones (FCFS puro)');
const preemptEvents = trace.events.filter(e => e.type === 'C→L');
const status = preemptEvents.length === 0 ? '✅' : '❌';
console.log(`  Expropiaciones detectadas: ${preemptEvents.length} ${status}`);

console.log('\n📋 CHECKPOINT 8: Orden FIFO respetado');
const admitEvents = trace.events.filter(e => e.type === 'N→L').sort((a, b) => a.t - b.t);
const dispatchOrder = trace.events.filter(e => e.type === 'L→C').map(e => e.pid);
const expectedOrder = admitEvents.map(e => e.pid);
const fifoRespected = JSON.stringify(dispatchOrder.slice(0, expectedOrder.length)) === JSON.stringify(expectedOrder);
const fifoStatus = fifoRespected ? '✅' : '❌';
console.log(`  Orden admisión: [${expectedOrder.join(', ')}]`);
console.log(`  Orden despacho: [${dispatchOrder.join(', ')}]`);
console.log(`  FIFO respetado: ${fifoStatus}`);

console.log('\n=== EVENTOS COMPLETOS ===');
trace.events.forEach(evt => {
  const dataStr = evt.data ? ` ${JSON.stringify(evt.data)}` : '';
  console.log(`  t=${evt.t}: ${evt.type} P${evt.pid}${dataStr}`);
});