#!/usr/bin/env npx tsx

/**
 * Test específico para debugging de SRTN 
 * Reproduce el problema: "expropiás y volvés a correr al expropiado"
 */

import { AdaptadorSimuladorDominio } from '../src/lib/core/adaptadorSimuladorDominio';
import type { Workload } from '../src/lib/domain/types';

console.log('🚨 === DIAGNÓSTICO ESPECÍFICO SRTN ===');
console.log('=====================================');

// Workload completo procesos_tanda_5p.json - donde puede estar el bug
const workload: Workload = {
  processes: [
    { id: 'P1', arribo: 0, rafagasCPU: 3, duracionCPU: 5, duracionIO: 4, prioridad: 2 },
    { id: 'P2', arribo: 1, rafagasCPU: 2, duracionCPU: 6, duracionIO: 3, prioridad: 1 },
    { id: 'P3', arribo: 3, rafagasCPU: 4, duracionCPU: 3, duracionIO: 2, prioridad: 3 },
    { id: 'P4', arribo: 5, rafagasCPU: 3, duracionCPU: 4, duracionIO: 2, prioridad: 2 },
    { id: 'P5', arribo: 6, rafagasCPU: 2, duracionCPU: 7, duracionIO: 5, prioridad: 1 }
  ],
  config: {
    policy: 'SRTN' as any,
    tip: 1,
    tfp: 1,
    tcp: 1
  }
};

async function diagnosticarSRTN() {
  console.log('\n🔍 Análisis detallado de SRTN:');
  console.log('Expectativa: P1 ejecuta 1-4, P3 llega en t=3 y debe expropiar a P1 en t=4');
  console.log('P3 (restante=2) < P1 (restante=5) → P3 debe ejecutar, no P1\n');
  
  const adaptador = new AdaptadorSimuladorDominio(workload);
  const resultado = adaptador.ejecutar();
  
  const eventos = resultado.eventosInternos;
  
  console.log('\n📋 Secuencia de eventos críticos:');
  const eventosRelevantes = eventos.filter(e => 
    ['Despacho', 'AgotamientoQuantum', 'FinRafagaCPU', 'FinTIP'].includes(e.tipo)
  );
  
  eventosRelevantes.forEach(evento => {
    console.log(`  t=${evento.tiempo}: ${evento.proceso} - ${evento.tipo} (${evento.extra || ''})`);
  });
  
  // Buscar el problema específico
  console.log('\n🔍 Análisis del problema reportado:');
  
  const despachosP1 = eventos.filter(e => e.tipo === 'Despacho' && e.proceso === 'P1');
  const despachosP3 = eventos.filter(e => e.tipo === 'Despacho' && e.proceso === 'P3');
  const expropriaciones = eventos.filter(e => e.tipo === 'AgotamientoQuantum');
  
  console.log(`📊 Despachos P1: ${despachosP1.length} veces`);
  despachosP1.forEach((d, i) => console.log(`  ${i+1}: t=${d.tiempo}`));
  
  console.log(`📊 Despachos P3: ${despachosP3.length} veces`);
  despachosP3.forEach((d, i) => console.log(`  ${i+1}: t=${d.tiempo}`));
  
  console.log(`📊 Expropiaciones: ${expropriaciones.length}`);
  expropriaciones.forEach((e, i) => console.log(`  ${i+1}: ${e.proceso} expropiado en t=${e.tiempo}`));
  
  // Verificar el bug específico
  const tiempoExpropiacion = 4; // Cuando P3 debería expropiar
  const eventosEnT4 = eventos.filter(e => Math.abs(e.tiempo - tiempoExpropiacion) < 0.1);
  
  console.log(`\n🎯 Eventos en t≈${tiempoExpropiacion} (momento crítico):`);
  eventosEnT4.forEach(e => {
    console.log(`  ${e.tiempo}: ${e.proceso} - ${e.tipo} (${e.extra || ''})`);
  });
  
  // Verificar si P1 vuelve a ejecutar inmediatamente después de ser expropiado
  let bugDetectado = false;
  for (let i = 0; i < eventosRelevantes.length - 1; i++) {
    const eventoActual = eventosRelevantes[i];
    const siguienteEvento = eventosRelevantes[i + 1];
    
    if (eventoActual.tipo === 'AgotamientoQuantum' && 
        siguienteEvento.tipo === 'Despacho' && 
        eventoActual.proceso === siguienteEvento.proceso &&
        Math.abs(eventoActual.tiempo - siguienteEvento.tiempo) < 0.1) {
      
      console.log(`\n🚨 BUG DETECTADO: ${eventoActual.proceso} expropiado en t=${eventoActual.tiempo} y vuelve a ejecutar en t=${siguienteEvento.tiempo}`);
      bugDetectado = true;
    }
  }
  
  if (!bugDetectado) {
    console.log('\n✅ No se detectó el bug de re-ejecución inmediata');
  }
  
  return resultado;
}

async function main() {
  try {
    await diagnosticarSRTN();
  } catch (error) {
    console.error('❌ Error en diagnóstico SRTN:', error);
  }
}

main();