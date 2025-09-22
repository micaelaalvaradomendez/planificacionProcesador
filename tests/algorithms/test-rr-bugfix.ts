#!/usr/bin/env npx tsx

/**
 * Test MÍNIMO para verificar bug RR corregido
 */

import { AdaptadorSimuladorDominio } from '../../src/lib/core/adaptadorSimuladorDominio.js';
import type { Workload } from '../../src/lib/domain/types.js';

console.log('🧪 TEST: RR Bug Fix');
console.log('==================');

// Test simple: un proceso que requiere 3 unidades con quantum 2
const testRRSimple: Workload = {
  processes: [
    { id: 'P1', arribo: 0, rafagasCPU: 1, duracionCPU: 3, duracionIO: 0, prioridad: 1 }
  ],
  config: { policy: 'RR', tip: 0, tfp: 0, tcp: 0, quantum: 2 }
};

console.log('\n📋 Test: Un proceso, quantum 2, CPU 3 unidades');
const adaptador = new AdaptadorSimuladorDominio(testRRSimple);
const resultado = adaptador.ejecutar();

if (!resultado.exitoso) {
  console.log(`❌ Error: ${resultado.error}`);
} else {
  console.log(`✅ Simulación exitosa, tiempo final: ${resultado.estadoFinal.tiempoActual}`);
  
  const despachos = resultado.eventosInternos.filter(e => e.tipo === 'Despacho');
  const expiraciones = resultado.eventosInternos.filter(e => e.tipo === 'AgotamientoQuantum');
  const rafagas = resultado.eventosInternos.filter(e => e.tipo === 'FinRafagaCPU');
  
  console.log(`  Despachos: ${despachos.length} (esperado: 2)`);
  console.log(`  Expiraciones: ${expiraciones.length} (esperado: 1)`);
  console.log(`  Fin ráfagas: ${rafagas.length} (esperado: 1)`);
  
  // El proceso debe ser expropiado una vez y luego completar
  const funcionaCorrectamente = despachos.length === 2 && expiraciones.length === 1 && rafagas.length === 1;
  console.log(`  ✅ RR funciona: ${funcionaCorrectamente ? 'SÍ' : 'NO'}`);
}

console.log('\n🎯 TEST COMPLETADO');