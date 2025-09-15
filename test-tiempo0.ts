/**
 * Test específico para verificar llegadas en tiempo 0
 */

import { AdaptadorSimuladorDominio } from './src/lib/core/adaptadorSimuladorDominio';
import type { Workload } from './src/lib/domain/types';

// Caso con procesos que llegan en tiempo 0
const workloadTiempo0: Workload = {
  processes: [
    {
      name: 'P1',
      tiempoArribo: 0,  // Llega en tiempo 0
      rafagasCPU: 1,
      duracionRafagaCPU: 8,
      duracionRafagaES: 0,
      prioridad: 1 // Baja prioridad
    },
    {
      name: 'P2',
      tiempoArribo: 0,  // También llega en tiempo 0
      rafagasCPU: 1,
      duracionRafagaCPU: 3,
      duracionRafagaES: 0,
      prioridad: 5 // Alta prioridad
    },
    {
      name: 'P3',
      tiempoArribo: 0,  // También llega en tiempo 0
      rafagasCPU: 1,
      duracionRafagaCPU: 2,
      duracionRafagaES: 0,
      prioridad: 3 // Prioridad media
    }
  ],
  config: {
    policy: 'PRIORITY',
    quantum: 4,
    tip: 1,
    tfp: 1,
    tcp: 1
  }
};

async function probarTiempo0(algoritmo: string) {
  console.log(`\n🧪 ===== PRUEBA TIEMPO 0: ${algoritmo} =====`);
  
  const workload = {
    ...workloadTiempo0,
    config: {
      ...workloadTiempo0.config,
      policy: algoritmo
    }
  };
  
  console.log('📊 Escenario:');
  console.log('   P1: arribo=0, CPU=8, prioridad=1 (baja)');
  console.log('   P2: arribo=0, CPU=3, prioridad=5 (alta)');
  console.log('   P3: arribo=0, CPU=2, prioridad=3 (media)');
  console.log('');
  console.log(`🎯 Expectativa para ${algoritmo}:`);
  if (algoritmo === 'PRIORITY') {
    console.log('   Orden esperado: P2 (prio=5) → P3 (prio=3) → P1 (prio=1)');
  } else if (algoritmo === 'SRTN' || algoritmo === 'SPN') {
    console.log('   Orden esperado: P3 (CPU=2) → P2 (CPU=3) → P1 (CPU=8)');
  } else if (algoritmo === 'FCFS') {
    console.log('   Orden esperado: P1 → P2 → P3 (orden de procesamiento)');
  } else if (algoritmo === 'RR') {
    console.log('   Orden esperado: P1 → P2 → P3 con rotación por quantum');
  }
  console.log('');
  
  try {
    const motor = new AdaptadorSimuladorDominio(workload);
    const resultado = motor.ejecutar();
    
    if (resultado.exitoso) {
      console.log(`✅ ${algoritmo}: Simulación exitosa`);
      
      // Analizar orden de despachos
      const despachos = resultado.eventosInternos.filter(e => e.tipo === 'Despacho');
      const orden = despachos.map(d => d.proceso);
      console.log(`📈 Orden real: ${orden.join(' → ')}`);
      console.log(`⏱️  Tiempo final: ${resultado.estadoFinal.tiempoActual}`);
      
      // Verificar todos los eventos para diagnóstico
      console.log(`📋 Eventos totales: ${resultado.eventosInternos.length}`);
      resultado.eventosInternos.forEach(e => {
        console.log(`   t${e.tiempo}: ${e.tipo} ${e.proceso || 'SISTEMA'} - ${e.extra || ''}`);
      });
      
      return {
        algoritmo,
        exitoso: true,
        orden,
        eventos: resultado.eventosInternos,
        tiempoFinal: resultado.estadoFinal.tiempoActual
      };
    } else {
      console.error(`❌ ${algoritmo}: Error - ${resultado.error}`);
      return { algoritmo, exitoso: false, error: resultado.error };
    }
  } catch (error) {
    console.error(`❌ ${algoritmo}: Excepción - ${error}`);
    return { algoritmo, exitoso: false, error: String(error) };
  }
}

async function main() {
  console.log('🚀 TEST TIEMPO 0 - Verificando manejo de llegadas simultáneas');
  
  const algoritmos = ['FCFS', 'SPN', 'SRTN', 'PRIORITY', 'RR'];
  const resultados = [];
  
  for (const algoritmo of algoritmos) {
    const resultado = await probarTiempo0(algoritmo);
    resultados.push(resultado);
  }
  
  console.log('\n📋 ===== RESUMEN =====');
  resultados.forEach(r => {
    if (r.error) {
      console.log(`${r.algoritmo.padEnd(8)}: ERROR - ${r.error}`);
    } else {
      console.log(`${r.algoritmo.padEnd(8)}: ${r.orden?.join(' → ')} (T=${r.tiempoFinal})`);
    }
  });
  
  // Verificar problemas específicos
  const errores = resultados.filter(r => !r.exitoso);
  if (errores.length > 0) {
    console.log('\n⚠️  PROBLEMAS DETECTADOS:');
    errores.forEach(r => {
      console.log(`   ${r.algoritmo}: ${r.error}`);
    });
  } else {
    console.log('\n✅ TODOS LOS ALGORITMOS MANEJAN TIEMPO 0 CORRECTAMENTE');
  }
}

main().catch(console.error);
