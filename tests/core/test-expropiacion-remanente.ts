/**
 * Test específico para validar expropiación con guardado de remanente de ráfaga
 * Verifica que Priority y SRTN guardan correctamente el tiempo restante cuando expropian
 */

import { MotorSimulacion } from '../../src/lib/core/engine.js';
import type { Workload } from '../../src/lib/model/types.js';

// Test para Priority: proceso con mayor prioridad expropia en medio de ráfaga
function testPriorityExpropiacionRemanente() {
  console.log('\n🧪 Test Priority - Expropiación con remanente de ráfaga');
  
  const workload: Workload = {
    config: {
      policy: 'PRIORITY',
      tip: 1,
      tfp: 1,
      tcp: 1
    },
    processes: [
      {
        name: 'P1',
        tiempoArribo: 0,
        rafagasCPU: 1,
        duracionRafagaCPU: 10,   // ráfaga larga
        duracionRafagaES: 1,
        prioridad: 1             // prioridad baja
      },
      {
        name: 'P2',
        tiempoArribo: 3,         // llega en t=3, cuando P1 lleva 2 unidades ejecutando
        rafagasCPU: 1,
        duracionRafagaCPU: 5,
        duracionRafagaES: 1,
        prioridad: 5             // prioridad alta - debe expropiar
      }
    ]
  };

  const motor = new MotorSimulacion(workload);
  const resultado = motor.ejecutar();

  console.log('\n📊 Eventos internos:');
  resultado.eventosInternos.forEach(e => {
    console.log(`t=${e.tiempo}: ${e.tipo} ${e.proceso || ''} ${e.extra || ''}`);
  });

  // Validaciones específicas
  const procesoP1 = resultado.estadoFinal.procesos.get('P1');
  const procesoP2 = resultado.estadoFinal.procesos.get('P2');

  console.log('\n🔍 Validaciones:');
  
  // Verificar los logs internos para confirmar que la expropiación funcionó
  const logExpropiacion = resultado.eventosInternos.find(e => 
    e.extra?.includes('ejecutó 3, le restan 7'));
  const logReinicio = resultado.eventosInternos.find(e => 
    e.extra?.includes('restanteEnRafaga=7'));
    
  console.log(`✅ Log expropiación encontrado: ${logExpropiacion ? 'SÍ' : 'NO'}`);
  console.log(`✅ Log reinicio con remanente correcto: ${logReinicio ? 'SÍ' : 'NO'}`);

  if (logExpropiacion && logReinicio) {
    console.log('✅ P1 - Remanente de ráfaga guardado y restaurado correctamente');
    return true;
  } else {
    console.log('❌ P1 - Remanente de ráfaga incorrecto');
    return false;
  }
}

// Test para SRTN: proceso con menor tiempo restante expropia en medio de ráfaga
function testSRTNExpropiacionRemanente() {
  console.log('\n🧪 Test SRTN - Expropiación con remanente de ráfaga');
  
  const workload: Workload = {
    config: {
      policy: 'SRTN',
      tip: 1,
      tfp: 1,
      tcp: 1
    },
    processes: [
      {
        name: 'P1',
        tiempoArribo: 0,
        rafagasCPU: 1,
        duracionRafagaCPU: 15,   // ráfaga larga
        duracionRafagaES: 1,
        prioridad: 1
      },
      {
        name: 'P2',
        tiempoArribo: 5,         // llega en t=5, cuando P1 lleva 3 unidades ejecutando
        rafagasCPU: 1,
        duracionRafagaCPU: 4,    // ráfaga corta - debe expropiar
        duracionRafagaES: 1,
        prioridad: 1
      }
    ]
  };

  const motor = new MotorSimulacion(workload);
  const resultado = motor.ejecutar();

  console.log('\n📊 Eventos internos:');
  resultado.eventosInternos.forEach(e => {
    console.log(`t=${e.tiempo}: ${e.tipo} ${e.proceso || ''} ${e.extra || ''}`);
  });

  // Validaciones específicas
  const procesoP1 = resultado.estadoFinal.procesos.get('P1');
  const procesoP2 = resultado.estadoFinal.procesos.get('P2');

  console.log('\n🔍 Validaciones:');
  
  // Verificar los logs internos para confirmar que la expropiación funcionó
  const logExpropiacion = resultado.eventosInternos.find(e => 
    e.extra?.includes('ejecutó 5, le restan 10'));
  const logReinicio = resultado.eventosInternos.find(e => 
    e.extra?.includes('restanteEnRafaga=10'));
    
  console.log(`✅ Log expropiación encontrado: ${logExpropiacion ? 'SÍ' : 'NO'}`);
  console.log(`✅ Log reinicio con remanente correcto: ${logReinicio ? 'SÍ' : 'NO'}`);

  if (logExpropiacion && logReinicio) {
    console.log('✅ P1 - Remanente de ráfaga guardado y restaurado correctamente');
    return true;
  } else {
    console.log('❌ P1 - Remanente de ráfaga incorrecto');
    return false;
  }
}

// Test para RR: agotamiento de quantum con remanente de ráfaga
function testRRQuantumRemanente() {
  console.log('\n🧪 Test RR - Agotamiento de quantum con remanente de ráfaga');
  
  const workload: Workload = {
    config: {
      policy: 'RR',
      quantum: 3,
      tip: 1,
      tfp: 1,
      tcp: 1
    },
    processes: [
      {
        name: 'P1',
        tiempoArribo: 0,
        rafagasCPU: 1,
        duracionRafagaCPU: 10,   // ráfaga más larga que quantum
        duracionRafagaES: 1,
        prioridad: 1
      }
    ]
  };

  const motor = new MotorSimulacion(workload);
  const resultado = motor.ejecutar();

  console.log('\n📊 Eventos internos:');
  resultado.eventosInternos.forEach(e => {
    console.log(`t=${e.tiempo}: ${e.tipo} ${e.proceso || ''} ${e.extra || ''}`);
  });

  // Validaciones específicas
  const procesoP1 = resultado.estadoFinal.procesos.get('P1');

  console.log('\n🔍 Validaciones:');
  
  // Verificar los logs internos para confirmar que el quantum funcionó
  const logQuantum1 = resultado.eventosInternos.find(e => 
    e.extra?.includes('ejecutó 3, le restan 7'));
  const logQuantum2 = resultado.eventosInternos.find(e => 
    e.extra?.includes('ejecutó 3, le restan 4'));
  const logQuantum3 = resultado.eventosInternos.find(e => 
    e.extra?.includes('ejecutó 3, le restan 1'));
    
  console.log(`✅ Quantum 1 funcionó: ${logQuantum1 ? 'SÍ' : 'NO'}`);
  console.log(`✅ Quantum 2 funcionó: ${logQuantum2 ? 'SÍ' : 'NO'}`);
  console.log(`✅ Quantum 3 funcionó: ${logQuantum3 ? 'SÍ' : 'NO'}`);

  if (logQuantum1 && logQuantum2 && logQuantum3) {
    console.log('✅ RR - Quantum con remanente funcionando correctamente');
    return true;
  } else {
    console.log('❌ RR - Quantum con remanente incorrecto');
    return false;
  }
}

// Ejecutar tests
console.log('🚀 Iniciando tests de expropiación con remanente de ráfaga...');

const test1 = testPriorityExpropiacionRemanente();
const test2 = testSRTNExpropiacionRemanente();
const test3 = testRRQuantumRemanente();

console.log('\n📋 Resumen:');
console.log(`Priority expropiación: ${test1 ? '✅' : '❌'}`);
console.log(`SRTN expropiación: ${test2 ? '✅' : '❌'}`);
console.log(`RR quantum: ${test3 ? '✅' : '❌'}`);

if (test1 && test2 && test3) {
  console.log('\n🎉 Todos los tests de expropiación pasaron!');
} else {
  console.log('\n❌ Algunos tests de expropiación fallaron');
}
