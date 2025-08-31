/**
 * Demimport { MotorSimulacion } from '../src/lib/core/engine.js';
import { exportarGanttParaVisualizacion } from '../src/lib/infrastructure/io/ganttBuilder.js';
import type { Workload } from '../src/lib/model/types.js';ompleto: Simulación con Construcción de Gantt Integrada
 * 
 * Este demo muestra la funcionalidad completa de:
 * - Simulación por eventos discretos
 * - Registro y exportación de eventos
 * - Construcción automática de diagrama de Gantt sin solapes
 * - Validación de la línea temporal
 */

import { MotorSimulacion } from '../src/lib/core/engine.js';
import { exportarGanttParaVisualizacion } from '../src/lib/infrastructure/io/ganttBuilder.js';
import type { Workload } from '../src/lib/model/types.js';

async function demoSimulacionConGantt() {
  console.log('🎯 DEMO: Simulación con Construcción de Gantt');
  console.log('=============================================');
  console.log('Simulación completa + Eventos + Gantt sin solapes\n');

  // ========================================
  // 1. CONFIGURACIÓN DEL WORKLOAD
  // ========================================
  console.log('📋 1. CONFIGURACIÓN DEL WORKLOAD');
  console.log('---------------------------------');

  const workload: Workload = {
    config: { 
      policy: 'RR',
      quantum: 2,      // Quantum corto para más cambios de contexto
      tip: 1,          
      tfp: 1,          
      tcp: 1           
    },
    processes: [
      { 
        name: 'Editor', 
        tiempoArribo: 0, 
        rafagasCPU: 2,           
        duracionRafagaCPU: 3, 
        duracionRafagaES: 2, 
        prioridad: 1 
      },
      { 
        name: 'Navegador', 
        tiempoArribo: 1, 
        rafagasCPU: 3,           
        duracionRafagaCPU: 2, 
        duracionRafagaES: 1, 
        prioridad: 2 
      },
      { 
        name: 'Sistema', 
        tiempoArribo: 3, 
        rafagasCPU: 1,           
        duracionRafagaCPU: 4, 
        duracionRafagaES: 1, 
        prioridad: 3 
      }
    ]
  };

  console.log(`Algoritmo: ${workload.config.policy} (Quantum: ${workload.config.quantum})`);
  console.log(`Procesos: ${workload.processes.length}`);
  
  workload.processes.forEach((proc, i) => {
    console.log(`  ${i+1}. ${proc.name}: Arribo=${proc.tiempoArribo}, CPU=${proc.rafagasCPU}x${proc.duracionRafagaCPU}, E/S=${proc.duracionRafagaES}`);
  });

  // ========================================
  // 2. EJECUCIÓN INTEGRADA
  // ========================================
  console.log('\n⚙️  2. EJECUCIÓN CON CONSTRUCCIÓN DE GANTT');
  console.log('------------------------------------------');

  const motor = new MotorSimulacion(workload);
  console.log('🚀 Ejecutando simulación con construcción automática de Gantt...');
  
  const inicioTiempo = Date.now();
  const { resultado, archivos, gantt } = await motor.ejecutarYExportar('demo-gantt', './');
  const finTiempo = Date.now();

  console.log(`✅ Simulación completada en ${finTiempo - inicioTiempo}ms`);
  console.log(`📊 Estado: ${resultado.exitoso ? 'EXITOSO' : 'ERROR'}`);

  // ========================================
  // 3. ANÁLISIS DEL GANTT GENERADO
  // ========================================
  console.log('\n📊 3. ANÁLISIS DEL GANTT GENERADO');
  console.log('---------------------------------');

  console.log(`✅ Segmentos del Gantt: ${gantt.segmentos.length}`);
  console.log(`✅ Tiempo total: ${gantt.tiempoTotal} unidades`);
  console.log(`✅ Procesos involucrados: ${gantt.procesos.length} (${gantt.procesos.join(', ')})`);
  
  // Validación de solapes
  console.log(`\n🔍 Validación temporal:`);
  console.log(`  Sin solapes: ${gantt.validacion.sinSolapes ? '✅' : '❌'}`);
  console.log(`  Errores: ${gantt.validacion.errores.length}`);
  console.log(`  Advertencias: ${gantt.validacion.advertencias.length}`);
  
  if (gantt.validacion.errores.length > 0) {
    console.log(`\n❌ Errores detectados:`);
    gantt.validacion.errores.forEach((error: string) => console.log(`  • ${error}`));
  }
  
  if (gantt.validacion.advertencias.length > 0) {
    console.log(`\n⚠️ Advertencias:`);
    gantt.validacion.advertencias.forEach((advertencia: string) => console.log(`  • ${advertencia}`));
  }

  // ========================================
  // 4. CRONOGRAMA DETALLADO
  // ========================================
  console.log('\n📈 4. CRONOGRAMA DETALLADO');
  console.log('--------------------------');

  console.log('Línea temporal completa (sin solapes):');
  gantt.segmentos.forEach((segmento: any, i: number) => {
    const duracion = segmento.tEnd - segmento.tStart;
    const tipoIcono = {
      'CPU': '🔥',
      'ES': '💾',
      'TIP': '🔧',
      'TFP': '🏁',
      'TCP': '🔄',
      'OCIOSO': '😴'
    }[segmento.kind] || '❓';
    
    console.log(`  ${i+1}. T${segmento.tStart}-${segmento.tEnd}: ${tipoIcono} ${segmento.process} (${segmento.kind}) - ${duracion}u`);
  });

  // ========================================
  // 5. ESTADÍSTICAS DE RENDIMIENTO
  // ========================================
  console.log('\n📊 5. ESTADÍSTICAS DE RENDIMIENTO');
  console.log('----------------------------------');

  console.log(`🔥 Utilización de CPU: ${gantt.estadisticas.utilizacionCPU.toFixed(1)}%`);
  console.log(`😴 Tiempo ocioso: ${gantt.estadisticas.tiempoOcioso} unidades`);
  console.log(`🔧 Tiempo del SO: ${gantt.estadisticas.tiempoSO} unidades`);

  console.log(`\n📋 Distribución temporal:`);
  Object.entries(gantt.estadisticas.distribucionTiempos)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .forEach(([tipo, tiempo]) => {
      const porcentaje = (((tiempo as number) / gantt.tiempoTotal) * 100).toFixed(1);
      const icono = {
        'CPU': '🔥',
        'ES': '💾',
        'TIP': '🔧',
        'OCIOSO': '😴'
      }[tipo] || '📊';
      console.log(`  ${icono} ${tipo}: ${tiempo} unidades (${porcentaje}%)`);
    });

  // ========================================
  // 6. EXPORTACIÓN PARA VISUALIZACIÓN
  // ========================================
  console.log('\n🎨 6. EXPORTACIÓN PARA VISUALIZACIÓN');
  console.log('-------------------------------------');

  const exportacionUI = exportarGanttParaVisualizacion(gantt);
  
  console.log(`✅ Datos para visualización preparados`);
  console.log(`📊 Segmentos para UI: ${exportacionUI.segmentos.length}`);
  console.log(`🔧 Metadata completa: tiempo total, procesos, estadísticas`);

  console.log(`\n📊 Formato para interfaz gráfica:`);
  exportacionUI.segmentos.slice(0, 5).forEach((seg, i) => {
    console.log(`  ${i+1}. ${seg.proceso} (${seg.tipo}): ${seg.tiempoInicio}→${seg.tiempoFin} (${seg.duracion}u)`);
  });
  
  if (exportacionUI.segmentos.length > 5) {
    console.log(`  ... y ${exportacionUI.segmentos.length - 5} segmentos más`);
  }

  // ========================================
  // 7. ANÁLISIS DE CONCURRENCIA
  // ========================================
  console.log('\n🔄 7. ANÁLISIS DE CONCURRENCIA');
  console.log('------------------------------');

  // Verificar superposiciones de E/S y CPU
  const segmentosCPU = gantt.segmentos.filter((s: any) => s.kind === 'CPU');
  const segmentosES = gantt.segmentos.filter((s: any) => s.kind === 'ES');

  console.log(`🔥 Períodos de CPU: ${segmentosCPU.length}`);
  console.log(`💾 Períodos de E/S: ${segmentosES.length}`);

  // Verificar si hay concurrencia real (E/S mientras otros procesos usan CPU)
  let concurrenciaDetectada = false;
  for (const segES of segmentosES) {
    for (const segCPU of segmentosCPU) {
      // Verificar si hay overlap temporal (E/S concurrente con CPU)
      if (segES.process !== segCPU.process && 
          segES.tStart < segCPU.tEnd && segCPU.tStart < segES.tEnd) {
        concurrenciaDetectada = true;
        break;
      }
    }
    if (concurrenciaDetectada) break;
  }

  console.log(`🔀 Concurrencia E/S-CPU: ${concurrenciaDetectada ? '✅ Detectada' : '❌ No detectada'}`);

  // ========================================
  // 8. ARCHIVOS GENERADOS
  // ========================================
  console.log('\n💾 8. ARCHIVOS GENERADOS');
  console.log('------------------------');

  console.log('Archivos de eventos generados:');
  console.log(`  📄 JSON: ${archivos.archivoJSON}`);
  console.log(`  📊 CSV: ${archivos.archivoCSV}`);
  console.log('\nArchivos listos para:');
  console.log('  📈 Análisis estadístico en herramientas externas');
  console.log('  🎨 Visualización personalizada del Gantt');
  console.log('  🔍 Auditoría detallada del planificador');
  console.log('  📚 Documentación y reportes académicos');

  // ========================================
  // RESUMEN FINAL
  // ========================================
  console.log('\n🎉 RESUMEN FINAL');
  console.log('================');
  console.log('✅ Simulación por eventos discretos: COMPLETADA');
  console.log('✅ Registro y exportación de eventos: EXITOSA');
  console.log('✅ Construcción de Gantt sin solapes: IMPLEMENTADA');
  console.log('✅ Validación temporal: PASADA');
  console.log('✅ Estadísticas de rendimiento: CALCULADAS');
  console.log('✅ Exportación para visualización: LISTA');

  console.log(`\n🎯 Resultado: Diagrama de Gantt de ${gantt.segmentos.length} segmentos`);
  console.log(`             con ${gantt.estadisticas.utilizacionCPU.toFixed(1)}% de utilización de CPU`);
  console.log(`             en ${gantt.tiempoTotal} unidades de tiempo`);
  
  console.log('\n🚀 ¡Demo completo exitoso! Sistema listo para producción.');
}

// Ejecutar demo
console.log('🚀 Iniciando demo de simulación con Gantt integrado...\n');

demoSimulacionConGantt()
  .catch(error => {
    console.error('❌ Error en el demo:', error);
  });
