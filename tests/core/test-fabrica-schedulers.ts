/**
 * Test específico para validar la fábrica de schedulers y el wiring en el motor
 * Verifica que todas las políticas se crean e implementan correctamente
 */

import { MotorSimulacion } from '../../src/lib/core/engine.js';
import { FabricaScheduler, validarConfiguracionScheduling } from '../../src/lib/core/scheduler.js';
import type { Workload, Policy } from '../../src/lib/model/types.js';
import type { ProcesoRT } from '../../src/lib/core/state.js';

// Test de la fábrica de schedulers
function testFabricaSchedulers() {
  console.log('\n🧪 Test Fábrica de Schedulers');
  
  const politicas: Policy[] = ['FCFS', 'PRIORITY', 'RR', 'SPN', 'SRTN'];
  let todosExitosos = true;

  for (const policy of politicas) {
    try {
      let scheduler;
      if (policy === 'RR') {
        scheduler = FabricaScheduler.crear(policy, 3);
        const procesoTest: ProcesoRT = { 
          name: 'test', 
          tiempoArribo: 0,
          rafagasCPU: 1, 
          duracionRafagaCPU: 5, 
          duracionRafagaES: 0,
          prioridad: 1,
          estado: 'Nuevo',
          rafagasRestantes: 1,
          restanteEnRafaga: 5,
          tiempoListoAcumulado: 0,
          tipCumplido: false
        };
        console.log(`✅ ${policy}: Creado correctamente (con quantum=${scheduler.calcularQuantum(procesoTest)})`);
      } else {
        scheduler = FabricaScheduler.crear(policy);
        console.log(`✅ ${policy}: Creado correctamente (${scheduler.esExpropiativo ? 'expropiativo' : 'no expropiativo'})`);
      }
    } catch (error) {
      console.log(`❌ ${policy}: Error - ${error}`);
      todosExitosos = false;
    }
  }

  // Test de validación
  console.log('\n🔍 Test de validación:');
  
  const validaciones = [
    { policy: 'RR' as Policy, quantum: 3, esperado: true },
    { policy: 'RR' as Policy, quantum: 0, esperado: false },
    { policy: 'FCFS' as Policy, quantum: undefined, esperado: true },
    { policy: 'PRIORITY' as Policy, quantum: undefined, esperado: true }
  ];

  for (const { policy, quantum, esperado } of validaciones) {
    const resultado = validarConfiguracionScheduling(policy, quantum);
    const exito = resultado.valida === esperado;
    console.log(`${exito ? '✅' : '❌'} ${policy} quantum=${quantum}: ${resultado.valida ? 'Válido' : resultado.error}`);
    if (!exito) todosExitosos = false;
  }

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
        duracionRafagaES: 1,
        prioridad: 1
      },
      {
        name: 'P2',
        tiempoArribo: 2,
        rafagasCPU: 1,
        duracionRafagaCPU: 3,
        duracionRafagaES: 1,
        prioridad: 3
      }
    ]
  };

  const politicas: Array<{policy: Policy, quantum?: number}> = [
    { policy: 'FCFS' },
    { policy: 'PRIORITY' },
    { policy: 'RR', quantum: 2 },
    { policy: 'SPN' },
    { policy: 'SRTN' }
  ];

  let todosExitosos = true;

  for (const { policy, quantum } of politicas) {
    try {
      const workload = { 
        ...workloadBase, 
        config: { ...workloadBase.config, policy, quantum } 
      };
      
      const motor = new MotorSimulacion(workload);
      const resultado = motor.ejecutar();
      
      if (resultado.exitoso) {
        console.log(`✅ ${policy}: Simulación exitosa (${resultado.eventosInternos.length} eventos)`);
      } else {
        console.log(`❌ ${policy}: Simulación falló - ${resultado.error}`);
        todosExitosos = false;
      }
    } catch (error) {
      console.log(`❌ ${policy}: Error en motor - ${error}`);
      todosExitosos = false;
    }
  }

  return todosExitosos;
}

// Test específico de selección de procesos
function testSeleccionProcesos() {
  console.log('\n🧪 Test Selección de Procesos por Política');
  
  // Test específico para Priority
  const workloadPriority: Workload = {
    config: {
      policy: 'PRIORITY',
      tip: 0,
      tfp: 0,
      tcp: 0
    },
    processes: [
      { name: 'Baja', tiempoArribo: 0, rafagasCPU: 1, duracionRafagaCPU: 5, duracionRafagaES: 0, prioridad: 1 },
      { name: 'Alta', tiempoArribo: 1, rafagasCPU: 1, duracionRafagaCPU: 3, duracionRafagaES: 0, prioridad: 5 },
      { name: 'Media', tiempoArribo: 1, rafagasCPU: 1, duracionRafagaCPU: 2, duracionRafagaES: 0, prioridad: 3 }
    ]
  };

  const motor = new MotorSimulacion(workloadPriority);
  const resultado = motor.ejecutar();

  // Verificar que el proceso de alta prioridad expropió
  const hayExpropiacion = resultado.eventosExportacion.some(e => e.tipo === 'EXPROPIACION');
  
  if (hayExpropiacion) {
    console.log('✅ Priority: Expropiación detectada correctamente');
    return true;
  } else {
    console.log('❌ Priority: No se detectó expropiación esperada');
    return false;
  }
}

// Test de información de políticas disponibles
function testInformacionPoliticas() {
  console.log('\n🧪 Test Información de Políticas');
  
  const politicas = FabricaScheduler.obtenerPoliticasDisponibles();
  
  console.log(`📋 Políticas disponibles: ${politicas.length}`);
  for (const info of politicas) {
    console.log(`   • ${info.policy}: ${info.nombre} (${info.esExpropiativo ? 'expropiativo' : 'no expropiativo'}${info.requiereQuantum ? ', requiere quantum' : ''})`);
  }
  
  // Verificar que tenemos las 5 políticas esperadas
  const esperadas = ['FCFS', 'PRIORITY', 'RR', 'SPN', 'SRTN'];
  const disponibles = politicas.map(p => p.policy);
  
  const todasPresentes = esperadas.every(p => disponibles.includes(p as Policy));
  
  if (todasPresentes) {
    console.log('✅ Todas las políticas esperadas están disponibles');
    return true;
  } else {
    console.log('❌ Faltan políticas esperadas');
    return false;
  }
}

// Ejecutar todos los tests
console.log('🚀 Iniciando tests de Fábrica de Schedulers y Wiring...');

const test1 = testFabricaSchedulers();
const test2 = testIntegracionMotorScheduler();
const test3 = testSeleccionProcesos();
const test4 = testInformacionPoliticas();

console.log('\n📋 Resumen:');
console.log(`Fábrica de Schedulers: ${test1 ? '✅' : '❌'}`);
console.log(`Integración Motor + Scheduler: ${test2 ? '✅' : '❌'}`);
console.log(`Selección de Procesos: ${test3 ? '✅' : '❌'}`);
console.log(`Información de Políticas: ${test4 ? '✅' : '❌'}`);

if (test1 && test2 && test3 && test4) {
  console.log('\n🎉 ¡Todos los tests de fábrica y wiring pasaron!');
} else {
  console.log('\n❌ Algunos tests de fábrica y wiring fallaron');
}
