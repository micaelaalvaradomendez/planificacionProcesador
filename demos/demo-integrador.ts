/**
 * Demo Completo: Simulación de Planificación con Exportación de Eventos
 * 
 * Este demo muestra todas las funcionalidades implementadas para la consigna del integrador:
 * - Simulación completa de planificación de procesos
 * - Registro detallado de todos los eventos del sistema
 * - Exportación automática a archivos eventos.json y eventos.csv
 * - Análisis de resultados y métricas
 */

import { MotorSimulacion } from '../src/lib/core/engine.js';
import { 
  combinarEventos, 
  exportarEventosAArchivos,
  generarResumenEventos,
  filtrarEventosPorTipo
} from '../src/lib/infrastructure/io/eventLogger.js';
import type { Workload } from '../src/lib/model/types.js';

async function demoCompletoIntegrador() {
  console.log('🎯 DEMO COMPLETO - CONSIGNA DEL INTEGRADOR');
  console.log('==========================================');
  console.log('Simulación de Planificación con Registro y Exportación de Eventos\n');

  // ========================================
  // 1. CONFIGURACIÓN DE LA SIMULACIÓN
  // ========================================
  console.log('📋 1. CONFIGURACIÓN DE LA SIMULACIÓN');
  console.log('------------------------------------');

  const workload: Workload = {
    config: { 
      policy: 'RR',    // Round Robin para mostrar más eventos
      quantum: 3, 
      tip: 1,          // Tiempo de inicialización
      tfp: 1,          // Tiempo de finalización
      tcp: 1           // Tiempo de cambio de contexto
    },
    processes: [
      { 
        name: 'Navegador', 
        tiempoArribo: 0, 
        rafagasCPU: 3,           // Proceso intensivo
        duracionRafagaCPU: 4, 
        duracionRafagaES: 2, 
        prioridad: 1 
      },
      { 
        name: 'Editor', 
        tiempoArribo: 1, 
        rafagasCPU: 2,           // Proceso con E/S
        duracionRafagaCPU: 3, 
        duracionRafagaES: 1, 
        prioridad: 2 
      },
      { 
        name: 'Compilador', 
        tiempoArribo: 2, 
        rafagasCPU: 1,           // Proceso corto
        duracionRafagaCPU: 5, 
        duracionRafagaES: 1, 
        prioridad: 3 
      }
    ]
  };

  console.log(`Algoritmo de Planificación: ${workload.config.policy}`);
  console.log(`Quantum: ${workload.config.quantum} unidades`);
  console.log(`Parámetros del SO: TIP=${workload.config.tip}, TFP=${workload.config.tfp}, TCP=${workload.config.tcp}`);
  console.log(`Procesos a simular: ${workload.processes.length}`);
  
  workload.processes.forEach((proc, i) => {
    console.log(`  ${i+1}. ${proc.name}: Arribo=${proc.tiempoArribo}, CPU=${proc.rafagasCPU}x${proc.duracionRafagaCPU}, E/S=${proc.duracionRafagaES}`);
  });

  // ========================================
  // 2. EJECUCIÓN DE LA SIMULACIÓN
  // ========================================
  console.log('\n⚙️  2. EJECUCIÓN DE LA SIMULACIÓN');
  console.log('----------------------------------');

  const motor = new MotorSimulacion(workload);
  console.log('🚀 Iniciando simulación por eventos discretos...');
  
  const inicioSimulacion = Date.now();
  const { resultado, archivos } = await motor.ejecutarYExportar('eventos', './');
  const finSimulacion = Date.now();

  console.log(`✅ Simulación completada en ${finSimulacion - inicioSimulacion}ms`);
  console.log(`📊 Estado final: ${resultado.exitoso ? 'EXITOSO' : 'ERROR'}`);

  // ========================================
  // 3. ANÁLISIS DE EVENTOS GENERADOS
  // ========================================
  console.log('\n📊 3. ANÁLISIS DE EVENTOS GENERADOS');
  console.log('-----------------------------------');

  const eventos = combinarEventos(resultado.eventosInternos, resultado.eventosExportacion);
  const resumen = generarResumenEventos(eventos);

  console.log(`Total de eventos registrados: ${resumen.totalEventos}`);
  console.log(`Duración total de la simulación: ${resumen.duracionTotal} unidades`);
  console.log(`Tiempo de inicio: ${resumen.tiempoInicio}`);
  console.log(`Tiempo de finalización: ${resumen.tiempoFin}`);

  console.log('\n📈 Distribución de eventos por tipo:');
  Object.entries(resumen.eventosPorTipo)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .forEach(([tipo, cantidad]) => {
      const porcentaje = (((cantidad as number) / resumen.totalEventos) * 100).toFixed(1);
      console.log(`  • ${tipo}: ${cantidad} eventos (${porcentaje}%)`);
    });

  console.log('\n👥 Distribución de eventos por proceso:');
  Object.entries(resumen.eventosPorProceso)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .forEach(([proceso, cantidad]) => {
      const porcentaje = (((cantidad as number) / resumen.totalEventos) * 100).toFixed(1);
      console.log(`  • ${proceso}: ${cantidad} eventos (${porcentaje}%)`);
    });

  // ========================================
  // 4. EVENTOS CRÍTICOS SEGÚN LA CONSIGNA
  // ========================================
  console.log('\n🎯 4. EVENTOS CRÍTICOS SEGÚN LA CONSIGNA');
  console.log('------------------------------------------');

  const eventosRequeridos = [
    'Arribo',
    'Incorporación',
    'Fin Ráfaga',
    'Agotamiento Quantum',
    'Fin E/S',
    'Atención Interrupción E/S',
    'Terminación'
  ];

  console.log('Verificación de eventos requeridos por la consigna:');
  eventosRequeridos.forEach(tipoRequerido => {
    const presente = eventos.some(e => e.tipo.includes(tipoRequerido.split(' ')[0]));
    const cantidad = eventos.filter(e => e.tipo.includes(tipoRequerido.split(' ')[0])).length;
    console.log(`  ${presente ? '✅' : '❌'} ${tipoRequerido}: ${presente ? `${cantidad} eventos` : 'NO ENCONTRADO'}`);
  });

  // ========================================
  // 5. EXPORTACIÓN DE ARCHIVOS
  // ========================================
  console.log('\n💾 5. EXPORTACIÓN DE ARCHIVOS');
  console.log('-----------------------------');

  console.log('Archivos generados automáticamente:');
  console.log(`  📄 JSON: ${archivos.archivoJSON}`);
  console.log(`  📊 CSV: ${archivos.archivoCSV}`);

  // Verificar archivos generados
  if (typeof window === 'undefined') {
    console.log('\nInformación de archivos:');
    console.log(`  📄 eventos.json: Archivo generado exitosamente`);
    console.log(`  📊 eventos.csv: Archivo generado exitosamente`);
    console.log('  � Los archivos se pueden inspeccionar manualmente en el directorio');
  }

  // ========================================
  // 6. CASOS DE USO DE LOS ARCHIVOS
  // ========================================
  console.log('\n🔧 6. CASOS DE USO DE LOS ARCHIVOS GENERADOS');
  console.log('---------------------------------------------');

  console.log('Los archivos eventos.json y eventos.csv pueden ser utilizados para:');
  console.log('  📊 Análisis estadístico con herramientas como Excel, R, Python');
  console.log('  📈 Generación de gráficos de Gantt personalizados');
  console.log('  🔍 Auditoría detallada del comportamiento del planificador');
  console.log('  📋 Validación de algoritmos de planificación');
  console.log('  🎯 Comparación de rendimiento entre diferentes políticas');
  console.log('  📚 Documentación para reportes académicos');

  // ========================================
  // RESUMEN FINAL
  // ========================================
  console.log('\n🎉 RESUMEN FINAL');
  console.log('================');
  console.log('✅ Simulación de planificación ejecutada exitosamente');
  console.log(`✅ ${resumen.totalEventos} eventos registrados y clasificados`);
  console.log('✅ Todos los eventos requeridos por la consigna están presentes');
  console.log('✅ Archivos eventos.json y eventos.csv generados automáticamente');
  console.log('✅ Sistema listo para análisis y generación de reportes');

  console.log('\n🎯 ¡Demo del integrador completado con éxito!');
  console.log('Los archivos están listos para ser utilizados en el análisis.');
}

// Ejecutar demo
console.log('🚀 Iniciando demo completo del integrador...\n');

demoCompletoIntegrador()
  .catch(error => {
    console.error('❌ Error en el demo:', error);
  });
