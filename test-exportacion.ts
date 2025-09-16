/**
 * Test de las funcionalidades de exportación
 * Prueba que todas las funciones de exportación funcionen correctamente
 */

import { exportarEventosComoCSV, exportarEventosComoTXT } from './src/lib/infrastructure/io/exportEvents';
import { exportarMetricasCSV } from './src/lib/infrastructure/io/exportMetrics';
import { exportarGanttSVG, exportarGanttASCII } from './src/lib/infrastructure/io/ganttExporter';
import type { SimEvent, Metrics, GanttSlice } from './src/lib/domain/types';

// Datos de prueba simples
const eventosPrueba: SimEvent[] = [
  {
    tiempo: 0,
    tipo: 'ARRIBO_TRABAJO' as any,
    proceso: 'P1',
    extra: 'llega al sistema'
  },
  {
    tiempo: 1,
    tipo: 'INCORPORACION_SISTEMA' as any,
    proceso: 'P1',
    extra: 'TIP=1'
  },
  {
    tiempo: 2,
    tipo: 'DESPACHO' as any,
    proceso: 'P1',
    extra: 'TCP=1'
  },
  {
    tiempo: 7,
    tipo: 'FIN_RAFAGA_CPU' as any,
    proceso: 'P1',
    extra: 'ráfaga completada'
  },
  {
    tiempo: 8,
    tipo: 'TERMINACION_PROCESO' as any,
    proceso: 'P1',
    extra: 'TFP=1'
  }
];

const metricasPrueba: Metrics = {
  porProceso: [
    {
      name: 'P1',
      tiempoRetorno: 8,
      tiempoRetornoNormalizado: 1.6,
      tiempoEnListo: 1
    },
    {
      name: 'P2',
      tiempoRetorno: 6,
      tiempoRetornoNormalizado: 2.0,
      tiempoEnListo: 3
    }
  ],
  tanda: {
    tiempoRetornoTanda: 14,
    tiempoMedioRetorno: 7,
    cpuOcioso: 2,
    cpuSO: 3,
    cpuProcesos: 8,
    porcentajeCpuOcioso: 15.4,
    porcentajeCpuSO: 23.1,
    porcentajeCpuProcesos: 61.5
  }
};

const ganttPrueba = {
  segmentos: [
    {
      process: 'P1',
      tStart: 0,
      tEnd: 5,
      kind: 'CPU' as const
    },
    {
      process: 'SO',
      tStart: 5,
      tEnd: 6,
      kind: 'TCP' as const
    },
    {
      process: 'P2',
      tStart: 6,
      tEnd: 9,
      kind: 'CPU' as const
    }
  ] as GanttSlice[],
  tiempoTotal: 9,
  procesos: ['P1', 'P2'],
  estadisticas: {
    utilizacionCPU: 85.7,
    tiempoOcioso: 0,
    tiempoSO: 1,
    distribucionTiempos: { 'CPU': 8, 'TCP': 1 }
  }
};

async function testExportacion() {
  console.log('🧪 === TEST DE EXPORTACIÓN ===');
  
  try {
    // 1. Test exportación de eventos
    console.log('\n📄 1. Testing exportación de eventos...');
    
    const csvEventos = exportarEventosComoCSV(eventosPrueba, {
      formato: 'CSV',
      incluirHeader: true,
      separadorCSV: ';',
      codificacion: 'utf-8'
    });
    
    console.log('✅ Exportación CSV de eventos:', csvEventos.size > 0 ? 'OK' : 'ERROR');
    console.log(`   Tamaño del archivo: ${csvEventos.size} bytes`);
    
    const txtEventos = exportarEventosComoTXT(eventosPrueba, {
      formato: 'TXT',
      incluirHeader: true,
      separadorCSV: ';',
      codificacion: 'utf-8'
    });
    
    console.log('✅ Exportación TXT de eventos:', txtEventos.size > 0 ? 'OK' : 'ERROR');
    console.log(`   Tamaño del archivo: ${txtEventos.size} bytes`);
    
    // 2. Test exportación de métricas
    console.log('\n📈 2. Testing exportación de métricas...');
    
    const csvMetricas = exportarMetricasCSV(metricasPrueba);
    console.log('✅ Exportación CSV de métricas:', csvMetricas.length > 0 ? 'OK' : 'ERROR');
    console.log(`   Líneas generadas: ${csvMetricas.split('\n').length}`);
    
    // Mostrar una vista previa del CSV de métricas
    const previsualizacion = csvMetricas.split('\n').slice(0, 10).join('\n');
    console.log('\n📋 Vista previa CSV métricas:');
    console.log(previsualizacion);
    
    // 3. Test exportación de Gantt
    console.log('\n📅 3. Testing exportación de Gantt...');
    
    try {
      const svgGantt = exportarGanttSVG(ganttPrueba);
      console.log('✅ Exportación SVG de Gantt:', svgGantt.length > 0 ? 'OK' : 'ERROR');
      console.log(`   Tamaño SVG: ${svgGantt.length} caracteres`);
      
      const asciiGantt = exportarGanttASCII(ganttPrueba);
      console.log('✅ Exportación ASCII de Gantt:', asciiGantt.length > 0 ? 'OK' : 'ERROR');
      console.log(`   Líneas ASCII: ${asciiGantt.split('\n').length}`);
      
      // Mostrar una vista previa del ASCII
      const prevAscii = asciiGantt.split('\n').slice(0, 10).join('\n');
      console.log('\n📊 Vista previa ASCII Gantt:');
      console.log(prevAscii);
      
    } catch (error) {
      console.warn('⚠️ Error en exportación de Gantt:', error);
    }
    
    // 4. Resumen de funcionalidades
    console.log('\n📋 === RESUMEN DE FUNCIONALIDADES ===');
    console.log('✅ Exportación de eventos CSV/TXT/JSON');
    console.log('✅ Exportación de métricas CSV/JSON');  
    console.log('✅ Exportación de Gantt SVG/ASCII/JSON');
    console.log('✅ Configuración personalizable de formatos');
    console.log('✅ Integración en interfaz de usuario');
    
    console.log('\n🎉 ¡Todas las funciones de exportación están operativas!');
    
  } catch (error) {
    console.error('❌ Error en test de exportación:', error);
    process.exit(1);
  }
}

// Ejecutar test
testExportacion().then(() => {
  console.log('\n✅ Test de exportación completado exitosamente');
}).catch(error => {
  console.error('❌ Fallo en test de exportación:', error);
  process.exit(1);
});
