#!/usr/bin/env npx tsx

/**
 *     TEST DEL MOTOR MEJORADO
 * ==========================
 * 
 * Valida que el motor mejorado implementa correctamente
 * las reglas del diagrama estadomejorado.puml
 */

import { AdaptadorMotorMejorado } from '../../src/lib/core/adaptadorMotorMejorado';
import type { Workload } from '../../src/lib/domain/types';

console.log('    TEST: MOTOR SIMULACIÓN MEJORADO');
console.log('==================================');

let testsPasados = 0;
let testsTotal = 0;

function validarTest(nombre: string, condicion: boolean, detalle?: string): void {
  testsTotal++;
  if (condicion) {
    console.log(`  ${nombre}`);
    testsPasados++;
  } else {
    console.log(`   ${nombre}${detalle ? ` - ${detalle}` : ''}`);
  }
}

// Test básico de funcionalidad
async function testBasico() {
  console.log('\n📋 Test Básico de Funcionalidad');
  console.log('────────────────────────────────');

  const workload: Workload = {
    workloadName: 'Test Básico',
    processes: [
      { id: 'P1', arribo: 0, rafagasCPU: 1, duracionCPU: 5, duracionIO: 0, prioridad: 1 },
      { id: 'P2', arribo: 2, rafagasCPU: 1, duracionCPU: 3, duracionIO: 0, prioridad: 2 }
    ],
    config: {
      policy: 'FCFS',
      tip: 1,
      tfp: 1,
      tcp: 1
    }
  };

  try {
    const motor = new AdaptadorMotorMejorado(workload);
    const resultado = motor.ejecutar();
    
    console.log(`   🔍 Debug: exitoso=${resultado.exitoso}, error="${resultado.error}"`);
    console.log(`   🔍 Eventos: ${resultado.eventosInternos.length}`);
    
    validarTest('Motor ejecuta sin errores', resultado.exitoso, resultado.error);
    validarTest('Se generan eventos', resultado.eventosInternos.length > 0);
    validarTest('Estado final válido', !!resultado.estadoFinal);
    
    if (resultado.estadisticasMotor) {
      const stats = resultado.estadisticasMotor;
      validarTest('Tiempo total > 0', stats.tiempoTotal > 0);
      validarTest('Tiempo SO incluye TIP/TCP/TFP', stats.tiempoSO >= 4); // TIP(2) + TCP(2) + TFP(2) mínimo
      validarTest('Tiempo usuario > 0', stats.tiempoUsuario > 0);
      
      console.log(`   📊 Estadísticas: Total=${stats.tiempoTotal}, SO=${stats.tiempoSO}, Usuario=${stats.tiempoUsuario}`);
    }
    
  } catch (error) {
    console.log(`   🔍 Excepción capturada: ${error}`);
    validarTest('Motor funciona sin excepción', false, error instanceof Error ? error.message : 'Error desconocido');
  }
}

// Test orden de eventos simultáneos 
async function testOrdenEventos() {
  console.log('\n🔢 Test Orden de Eventos Simultáneos');
  console.log('─────────────────────────────────────');

  const workload: Workload = {
    workloadName: 'Test Orden Eventos',
    processes: [
      { id: 'P1', arribo: 0, rafagasCPU: 2, duracionCPU: 2, duracionIO: 1, prioridad: 1 },
      { id: 'P2', arribo: 0, rafagasCPU: 1, duracionCPU: 1, duracionIO: 0, prioridad: 2 }
    ],
    config: {
      policy: 'FCFS',
      tip: 0,
      tfp: 0,
      tcp: 0
    }
  };

  try {
    const motor = new AdaptadorMotorMejorado(workload);
    const resultado = motor.ejecutar();
    
    if (resultado.exitoso) {
      const eventos = resultado.eventosInternos;
      
      // Buscar eventos en tiempo 0 (llegadas simultáneas)
      const eventosT0 = eventos.filter(e => e.tiempo === 0);
      validarTest('Hay eventos simultáneos en t=0', eventosT0.length > 1);
      
      // Verificar que las llegadas están primero que los dispatches
      let llegadasAntes = true;
      let ultimaLlegada = -1;
      let primerDispatch = Infinity;
      
      for (let i = 0; i < eventos.length; i++) {
        if (eventos[i].tipo === 'Llegada') {
          ultimaLlegada = i;
        }
        if (eventos[i].tipo === 'Despacho' && primerDispatch === Infinity) {
          primerDispatch = i;
        }
      }
      
      if (ultimaLlegada >= 0 && primerDispatch < Infinity) {
        llegadasAntes = ultimaLlegada < primerDispatch;
      }
      
      validarTest('Llegadas antes que dispatches', llegadasAntes);
      
      console.log(`   📋 Eventos: ${eventos.length} total, ${eventosT0.length} simultáneos en t=0`);
    }
    
  } catch (error) {
    validarTest('Test orden eventos sin error', false, error instanceof Error ? error.message : 'Error');
  }
}

// Test reglas TCP
async function testReglasTC() {
  console.log('\n⚡ Test Reglas TCP');
  console.log('──────────────────');

  const workload: Workload = {
    workloadName: 'Test TCP',
    processes: [
      { id: 'P1', arribo: 0, rafagasCPU: 1, duracionCPU: 1, duracionIO: 0, prioridad: 1 }
    ],
    config: {
      policy: 'FCFS',
      tip: 1,
      tfp: 1,
      tcp: 2 // TCP notable para validar
    }
  };

  try {
    const motor = new AdaptadorMotorMejorado(workload);
    const resultado = motor.ejecutar();
    
    if (resultado.exitoso && resultado.estadisticasMotor) {
      const stats = resultado.estadisticasMotor;
      
      // TCP debe cobrarse: una vez en dispatch
      const tcpEsperado = 2; // Un dispatch
      validarTest('TCP se cobra correctamente', stats.tiempoSO >= tcpEsperado, 
                 `SO=${stats.tiempoSO}, esperado>=${tcpEsperado}`);
      
      console.log(`   ⚡ TCP: SO total=${stats.tiempoSO} (incluye TIP=${workload.config.tip}, TCP=${workload.config.tcp}, TFP=${workload.config.tfp})`);
    }
    
  } catch (error) {
    validarTest('Test TCP sin error', false, error instanceof Error ? error.message : 'Error');
  }
}

// Test Round Robin
async function testRoundRobin() {
  console.log('\n    Test Round Robin');
  console.log('───────────────────');

  const workload: Workload = {
    workloadName: 'Test RR',
    processes: [
      { id: 'P1', arribo: 0, rafagasCPU: 1, duracionCPU: 5, duracionIO: 0, prioridad: 1 },
      { id: 'P2', arribo: 0, rafagasCPU: 1, duracionCPU: 3, duracionIO: 0, prioridad: 1 }
    ],
    config: {
      policy: 'RR',
      tip: 0,
      tfp: 0,
      tcp: 1,
      quantum: 2
    }
  };

  try {
    const motor = new AdaptadorMotorMejorado(workload);
    const resultado = motor.ejecutar();
    
    if (resultado.exitoso) {
      const eventos = resultado.eventosInternos;
      
      // Buscar eventos de quantum (expropiación)
      const eventosQuantum = eventos.filter(e => 
        e.tipo === 'AgotamientoQuantum' || e.tipo === 'Expropiacion'
      );
      
      validarTest('RR genera expropiariones por quantum', eventosQuantum.length > 0);
      
      // Verificar que hay cambios de contexto
      const dispatches = eventos.filter(e => e.tipo === 'Despacho');
      validarTest('RR genera múltiples dispatches', dispatches.length > 2);
      
      console.log(`       RR: ${dispatches.length} dispatches, ${eventosQuantum.length} expropiacines`);
    }
    
  } catch (error) {
    validarTest('Test RR sin error', false, error instanceof Error ? error.message : 'Error');
  }
}

// Test SRTF (expropiación por tiempo restante)
async function testSRTF() {
  console.log('\n⚡ Test SRTF (Expropiación)');
  console.log('───────────────────────────');

  const workload: Workload = {
    workloadName: 'Test SRTF',
    processes: [
      { id: 'P1', arribo: 0, rafagasCPU: 1, duracionCPU: 5, duracionIO: 0, prioridad: 1 },
      { id: 'P2', arribo: 1, rafagasCPU: 1, duracionCPU: 2, duracionIO: 0, prioridad: 1 } // Más corto, debe expropiar
    ],
    config: {
      policy: 'SRTN',
      tip: 0,
      tfp: 0,
      tcp: 1
    }
  };

  try {
    const motor = new AdaptadorMotorMejorado(workload);
    const resultado = motor.ejecutar();
    
    if (resultado.exitoso) {
      const eventos = resultado.eventosInternos;
      
      // Buscar expropiación 
      const expropiraciones = eventos.filter(e => e.tipo === 'Expropiacion');
      validarTest('SRTF genera expropiación', expropiraciones.length > 0);
      
      // P2 debe ejecutar antes que P1 complete
      const finP2 = eventos.find(e => e.proceso === 'P2' && (e.tipo === 'FinTFP' || e.tipo === 'FinRafagaCPU'));
      const finP1 = eventos.find(e => e.proceso === 'P1' && (e.tipo === 'FinTFP' || e.tipo === 'FinRafagaCPU'));
      
      if (finP2 && finP1) {
        validarTest('P2 (más corto) termina antes que P1', finP2.tiempo < finP1.tiempo);
      }
      
      console.log(`   ⚡ SRTF: ${expropiraciones.length} expropiacines`);
    }
    
  } catch (error) {
    validarTest('Test SRTF sin error', false, error instanceof Error ? error.message : 'Error');
  }
}

// Ejecutar todos los tests
async function ejecutarTests() {
  console.log('Iniciando tests del motor mejorado...\n');
  
  await testBasico();
  await testOrdenEventos();
  await testReglasTC();
  await testRoundRobin();
  await testSRTF();
  
  console.log('\n' + '='.repeat(50));
  console.log(`📊 RESUMEN: ${testsPasados}/${testsTotal} tests pasaron`);
  
  if (testsPasados === testsTotal) {
    console.log('🎉 ¡Todos los tests pasaron! Motor mejorado funciona correctamente.');
  } else {
    console.log('⚠️  Algunos tests fallaron. Revisar implementación.');
  }
  
  process.exit(testsPasados === testsTotal ? 0 : 1);
}

// Ejecutar
ejecutarTests().catch(error => {
  console.error('   Error ejecutando tests:', error);
  process.exit(1);
});
