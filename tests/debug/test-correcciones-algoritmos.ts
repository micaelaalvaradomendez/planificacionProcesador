/**
 * Test simplificado para verificar correcciones en algoritmos SJF y SRTF
 */

import { ejecutarSimulacion } from '../../src/lib/core';
import type { Workload } from '../../src/lib/domain/types';

console.log('🧪 Test de Correcciones - SJF y SRTF');
console.log('=====================================');

// Test SJF: Debe priorizar procesos con ráfagas de CPU más cortas
console.log('\n📋 Test SJF - Shortest Process Next (ráfaga)');
const testSJF: Workload = {
  processes: [
    { name: 'P1', tiempoArribo: 0, rafagasCPU: 1, duracionRafagaCPU: 8, duracionRafagaES: 0, prioridad: 1 },   // Ráfaga larga
    { name: 'P2', tiempoArribo: 1, rafagasCPU: 1, duracionRafagaCPU: 3, duracionRafagaES: 0, prioridad: 1 },   // Ráfaga corta
    { name: 'P3', tiempoArribo: 2, rafagasCPU: 1, duracionRafagaCPU: 5, duracionRafagaES: 0, prioridad: 1 }    // Ráfaga media
  ],
  config: { policy: 'SPN', tip: 0, tfp: 0, tcp: 0 }
};

async function probarSJF() {
  try {
    const resultado = await ejecutarSimulacion(testSJF);
    console.log('✅ SJF ejecutado correctamente');
    
    // El orden de ejecución debería ser: P1 (arriba primero), luego P2 (ráfaga más corta), luego P3
    const eventos = resultado.eventos.filter(e => e.tipo === 'DESPACHO');
    console.log('📝 Orden de despacho:', eventos.map(e => e.proceso));
    
    // Verificar métricas
    console.log('📊 Métricas por proceso:');
    Object.entries(resultado.metricas.porProceso).forEach(([nombre, metricas]) => {
      console.log(`  ${nombre}: TR=${metricas.tiempoRetorno}, TRn=${metricas.tiempoRetornoNormalizado.toFixed(2)}`);
    });
    
  } catch (error) {
    console.error('❌ Error en SJF:', error);
  }
}

// Test SRTF: Debe expropiar cuando llega proceso con ráfaga restante más corta
console.log('\n📋 Test SRTF - Shortest Remaining Time Next (ráfaga actual)');
const testSRTF: Workload = {
  processes: [
    { name: 'P1', tiempoArribo: 0, rafagasCPU: 1, duracionRafagaCPU: 8, duracionRafagaES: 0, prioridad: 1 },   // Ráfaga larga
    { name: 'P2', tiempoArribo: 3, rafagasCPU: 1, duracionRafagaCPU: 2, duracionRafagaES: 0, prioridad: 1 }    // Ráfaga corta que llega después
  ],
  config: { policy: 'SRTN', tip: 0, tfp: 0, tcp: 0 }
};

async function probarSRTF() {
  try {
    const resultado = await ejecutarSimulacion(testSRTF);
    console.log('✅ SRTF ejecutado correctamente');
    
    // Debería haber expropiación: P1 inicia, P2 llega y expropia porque tiene ráfaga más corta
    const eventos = resultado.eventos.filter(e => ['DESPACHO', 'EXPROPIACION'].includes(e.tipo));
    console.log('📝 Eventos de scheduling:', eventos.map(e => `${e.tiempo}:${e.tipo}:${e.proceso}`));
    
    // Verificar métricas
    console.log('📊 Métricas por proceso:');
    Object.entries(resultado.metricas.porProceso).forEach(([nombre, metricas]) => {
      console.log(`  ${nombre}: TR=${metricas.tiempoRetorno}, TRn=${metricas.tiempoRetornoNormalizado.toFixed(2)}`);
    });
    
  } catch (error) {
    console.error('❌ Error en SRTF:', error);
  }
}

// Ejecutar tests
async function ejecutarTests() {
  await probarSJF();
  console.log('\n' + '='.repeat(50));
  await probarSRTF();
  
  console.log('\n🎯 Tests completados');
  console.log('📝 Verificar que:');
  console.log('   - SJF respete el orden por duración de ráfaga');
  console.log('   - SRTF realice expropiación basada en tiempo restante de ráfaga actual');
}

ejecutarTests();
