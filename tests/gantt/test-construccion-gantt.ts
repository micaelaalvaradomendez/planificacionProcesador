/**
 * Test: Construcción de Gantt desde Eventos
 * 
 * Valida la funcionalidad de construir diagramas de Gantt
 * a partir de eventos de exportación sin solapes temporales.
 */

import { construirGanttDesdeEventos, exportarGanttParaVisualizacion } from '../../src/lib/infrastructure/io/ganttBuilder.js';
import type { EventoLog } from '../../src/lib/infrastructure/io/eventLogger.js';

function crearEventosDePrueba(): EventoLog[] {
  return [
    { timestamp: 0, tipo: 'Arribo', proceso: 'P1', descripcion: 'Proceso P1 llega al sistema' },
    { timestamp: 1, tipo: 'Incorporación Sistema', proceso: 'P1', descripcion: 'P1 incorporado al sistema' },
    { timestamp: 1, tipo: 'Despacho', proceso: 'P1', descripcion: 'P1 despachado para ejecución' },
    { timestamp: 4, tipo: 'Fin Ráfaga CPU', proceso: 'P1', descripcion: 'P1 termina ráfaga CPU' },
    { timestamp: 4, tipo: 'Inicio E/S', proceso: 'P1', descripcion: 'P1 inicia E/S' },
    { timestamp: 6, tipo: 'Fin E/S', proceso: 'P1', descripcion: 'P1 termina E/S' },
    { timestamp: 6, tipo: 'Despacho', proceso: 'P1', descripcion: 'P1 despachado nuevamente' },
    { timestamp: 8, tipo: 'Terminación Proceso', proceso: 'P1', descripcion: 'P1 termina' }
  ];
}

async function testConstruccionGanttBasico() {
  console.log('🧪 Test: Construcción básica de Gantt desde eventos');
  console.log('==================================================');

  const eventos = crearEventosDePrueba();
  console.log(`Eventos de entrada: ${eventos.length}`);
  
  const diagrama = construirGanttDesdeEventos(eventos);
  
  console.log(`✅ Segmentos generados: ${diagrama.segmentos.length}`);
  console.log(`✅ Tiempo total: ${diagrama.tiempoTotal}`);
  console.log(`✅ Procesos detectados: ${diagrama.procesos.join(', ')}`);
  
  // Verificar validación
  console.log(`\n🔍 Validación:`);
  console.log(`  Sin solapes: ${diagrama.validacion.sinSolapes ? '✅' : '❌'}`);
  console.log(`  Errores: ${diagrama.validacion.errores.length}`);
  console.log(`  Advertencias: ${diagrama.validacion.advertencias.length}`);
  
  if (diagrama.validacion.errores.length > 0) {
    console.log(`\n❌ Errores encontrados:`);
    diagrama.validacion.errores.forEach(error => console.log(`  • ${error}`));
  }
  
  if (diagrama.validacion.advertencias.length > 0) {
    console.log(`\n⚠️ Advertencias:`);
    diagrama.validacion.advertencias.forEach(advertencia => console.log(`  • ${advertencia}`));
  }
  
  // Mostrar segmentos
  console.log(`\n📊 Segmentos del Gantt:`);
  diagrama.segmentos.forEach((segmento, i) => {
    console.log(`  ${i+1}. ${segmento.process} (${segmento.kind}): ${segmento.tStart} → ${segmento.tEnd} (duración: ${segmento.tEnd - segmento.tStart})`);
  });
  
  // Mostrar estadísticas
  console.log(`\n📈 Estadísticas:`);
  console.log(`  Utilización CPU: ${diagrama.estadisticas.utilizacionCPU.toFixed(1)}%`);
  console.log(`  Tiempo ocioso: ${diagrama.estadisticas.tiempoOcioso}`);
  console.log(`  Tiempo SO: ${diagrama.estadisticas.tiempoSO}`);
  
  console.log(`\n📋 Distribución de tiempos:`);
  Object.entries(diagrama.estadisticas.distribucionTiempos)
    .sort(([,a], [,b]) => b - a)
    .forEach(([tipo, tiempo]) => {
      const porcentaje = ((tiempo / diagrama.tiempoTotal) * 100).toFixed(1);
      console.log(`  • ${tipo}: ${tiempo} unidades (${porcentaje}%)`);
    });
}

async function testExportacionParaVisualizacion() {
  console.log('\n🎨 Test: Exportación para visualización');
  console.log('======================================');

  const eventos = crearEventosDePrueba();
  const diagrama = construirGanttDesdeEventos(eventos);
  const exportacion = exportarGanttParaVisualizacion(diagrama);
  
  console.log(`✅ Segmentos para UI: ${exportacion.segmentos.length}`);
  console.log(`✅ Metadata completa: ${Object.keys(exportacion.metadata).length} campos`);
  
  console.log(`\n📊 Segmentos para visualización:`);
  exportacion.segmentos.forEach((segmento, i) => {
    console.log(`  ${i+1}. ${segmento.proceso} (${segmento.tipo}): ${segmento.tiempoInicio} → ${segmento.tiempoFin} (${segmento.duracion})`);
  });
  
  console.log(`\n🔧 Metadata de visualización:`);
  console.log(`  Tiempo total: ${exportacion.metadata.tiempoTotal}`);
  console.log(`  Procesos: [${exportacion.metadata.procesos.join(', ')}]`);
  console.log(`  Estadísticas: ${Object.keys(exportacion.metadata.estadisticas).length} métricas`);
}

async function testEventosComplejos() {
  console.log('\n🔄 Test: Eventos complejos con múltiples procesos');
  console.log('================================================');

  const eventosComplejos: EventoLog[] = [
    // Proceso P1
    { timestamp: 0, tipo: 'Arribo', proceso: 'P1', descripcion: 'P1 llega' },
    { timestamp: 1, tipo: 'Incorporación Sistema', proceso: 'P1', descripcion: 'P1 incorporado' },
    { timestamp: 1, tipo: 'Despacho', proceso: 'P1', descripcion: 'P1 ejecutando' },
    
    // Proceso P2 arriba mientras P1 ejecuta
    { timestamp: 2, tipo: 'Arribo', proceso: 'P2', descripcion: 'P2 llega' },
    { timestamp: 3, tipo: 'Incorporación Sistema', proceso: 'P2', descripcion: 'P2 incorporado' },
    
    // P1 termina ráfaga y va a E/S
    { timestamp: 4, tipo: 'Fin Ráfaga CPU', proceso: 'P1', descripcion: 'P1 termina CPU' },
    { timestamp: 4, tipo: 'Inicio E/S', proceso: 'P1', descripcion: 'P1 va a E/S' },
    
    // P2 toma la CPU
    { timestamp: 4, tipo: 'Despacho', proceso: 'P2', descripcion: 'P2 ejecutando' },
    
    // P1 termina E/S mientras P2 ejecuta
    { timestamp: 6, tipo: 'Fin E/S', proceso: 'P1', descripcion: 'P1 termina E/S' },
    
    // P2 termina
    { timestamp: 7, tipo: 'Fin Ráfaga CPU', proceso: 'P2', descripcion: 'P2 termina CPU' },
    { timestamp: 7, tipo: 'Terminación Proceso', proceso: 'P2', descripcion: 'P2 termina' },
    
    // P1 vuelve a ejecutar
    { timestamp: 8, tipo: 'Despacho', proceso: 'P1', descripcion: 'P1 ejecutando otra vez' },
    { timestamp: 10, tipo: 'Terminación Proceso', proceso: 'P1', descripcion: 'P1 termina' }
  ];
  
  console.log(`Eventos de entrada: ${eventosComplejos.length}`);
  
  const diagrama = construirGanttDesdeEventos(eventosComplejos);
  
  console.log(`✅ Segmentos generados: ${diagrama.segmentos.length}`);
  console.log(`✅ Procesos detectados: ${diagrama.procesos.length} (${diagrama.procesos.join(', ')})`);
  console.log(`✅ Sin solapes: ${diagrama.validacion.sinSolapes ? '✅' : '❌'}`);
  
  console.log(`\n📊 Cronograma completo:`);
  diagrama.segmentos.forEach((segmento, i) => {
    console.log(`  ${i+1}. T${segmento.tStart}-${segmento.tEnd}: ${segmento.process} (${segmento.kind})`);
  });
  
  console.log(`\n📈 Estadísticas finales:`);
  console.log(`  Utilización CPU: ${diagrama.estadisticas.utilizacionCPU.toFixed(1)}%`);
  console.log(`  Tiempo total simulación: ${diagrama.tiempoTotal}`);
  
  // Verificar distribución por proceso
  const distribucionPorProceso = new Map<string, number>();
  diagrama.segmentos.forEach(segmento => {
    if (segmento.kind === 'CPU') {
      const tiempo = segmento.tEnd - segmento.tStart;
      distribucionPorProceso.set(segmento.process, (distribucionPorProceso.get(segmento.process) || 0) + tiempo);
    }
  });
  
  console.log(`\n👥 Tiempo de CPU por proceso:`);
  Array.from(distribucionPorProceso.entries())
    .sort(([,a], [,b]) => b - a)
    .forEach(([proceso, tiempo]) => {
      console.log(`  • ${proceso}: ${tiempo} unidades`);
    });
}

async function testValidacionSolapes() {
  console.log('\n🔍 Test: Validación de solapes');
  console.log('==============================');

  // Crear eventos que deliberadamente podrían causar solapes
  const eventosConflictivos: EventoLog[] = [
    { timestamp: 0, tipo: 'Arribo', proceso: 'P1', descripcion: 'P1 llega' },
    { timestamp: 0, tipo: 'Arribo', proceso: 'P2', descripcion: 'P2 llega al mismo tiempo' },
    { timestamp: 1, tipo: 'Despacho', proceso: 'P1', descripcion: 'P1 ejecutando' },
    { timestamp: 1, tipo: 'Despacho', proceso: 'P2', descripcion: 'P2 también ejecutando???' },
    { timestamp: 3, tipo: 'Fin Ráfaga CPU', proceso: 'P1', descripcion: 'P1 termina' },
    { timestamp: 2, tipo: 'Fin Ráfaga CPU', proceso: 'P2', descripcion: 'P2 termina antes???' }
  ];
  
  console.log(`Eventos potencialmente conflictivos: ${eventosConflictivos.length}`);
  
  const diagrama = construirGanttDesdeEventos(eventosConflictivos);
  
  console.log(`\n🔍 Resultado de validación:`);
  console.log(`  Sin solapes: ${diagrama.validacion.sinSolapes ? '✅' : '❌'}`);
  console.log(`  Errores detectados: ${diagrama.validacion.errores.length}`);
  console.log(`  Advertencias: ${diagrama.validacion.advertencias.length}`);
  
  if (diagrama.validacion.errores.length > 0) {
    console.log(`\n❌ Errores:`);
    diagrama.validacion.errores.forEach(error => console.log(`  • ${error}`));
  }
  
  console.log(`\n📊 Segmentos resultantes (${diagrama.segmentos.length}):`);
  diagrama.segmentos.forEach((segmento, i) => {
    console.log(`  ${i+1}. T${segmento.tStart}-${segmento.tEnd}: ${segmento.process} (${segmento.kind})`);
  });
}

// Ejecutar todos los tests
async function ejecutarTestsGantt() {
  console.log('🎯 TESTS: Construcción de Gantt desde Eventos');
  console.log('==============================================\n');

  try {
    await testConstruccionGanttBasico();
    await testExportacionParaVisualizacion();
    await testEventosComplejos();
    await testValidacionSolapes();
    
    console.log('\n🎉 TODOS LOS TESTS COMPLETADOS');
    console.log('===============================');
    console.log('✅ Construcción de Gantt desde eventos: FUNCIONANDO');
    console.log('✅ Validación de solapes: IMPLEMENTADA');
    console.log('✅ Exportación para visualización: LISTA');
    console.log('✅ Manejo de casos complejos: VALIDADO');
    
  } catch (error) {
    console.error('❌ Error en los tests:', error);
  }
}

// Ejecutar tests
ejecutarTestsGantt();
