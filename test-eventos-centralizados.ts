#!/usr/bin/env npx tsx

/**
 * Test de Validación del Sistema Centralizado de Eventos
 * Verifica que el problema de doble registro ha sido resuelto
 */

import { RegistroEventos, registrarEvento } from './src/lib/core/registroEventos';
import { crearEstadoInicial, obtenerEventosInternos, obtenerEventosExportacion } from './src/lib/core/state';
import { convertirEventosInternos, procesarEventosCentralizados } from './src/lib/infrastructure/io/eventLogger';
import type { Workload } from './src/lib/domain/types';

console.log('🧪 TEST: Sistema Centralizado de Eventos');
console.log('==========================================');
console.log('');

// Test 1: Verificar que RegistroEventos funciona correctamente
console.log('📝 Test 1: Registro Centralizado de Eventos');
console.log('----------------------------------------------');

const registro = new RegistroEventos();

// Simular algunos eventos
registro.registrar(0, 'Arribo', 'P1', 'Proceso llegó al sistema');
registro.registrar(1, 'FinTIP', 'P1', 'TIP completado');
registro.registrar(1, 'Despacho', 'P1', 'Proceso despachado');
registro.registrar(10, 'FinRafagaCPU', 'P1', 'CPU completada');
registro.registrar(12, 'FinTFP', 'P1', 'Proceso terminado');

const eventosInternos = registro.obtenerEventosInternos();
const eventosExportacion = registro.proyectarEventosExportacion();

console.log(`✅ Eventos internos registrados: ${eventosInternos.length}`);
console.log(`✅ Eventos exportación proyectados: ${eventosExportacion.length}`);

// Verificar que ambos tengan la misma cantidad
if (eventosInternos.length === eventosExportacion.length) {
  console.log('✅ CORRECTO: Misma cantidad de eventos internos y exportación');
} else {
  console.log('❌ ERROR: Diferente cantidad de eventos');
  process.exit(1);
}

console.log('');

// Test 2: Verificar que no hay duplicación en el procesamiento
console.log('🔄 Test 2: No Duplicación en Procesamiento');
console.log('--------------------------------------------');

const eventosLog = procesarEventosCentralizados(eventosInternos, eventosExportacion);
console.log(`📊 Eventos procesados para log: ${eventosLog.length}`);

// Verificar que el procesamiento usa una sola fuente
if (eventosLog.length === eventosInternos.length) {
  console.log('✅ CORRECTO: Procesamiento usa fuente única (eventos internos)');
} else {
  console.log('❌ ERROR: Procesamiento duplicando eventos');
  process.exit(1);
}

console.log('');

// Test 3: Verificar integración con SimState
console.log('🏗️ Test 3: Integración con SimState');
console.log('------------------------------------');

const workloadTest: Workload = {
  processes: [
    {
      id: 'P1',
      arribo: 0,
      rafagasCPU: 1,
      duracionCPU: 10,
      duracionIO: 5,
      prioridad: 1
    }
  ],
  config: {
    policy: 'FCFS',
    tip: 2,
    tfp: 2,
    tcp: 1
  }
};

const state = crearEstadoInicial(workloadTest);

// Registrar algunos eventos en el estado
state.registroEventos.registrar(0, 'Arribo', 'P1', 'Test arribo');
state.registroEventos.registrar(2, 'FinTIP', 'P1', 'Test TIP');
state.registroEventos.registrar(3, 'Despacho', 'P1', 'Test despacho');

const eventosDesdeEstado = obtenerEventosInternos(state);
const exportacionDesdeEstado = obtenerEventosExportacion(state);

console.log(`📊 Eventos desde estado: ${eventosDesdeEstado.length}`);
console.log(`📤 Exportación desde estado: ${exportacionDesdeEstado.length}`);

if (eventosDesdeEstado.length === exportacionDesdeEstado.length) {
  console.log('✅ CORRECTO: Estado integrado correctamente');
} else {
  console.log('❌ ERROR: Integración con estado fallida');
  process.exit(1);
}

console.log('');

// Test 4: Verificar mapeo correcto de tipos
console.log('🗺️ Test 4: Mapeo de Tipos de Eventos');
console.log('-------------------------------------');

const eventoInterno = eventosDesdeEstado[0];
const eventoExportacion = exportacionDesdeEstado[0];

console.log(`🔍 Evento interno: ${eventoInterno.tipo}`);
console.log(`📤 Evento exportación: ${eventoExportacion.tipo}`);

// Verificar algunos mapeos específicos
const mapeosEsperados = [
  ['Arribo', 'JOB_LLEGA'],
  ['FinTIP', 'NUEVO_A_LISTO'],
  ['Despacho', 'LISTO_A_CORRIENDO']
];

let mapeosCorrecto = true;
for (const [interno, esperado] of mapeosEsperados) {
  const registro2 = new RegistroEventos();
  registro2.registrar(0, interno as any, 'TEST');
  const exp = registro2.proyectarEventosExportacion();
  if (exp[0].tipo !== esperado) {
    console.log(`❌ ERROR: Mapeo incorrecto ${interno} -> ${exp[0].tipo} (esperado: ${esperado})`);
    mapeosCorrecto = false;
  }
}

if (mapeosCorrecto) {
  console.log('✅ CORRECTO: Mapeo de tipos funcionando');
} else {
  console.log('❌ ERROR: Mapeo de tipos fallido');
  process.exit(1);
}

console.log('');

// Test 5: Verificar estadísticas
console.log('📈 Test 5: Estadísticas del Registro');
console.log('------------------------------------');

const stats = state.registroEventos.obtenerEstadisticas();
console.log(`📊 Total eventos: ${stats.totalEventos}`);
console.log(`🕐 Tiempo inicio: ${stats.tiempoInicio}`);
console.log(`🕐 Tiempo fin: ${stats.tiempoFin}`);
console.log(`📋 Eventos por tipo:`, stats.eventosPorTipo);
console.log(`👥 Eventos por proceso:`, stats.eventosPorProceso);

if (stats.totalEventos === 3 && stats.tiempoInicio === 0 && stats.tiempoFin === 3) {
  console.log('✅ CORRECTO: Estadísticas precisas');
} else {
  console.log('❌ ERROR: Estadísticas incorrectas');
  process.exit(1);
}

console.log('');

console.log('🎉 TODOS LOS TESTS PASARON');
console.log('==========================');
console.log('✅ Sistema centralizado de eventos funcionando correctamente');
console.log('✅ Problema de doble registro RESUELTO');
console.log('✅ Fuente única de verdad implementada');
console.log('✅ Proyección automática funcionando');
console.log('✅ Integración con estado completa');
console.log('✅ Sin duplicación de eventos');
console.log('✅ Mapeo de tipos correcto');
console.log('✅ Estadísticas precisas');