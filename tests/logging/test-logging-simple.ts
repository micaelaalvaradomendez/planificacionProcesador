/**
 * Test simplificado para el sistema de logging de eventos
 * Valida la generación de logs JSON y CSV con todos los eventos requeridos
 */

import { MotorSimulacion } from '../../src/lib/core/engine.js';
import { 
  combinarEventos, 
  exportarEventosJSON, 
  exportarEventosCSV,
  generarResumenEventos
} from '../../src/lib/infrastructure/io/eventLogger.js';
import type { Workload } from '../../src/lib/model/types.js';

function testEventosBasicos() {
  console.log('\n🧪 Test Eventos Básicos');
  
  const workload: Workload = {
    config: { policy: 'FCFS', tip: 1, tfp: 1, tcp: 1 },
    processes: [
      { name: 'P1', tiempoArribo: 0, rafagasCPU: 1, duracionRafagaCPU: 3, duracionRafagaES: 1, prioridad: 1 }
    ]
  };

  const motor = new MotorSimulacion(workload);
  const resultado = motor.ejecutar();
  
  const eventos = combinarEventos(resultado.eventosInternos, resultado.eventosExportacion);
  const tipos = [...new Set(eventos.map(e => e.tipo))];
  
  console.log(`📊 ${eventos.length} eventos, ${tipos.length} tipos únicos`);
  console.log(`🔍 Tipos: ${tipos.join(', ')}`);
  
  // Verificar eventos críticos
  const arriboPresente = tipos.includes('Arribo');
  const terminacionPresente = tipos.some(t => t.includes('Terminación'));
  
  console.log(`✅ Arribo: ${arriboPresente ? 'presente' : 'ausente'}`);
  console.log(`✅ Terminación: ${terminacionPresente ? 'presente' : 'ausente'}`);
  console.log(`🔍 Debug - Eventos que incluyen 'Terminación': ${tipos.filter(t => t.includes('Terminación')).join(', ')}`);
  
  return arriboPresente && terminacionPresente;
}

function testExportacionFormatos() {
  console.log('\n🧪 Test Exportación de Formatos');
  
  const workload: Workload = {
    config: { policy: 'RR', quantum: 2, tip: 1, tfp: 1, tcp: 1 },
    processes: [
      { name: 'P1', tiempoArribo: 0, rafagasCPU: 1, duracionRafagaCPU: 5, duracionRafagaES: 1, prioridad: 1 }
    ]
  };

  const motor = new MotorSimulacion(workload);
  const resultado = motor.ejecutar();
  const eventos = combinarEventos(resultado.eventosInternos, resultado.eventosExportacion);

  // Test JSON
  const json = exportarEventosJSON(eventos);
  let jsonValido = false;
  try {
    const parsed = JSON.parse(json);
    jsonValido = parsed.metadata && parsed.eventos && parsed.eventos.length > 0;
  } catch {}
  
  // Test CSV  
  const csv = exportarEventosCSV(eventos);
  const lineasCSV = csv.split('\n');
  const csvValido = lineasCSV.length > 1 && lineasCSV[0].includes('Tiempo,Tipo,Proceso');

  // Test resumen
  const resumen = generarResumenEventos(eventos);
  const resumenValido = resumen.totalEventos > 0 && Object.keys(resumen.eventosPorTipo).length > 0;

  console.log(`✅ JSON válido: ${jsonValido}`);
  console.log(`✅ CSV válido: ${csvValido} (${lineasCSV.length - 1} filas)`);
  console.log(`✅ Resumen válido: ${resumenValido} (${resumen.totalEventos} eventos)`);

  return jsonValido && csvValido && resumenValido;
}

function testEventosEspecificos() {
  console.log('\n🧪 Test Eventos Específicos de la Consigna');
  
  // Test para generar todos los eventos requeridos
  const workload: Workload = {
    config: { policy: 'RR', quantum: 2, tip: 1, tfp: 1, tcp: 1 },
    processes: [
      { 
        name: 'P1', 
        tiempoArribo: 0, 
        rafagasCPU: 2,    // 2 ráfagas: CPU -> E/S -> CPU (terminación)
        duracionRafagaCPU: 3,  // más largo que quantum para agotamiento
        duracionRafagaES: 1, 
        prioridad: 1 
      }
    ]
  };

  const motor = new MotorSimulacion(workload);
  const resultado = motor.ejecutar();
  const eventos = combinarEventos(resultado.eventosInternos, resultado.eventosExportacion);

  // Eventos requeridos por la consigna
  const eventosRequeridos = {
    'Arribo': eventos.some(e => e.tipo === 'Arribo'),
    'Incorporación': eventos.some(e => e.tipo.includes('Incorporación')),
    'Fin Ráfaga': eventos.some(e => e.tipo.includes('Fin Ráfaga')),
    'Agotamiento Quantum': eventos.some(e => e.tipo.includes('Quantum')),
    'Fin E/S': eventos.some(e => e.tipo.includes('Fin E/S')),
    'Terminación': eventos.some(e => e.tipo.includes('Terminación'))
  };

  console.log('📋 Eventos requeridos por consigna:');
  console.log(`🔍 Debug - Todos los tipos: ${[...new Set(eventos.map(e => e.tipo))].join(', ')}`);
  let todosPresentes = true;
  for (const [evento, presente] of Object.entries(eventosRequeridos)) {
    console.log(`${presente ? '✅' : '❌'} ${evento}: ${presente ? 'presente' : 'ausente'}`);
    if (!presente) todosPresentes = false;
  }

  return todosPresentes;
}

// Ejecutar tests
console.log('🚀 Iniciando tests de logging de eventos...');

const test1 = testEventosBasicos();
const test2 = testExportacionFormatos();
const test3 = testEventosEspecificos();

console.log('\n📋 Resumen Final:');
console.log(`Eventos básicos: ${test1 ? '✅' : '❌'}`);
console.log(`Exportación formatos: ${test2 ? '✅' : '❌'}`);
console.log(`Eventos específicos: ${test3 ? '✅' : '❌'}`);

if (test1 && test2 && test3) {
  console.log('\n🎉 ¡Todos los tests de logging pasaron!');
} else {
  console.log('\n❌ Algunos tests de logging fallaron');
}
