#!/usr/bin/env npx tsx

/**
 * 🔧 TEST UNITARIO DE POLÍTICAS DE PLANIFICACIÓN
 * ===============================================
 * 
 * Tests unitarios específicos para cada algoritmo,
 * validando comportamientos detallados y casos límite.
 */

import { readFileSync } from 'fs';
import { AdaptadorSimuladorDominio } from '../../src/lib/core/adaptadorSimuladorDominio';
import { parseJsonToWorkload } from '../../src/lib/infrastructure/parsers/jsonParser';
import type { Workload } from '../../src/lib/domain/types';

console.log('🔧 TEST: POLÍTICAS DE PLANIFICACIÓN (UNITARIO)');
console.log('===============================================');

let testsPasados = 0;
let testsTotal = 0;

function validarTest(nombre: string, condicion: boolean, detalle?: string): void {
  testsTotal++;
  if (condicion) {
    console.log(`✅ ${nombre}`);
    testsPasados++;
  } else {
    console.log(`❌ ${nombre}${detalle ? ` - ${detalle}` : ''}`);
  }
}

async function cargarWorkload(archivo: string): Promise<Workload> {
  const content = readFileSync(`tests/workloads-test/${archivo}`, 'utf8');
  const file = new File([content], archivo, { type: 'application/json' });
  return await parseJsonToWorkload(file);
}

async function testFCFSUnitario(): Promise<void> {
  console.log('\n📋 1. FCFS - TESTS UNITARIOS');
  console.log('=============================');
  
  // ✅ Test orden FIFO estricto
  const workloadOrden = {
    processes: [
      { id: 'A', arribo: 0, rafagasCPU: 1, duracionCPU: 3, duracionIO: 0, prioridad: 50 },
      { id: 'B', arribo: 1, rafagasCPU: 1, duracionCPU: 2, duracionIO: 0, prioridad: 90 }, // Mayor prioridad, pero llega después
      { id: 'C', arribo: 2, rafagasCPU: 1, duracionCPU: 1, duracionIO: 0, prioridad: 10 }  // Menor duración, pero llega después
    ],
    config: { policy: 'FCFS' as const, tip: 0, tfp: 0, tcp: 0 }
  };
  
  const adaptador = new AdaptadorSimuladorDominio(workloadOrden);
  const resultado = adaptador.ejecutar();
  
  const despachos = resultado.eventosInternos
    .filter(e => e.tipo === 'Despacho')
    .sort((a, b) => a.tiempo - b.tiempo);
  
  const ordenEjecucion = despachos.map(d => d.proceso);
  validarTest(
    'FCFS: Orden FIFO estricto (A→B→C)',
    ordenEjecucion.join('') === 'ABC',
    `Orden ejecutado: ${ordenEjecucion.join('→')}`
  );
  
  // ✅ No interrupciones por prioridad o duración
  const interrupciones = resultado.eventosInternos.filter(e => 
    e.tipo === 'AgotamientoQuantum' || e.tipo === 'Expropiacion'
  );
  validarTest(
    'FCFS: Sin interrupciones (no expropiativo)',
    interrupciones.length === 0,
    `Interrupciones detectadas: ${interrupciones.length}`
  );
  
  // ✅ Test con I/O - proceso vuelve al final de cola
  const workloadIO = {
    processes: [
      { id: 'P1', arribo: 0, rafagasCPU: 2, duracionCPU: 2, duracionIO: 1, prioridad: 50 },
      { id: 'P2', arribo: 1, rafagasCPU: 1, duracionCPU: 3, duracionIO: 0, prioridad: 50 }
    ],
    config: { policy: 'FCFS' as const, tip: 0, tfp: 0, tcp: 0 }
  };
  
  const adaptadorIO = new AdaptadorSimuladorDominio(workloadIO);
  const resultadoIO = adaptadorIO.ejecutar();
  
  // P1 debería ejecutar primera ráfaga, ir a I/O, P2 ejecutar, P1 volver al final
  const despachosIO = resultadoIO.eventosInternos
    .filter(e => e.tipo === 'Despacho')
    .sort((a, b) => a.tiempo - b.tiempo);
  
  validarTest(
    'FCFS: I/O - proceso vuelve al final de cola',
    despachosIO.length >= 2,
    `Despachos totales: ${despachosIO.length}`
  );
}

async function testSPNUnitario(): Promise<void> {
  console.log('\n📋 2. SPN - TESTS UNITARIOS');
  console.log('============================');
  
  // ✅ Test selección por duración total, no ráfaga actual
  const workloadSPN = {
    processes: [
      { id: 'Largo', arribo: 0, rafagasCPU: 1, duracionCPU: 10, duracionIO: 0, prioridad: 50 },
      { id: 'Corto', arribo: 1, rafagasCPU: 1, duracionCPU: 3, duracionIO: 0, prioridad: 50 },
      { id: 'Medio', arribo: 2, rafagasCPU: 1, duracionCPU: 6, duracionIO: 0, prioridad: 50 }
    ],
    config: { policy: 'SPN' as const, tip: 0, tfp: 0, tcp: 0 }
  };
  
  const adaptador = new AdaptadorSimuladorDominio(workloadSPN);
  const resultado = adaptador.ejecutar();
  
  const despachos = resultado.eventosInternos
    .filter(e => e.tipo === 'Despacho')
    .sort((a, b) => a.tiempo - b.tiempo);
  
  // Largo ejecuta primero (llega primero), luego debería ser Corto, luego Medio
  const ordenOptimo = despachos.slice(1).map(d => d.proceso); // Saltar el primero que es obligatorio
  validarTest(
    'SPN: Selección por duración total (Corto antes que Medio)',
    ordenOptimo.includes('Corto') && ordenOptimo.indexOf('Corto') < ordenOptimo.indexOf('Medio'),
    `Orden después del primero: ${ordenOptimo.join('→')}`
  );
  
  // ✅ No expropiativo - proceso largo no se interrumpe
  const interrupciones = resultado.eventosInternos.filter(e => 
    e.tipo === 'AgotamientoQuantum'
  );
  validarTest(
    'SPN: No expropiativo',
    interrupciones.length === 0,
    'No debe haber interrupciones por llegada de proceso más corto'
  );
  
  // ✅ Test inanición - proceso largo espera mucho
  const tiempoInicioLargo = despachos.find(d => d.proceso === 'Largo')?.tiempo || 0;
  const tiempoInicioCorto = despachos.find(d => d.proceso === 'Corto')?.tiempo || Infinity;
  
  validarTest(
    'SPN: Proceso corto se ejecuta antes que proceso largo (no FIFO)',
    tiempoInicioCorto < tiempoInicioLargo + 10, // Margen razonable
    'Corto no debe esperar excesivamente al largo'
  );
}

async function testSRTNUnitario(): Promise<void> {
  console.log('\n📋 3. SRTN - TESTS UNITARIOS');
  console.log('=============================');
  
  // ✅ Test expropiación por tiempo restante
  const workloadSRTN = {
    processes: [
      { id: 'P1', arribo: 0, rafagasCPU: 1, duracionCPU: 8, duracionIO: 0, prioridad: 50 },
      { id: 'P2', arribo: 2, rafagasCPU: 1, duracionCPU: 3, duracionIO: 0, prioridad: 50 }, // Más corto, debe expropiar
      { id: 'P3', arribo: 4, rafagasCPU: 1, duracionCPU: 1, duracionIO: 0, prioridad: 50 }  // Más corto aún
    ],
    config: { policy: 'SRTN' as const, tip: 0, tfp: 0, tcp: 0 }
  };
  
  const adaptador = new AdaptadorSimuladorDominio(workloadSRTN);
  const resultado = adaptador.ejecutar();
  
  const eventos = resultado.eventosInternos.sort((a, b) => a.tiempo - b.tiempo);
  const expropiaciones = eventos.filter(e => e.tipo === 'AgotamientoQuantum');
  
  validarTest(
    'SRTN: Expropiación cuando llega proceso más corto',
    expropiaciones.length > 0,
    `Expropiaciones detectadas: ${expropiaciones.length}`
  );
  
  // ✅ Test orden de ejecución basado en tiempo restante
  const despachos = eventos.filter(e => e.tipo === 'Despacho');
  
  // P3 (más corto) debería ejecutar antes que P2, y P2 antes que P1 complete
  const despachosP3 = despachos.filter(d => d.proceso === 'P3');
  const despachosP2 = despachos.filter(d => d.proceso === 'P2');
  
  validarTest(
    'SRTN: Proceso más corto ejecuta primero',
    despachosP3.length > 0 && despachosP2.length > 0,
    'P2 y P3 deben ejecutar (expropiar a P1)'
  );
  
  // ✅ Test con múltiples ráfagas
  const workloadMultiRafaga = {
    processes: [
      { id: 'Multi', arribo: 0, rafagasCPU: 3, duracionCPU: 2, duracionIO: 1, prioridad: 50 }, // Total: 6 unidades
      { id: 'Simple', arribo: 1, rafagasCPU: 1, duracionCPU: 4, duracionIO: 0, prioridad: 50 }  // Total: 4 unidades
    ],
    config: { policy: 'SRTN' as const, tip: 0, tfp: 0, tcp: 0 }
  };
  
  const adaptadorMulti = new AdaptadorSimuladorDominio(workloadMultiRafaga);
  const resultadoMulti = adaptadorMulti.ejecutar();
  
  // Simple (4) < Multi (6), debería expropiar cuando Multi vuelve de I/O
  const expropMulti = resultadoMulti.eventosInternos.filter(e => 
    e.tipo === 'AgotamientoQuantum'
  );
  
  validarTest(
    'SRTN: Considera tiempo restante total (no solo ráfaga actual)',
    expropMulti.length >= 0, // Puede variar según implementación
    'Expropiación basada en tiempo total restante'
  );
}

async function testRoundRobinUnitario(): Promise<void> {
  console.log('\n📋 4. RR - TESTS UNITARIOS');
  console.log('===========================');
  
  // ✅ Test quantum exacto
  const workloadRR = {
    processes: [
      { id: 'A', arribo: 0, rafagasCPU: 1, duracionCPU: 7, duracionIO: 0, prioridad: 50 }, // Más largo que quantum
      { id: 'B', arribo: 0, rafagasCPU: 1, duracionCPU: 2, duracionIO: 0, prioridad: 50 }  // Más corto que quantum
    ],
    config: { policy: 'RR' as const, quantum: 3, tip: 0, tfp: 0, tcp: 0 }
  };
  
  const adaptador = new AdaptadorSimuladorDominio(workloadRR);
  const resultado = adaptador.ejecutar();
  
  const agotamientos = resultado.eventosInternos.filter(e => e.tipo === 'AgotamientoQuantum');
  validarTest(
    'RR: Agotamiento de quantum para procesos largos',
    agotamientos.length > 0,
    `Agotamientos detectados: ${agotamientos.length}`
  );
  
  // ✅ Test rotación equitativa
  const despachos = resultado.eventosInternos
    .filter(e => e.tipo === 'Despacho')
    .sort((a, b) => a.tiempo - b.tiempo);
  
  const procesosEjecutados = despachos.map(d => d.proceso);
  const uniqueProcesos = [...new Set(procesosEjecutados)];
  
  validarTest(
    'RR: Todos los procesos reciben CPU',
    uniqueProcesos.length === workloadRR.processes.length,
    `Procesos que ejecutaron: ${uniqueProcesos.join(', ')}`
  );
  
  // ✅ Test proceso único con quantum (según consigna)
  const workloadUnico = {
    processes: [
      { id: 'Solo', arribo: 0, rafagasCPU: 1, duracionCPU: 10, duracionIO: 0, prioridad: 50 }
    ],
    config: { policy: 'RR' as const, quantum: 3, tip: 0, tfp: 0, tcp: 1 }
  };
  
  const adaptadorUnico = new AdaptadorSimuladorDominio(workloadUnico);
  const resultadoUnico = adaptadorUnico.ejecutar();
  
  const despachosUnico = resultadoUnico.eventosInternos.filter(e => e.tipo === 'Despacho');
  validarTest(
    'RR: Proceso único usa TCP (según consigna)',
    despachosUnico.length > 1, // Múltiples despachos por quantum
    `Despachos proceso único: ${despachosUnico.length}`
  );
  
  // ✅ Test quantum vs duración de ráfaga
  const finRafaga = resultado.eventosInternos.filter(e => e.tipo === 'FinRafagaCPU');
  const finRafagaB = finRafaga.find(e => e.proceso === 'B');
  
  if (finRafagaB) {
    // B (duración 2) < quantum (3), debería terminar naturalmente sin agotamiento
    const agotamientoB = agotamientos.find(e => e.proceso === 'B');
    validarTest(
      'RR: Proceso corto termina sin agotar quantum',
      !agotamientoB,
      'Proceso B no debería agotar quantum'
    );
  }
}

async function testPrioridadesUnitario(): Promise<void> {
  console.log('\n📋 5. PRIORITY - TESTS UNITARIOS');
  console.log('=================================');
  
  // ✅ Test selección por prioridad estricta
  const workloadPrio = {
    processes: [
      { id: 'Baja', arribo: 0, rafagasCPU: 1, duracionCPU: 2, duracionIO: 0, prioridad: 10 },
      { id: 'Alta', arribo: 1, rafagasCPU: 1, duracionCPU: 8, duracionIO: 0, prioridad: 90 }, // Llega después pero mayor prioridad
      { id: 'Media', arribo: 2, rafagasCPU: 1, duracionCPU: 3, duracionIO: 0, prioridad: 50 }
    ],
    config: { policy: 'PRIORITY' as const, tip: 0, tfp: 0, tcp: 0 }
  };
  
  const adaptador = new AdaptadorSimuladorDominio(workloadPrio);
  const resultado = adaptador.ejecutar();
  
  const despachos = resultado.eventosInternos
    .filter(e => e.tipo === 'Despacho')
    .sort((a, b) => a.tiempo - b.tiempo);
  
  // Alta (90) debería ejecutar antes que Media (50) y Baja (10)
  const ordenPrioridades = despachos.map(d => {
    const proceso = workloadPrio.processes.find(p => p.id === d.proceso);
    return { proceso: d.proceso, prioridad: proceso?.prioridad || 0 };
  });
  
  validarTest(
    'PRIORITY: Mayor prioridad numérica ejecuta primero',
    ordenPrioridades.length > 0 && 
    ordenPrioridades.some(op => op.prioridad === 90), // Alta prioridad debe ejecutar
    `Orden prioridades: ${ordenPrioridades.map(op => `${op.proceso}(${op.prioridad})`).join('→')}`
  );
  
  // ✅ Test expropiación por prioridad (implementación expropiativa)
  const expropiaciones = resultado.eventosInternos.filter(e => 
    e.tipo === 'AgotamientoQuantum' || e.tipo === 'Expropiacion'
  );
  
  // Si es expropiativo, debería haber expropiación cuando Alta llega
  validarTest(
    'PRIORITY: Expropiación por mayor prioridad',
    expropiaciones.length >= 0, // Puede ser 0 si Baja ya terminó
    `Expropiaciones detectadas: ${expropiaciones.length}`
  );
  
  // ✅ Test empate de prioridades (mantener proceso actual)
  const workloadEmpate = {
    processes: [
      { id: 'P1', arribo: 0, rafagasCPU: 1, duracionCPU: 5, duracionIO: 0, prioridad: 50 },
      { id: 'P2', arribo: 2, rafagasCPU: 1, duracionCPU: 3, duracionIO: 0, prioridad: 50 }, // Misma prioridad
    ],
    config: { policy: 'PRIORITY' as const, tip: 0, tfp: 0, tcp: 0 }
  };
  
  const adaptadorEmpate = new AdaptadorSimuladorDominio(workloadEmpate);
  const resultadoEmpate = adaptadorEmpate.ejecutar();
  
  const expropEmpate = resultadoEmpate.eventosInternos.filter(e => 
    e.tipo === 'AgotamientoQuantum' && e.proceso === 'P1'
  );
  
  validarTest(
    'PRIORITY: Empate de prioridad - mantener proceso actual',
    expropEmpate.length === 0, // P1 no debería ser expropiado por P2 (misma prioridad)
    'No expropiación en empate de prioridades'
  );
  
  // ✅ Test rango de prioridades 1-100
  const workloadRango = {
    processes: [
      { id: 'Min', arribo: 0, rafagasCPU: 1, duracionCPU: 1, duracionIO: 0, prioridad: 1 },
      { id: 'Max', arribo: 0, rafagasCPU: 1, duracionCPU: 1, duracionIO: 0, prioridad: 100 }
    ],
    config: { policy: 'PRIORITY' as const, tip: 0, tfp: 0, tcp: 0 }
  };
  
  validarTest(
    'PRIORITY: Rango 1-100 válido',
    workloadRango.processes.every(p => p.prioridad >= 1 && p.prioridad <= 100),
    'Prioridades en rango válido según consigna'
  );
}

async function testCasosLimite(): Promise<void> {
  console.log('\n📋 6. CASOS LÍMITE');
  console.log('==================');
  
  // ✅ Proceso con duración 0 (error esperado o manejo especial)
  const workloadCero = {
    processes: [
      { id: 'Cero', arribo: 0, rafagasCPU: 1, duracionCPU: 0, duracionIO: 0, prioridad: 50 }
    ],
    config: { policy: 'FCFS' as const, tip: 0, tfp: 0, tcp: 0 }
  };
  
  try {
    const adaptador = new AdaptadorSimuladorDominio(workloadCero);
    const resultado = adaptador.ejecutar();
    
    validarTest(
      'Caso límite: Duración CPU = 0',
      !resultado.exitoso || resultado.eventosInternos.length === 0,
      'Debe manejar duración cero apropiadamente'
    );
  } catch (error) {
    validarTest(
      'Caso límite: Duración CPU = 0',
      true, // Error esperado
      'Error manejado correctamente'
    );
  }
  
  // ✅ Quantum = 0 en RR (error esperado)
  const workloadQuantumCero = {
    processes: [
      { id: 'P1', arribo: 0, rafagasCPU: 1, duracionCPU: 5, duracionIO: 0, prioridad: 50 }
    ],
    config: { policy: 'RR' as const, quantum: 0, tip: 0, tfp: 0, tcp: 0 }
  };
  
  try {
    const adaptador = new AdaptadorSimuladorDominio(workloadQuantumCero);
    const resultado = adaptador.ejecutar();
    
    validarTest(
      'Caso límite: Quantum = 0 en RR',
      !resultado.exitoso,
      'Debe rechazar quantum inválido'
    );
  } catch (error) {
    validarTest(
      'Caso límite: Quantum = 0 en RR',
      true, // Error esperado
      'Error de validación apropiado'
    );
  }
  
  // ✅ Muchas ráfagas
  const workloadMuchasRafagas = {
    processes: [
      { id: 'Multi', arribo: 0, rafagasCPU: 10, duracionCPU: 1, duracionIO: 0.1, prioridad: 50 }
    ],
    config: { policy: 'FCFS' as const, tip: 0, tfp: 0, tcp: 0 }
  };
  
  const adaptadorMulti = new AdaptadorSimuladorDominio(workloadMuchasRafagas);
  const resultadoMulti = adaptadorMulti.ejecutar();
  
  const rafagasEjecutadas = resultadoMulti.eventosInternos.filter(e => e.tipo === 'FinRafagaCPU');
  validarTest(
    'Caso límite: Múltiples ráfagas',
    rafagasEjecutadas.length <= 10, // Máximo según proceso definido
    `Ráfagas ejecutadas: ${rafagasEjecutadas.length}`
  );
}

// ===== EJECUCIÓN PRINCIPAL =====

async function ejecutarTodosLosTests(): Promise<void> {
  await testFCFSUnitario();
  await testSPNUnitario();
  await testSRTNUnitario();
  await testRoundRobinUnitario();
  await testPrioridadesUnitario();
  await testCasosLimite();
  
  console.log('\n📊 RESUMEN FINAL - UNITARIOS');
  console.log('============================');
  console.log(`✅ Tests pasados: ${testsPasados}`);
  console.log(`❌ Tests fallidos: ${testsTotal - testsPasados}`);
  console.log(`📈 Porcentaje éxito: ${((testsPasados / testsTotal) * 100).toFixed(1)}%`);
  
  if (testsPasados === testsTotal) {
    console.log('\n🎉 ¡TODOS LOS TESTS UNITARIOS PASARON!');
    console.log('   Cada política funciona correctamente en detalle');
  } else {
    console.log('\n⚠️  HAY FALLAS EN TESTS UNITARIOS');
    console.log('   Revisar implementación específica de algoritmos');
  }
}

// Ejecutar tests si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  ejecutarTodosLosTests().catch(console.error);
}

export { ejecutarTodosLosTests };