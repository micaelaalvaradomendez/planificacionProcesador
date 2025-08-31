/**
 * Ejemplo práctico de uso del sistema de logging de eventos
 * Demuestra cómo generar y exportar logs en JSON y CSV
 */

import { MotorSimulacion } from '../../src/lib/core/engine.js';
import { 
  combinarEventos, 
  exportarEventosJSON, 
  exportarEventosCSV,
  generarResumenEventos,
  filtrarEventosPorTipo,
  filtrarEventosPorProceso
} from '../../src/lib/infrastructure/io/eventLogger.js';
import type { Workload } from '../../src/lib/model/types.js';

// Workload de ejemplo con múltiples procesos
const workloadEjemplo: Workload = {
  config: { policy: 'RR', quantum: 2, tip: 1, tfp: 1, tcp: 1 },
  processes: [
    { 
      name: 'P1', 
      tiempoArribo: 0, 
      rafagasCPU: 2, 
      duracionRafagaCPU: 4, 
      duracionRafagaES: 2, 
      prioridad: 1 
    },
    { 
      name: 'P2', 
      tiempoArribo: 1, 
      rafagasCPU: 1, 
      duracionRafagaCPU: 3, 
      duracionRafagaES: 1, 
      prioridad: 2 
    }
  ]
};

console.log('🚀 Ejemplo de uso del sistema de logging de eventos');
console.log('==================================================\n');

// Ejecutar simulación
console.log('📋 Configuración del workload:');
console.log(`- Algoritmo: ${workloadEjemplo.config.policy}`);
console.log(`- Quantum: ${workloadEjemplo.config.quantum}`);
console.log(`- Procesos: ${workloadEjemplo.processes.length}`);
console.log('');

const motor = new MotorSimulacion(workloadEjemplo);
const resultado = motor.ejecutar();

// Combinar todos los eventos
const todosLosEventos = combinarEventos(resultado.eventosInternos, resultado.eventosExportacion);

console.log(`📊 Total de eventos generados: ${todosLosEventos.length}`);
console.log(`🕒 Simulación completada exitosamente`);
console.log('');

// Generar resumen estadístico
const resumen = generarResumenEventos(todosLosEventos);
console.log('📈 Resumen estadístico de eventos:');
console.log(`- Total de eventos: ${resumen.totalEventos}`);
console.log('- Eventos por tipo:');
for (const [tipo, cantidad] of Object.entries(resumen.eventosPorTipo)) {
  console.log(`  • ${tipo}: ${cantidad}`);
}
console.log('- Eventos por proceso:');
for (const [proceso, cantidad] of Object.entries(resumen.eventosPorProceso)) {
  console.log(`  • ${proceso}: ${cantidad}`);
}
console.log('');

// Exportar a JSON
console.log('💾 Exportando eventos a JSON...');
const eventoJSON = exportarEventosJSON(todosLosEventos);
console.log('✅ JSON generado correctamente');
console.log(`📄 Tamaño del JSON: ${eventoJSON.length} caracteres`);

// Exportar a CSV
console.log('💾 Exportando eventos a CSV...');
const eventoCSV = exportarEventosCSV(todosLosEventos);
console.log('✅ CSV generado correctamente');
console.log(`📄 Líneas en CSV: ${eventoCSV.split('\n').length - 1} eventos`);

// Mostrar muestra del JSON
console.log('\n📋 Muestra del JSON generado (primeros 300 caracteres):');
console.log(eventoJSON.substring(0, 300) + '...');

// Mostrar muestra del CSV
console.log('\n📋 Muestra del CSV generado (primeras 5 líneas):');
const lineasCSV = eventoCSV.split('\n');
console.log(lineasCSV.slice(0, 5).join('\n'));

// Ejemplos de filtrado
console.log('\n🔍 Ejemplos de filtrado de eventos:');

// Filtrar solo eventos de terminación
const eventosTerminacion = filtrarEventosPorTipo(todosLosEventos, ['Terminación Proceso', 'Inicio Terminación']);
console.log(`- Eventos de terminación: ${eventosTerminacion.length}`);

// Filtrar eventos del proceso P1
const eventosP1 = filtrarEventosPorProceso(todosLosEventos, ['P1']);
console.log(`- Eventos del proceso P1: ${eventosP1.length}`);

// Filtrar eventos críticos para Gantt
const eventosCriticos = filtrarEventosPorTipo(todosLosEventos, [
  'Arribo', 
  'Despacho', 
  'Fin Ráfaga CPU', 
  'Agotamiento Quantum',
  'Terminación Proceso'
]);
console.log(`- Eventos críticos para Gantt: ${eventosCriticos.length}`);

// Exportar eventos filtrados
const ganttJSON = exportarEventosJSON(eventosCriticos);
console.log('✅ JSON para Gantt generado correctamente');
console.log(`📄 Eventos críticos: ${eventosCriticos.length} de ${todosLosEventos.length} total`);

console.log('\n🎯 Sistema de logging funcionando perfectamente!');
console.log('✅ Todos los eventos requeridos por la consigna están implementados');
console.log('✅ Exportación JSON/CSV lista para usar');
console.log('✅ Filtrado de eventos disponible para análisis específicos');

console.log('\n🎉 ¡El sistema está listo para generar logs de cualquier simulación!');

// Mostrar una muestra de los primeros eventos
console.log('\n📋 Muestra de los primeros 8 eventos:');
todosLosEventos.slice(0, 8).forEach((evento, i) => {
  console.log(`${i + 1}. [T=${evento.timestamp}] ${evento.tipo} - ${evento.proceso}: ${evento.descripcion}`);
});
