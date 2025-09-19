/**
 * Tests específicos para cada política de planificación
 * Identifica inconsistencias en el comportamiento según la teoría de SO
 */

import type { Workload, ProcessSpec, RunConfig } from './src/lib/domain/types';
import { AdaptadorSimuladorDominio } from './src/lib/core/adaptadorSimuladorDominio';

// Dataset de prueba común para todas las políticas
const procesosBasicos: ProcessSpec[] = [
  { name: 'P1', tiempoArribo: 0, rafagasCPU: 1, duracionRafagaCPU: 10, duracionRafagaES: 0, prioridad: 3 },
  { name: 'P2', tiempoArribo: 2, rafagasCPU: 1, duracionRafagaCPU: 5, duracionRafagaES: 0, prioridad: 1 },
  { name: 'P3', tiempoArribo: 4, rafagasCPU: 1, duracionRafagaCPU: 8, duracionRafagaES: 0, prioridad: 2 },
  { name: 'P4', tiempoArribo: 6, rafagasCPU: 1, duracionRafagaCPU: 3, duracionRafagaES: 0, prioridad: 4 }
];

// Procesos para probar Round Robin específicamente
const procesosRR: ProcessSpec[] = [
  { name: 'P1', tiempoArribo: 0, rafagasCPU: 1, duracionRafagaCPU: 12, duracionRafagaES: 0, prioridad: 1 },
  { name: 'P2', tiempoArribo: 1, rafagasCPU: 1, duracionRafagaCPU: 8, duracionRafagaES: 0, prioridad: 1 },
  { name: 'P3', tiempoArribo: 2, rafagasCPU: 1, duracionRafagaCPU: 4, duracionRafagaES: 0, prioridad: 1 }
];

const configBase: RunConfig = {
  policy: 'FCFS',
  tip: 1,
  tfp: 1, 
  tcp: 1,
  quantum: 4
};

function analizarEventos(eventos: any[], algoritmo: string): void {
  console.log(`\n📊 === ANÁLISIS DE ${algoritmo} ===`);
  
  // Mostrar TODOS los eventos para debug
  console.log('📋 Todos los eventos generados:');
  eventos.forEach((evento, i) => {
    console.log(`  ${i+1}. T=${evento.tiempo} | ${evento.tipo} | ${evento.proceso} | ${evento.extra || ''}`);
  });
  
  const eventosRelevantes = eventos.filter(e => 
    ['LISTO_A_CORRIENDO', 'CORRIENDO_A_TERMINADO', 'CORRIENDO_A_LISTO'].includes(e.tipo)
  );
  
  console.log('\n🔄 Secuencia de despachos y expropiaciones:');
  if (eventosRelevantes.length === 0) {
    console.log('  ⚠️ NO SE ENCONTRARON EVENTOS DE TRANSICIÓN');
    console.log('  🔍 Verificar mapeo de eventos en runSimulation.ts');
  } else {
    eventosRelevantes.forEach((evento, i) => {
      const icono = evento.tipo === 'LISTO_A_CORRIENDO' ? '🚀' :
                    evento.tipo === 'CORRIENDO_A_TERMINADO' ? '🏁' : '⏰';
      console.log(`  ${i+1}. T=${evento.tiempo} ${icono} ${evento.tipo} - ${evento.proceso} ${evento.extra || ''}`);
    });
  }
  
  // Análisis de cumplimiento teórico
  console.log('\n🎯 Análisis de cumplimiento teórico:');
  
  if (algoritmo === 'FCFS') {
    // FCFS debe ser no expropiativo y ordenar por arribo
    const hayExpropiacion = eventosRelevantes.some(e => e.tipo === 'CORRIENDO_A_LISTO');
    console.log(`  ${hayExpropiacion ? '❌' : '✅'} No expropiativo (no debe haber CORRIENDO_A_LISTO)`);
    
    const despachos = eventosRelevantes.filter(e => e.tipo === 'LISTO_A_CORRIENDO');
    const ordenCorrecto = despachos.every((despacho, i) => {
      if (i === 0) return true;
      const procesoAnterior = despachos[i-1].proceso;
      const procesoActual = despacho.proceso;
      // P1 < P2 < P3 < P4 por tiempo de arribo
      return procesoAnterior <= procesoActual;
    });
    console.log(`  ${ordenCorrecto ? '✅' : '❌'} Orden por tiempo de arribo (FIFO)`);
  }
  
  if (algoritmo === 'Round Robin') {
    const hayQuantumExpired = eventosRelevantes.some(e => e.tipo === 'CORRIENDO_A_LISTO');
    console.log(`  ${hayQuantumExpired ? '✅' : '❌'} Expropiativo por quantum (debe haber CORRIENDO_A_LISTO)`);
    
    // Verificar que ningún proceso ejecute más del quantum sin expropiación
    // TODO: Análisis más detallado de tiempos de ejecución vs quantum
  }
  
  if (algoritmo === 'SJF') {
    const hayExpropiacion = eventosRelevantes.some(e => e.tipo === 'CORRIENDO_A_LISTO');
    console.log(`  ${hayExpropiacion ? '❌' : '✅'} No expropiativo (no debe haber CORRIENDO_A_LISTO)`);
    
    // Verificar orden por duración de ráfaga
    const despachos = eventosRelevantes.filter(e => e.tipo === 'LISTO_A_CORRIENDO');
    console.log(`  🔍 Orden de despacho: ${despachos.map(d => d.proceso).join(' → ')}`);
    // Debería ser P2(5) → P4(3) → P3(8) → P1(10) si están todos disponibles
  }
  
  if (algoritmo === 'SRTF') {
    const hayExpropiacion = eventosRelevantes.some(e => e.tipo === 'CORRIENDO_A_LISTO');
    console.log(`  ${hayExpropiacion ? '✅' : '❌'} Expropiativo por tiempo restante (debe haber CORRIENDO_A_LISTO)`);
  }
  
  if (algoritmo === 'PRIORITY') {
    const despachos = eventosRelevantes.filter(e => e.tipo === 'LISTO_A_CORRIENDO');
    console.log(`  🔍 Orden de despacho: ${despachos.map(d => d.proceso).join(' → ')}`);
    // Debería ser P4(prio=4) → P1(prio=3) → P3(prio=2) → P2(prio=1)
  }
}

function ejecutarTestPolitica(algoritmo: string, procesos: ProcessSpec[], config: RunConfig): void {
  try {
    const workload: Workload = {
      workloadName: `Test ${algoritmo}`,
      processes: procesos,
      config: { ...config, policy: algoritmo as any }
    };
    
    console.log(`\n🧪 === PROBANDO ${algoritmo} ===`);
    console.log(`📋 Procesos: ${procesos.map(p => `${p.name}(CPU=${p.duracionRafagaCPU}, Prio=${p.prioridad})`).join(', ')}`);
    console.log(`⚙️ Config: TIP=${config.tip}, TFP=${config.tfp}, TCP=${config.tcp}${algoritmo === 'RR' ? `, Q=${config.quantum}` : ''}`);
    
    const adaptador = new AdaptadorSimuladorDominio(workload);
    const resultado = adaptador.ejecutar();
    
    if (!resultado.exitoso) {
      console.log(`❌ Error en simulación de ${algoritmo}: ${resultado.error}`);
      return;
    }
    
    console.log(`✅ Simulación completada. Eventos: ${resultado.eventosInternos.length} internos, ${resultado.eventosExportacion.length} exportados.`);
    
    // Mapear eventos internos a eventos del dominio para análisis
    const mapeoTiposEventos: Record<string, string> = {
      'Arribo': 'JOB_LLEGA',
      'FinTIP': 'NUEVO_A_LISTO',
      'Despacho': 'LISTO_A_CORRIENDO',
      'FinRafagaCPU': 'FIN_RAFAGA_CPU',
      'FinTFP': 'CORRIENDO_A_TERMINADO',
      'FinES': 'BLOQUEADO_A_LISTO',
      'InicioES': 'CORRIENDO_A_BLOQUEADO',
      'AgotamientoQuantum': 'CORRIENDO_A_LISTO'
    };
    
    const eventosMapeados = resultado.eventosInternos.map(evento => ({
      tiempo: evento.tiempo,
      tipo: mapeoTiposEventos[evento.tipo] || evento.tipo,
      proceso: evento.proceso || 'SISTEMA',
      extra: evento.extra
    }));
    
    analizarEventos(eventosMapeados, algoritmo);
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
    console.log(`💥 Excepción en test de ${algoritmo}:`, errorMsg);
  }
}

function ejecutarTestsCompletos(): void {
  console.log('🚀 === INICIANDO TESTS DE POLÍTICAS DE PLANIFICACIÓN ===');
  console.log('📚 Basado en documentación: docs/research/planificacion-procesos.txt\n');
  
  // Test 1: FCFS
  ejecutarTestPolitica('FCFS', procesosBasicos, configBase);
  
  // Test 2: Round Robin
  ejecutarTestPolitica('RR', procesosRR, { ...configBase, policy: 'RR' });
  
  // Test 3: SJF/SPN  
  ejecutarTestPolitica('SPN', procesosBasicos, { ...configBase, policy: 'SPN' });
  
  // Test 4: SRTF/SRTN
  ejecutarTestPolitica('SRTN', procesosBasicos, { ...configBase, policy: 'SRTN' });
  
  // Test 5: Priority
  ejecutarTestPolitica('PRIORITY', procesosBasicos, { ...configBase, policy: 'PRIORITY' });
  
  console.log('\n📋 === RESUMEN DE VERIFICACIONES ===');
  console.log('✅ Tests completados. Revisar salidas para identificar inconsistencias.');
  console.log('🔍 Buscar:');
  console.log('  - FCFS: Debe ser no expropiativo, orden FIFO');
  console.log('  - RR: Debe expropiar por quantum, orden circular');
  console.log('  - SJF: No expropiativo, orden por duración de ráfaga');
  console.log('  - SRTF: Expropiativo, orden por tiempo restante de ráfaga');
  console.log('  - Priority: Orden por prioridad externa (mayor número = mayor prioridad)');
}

// Ejecutar tests
ejecutarTestsCompletos();