/**
 * Ejemplo de uso completo: Simulación + Exportación de archivos
 * Demuestra cómo ejecutar una simulación y exportar los eventos a archivos JSON y CSV
 */

import { MotorSimulacion } from '../../src/lib/core/engine.js';
import { 
  combinarEventos, 
  exportarEventosAArchivos,
  generarResumenEventos
} from '../../src/lib/infrastructure/io/eventLogger.js';
import type { Workload } from '../../src/lib/domain/types.js';

async function ejemploSimulacionCompleta() {
  console.log('🚀 Ejemplo: Simulación Completa con Exportación');
  console.log('===============================================\n');

  // Workload de ejemplo con múltiples procesos y diferentes características
  const workload: Workload = {
    config: { 
      policy: 'RR', 
      quantum: 2, 
      tip: 1, 
      tfp: 1, 
      tcp: 1 
    },
    processes: [
      { 
        name: 'Proceso_A', 
        tiempoArribo: 0, 
        rafagasCPU: 3,     // Proceso intensivo en CPU
        duracionRafagaCPU: 4, 
        duracionRafagaES: 2, 
        prioridad: 1 
      },
      { 
        name: 'Proceso_B', 
        tiempoArribo: 1, 
        rafagasCPU: 2,     // Proceso con E/S frecuente
        duracionRafagaCPU: 2, 
        duracionRafagaES: 1, 
        prioridad: 2 
      },
      { 
        name: 'Proceso_C', 
        tiempoArribo: 2, 
        rafagasCPU: 1,     // Proceso corto
        duracionRafagaCPU: 3, 
        duracionRafagaES: 1, 
        prioridad: 3 
      }
    ]
  };

  console.log('📋 Configuración de la simulación:');
  console.log(`   Algoritmo: ${workload.config.policy}`);
  console.log(`   Quantum: ${workload.config.quantum}`);
  console.log(`   Procesos: ${workload.processes.length}`);
  console.log(`   TIP/TFP/TCP: ${workload.config.tip}/${workload.config.tfp}/${workload.config.tcp}\n`);

  // Ejecutar simulación
  console.log('⚙️  Ejecutando simulación...');
  const motor = new MotorSimulacion(workload);
  const resultado = motor.ejecutar();

  // Combinar eventos
  const eventos = combinarEventos(resultado.eventosInternos, resultado.eventosExportacion);
  console.log(`✅ Simulación completada: ${eventos.length} eventos generados\n`);

  // Generar resumen
  const resumen = generarResumenEventos(eventos);
  console.log('📊 Resumen de la simulación:');
  console.log(`   Total de eventos: ${resumen.totalEventos}`);
  console.log(`   Duración total: ${resumen.duracionTotal} unidades de tiempo`);
  console.log(`   Eventos por tipo:`);
  for (const [tipo, cantidad] of Object.entries(resumen.eventosPorTipo)) {
    console.log(`     • ${tipo}: ${cantidad}`);
  }
  console.log(`   Eventos por proceso:`);
  for (const [proceso, cantidad] of Object.entries(resumen.eventosPorProceso)) {
    console.log(`     • ${proceso}: ${cantidad}`);
  }
  console.log('');

  // Exportar archivos
  console.log('💾 Exportando eventos a archivos...');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const nombreArchivo = `simulacion-${timestamp}`;
  
  try {
    const archivos = await exportarEventosAArchivos(eventos, nombreArchivo, './resultados');
    
    console.log('✅ Archivos exportados exitosamente:');
    console.log(`   📄 JSON: ${archivos.archivoJSON}`);
    console.log(`   📊 CSV: ${archivos.archivoCSV}\n`);

    // Información adicional sobre los archivos
    if (typeof window === 'undefined') {
      const fs = await import('fs/promises');
      
      const jsonStats = await fs.stat(archivos.archivoJSON);
      const csvStats = await fs.stat(archivos.archivoCSV);
      
      console.log('📈 Información de archivos:');
      console.log(`   JSON: ${Math.round(jsonStats.size / 1024)} KB`);
      console.log(`   CSV: ${Math.round(csvStats.size / 1024)} KB`);
    }

    console.log('\n🎯 Los archivos están listos para:');
    console.log('   📊 Análisis de datos con herramientas como Excel, Python, R');
    console.log('   📈 Generación de gráficos y estadísticas');
    console.log('   🔍 Auditoría detallada de la simulación');
    console.log('   📋 Reproducción y validación de resultados');

  } catch (error) {
    console.error('❌ Error al exportar archivos:', error);
  }

  console.log('\n🎉 Ejemplo completado!');
  console.log('   Los eventos se han exportado correctamente a archivos.');
  console.log('   Puedes encontrar los archivos en la carpeta ./resultados/');
}

// Ejecutar ejemplo
ejemploSimulacionCompleta()
  .catch(error => {
    console.error('❌ Error en el ejemplo:', error);
  });
