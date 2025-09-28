// src/lib/test/test-edge-cases.ts
import { runSRTN, runSPN, runRR } from '../../src/lib/engine/engine';
import type { Proceso } from '../../src/lib/model/proceso';

/**
 * Tests para casos edge y regresiones sutiles
 */

// Test 1: SRTN - empate de restante (no debe expropiar con ==)
export function testSRTNEmpate(): boolean {
  console.log('  Test SRTN Empate - No expropiar con restante igual');
  
  const procesos: Proceso[] = [
    { pid: 1, arribo: 0, rafagasCPU: [4], estado: 'N' },    // P1: ráfaga 4
    { pid: 2, arribo: 2, rafagasCPU: [2], estado: 'N' }     // P2: arriba cuando P1 tiene restante=2, no debe expropiar
  ];
  
  const costos = { TIP: 0, TCP: 0, TFP: 0, bloqueoES: 0 };
  const trace = runSRTN(procesos, costos);
  
  // No debe haber expropiación porque restante(P1)=2 == restante(P2)=2 en t=2
  const expropiaciones = trace.events.filter(e => e.type === 'C→L').length;
  const esperado = 0; // Sin expropiación
  
  console.log(`  Expropiaciones encontradas: ${expropiaciones} (esperado: ${esperado})`);
  console.log(`  Slices: ${trace.slices.map(s => `P${s.pid}:${s.start}-${s.end}`).join(', ')}`);
  
  if (expropiaciones === esperado) {
    console.log(' SRTN Empate: ¡PASÓ!');
    return true;
  } else {
    console.log('❌ SRTN Empate: FALLÓ');
    return false;
  }
}

// Test 2: SPN - llegada de más corto (no debe expropiar)
export function testSPNNoExpropia(): boolean {
  console.log('  Test SPN No Expropia - Llegada de ráfaga más corta');
  
  const procesos: Proceso[] = [
    { pid: 1, arribo: 0, rafagasCPU: [5], estado: 'N' },    // P1: ráfaga 5
    { pid: 2, arribo: 2, rafagasCPU: [2], estado: 'N' }     // P2: ráfaga más corta, pero SPN no expropia
  ];
  
  const costos = { TIP: 0, TCP: 0, TFP: 0, bloqueoES: 0 };
  const trace = runSPN(procesos, costos);
  
  const expropiaciones = trace.events.filter(e => e.type === 'C→L').length;
  const esperado = 0; // SPN nunca expropia
  
  console.log(`  Expropiaciones encontradas: ${expropiaciones} (esperado: ${esperado})`);
  console.log(`  Orden esperado: P1:0-5, P2:5-7`);
  console.log(`  Slices: ${trace.slices.map(s => `P${s.pid}:${s.start}-${s.end}`).join(', ')}`);
  
  if (expropiaciones === esperado && trace.slices.length === 2) {
    console.log(' SPN No Expropia: ¡PASÓ!');
    return true;
  } else {
    console.log('❌ SPN No Expropia: FALLÓ');
    return false;
  }
}

// Test 3: RR - TCP/TFP no consumen quantum
export function testRRQuantumPuro(): boolean {
  console.log('  Test RR Quantum Puro - TCP/TFP no consumen quantum');
  
  const procesos: Proceso[] = [
    { pid: 1, arribo: 0, rafagasCPU: [6], estado: 'N' }     // P1: ráfaga 6, quantum 4
  ];
  
  const costos = { TIP: 0, TCP: 1, TFP: 1, bloqueoES: 0 }; // TCP=1, TFP=1
  const trace = runRR(procesos, costos, 4); // quantum = 4
  
  // Esperado: P1 debe usar 4ms de CPU puro, luego ser desalojado
  // TCP/TFP no deben contar para el quantum
  const slice1 = trace.slices[0];
  const duracionCPU = slice1.end - slice1.start;
  
  console.log(`  Slice: P${slice1.pid}:${slice1.start}-${slice1.end} (duración CPU: ${duracionCPU})`);
  console.log(`  TCP=${costos.TCP}, TFP=${costos.TFP}, quantum=4`);
  
  if (duracionCPU === 4) { // Solo CPU pura cuenta para quantum
    console.log(' RR Quantum Puro: ¡PASÓ!');
    return true;
  } else {
    console.log('❌ RR Quantum Puro: FALLÓ');
    return false;
  }
}

// Test 4: SRTN expropiación en retorno de E/S
export function testSRTNExpropiacionES(): boolean {
  console.log('  Test SRTN Expropiación E/S - Proceso corto exprompia al que retorna');
  
  const procesos: Proceso[] = [
    { pid: 1, arribo: 0, rafagasCPU: [2, 4], estado: 'N' }, // P1: 2ms → E/S → retorna con 4ms restante
    { pid: 2, arribo: 5, rafagasCPU: [1], estado: 'N' },   // P2: llega cuando P1 retornó (t=4+bloqueoES=2=6) con 1ms
  ];
  
  const costos = { TIP: 0, TCP: 0, TFP: 0, bloqueoES: 2 }; // P1 retorna en t=4+2=6
  const trace = runSRTN(procesos, costos);
  
  // P1 ejecuta 0-2, va a E/S, retorna en t=4
  // P2 arriba en t=5, cuando P1 ya retomó CPU
  // P2 (restante=1) debe expropiar a P1 (restante=4)
  const expropiaciones = trace.events.filter(e => e.type === 'C→L' && e.pid === 1);
  
  console.log(`  Slices: ${trace.slices.map(s => `P${s.pid}:${s.start}-${s.end}`).join(', ')}`);
  console.log(`  Expropiaciones de P1: ${expropiaciones.length} (esperado: 1 en t=5)`);
  
  if (expropiaciones.length === 1 && expropiaciones[0].t === 5) {
    console.log(' SRTN Expropiación E/S: ¡PASÓ!');
    return true;
  } else {
    console.log('❌ SRTN Expropiación E/S: FALLÓ');
    return false;
  }
}

// Runner para todos los tests edge
export function runEdgeCaseTests(): void {
  console.log('🚀 Ejecutando Tests de Casos Edge\n');
  
  const tests = [
    testSRTNEmpate,
    testSPNNoExpropia, 
    testRRQuantumPuro,
    testSRTNExpropiacionES
  ];
  
  let passed = 0;
  for (const test of tests) {
    try {
      if (test()) passed++;
    } catch (error) {
      console.error(`💥 Error en test: ${error}`);
    }
    console.log(''); // Línea en blanco
  }
  
  console.log(`✨ Tests Edge Cases completados: ${passed}/${tests.length} pasaron`);
}

// Para ejecutar standalone
if (import.meta.url === `file://${process.argv[1]}`) {
  runEdgeCaseTests();
}