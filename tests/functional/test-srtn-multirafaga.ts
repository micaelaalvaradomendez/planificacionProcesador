#!/usr/bin/env npx tsx

/**
 * Test específico para SRTN con procesos multi-ráfaga
 * Usando la misma estructura que funciona en test-politicas-planificacion.ts
 */

import { AdaptadorSimuladorDominio } from '../../src/lib/core/adaptadorSimuladorDominio.js';

console.log('🚀 === TEST SRTN: Multi-ráfagas con I/O ===');

// Procesos con múltiples ráfagas - usar el formato correcto del adaptador
const procesos = [
  {
    id: "P1",
    arribo: 0,
    rafagasCPU: 3,         // 3 ráfagas de CPU
    duracionCPU: 5,  // 5 unidades cada una 
    duracionIO: 4,   // 4 unidades de I/O entre ráfagas
    prioridad: 2
  },
  {
    id: "P2", 
    arribo: 1,
    rafagasCPU: 2,         // 2 ráfagas de CPU
    duracionCPU: 6,  // 6 unidades cada una
    duracionIO: 3,   // 3 unidades de I/O
    prioridad: 1
  },
  {
    id: "P3",
    arribo: 3,
    rafagasCPU: 4,         // 4 ráfagas de CPU
    duracionCPU: 3,  // 3 unidades cada una
    duracionIO: 2,   // 2 unidades de I/O
    prioridad: 3
  }
];

console.log('\n📋 Configuración de procesos multi-ráfaga:');
procesos.forEach(p => {
  const cpuTotal = p.rafagasCPU * p.duracionRafagaCPU;
  const ioTotal = (p.rafagasCPU - 1) * p.duracionRafagaES;
  console.log(`  ${p.name}: arribo=${p.tiempoArribo}, ${p.rafagasCPU}×${p.duracionRafagaCPU}CPU (total=${cpuTotal}) + ${p.rafagasCPU-1}×${p.duracionRafagaES}IO (total=${ioTotal})`);
});

const config = { 
  tip: 1, 
  tfp: 1, 
  tcp: 1, 
  quantum: 0,
  policy: "SRTN" as any
};

console.log('\n🚀 Iniciando simulación con SRTN...');

// Crear workload como en test-politicas-planificacion.ts
const workload = {
  processes: procesos,
  config: config
};

// Crear adaptador usando constructor normal
const adaptador = new AdaptadorSimuladorDominio(workload);
const resultado = adaptador.ejecutar();

if (!resultado.exitoso) {
  console.log(`❌ Error en simulación SRTN: ${resultado.error}`);
  process.exit(1);
}

console.log(`✅ Simulación completada. Eventos: ${resultado.eventosInternos.length} internos, ${resultado.eventosExportacion.length} exportados.`);

// Mapear eventos internos a SimEvent para el GanttBuilder
function mapearEventosInternosASimEvent(eventosInternos: any[]): any[] {
  const mapeoTipos: Record<string, string> = {
    'Arribo': 'JOB_LLEGA',
    'FinTIP': 'NUEVO_A_LISTO',
    'Despacho': 'LISTO_A_CORRIENDO',
    'FinRafagaCPU': 'FIN_RAFAGA_CPU',
    'AgotamientoQuantum': 'CORRIENDO_A_LISTO',
    'FinES': 'BLOQUEADO_A_LISTO',
    'FinTFP': 'CORRIENDO_A_TERMINADO'
  };

  return eventosInternos.map(evento => ({
    tiempo: evento.tiempo,
    tipo: mapeoTipos[evento.tipo] || evento.tipo,
    proceso: evento.proceso || 'SISTEMA',
    extra: evento.extra
  }));
}

// Generar Gantt para verificar correcciones
console.log('\n🔧 === GENERANDO DIAGRAMA DE GANTT CORREGIDO ===');
import { GanttBuilder } from '../../src/lib/domain/services/GanttBuilder.js';
const eventosMapeados = mapearEventosInternosASimEvent(resultado.eventosInternos);
const diagramaGantt = GanttBuilder.construirDiagramaGantt(eventosMapeados);

console.log(`📊 Gantt generado: ${diagramaGantt.segmentos.length} segmentos, tiempo total: ${diagramaGantt.tiempoTotal}`);
console.log(`📈 Utilización CPU: ${diagramaGantt.estadisticas.utilizacionCPU.toFixed(1)}%`);
console.log(`⏰ Tiempo ocioso: ${diagramaGantt.estadisticas.tiempoOcioso}`);
console.log(`🖥️ Tiempo SO: ${diagramaGantt.estadisticas.tiempoSO}`);

console.log('\n📋 Segmentos del Gantt:');
diagramaGantt.segmentos.forEach((segmento, i) => {
  const duracion = segmento.tEnd - segmento.tStart;
  console.log(`  ${i+1}. ${segmento.process} (${segmento.kind}): ${segmento.tStart}→${segmento.tEnd} (dur=${duracion})`);
});

console.log('\n📊 === ANÁLISIS DE SRTN MULTI-RÁFAGA ===');
console.log('📋 Todos los eventos generados:');
resultado.eventosInternos.forEach((evento: any, i: number) => {
  console.log(`  ${i+1}. T=${evento.tiempo} | ${evento.tipo} | ${evento.proceso} | ${evento.extra || ''}`);
});

console.log('\n🔍 === VERIFICACIÓN DE CORRECCIONES ===');

// Verificar que hay eventos de I/O
const eventosIO = resultado.eventosInternos.filter((e: any) => e.extra && e.extra.includes('I/O'));
console.log(`📊 Eventos que mencionan I/O: ${eventosIO.length}`);
eventosIO.forEach((e: any) => {
  console.log(`  ✓ T=${e.tiempo} | ${e.proceso} | ${e.extra}`);
});

// Verificar eventos de regreso de I/O
const eventosFinIO = resultado.eventosInternos.filter((e: any) => e.tipo === 'FinES');
console.log(`📊 Eventos de fin I/O (FinES): ${eventosFinIO.length}`);
eventosFinIO.forEach((e: any) => {
  console.log(`  ✓ T=${e.tiempo} | ${e.proceso} | ${e.extra}`);
});

// Verificar que no todos los procesos terminan inmediatamente
const eventosTerminacion = resultado.eventosInternos.filter((e: any) => e.tipo === 'FinTFP');
console.log(`📊 Procesos que terminan (FinTFP): ${eventosTerminacion.length}`);
eventosTerminacion.forEach((e: any) => {
  console.log(`  ✓ T=${e.tiempo} | ${e.proceso} termina`);
});

console.log('\n🎯 === EXPECTATIVAS PARA SRTN CORRECTO ===');
console.log('✓ Debe haber eventos de I/O (no solo terminaciones)');
console.log('✓ P2 debe expropiar a P1 en t=1 (total_CPU: 12 < 15)');
console.log('✓ P3 puede expropiar cuando llega en t=3 (total_CPU: 12 = 12, empate)');
console.log('✓ Procesos deben hacer I/O entre ráfagas, no terminar en la primera');
console.log('✓ Debe haber múltiples eventos FinES (regresos de I/O)');

if (eventosIO.length === 0) {
  console.log('\n❌ PROBLEMA: No hay eventos de I/O - procesos terminan prematuramente');
} else {
  console.log('\n✅ CORRECCIÓN EXITOSA: Hay eventos de I/O');
}

if (eventosFinIO.length === 0) {
  console.log('❌ PROBLEMA: No hay eventos de regreso de I/O');  
} else {
  console.log('✅ CORRECCIÓN EXITOSA: Hay eventos de regreso de I/O');
}