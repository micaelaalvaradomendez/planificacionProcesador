/**
 * Test para verificar el manejo correcto de arribos simultáneos
 * Debe aplicar tie-break estable por orden de arribo y nombre/ID
 */

import { MotorSimulacion } from '../../src/lib/core/engine';
import type { Workload } from '../../src/lib/model/types';

console.log('🧪 Test Arribos Simultáneos - Tie-break Estable');
console.log('==============================================');

// Configuración de prueba: 3 procesos que llegan al mismo tiempo
const workload: Workload = {
  processes: [
    {
      name: 'P3',
      tiempoArribo: 0,
      rafagasCPU: 1,
      duracionRafagaCPU: 5,
      duracionRafagaES: 0,
      prioridad: 1
    },
    {
      name: 'P1',
      tiempoArribo: 0,
      rafagasCPU: 1,
      duracionRafagaCPU: 3,
      duracionRafagaES: 0,
      prioridad: 1
    },
    {
      name: 'P2',
      tiempoArribo: 0,
      rafagasCPU: 1,
      duracionRafagaCPU: 4,
      duracionRafagaES: 0,
      prioridad: 1
    }
  ],
  config: {
    policy: 'FCFS',
    quantum: 4,
    tip: 1,
    tfp: 1,
    tcp: 1
  }
};

console.log('📋 Configuración:');
console.log('  Algoritmo: FCFS');
console.log('  Procesos con tiempo de arribo 0:');
workload.processes.forEach(p => {
  console.log(`    ${p.name}: arribo=${p.tiempoArribo}, rafaga=${p.duracionRafagaCPU}`);
});

console.log('\n🚀 Iniciando simulación...');

const motor = new MotorSimulacion(workload);
const resultado = motor.ejecutar();

console.log('\n📊 Resultado:');
console.log(`  Estado: ${resultado.exitoso ? '✅ Exitoso' : '❌ Error'}`);
if (!resultado.exitoso) {
  console.log(`  Error: ${resultado.error}`);
}

console.log('\n🔍 Eventos internos (primeros 10):');
resultado.eventosInternos.slice(0, 10).forEach((evento, i) => {
  console.log(`  ${i+1}. ${evento.tiempo}: ${evento.tipo} - ${evento.proceso}`);
});

console.log('\n🎯 Análisis del Orden:');
console.log('  ¿Los arribos respetan el orden esperado?');

// Verificar orden de eventos de FinTIP (que vienen después de Arribo)
const eventosFinTIP = resultado.eventosInternos.filter(e => e.tipo === 'FinTIP');
console.log('\n📝 Orden de FinTIP (después de Arribo):');
eventosFinTIP.forEach((evento, i) => {
  console.log(`  ${i+1}. ${evento.proceso} en tiempo ${evento.tiempo}`);
});

// El orden debería ser consistente con el tie-break: primero por tiempo de arribo, luego por nombre
console.log('\n✅ Orden esperado para arribos simultáneos:');
console.log('  1. P1 (nombre lexicográficamente menor)');
console.log('  2. P2 (siguiente en orden alfabético)');
console.log('  3. P3 (último en orden alfabético)');

// Verificar si el orden es correcto
const ordenReal = eventosFinTIP.map(e => e.proceso);
const ordenEsperado = ['P1', 'P2', 'P3'];
const ordenCorrecto = JSON.stringify(ordenReal) === JSON.stringify(ordenEsperado);

console.log(`\n🎯 ¿Orden correcto? ${ordenCorrecto ? '✅ SÍ' : '❌ NO'}`);
console.log(`  Real: [${ordenReal.join(', ')}]`);
console.log(`  Esperado: [${ordenEsperado.join(', ')}]`);

if (!ordenCorrecto) {
  console.log('\n⚠️  PROBLEMA: Los arribos simultáneos no respetan el tie-break estable');
  console.log('   Necesita implementar tie-break por nombre/ID del proceso');
} else {
  console.log('\n🎉 CORRECTO: El tie-break está funcionando apropiadamente');
}
