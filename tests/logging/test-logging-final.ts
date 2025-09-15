/**
 * Test final y definitivo para validar logging completo
 * Usa multiple workloads para asegurar que todos los eventos se generen
 */

import { MotorSimulacion } from '../../src/lib/core/engine.js';
import { 
  combinarEventos, 
  exportarEventosJSON, 
  exportarEventosCSV,
  generarResumenEventos
} from '../../src/lib/infrastructure/io/eventLogger.js';
import type { Workload } from '../../src/lib/domain/types.js';

function ejecutarYAnalizar(nombre: string, workload: Workload) {
  console.log(`\n🧪 ${nombre}`);
  
  const motor = new MotorSimulacion(workload);
  const resultado = motor.ejecutar();
  const eventos = combinarEventos(resultado.eventosInternos, resultado.eventosExportacion);
  const tipos = [...new Set(eventos.map(e => e.tipo))];
  
  console.log(`📊 ${eventos.length} eventos, ${tipos.length} tipos únicos`);
  console.log(`🔍 Tipos: ${tipos.join(', ')}`);
  
  return tipos;
}

// Test 1: Proceso simple que termina (para obtener terminación)
const workloadSimple: Workload = {
  config: { policy: 'FCFS', tip: 1, tfp: 1, tcp: 1 },
  processes: [
    { name: 'P1', tiempoArribo: 0, rafagasCPU: 1, duracionRafagaCPU: 3, duracionRafagaES: 1, prioridad: 1 }
  ]
};

// Test 2: Proceso con E/S pero que también termina
const workloadConES: Workload = {
  config: { policy: 'FCFS', tip: 1, tfp: 1, tcp: 1 },
  processes: [
    { name: 'P1', tiempoArribo: 0, rafagasCPU: 2, duracionRafagaCPU: 2, duracionRafagaES: 1, prioridad: 1 }
  ]
};

// Test 3: Proceso con Round Robin para obtener agotamiento quantum
const workloadRR: Workload = {
  config: { policy: 'RR', quantum: 1, tip: 1, tfp: 1, tcp: 1 },
  processes: [
    { name: 'P1', tiempoArribo: 0, rafagasCPU: 1, duracionRafagaCPU: 3, duracionRafagaES: 1, prioridad: 1 }
  ]
};

console.log('🚀 Análisis completo de eventos por workload...');

const tiposSimple = ejecutarYAnalizar('Proceso Simple (FCFS)', workloadSimple);
const tiposConES = ejecutarYAnalizar('Proceso con E/S (FCFS)', workloadConES);
const tiposRR = ejecutarYAnalizar('Proceso Round Robin', workloadRR);

// Combinar todos los tipos únicos
const todosLosTipos = [...new Set([...tiposSimple, ...tiposConES, ...tiposRR])];

console.log('\n📋 Resumen de todos los tipos de eventos encontrados:');
console.log(`🔍 Total de tipos únicos: ${todosLosTipos.length}`);
console.log(`📝 Tipos: ${todosLosTipos.join(', ')}`);

// Verificar eventos requeridos por la consigna
const eventosRequeridos = {
  'Arribo': todosLosTipos.some(t => t.includes('Arribo')),
  'Incorporación': todosLosTipos.some(t => t.includes('Incorporación')),
  'Fin Ráfaga': todosLosTipos.some(t => t.includes('Fin Ráfaga')),
  'Agotamiento Quantum': todosLosTipos.some(t => t.includes('Quantum')),
  'Fin E/S': todosLosTipos.some(t => t.includes('Fin E/S')),
  'Terminación': todosLosTipos.some(t => t.includes('Terminación'))
};

console.log('\n✅ Validación de eventos requeridos por consigna:');
let todosPresentes = true;
for (const [evento, presente] of Object.entries(eventosRequeridos)) {
  console.log(`${presente ? '✅' : '❌'} ${evento}: ${presente ? 'presente' : 'ausente'}`);
  if (!presente) todosPresentes = false;
}

// Test de exportación
console.log('\n🧪 Test de Exportación');
const motor = new MotorSimulacion(workloadConES);
const resultado = motor.ejecutar();
const eventos = combinarEventos(resultado.eventosInternos, resultado.eventosExportacion);

const json = exportarEventosJSON(eventos);
const csv = exportarEventosCSV(eventos);
const resumen = generarResumenEventos(eventos);

const jsonValido = json.includes('"metadata"') && json.includes('"eventos"');
const csvValido = csv.includes('Tiempo,Tipo,Proceso') && csv.split('\n').length > 1;
const resumenValido = resumen.totalEventos > 0;

console.log(`✅ Exportación JSON: ${jsonValido ? 'válida' : 'inválida'}`);
console.log(`✅ Exportación CSV: ${csvValido ? 'válida' : 'inválida'}`);
console.log(`✅ Resumen estadístico: ${resumenValido ? 'válido' : 'inválido'}`);

const todosLosTestsPasan = todosPresentes && jsonValido && csvValido && resumenValido;

console.log('\n🎯 RESULTADO FINAL:');
if (todosLosTestsPasan) {
  console.log('🎉 ¡Sistema de logging de eventos completamente funcional!');
  console.log('✅ Todos los eventos requeridos por la consigna están presentes');
  console.log('✅ Exportación JSON/CSV funciona correctamente');
} else {
  console.log('❌ Faltan algunos eventos o funcionalidades');
}
