import { runRR } from '../engine/engine';
import type { Proceso } from '../model/proceso';

// Gate tests for RR implementation
function testRRGate() {
  console.log('🔄 RR Gate Tests');
  console.log('===============');

  // Test case 1: TIP=TCP=TFP=0, E/S=0, q=2
  const procesos: Proceso[] = [
    { pid: 1, arribo: 0, rafagasCPU: [5], estado: 'N' },
    { pid: 2, arribo: 0, rafagasCPU: [5], estado: 'N' }
  ];

  const trace = runRR(procesos, {
    TIP: 0,
    TCP: 0,
    TFP: 0,
    bloqueoES: 0
  }, 2);

  // Expected pattern: P1:0–2, P2:2–4, P1:4–6, P2:6–8, P1:8–9, P2:9–10
  console.log('\n📋 Test 1: Basic RR q=2');
  console.log('Expected: P1:0–2, P2:2–4, P1:4–6, P2:6–8, P1:8–9, P2:9–10');
  console.log('Got:');
  trace.slices.forEach(slice => 
    console.log(`P${slice.pid}:${slice.start}–${slice.end}`));
  
  console.log('\nEvent trace:');
  trace.events.forEach(e => 
    console.log(`${e.t}: ${e.type}(${e.pid})`));

  // Test case 2: With TCP=1
  const trace2 = runRR(procesos, {
    TIP: 0,
    TCP: 1,
    TFP: 0,
    bloqueoES: 0
  }, 2);

  console.log('\n📋 Test 2: RR with TCP=1');
  console.log('Expected: Slices shifted +1 on start, same 2 unit duration');
  console.log('Got:');
  trace2.slices.forEach(slice =>
    console.log(`P${slice.pid}:${slice.start}–${slice.end}`));
}

testRRGate();
