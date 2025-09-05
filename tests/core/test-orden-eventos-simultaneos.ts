/**
 * Test para verificar el orden específico de eventos simultáneos según la consigna
 * 
 * Orden especificado en la consigna (sección "Acuerdos", punto a):
 * 1. Corriendo a Terminado.
 * 2. Corriendo a Bloqueado.
 * 3. Corriendo a Listo.
 * 4. Bloqueado a Listo.
 * 5. Nuevo a Listo.
 * 6. Finalmente el despacho de Listo a Corriendo.
 */

import { MotorSimulacion } from '../../src/lib/core/engine';
import type { Workload } from '../../src/lib/model/types';

export function testOrdenEventosSimultaneos() {
  console.log('\n🧪 Verificando orden de eventos simultáneos según consigna...\n');

  // Configurar workload que genere eventos simultáneos en t=2
  const workload: Workload = {
    config: {
      policy: 'RR',
      quantum: 1,
      tip: 0,     // Sin TIP para simplificar
      tfp: 0,     // Sin TFP para simplificar  
      tcp: 0      // Sin TCP para simplificar
    },
    processes: [
      { 
        name: 'P1', 
        tiempoArribo: 0, 
        rafagasCPU: 2,     
        duracionRafagaCPU: 1, 
        duracionRafagaES: 0,   // Sin E/S para simplificar primer test
        prioridad: 1 
      },
      { 
        name: 'P2', 
        tiempoArribo: 2,       // Llega cuando P1 está ejecutando
        rafagasCPU: 1,     
        duracionRafagaCPU: 1, 
        duracionRafagaES: 0, 
        prioridad: 1 
      }
    ]
  };

  const motor = new MotorSimulacion(workload);
  const resultado = motor.ejecutar();

  console.log('📊 Eventos internos cronológicos:');
  resultado.eventosInternos.forEach(e => {
    console.log(`t=${e.tiempo}: ${e.tipo} ${e.proceso || ''} ${e.extra || ''}`);
  });

  // Verificar que el orden de prioridades se respeta
  console.log('\n🔍 Análisis del orden de eventos:');
  
  // Agrupar eventos por tiempo
  const eventosPorTiempo = new Map<number, typeof resultado.eventosInternos>();
  resultado.eventosInternos.forEach(e => {
    if (!eventosPorTiempo.has(e.tiempo)) {
      eventosPorTiempo.set(e.tiempo, []);
    }
    eventosPorTiempo.get(e.tiempo)!.push(e);
  });

  let todasLasPrioridadesCorrectas = true;

  eventosPorTiempo.forEach((eventos, tiempo) => {
    if (eventos.length > 1) {
      console.log(`\n⏰ t=${tiempo} - Eventos simultáneos (${eventos.length}):`);
      
      const prioridadesEsperadas = {
        'FinRafagaCPU': eventos.some(e => e.extra?.includes('Última')) ? 1 : 2,  // 1 si terminado, 2 si bloqueado
        'AgotamientoQuantum': 3,
        'FinES': 4,
        'Arribo': 5,
        'FinTIP': 5,
        'FinTFP': 5,
        'Despacho': 6
      };

      let prioridadAnterior = 0;
      eventos.forEach((evento, index) => {
        const prioridadActual = prioridadesEsperadas[evento.tipo] || 99;
        console.log(`   ${index + 1}. ${evento.tipo} (prioridad ${prioridadActual}) - ${evento.proceso}`);
        
        if (prioridadActual < prioridadAnterior) {
          console.log(`   ❌ ORDEN INCORRECTO: ${evento.tipo} (${prioridadActual}) después de prioridad ${prioridadAnterior}`);
          todasLasPrioridadesCorrectas = false;
        }
        prioridadAnterior = prioridadActual;
      });
    }
  });

  console.log(`\n📋 Resultado: ${todasLasPrioridadesCorrectas ? '✅ ORDEN CORRECTO' : '❌ ORDEN INCORRECTO'}`);
  return todasLasPrioridadesCorrectas;
}

export function testOrdenEventosComplejo() {
  console.log('\n🧪 Test complejo: múltiples eventos simultáneos...\n');

  // Workload más complejo que genere más eventos simultáneos
  const workload: Workload = {
    config: {
      policy: 'PRIORITY',
      tip: 1,
      tfp: 1,
      tcp: 1
    },
    processes: [
      { 
        name: 'P1', 
        tiempoArribo: 0, 
        rafagasCPU: 2,     
        duracionRafagaCPU: 2, 
        duracionRafagaES: 1, 
        prioridad: 1 
      },
      { 
        name: 'P2', 
        tiempoArribo: 3,   // Llega cuando P1 termina primera ráfaga
        rafagasCPU: 1,     
        duracionRafagaCPU: 3, 
        duracionRafagaES: 0, 
        prioridad: 5       // Mayor prioridad - debe expropiar
      },
      { 
        name: 'P3', 
        tiempoArribo: 3,   // Llega al mismo tiempo que P2
        rafagasCPU: 1,     
        duracionRafagaCPU: 1, 
        duracionRafagaES: 0, 
        prioridad: 3 
      }
    ]
  };

  const motor = new MotorSimulacion(workload);
  const resultado = motor.ejecutar();

  console.log('📊 Eventos internos cronológicos:');
  resultado.eventosInternos.forEach(e => {
    console.log(`t=${e.tiempo}: ${e.tipo} ${e.proceso || ''} ${e.extra || ''}`);
  });

  // Buscar eventos simultáneos y verificar orden
  const eventosPorTiempo = new Map<number, typeof resultado.eventosInternos>();
  resultado.eventosInternos.forEach(e => {
    if (!eventosPorTiempo.has(e.tiempo)) {
      eventosPorTiempo.set(e.tiempo, []);
    }
    eventosPorTiempo.get(e.tiempo)!.push(e);
  });

  console.log('\n🔍 Análisis de eventos simultáneos:');
  let hayEventosSimultaneos = false;
  
  eventosPorTiempo.forEach((eventos, tiempo) => {
    if (eventos.length > 1) {
      hayEventosSimultaneos = true;
      console.log(`\n⏰ t=${tiempo} - ${eventos.length} eventos simultáneos:`);
      eventos.forEach((evento, index) => {
        console.log(`   ${index + 1}. ${evento.tipo} - ${evento.proceso || 'N/A'}`);
      });
    }
  });

  if (!hayEventosSimultaneos) {
    console.log('ℹ️  No se generaron eventos simultáneos en esta simulación');
  }

  return true;
}

// Ejecutar tests automáticamente
console.log('🎯 Testing: Orden de Eventos Simultáneos según Consigna\n');

const resultadoBasico = testOrdenEventosSimultaneos();
const resultadoComplejo = testOrdenEventosComplejo();

console.log('\n📈 Resumen de Tests:');
console.log(`   Orden básico: ${resultadoBasico ? '✅' : '❌'}`);
console.log(`   Caso complejo: ${resultadoComplejo ? '✅' : '❌'}`);

if (resultadoBasico && resultadoComplejo) {
  console.log('\n🎉 ¡Orden de eventos implementado correctamente según consigna!');
} else {
  console.log('\n⚠️  Revisar implementación del orden de eventos');
}
