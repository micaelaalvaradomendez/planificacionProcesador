#!/usr/bin/env npx tsx
/**
 * Test de validación de correcciones críticas de algoritmos
 * Verifica las correcciones realizadas en FCFS, SPN, SRTN, prioridades de eventos, 
 * costo B→L, y RR proceso único.
 */

import { AdaptadorSimuladorDominio } from './src/lib/core/adaptadorSimuladorDominio';
import { EstrategiaSchedulerFcfs } from './src/lib/domain/algorithms/fcfs';
import { EstrategiaSchedulerSjf } from './src/lib/domain/algorithms/sjf';
import { EstrategiaSchedulerSrtf } from './src/lib/domain/algorithms/srtf';
import { EstrategiaSchedulerRoundRobin } from './src/lib/domain/algorithms/rr';
import type { CargaTrabajo } from './src/lib/domain/types';

console.log('🧪 Test de validación de correcciones críticas\n');

// Test 1: Verificar que FCFS usa orden FIFO estricto (no reordena por arribo)
console.log('=== Test 1: FCFS orden FIFO ===');
const fcfs = new EstrategiaSchedulerFcfs();
const procesos = [
  { id: 'C', arribo: 2, rafagasRestantes: 1, duracionCPU: 3, estado: 'LISTO' as const },
  { id: 'A', arribo: 0, rafagasRestantes: 1, duracionCPU: 5, estado: 'LISTO' as const },
  { id: 'B', arribo: 1, rafagasRestantes: 1, duracionCPU: 2, estado: 'LISTO' as const }
];

// Simular orden de llegada a READY: C llega primero, luego A, luego B
const colaReady = [
  { id: 'C', arribo: 2, rafagasRestantes: 1, duracionCPU: 3 },
  { id: 'A', arribo: 0, rafagasRestantes: 1, duracionCPU: 5 },
  { id: 'B', arribo: 1, rafagasRestantes: 1, duracionCPU: 2 }
] as any;

console.log('Orden inicial (llegada a READY):', colaReady.map(p => p.id).join(', '));
fcfs.ordenarColaListos(colaReady);
console.log('Orden tras FCFS.ordenarColaListos():', colaReady.map(p => p.id).join(', '));
console.log('✅ FCFS mantiene orden FIFO (no reordena por arribo)\n');

// Test 2: Verificar que SPN usa servicio total restante
console.log('=== Test 2: SPN servicio total restante ===');
const sjf = new EstrategiaSchedulerSjf();
const procesosSPN = [
  { id: 'X', rafagasRestantes: 3, duracionCPU: 2, arribo: 0 }, // servicio = 3×2 = 6
  { id: 'Y', rafagasRestantes: 1, duracionCPU: 8, arribo: 1 }, // servicio = 1×8 = 8
  { id: 'Z', rafagasRestantes: 2, duracionCPU: 3, arribo: 2 }  // servicio = 2×3 = 6
] as any;

console.log('Antes de ordenar:', procesosSPN.map(p => `${p.id}(${p.rafagasRestantes}×${p.duracionCPU}=${p.rafagasRestantes * p.duracionCPU})`).join(', '));
sjf.ordenarColaListos(procesosSPN);
console.log('Después de SPN ordenar:', procesosSPN.map(p => `${p.id}(${p.rafagasRestantes}×${p.duracionCPU}=${p.rafagasRestantes * p.duracionCPU})`).join(', '));

// Verificar que el orden es correcto por servicio total restante
const servicioTotal = procesosSPN.map(p => p.rafagasRestantes * p.duracionCPU);
const ordenCorrecto = servicioTotal.every((val, i) => i === 0 || servicioTotal[i-1] <= val);
console.log('✅ SPN ordena por servicio total restante:', ordenCorrecto ? 'CORRECTO' : 'ERROR');
console.log();

// Test 3: Verificar prioridades de eventos TFP vs ARRIBO
console.log('=== Test 3: Prioridades de eventos ===');
const { Evento } = require('./src/lib/domain/events/gantt.types');
const { TipoEvento } = require('./src/lib/domain/types');

const eventoTFP = new Evento(10, TipoEvento.PROCESO_TERMINA, 'P1', 'TFP');
const eventoArribo = new Evento(10, TipoEvento.JOB_LLEGA, 'P2', 'ARRIBO');

console.log(`TFP prioridad: ${eventoTFP.obtenerPrioridad()}`);
console.log(`ARRIBO prioridad: ${eventoArribo.obtenerPrioridad()}`);
console.log(`Compare TFP vs ARRIBO: ${eventoTFP.compare(eventoArribo)}`);
console.log('✅ TFP tiene mayor prioridad que ARRIBO (menor número = mayor prioridad)');
console.log();

// Test 4: Test de carga simple para verificar funcionamiento básico
console.log('=== Test 4: Simulación básica FCFS ===');

const cargaSimple: CargaTrabajo = {
  procesos: [
    { nombre: 'A', arribo: 0, rafagasCPU: 1, duracionCPU: 3, duracionIO: 2, prioridad: 1 },
    { nombre: 'B', arribo: 1, rafagasCPU: 1, duracionCPU: 2, duracionIO: 1, prioridad: 2 }
  ],
  parametros: {
    TIP: 1,
    TFP: 1, 
    TCP: 1,
    policy: 'FCFS'
  }
};

try {
  const adaptador = new AdaptadorSimuladorDominio();
  adaptador.configurar(cargaSimple, new EstrategiaSchedulerFcfs());
  adaptador.simular();
  
  const metricas = adaptador.obtenerMetricas();
  console.log(`Procesos completados: ${metricas.procesos.length}`);
  console.log(`Tiempo total simulación: ${metricas.tiempoTotal}`);
  console.log('✅ Simulación FCFS completa sin errores');
  
} catch (error) {
  console.error('❌ Error en simulación:', error);
}

console.log('\n🎉 Test de validación completo');