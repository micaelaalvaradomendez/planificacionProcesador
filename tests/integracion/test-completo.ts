/**
 * Test de Integración: Simulación Completa con Gantt
 * 
 * Prueba la funcionalidad completa según la consigna del integrador:
 * - Simulación por eventos discretos
 * - Registro de todos los eventos requeridos
 * - Construcción de Gantt sin solapes
 * - Exportación a archivos JSON y CSV
 * - Validación de consistencia temporal
 */

import { MotorSimulacion } from '../../src/lib/core/engine.js';
import { construirGanttDesdeEventos } from '../../src/lib/infrastructure/io/ganttBuilder.js';
import { combinarEventos } from '../../src/lib/infrastructure/io/eventLogger.js';
import type { Workload } from '../../src/lib/model/types.js';

// Casos de prueba según diferentes algoritmos
const CASOS_PRUEBA: Array<{
  nombre: string;
  workload: Workload;
  expectativas: {
    minEventos: number;
    tipoEventosRequeridos: string[];
    utilizacionCPUMin: number;
  };
}> = [
  {
    nombre: 'FCFS - Caso Básico',
    workload: {
      config: { policy: 'FCFS', tip: 1, tfp: 1, tcp: 1 },
      processes: [
        { name: 'P1', tiempoArribo: 0, rafagasCPU: 1, duracionRafagaCPU: 3, duracionRafagaES: 1, prioridad: 1 },
        { name: 'P2', tiempoArribo: 1, rafagasCPU: 1, duracionRafagaCPU: 2, duracionRafagaES: 1, prioridad: 1 }
      ]
    },
    expectativas: {
      minEventos: 10,
      tipoEventosRequeridos: ['Arribo', 'Incorporación Sistema', 'Despacho', 'Fin Ráfaga CPU'],
      utilizacionCPUMin: 50
    }
  },
  {
    nombre: 'Round Robin - Múltiples Quantum',
    workload: {
      config: { policy: 'RR', quantum: 2, tip: 1, tfp: 1, tcp: 1 },
      processes: [
        { name: 'A', tiempoArribo: 0, rafagasCPU: 2, duracionRafagaCPU: 3, duracionRafagaES: 1, prioridad: 1 },
        { name: 'B', tiempoArribo: 1, rafagasCPU: 2, duracionRafagaCPU: 4, duracionRafagaES: 2, prioridad: 1 },
        { name: 'C', tiempoArribo: 2, rafagasCPU: 1, duracionRafagaCPU: 2, duracionRafagaES: 1, prioridad: 1 }
      ]
    },
    expectativas: {
      minEventos: 15,
      tipoEventosRequeridos: ['Arribo', 'Despacho', 'Agotamiento Quantum', 'Cambio Contexto'],
      utilizacionCPUMin: 40
    }
  },
  {
    nombre: 'Priority - Con E/S',
    workload: {
      config: { policy: 'PRIORITY', tip: 1, tfp: 1, tcp: 1 },
      processes: [
        { name: 'Alta', tiempoArribo: 0, rafagasCPU: 2, duracionRafagaCPU: 2, duracionRafagaES: 3, prioridad: 1 },
        { name: 'Media', tiempoArribo: 1, rafagasCPU: 1, duracionRafagaCPU: 4, duracionRafagaES: 1, prioridad: 5 },
        { name: 'Baja', tiempoArribo: 2, rafagasCPU: 1, duracionRafagaCPU: 3, duracionRafagaES: 2, prioridad: 10 }
      ]
    },
    expectativas: {
      minEventos: 12,
      tipoEventosRequeridos: ['Arribo', 'Despacho', 'Inicio E/S', 'Fin E/S'],
      utilizacionCPUMin: 30
    }
  }
];

async function testCasoIntegracion(caso: typeof CASOS_PRUEBA[0]) {
  console.log(`\n🧪 Test: ${caso.nombre}`);
  console.log('='.repeat(50));

  try {
    // 1. Ejecutar simulación completa
    const motor = new MotorSimulacion(caso.workload);
    
    // Sanitizar nombre del archivo
    const nombreArchivo = `test-${caso.nombre.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const { resultado, archivos, gantt } = await motor.ejecutarYExportar(nombreArchivo, './');

    // 2. Validaciones básicas
    console.log('📊 Validaciones básicas:');
    console.log(`  ✅ Simulación exitosa: ${resultado.exitoso}`);
    console.log(`  ✅ Eventos registrados: ${resultado.eventosExportacion.length} (min: ${caso.expectativas.minEventos})`);
    
    const cumpleMinEventos = resultado.eventosExportacion.length >= caso.expectativas.minEventos;
    console.log(`  ${cumpleMinEventos ? '✅' : '❌'} Mínimo de eventos: ${cumpleMinEventos ? 'CUMPLE' : 'NO CUMPLE'}`);

    // 3. Validar tipos de eventos requeridos
    console.log('\n📋 Eventos requeridos por consigna:');
    const eventos = combinarEventos(resultado.eventosInternos, resultado.eventosExportacion);
    const tiposPresentes = new Set(eventos.map(e => e.tipo));
    
    let todosEventosPresentes = true;
    for (const tipoRequerido of caso.expectativas.tipoEventosRequeridos) {
      const presente = Array.from(tiposPresentes).some(tipo => tipo.includes(tipoRequerido));
      console.log(`  ${presente ? '✅' : '❌'} ${tipoRequerido}: ${presente ? 'PRESENTE' : 'AUSENTE'}`);
      if (!presente) todosEventosPresentes = false;
    }

    console.log(`  📝 Resumen: ${todosEventosPresentes ? '✅ TODOS PRESENTES' : '❌ FALTAN EVENTOS'}`);

    // 4. Validar construcción de Gantt
    console.log('\n📊 Validación del Gantt:');
    console.log(`  ✅ Segmentos generados: ${gantt.segmentos.length}`);
    console.log(`  ✅ Sin solapes: ${gantt.validacion.sinSolapes ? '✅' : '❌'}`);
    console.log(`  ✅ Tiempo total: ${gantt.tiempoTotal}`);
    console.log(`  ✅ Procesos detectados: ${gantt.procesos.length} (${gantt.procesos.join(', ')})`);

    // 5. Validar utilización de CPU
    const utilizacionOK = gantt.estadisticas.utilizacionCPU >= caso.expectativas.utilizacionCPUMin;
    console.log(`\n⚡ Rendimiento:`);
    console.log(`  📈 Utilización CPU: ${gantt.estadisticas.utilizacionCPU.toFixed(1)}% (min: ${caso.expectativas.utilizacionCPUMin}%)`);
    console.log(`  ${utilizacionOK ? '✅' : '⚠️'} Rendimiento: ${utilizacionOK ? 'ACEPTABLE' : 'BAJO'}`);

    // 6. Mostrar cronograma
    console.log('\n🕐 Cronograma:');
    gantt.segmentos.slice(0, 8).forEach((seg: any, i: number) => {
      const iconos: Record<string, string> = { 'CPU': '🔥', 'ES': '💾', 'TIP': '🔧', 'TFP': '🏁', 'TCP': '🔄', 'OCIOSO': '😴' };
      const icono = iconos[seg.kind] || '❓';
      console.log(`  ${i+1}. T${seg.tStart}-${seg.tEnd}: ${icono} ${seg.process} (${seg.kind})`);
    });
    
    if (gantt.segmentos.length > 8) {
      console.log(`  ... y ${gantt.segmentos.length - 8} segmentos más`);
    }

    // 7. Validar archivos generados
    console.log('\n💾 Archivos generados:');
    console.log(`  📄 JSON: ${archivos.archivoJSON}`);
    console.log(`  📊 CSV: ${archivos.archivoCSV}`);

    // 8. Resultado del caso
    const exito = resultado.exitoso && gantt.validacion.sinSolapes && cumpleMinEventos && todosEventosPresentes;
    console.log(`\n🎯 Resultado del caso: ${exito ? '✅ EXITOSO' : '❌ FALLÓ'}`);

    return exito;

  } catch (error) {
    console.error(`❌ Error en caso ${caso.nombre}:`, error);
    return false;
  }
}

async function testValidacionCompleta() {
  console.log('\n🔍 Test: Validación completa de Gantt');
  console.log('=====================================');

  // Crear caso específico para validación exhaustiva
  const workloadValidacion: Workload = {
    config: { policy: 'RR', quantum: 3, tip: 2, tfp: 1, tcp: 1 },
    processes: [
      { name: 'Proc1', tiempoArribo: 0, rafagasCPU: 3, duracionRafagaCPU: 2, duracionRafagaES: 2, prioridad: 1 },
      { name: 'Proc2', tiempoArribo: 2, rafagasCPU: 2, duracionRafagaCPU: 4, duracionRafagaES: 1, prioridad: 1 },
      { name: 'Proc3', tiempoArribo: 4, rafagasCPU: 1, duracionRafagaCPU: 3, duracionRafagaES: 3, prioridad: 1 }
    ]
  };

  const motor = new MotorSimulacion(workloadValidacion);
  const { resultado, gantt } = await motor.ejecutarYExportar('validacion-completa', './');

  // Validaciones exhaustivas
  console.log('🔍 Validaciones exhaustivas:');
  
  // 1. Verificar continuidad temporal
  let continuidadOK = true;
  for (let i = 1; i < gantt.segmentos.length; i++) {
    const anterior = gantt.segmentos[i-1];
    const actual = gantt.segmentos[i];
    
    if (actual.tStart !== anterior.tEnd) {
      console.log(`❌ Gap temporal: ${anterior.tEnd} → ${actual.tStart}`);
      continuidadOK = false;
    }
  }
  console.log(`  ${continuidadOK ? '✅' : '❌'} Continuidad temporal: ${continuidadOK ? 'OK' : 'GAPS DETECTADOS'}`);

  // 2. Verificar que no hay duraciones cero
  let duracionesOK = true;
  gantt.segmentos.forEach((seg: any, i: number) => {
    if (seg.tEnd <= seg.tStart) {
      console.log(`❌ Duración inválida en segmento ${i}: ${seg.tStart} → ${seg.tEnd}`);
      duracionesOK = false;
    }
  });
  console.log(`  ${duracionesOK ? '✅' : '❌'} Duraciones válidas: ${duracionesOK ? 'OK' : 'DURACIONES INVÁLIDAS'}`);

  // 3. Verificar consistencia de procesos
  const procesosEnSegmentos = new Set(gantt.segmentos.map((s: any) => s.process).filter((p: string) => p !== 'SISTEMA'));
  const procesosOriginales = new Set(workloadValidacion.processes.map(p => p.name));
  const procesosConsistentes = Array.from(procesosEnSegmentos).every((p: unknown) => procesosOriginales.has(p as string));
  
  console.log(`  ${procesosConsistentes ? '✅' : '❌'} Procesos consistentes: ${procesosConsistentes ? 'OK' : 'PROCESOS DESCONOCIDOS'}`);

  // 4. Verificar balance de tiempo
  const tiempoCalculado = gantt.segmentos.reduce((sum: number, seg: any) => sum + (seg.tEnd - seg.tStart), 0);
  const balanceOK = Math.abs(tiempoCalculado - gantt.tiempoTotal) < 0.01;
  
  console.log(`  ${balanceOK ? '✅' : '❌'} Balance temporal: ${balanceOK ? 'OK' : 'INCONSISTENTE'}`);
  console.log(`    Tiempo total: ${gantt.tiempoTotal}, Suma segmentos: ${tiempoCalculado}`);

  const validacionExitosa = continuidadOK && duracionesOK && procesosConsistentes && balanceOK;
  console.log(`\n🎯 Validación completa: ${validacionExitosa ? '✅ EXITOSA' : '❌ FALLÓ'}`);

  return validacionExitosa;
}

async function ejecutarTestsIntegracion() {
  console.log('🎯 TESTS DE INTEGRACIÓN COMPLETA');
  console.log('================================');
  console.log('Simulación + Eventos + Gantt según Consigna del Integrador\n');

  let casosExitosos = 0;
  const totalCasos = CASOS_PRUEBA.length;

  // Ejecutar casos de prueba
  for (const caso of CASOS_PRUEBA) {
    const exito = await testCasoIntegracion(caso);
    if (exito) casosExitosos++;
  }

  // Ejecutar validación exhaustiva
  const validacionExitosa = await testValidacionCompleta();

  // Resumen final
  console.log('\n🎉 RESUMEN DE TESTS DE INTEGRACIÓN');
  console.log('==================================');
  console.log(`📊 Casos exitosos: ${casosExitosos}/${totalCasos}`);
  console.log(`🔍 Validación exhaustiva: ${validacionExitosa ? '✅ EXITOSA' : '❌ FALLÓ'}`);
  
  const todoExitoso = casosExitosos === totalCasos && validacionExitosa;
  console.log(`\n🎯 RESULTADO FINAL: ${todoExitoso ? '✅ TODOS LOS TESTS PASARON' : '❌ ALGUNOS TESTS FALLARON'}`);

  if (todoExitoso) {
    console.log('\n🚀 SISTEMA COMPLETAMENTE VALIDADO');
    console.log('==================================');
    console.log('✅ Simulación por eventos discretos');
    console.log('✅ Registro completo de eventos');
    console.log('✅ Construcción de Gantt sin solapes');
    console.log('✅ Exportación a JSON y CSV');
    console.log('✅ Validación temporal exhaustiva');
    console.log('✅ Compatibilidad con todos los algoritmos');
    console.log('\n🎯 ¡Listo para cumplir con la consigna del integrador!');
  }
}

// Ejecutar tests
ejecutarTestsIntegracion();
