/**
 * Test específico para validar la fábrica de schedulers y el wiring en el motor
 * Verifica que todas las políticas se crean e implementan correctamente
 */

import { MotorSimulacion } from '../../src/lib/core/engine.js';
import { FabricaSchedulerDominio } from '../../src/lib/core/fabricaSchedulerDominio.js';
import type { Workload, Policy } from '../../src/lib/domain/types.js';
import type { ProcesoRT } from '../../src/lib/core/state.js';

// Test de creación de schedulers
function testCreacionSchedulers() {
  console.log('🧪 Test Creación de Schedulers');
  
  const politicas: Policy[] = ['FCFS', 'PRIORITY', 'RR', 'SPN', 'SRTN'];
  let todosExitosos = true;

  for (const policy of politicas) {
    try {
      let scheduler;
      if (policy === 'RR') {
        scheduler = FabricaSchedulerDominio.crear(policy, 3);
        console.log(`✅ ${policy}: Creado correctamente (con quantum=${scheduler.calcularQuantum()})`);
      } else {
        scheduler = FabricaSchedulerDominio.crear(policy);
        console.log(`✅ ${policy}: Creado correctamente (${scheduler.esExpropiativo ? 'expropiativo' : 'no expropiativo'})`);
      }
    } catch (error) {
      console.log(`❌ ${policy}: Error en creación - ${error}`);
      todosExitosos = false;
    }
  }

  console.log('✅ Validaciones de configuración saltadas (función no disponible en nueva implementación)');
  
  return todosExitosos;
}

// Test de integración: motor + scheduler por cada política
function testIntegracionMotorScheduler() {
  console.log('\n🧪 Test Integración Motor + Scheduler');
  
  const workloadBase: Workload = {
    config: {
      policy: 'FCFS', // será sobrescrito
      tip: 1,
      tfp: 1,
      tcp: 1
    },
    processes: [
      {
        name: 'P1',
        tiempoArribo: 0,
        rafagasCPU: 1,
        duracionRafagaCPU: 5,
        duracionRafagaES: 0,
        prioridad: 1
      }
    ]
  };

  const politicas: Policy[] = ['FCFS', 'PRIORITY', 'SPN', 'SRTN'];
  let todosExitosos = true;

  for (const policy of politicas) {
    try {
      const workload = { ...workloadBase, config: { ...workloadBase.config, policy } };
      const motor = new MotorSimulacion(workload);
      const resultado = motor.ejecutar();
      
      console.log(`✅ ${policy}: Simulación exitosa, eventos=${resultado.eventosInternos.length}`);
    } catch (error) {
      console.log(`❌ ${policy}: Error en simulación - ${error}`);
      todosExitosos = false;
    }
  }

  // Test especial para RR con quantum
  try {
    const workloadRR = { ...workloadBase, config: { ...workloadBase.config, policy: 'RR' as Policy, quantum: 3 } };
    const motor = new MotorSimulacion(workloadRR);
    const resultado = motor.ejecutar();
    console.log(`✅ RR: Simulación exitosa, eventos=${resultado.eventosInternos.length}`);
  } catch (error) {
    console.log(`❌ RR: Error en simulación - ${error}`);
    todosExitosos = false;
  }

  return todosExitosos;
}

// Test simplificado para políticas disponibles
function testPoliticasDisponibles() {
  console.log('\n🧪 Test Políticas Disponibles');
  
  // Test manual de políticas conocidas
  const politicasConocidas: Policy[] = ['FCFS', 'PRIORITY', 'RR', 'SPN', 'SRTN'];
  let todosExitosos = true;

  for (const policy of politicasConocidas) {
    try {
      if (policy === 'RR') {
        FabricaSchedulerDominio.crear(policy, 3);
      } else {
        FabricaSchedulerDominio.crear(policy);
      }
      console.log(`✅ ${policy}: Disponible`);
    } catch (error) {
      console.log(`❌ ${policy}: No disponible - ${error}`);
      todosExitosos = false;
    }
  }

  return todosExitosos;
}

// Función principal
export function testFabricaSchedulers() {
  console.log('🚀 Iniciando tests de fábrica de schedulers...\n');

  const test1 = testCreacionSchedulers();
  const test2 = testIntegracionMotorScheduler();
  const test3 = testPoliticasDisponibles();

  const todosExitosos = test1 && test2 && test3;

  console.log(`\n${todosExitosos ? '🎉' : '❌'} Tests fábrica schedulers: ${todosExitosos ? 'EXITOSOS' : 'FALLOS DETECTADOS'}`);
  return todosExitosos;
}

// Ejecutar directamente
testFabricaSchedulers();
