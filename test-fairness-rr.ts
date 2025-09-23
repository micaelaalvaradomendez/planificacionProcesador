/**
 * Test que demuestra el problema de fairness en Round Robin
 * cuando se usa comparador por arribo en lugar de cola FIFO real
 */

import { AdaptadorSimuladorDominio } from './src/lib/core/adaptadorSimuladorDominio';
import type { Workload } from './src/lib/domain/types';

console.log('🧪 Demostrando problema de fairness en Round Robin...');

// Escenario que expone el problema:
// P1 llega primero, ejecuta, es expropiado
// P2 llega después, va a cola READY
// Con comparador por arribo: P1 ejecuta antes que P2 (injusto)
// Con FIFO real: P2 debería ejecutar antes que P1 (justo)

const workload: Workload = {
  processes: [
    // P1: Llega primero, será expropiado
    { id: 'P1', arribo: 0, rafagasCPU: 1, duracionCPU: 10, duracionIO: 0, prioridad: 50 },
    
    // P2: Llega durante la ejecución de P1
    { id: 'P2', arribo: 2, rafagasCPU: 1, duracionCPU: 5, duracionIO: 0, prioridad: 50 },
    
    // P3: Llega también durante la ejecución de P1  
    { id: 'P3', arribo: 3, rafagasCPU: 1, duracionCPU: 3, duracionIO: 0, prioridad: 50 }
  ],
  config: {
    policy: 'RR',
    tip: 0,
    tfp: 0,
    tcp: 0,
    quantum: 4  // P1 será expropiado en tiempo 4
  }
};

console.log('\n📋 Configuración del test Round Robin:');
console.log('  P1: arribo=0, duracionCPU=10 (será expropiado en t=4)');
console.log('  P2: arribo=2, duracionCPU=5 (llega mientras P1 ejecuta)');
console.log('  P3: arribo=3, duracionCPU=3 (llega mientras P1 ejecuta)');
console.log('  Quantum=4 → P1 ejecuta t=0-4, luego es expropiado');

console.log('\n🎯 Comportamiento esperado con FIFO real:');
console.log('  t=0-4: P1 ejecuta (primer quantum)');
console.log('  t=4: P1 expropiado, va al FINAL de cola READY: [P2, P3, P1]');
console.log('  t=4-8: P2 ejecuta (llegó a READY antes que P1)');
console.log('  t=8-11: P3 ejecuta (llegó a READY antes que P1)');
console.log('  t=11-15: P1 continúa (su turno después de esperar)');

console.log('\n❌ Comportamiento incorrecto con comparador por arribo:');
console.log('  P1 siempre ordenaría antes que P2 y P3 (arribo=0 < 2 < 3)');
console.log('  Esto rompe el fairness de Round Robin');

const adaptador = new AdaptadorSimuladorDominio(workload);
const resultado = adaptador.ejecutar();

console.log('\n📊 Resultados de la simulación:');

// Analizar los despachos para ver el orden
const eventos = resultado.eventosInternos;
const despachos = eventos.filter(e => e.tipo === 'Despacho').slice(0, 4); // Primeros 4 despachos

console.log('\n🔄 Orden de despachos observado:');
despachos.forEach((evento, i) => {
  console.log(`  ${i + 1}. ${evento.proceso} en tiempo ${evento.tiempo}`);
});

// Verificar si hay fairness
const ordenObservado = despachos.map(e => e.proceso);

// Con fairness correcto: P1, P2, P3, P1 (P1 va al final tras expropiación)
// Con problema por arribo: P1, P1, P2, P3 (P1 siempre primero)

console.log('\n🧪 Análisis de fairness:');

if (ordenObservado.length >= 3) {
  const segundoDespacho = ordenObservado[1];
  const tercerDespacho = ordenObservado[2];
  
  console.log(`  Segundo despacho: ${segundoDespacho}`);
  console.log(`  Tercer despacho: ${tercerDespacho}`);
  
  if (segundoDespacho === 'P2') {
    console.log('  ✅ POSIBLE: P2 ejecutó después de expropiación de P1');
    console.log('  ✅ Esto sugiere que hay algún nivel de fairness');
  } else if (segundoDespacho === 'P1') {
    console.log('  ❌ PROBLEMA: P1 siguió ejecutando sin respetar FIFO');
    console.log('  ❌ Comparador por arribo está rompiendo fairness');
  }
  
  // Verificar si P1 vuelve al final de la cola
  const indicePrimerP1 = ordenObservado.indexOf('P1');
  const indiceSegundoP1 = ordenObservado.indexOf('P1', indicePrimerP1 + 1);
  
  if (indiceSegundoP1 > -1) {
    const procesoEntreP1s = ordenObservado.slice(indicePrimerP1 + 1, indiceSegundoP1);
    console.log(`  Procesos entre primer y segundo P1: ${procesoEntreP1s.join(', ')}`);
    
    if (procesoEntreP1s.length >= 2) {
      console.log('  ✅ P1 fue al final de la cola tras expropiación');
    } else {
      console.log('  ❌ P1 no respetó orden FIFO de cola READY');
    }
  }
} else {
  console.log('  ⚠️  No hay suficientes despachos para analizar');
}

console.log('\n💡 Solución requerida:');
console.log('  - Reemplazar comparador RR por cola FIFO real (ColaProcesos)');
console.log('  - Tras expropiación, empujar al FINAL de la cola');
console.log('  - Despachar siempre desde el FRENTE de la cola');
console.log('  - Orden por llegada a READY, NO por arribo al sistema');

console.log('\n🔚 Test completado - problema de fairness demostrado');