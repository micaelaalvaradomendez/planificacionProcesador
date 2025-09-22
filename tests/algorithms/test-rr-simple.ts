#!/usr/bin/env npx tsx

/**
 * Test simplificado para Round Robin - API del dominio
 */

import { AdaptadorSimuladorDominio } from '../../src/lib/core/adaptadorSimuladorDominio.js';
import type { Workload } from '../../src/lib/domain/types.js';

console.log('🧪 TEST: Algoritmo RR (Round Robin)');
console.log('==================================');

// Función helper para ejecutar test
function ejecutarTest(nombre: string, workload: Workload) {
  console.log(`\n📋 ${nombre}`);
  const adaptador = new AdaptadorSimuladorDominio(workload);
  const resultado = adaptador.ejecutar();
  
  if (!resultado.exitoso) {
    throw new Error(`Test falló: ${resultado.error}`);
  }
  return resultado;
}

// Test 1: Expropiación por quantum
const testRRBasico: Workload = {
  processes: [
    { id: 'P1', arribo: 0, rafagasCPU: 1, duracionCPU: 5, duracionIO: 0, prioridad: 1 },
    { id: 'P2', arribo: 1, rafagasCPU: 1, duracionCPU: 4, duracionIO: 0, prioridad: 1 }
  ],
  config: { policy: 'RR', tip: 0, tfp: 0, tcp: 0, quantum: 2 }
};

const resultado1 = ejecutarTest('RR con Quantum = 2', testRRBasico);

// Verificaciones
const despachos1 = resultado1.eventosInternos.filter(e => e.tipo === 'Despacho');
const expiraciones1 = resultado1.eventosInternos.filter(e => e.tipo === 'AgotamientoQuantum');

console.log(`  Despachos: ${despachos1.length}, Expiraciones: ${expiraciones1.length}`);
console.log(`  Orden de despachos: ${despachos1.map(e => e.proceso).join(' → ')}`);

const hayExpiracion = expiraciones1.length > 0;
const ejecucionRR = despachos1.length >= 3; // Al menos P1, P2, P1 de nuevo

console.log(`  ✅ Expropiación por quantum: ${hayExpiracion ? 'SÍ' : 'NO'}`);
console.log(`  ✅ Rotación RR detectada: ${ejecucionRR ? 'SÍ' : 'NO'}`);

// Test 2: Un solo proceso (no hay a quién expropiar)
const testRRSolo: Workload = {
  processes: [
    { id: 'Solo', arribo: 0, rafagasCPU: 1, duracionCPU: 6, duracionIO: 0, prioridad: 1 }
  ],
  config: { policy: 'RR', tip: 0, tfp: 0, tcp: 0, quantum: 2 }
};

const resultado2 = ejecutarTest('RR Proceso Único', testRRSolo);

const despachos2 = resultado2.eventosInternos.filter(e => e.tipo === 'Despacho');
const expiraciones2 = resultado2.eventosInternos.filter(e => e.tipo === 'AgotamientoQuantum');

console.log(`  Despachos únicos: ${despachos2.length}`);
console.log(`  Expiraciones: ${expiraciones2.length} (esperado: 2, en t=2 y t=4)`);

const expiranEnTiemposCorrectos = expiraciones2.length === 2 && 
  expiraciones2[0].tiempo === 2 && expiraciones2[1].tiempo === 4;

console.log(`  ✅ Expiraciones cada quantum: ${expiranEnTiemposCorrectos ? 'CORRECTO' : 'INCORRECTO'}`);

// Test 3: Multi-ráfaga con quantum
const testRRMulti: Workload = {
  processes: [
    { id: 'M1', arribo: 0, rafagasCPU: 2, duracionCPU: 4, duracionIO: 1, prioridad: 1 },
    { id: 'M2', arribo: 1, rafagasCPU: 1, duracionCPU: 2, duracionIO: 0, prioridad: 1 }
  ],
  config: { policy: 'RR', tip: 0, tfp: 0, tcp: 0, quantum: 3 }
};

const resultado3 = ejecutarTest('RR Multi-ráfaga', testRRMulti);

const despachos3 = resultado3.eventosInternos.filter(e => e.tipo === 'Despacho');
const finES3 = resultado3.eventosInternos.filter(e => e.tipo === 'FinES');
const rafagasCPU3 = resultado3.eventosInternos.filter(e => e.tipo === 'FinRafagaCPU');

console.log(`  M1 ráfagas CPU: ${rafagasCPU3.filter(e => e.proceso === 'M1').length} (esperado: 2)`);
console.log(`  M2 ráfagas CPU: ${rafagasCPU3.filter(e => e.proceso === 'M2').length} (esperado: 1)`);
console.log(`  Operaciones I/O: ${finES3.length} (esperado: 1)`);

const multirafagaCorrecta = rafagasCPU3.filter(e => e.proceso === 'M1').length === 2 &&
  rafagasCPU3.filter(e => e.proceso === 'M2').length === 1 && finES3.length === 1;

console.log(`  ✅ Multi-ráfaga con RR: ${multirafagaCorrecta ? 'CORRECTO' : 'INCORRECTO'}`);

console.log('\n🎯 TEST RR COMPLETADO');
console.log('====================');