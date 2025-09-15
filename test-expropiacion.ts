/**
 * Test específico para verificar EXPROPIACIÓN en algoritmos
 * Caso diseñado para mostrar claramente cuándo debe ocurrir preemption
 */

import { AdaptadorSimuladorDominio } from './src/lib/core/adaptadorSimuladorDominio';
import type { Workload } from './src/lib/domain/types';

// Caso que demuestra expropiación
const workloadExpropiacion: Workload = {
  processes: [
    {
      name: 'LARGO',
      tiempoArribo: 0,
      rafagasCPU: 1,
      duracionRafagaCPU: 10, // Proceso muy largo
      duracionRafagaES: 0,
      prioridad: 1 // Baja prioridad
    },
    {
      name: 'CORTO',
      tiempoArribo: 3, // Llega DESPUÉS de que LARGO ya empezó
      rafagasCPU: 1,
      duracionRafagaCPU: 2, // Proceso muy corto
      duracionRafagaES: 0,
      prioridad: 5 // Alta prioridad
    }
  ],
  config: {
    policy: 'PRIORITY', // Cambiaremos para cada test
    quantum: 4,
    tip: 1,
    tfp: 1,
    tcp: 1
  }
};

async function analizarExpropiacion(algoritmo: string) {
  console.log(`\n🔍 ===== ANÁLISIS DE EXPROPIACIÓN: ${algoritmo} =====`);
  
  const workload = {
    ...workloadExpropiacion,
    config: {
      ...workloadExpropiacion.config,
      policy: algoritmo
    }
  };
  
  console.log('📊 Escenario:');
  console.log('   LARGO: arribo=0, CPU=10, prioridad=1 (baja)');
  console.log('   CORTO: arribo=3, CPU=2, prioridad=5 (alta)');
  console.log('');
  console.log('🎯 Expectativa para algoritmos expropitativos:');
  console.log('   - LARGO empieza en t=1 (después de TIP)');
  console.log('   - CORTO llega en t=3, debería EXPROPIAR a LARGO');
  console.log('   - CORTO ejecuta t=5-7, luego LARGO retoma');
  console.log('');
  
  try {
    const motor = new AdaptadorSimuladorDominio(workload);
    const resultado = motor.ejecutar();
    
    if (resultado.exitoso) {
      console.log(`📈 RESULTADO:`);
      
      // Analizar eventos de despacho
      const despachos = resultado.eventosInternos.filter(e => e.tipo === 'Despacho');
      console.log(`   Despachos: ${despachos.map(d => `${d.proceso}@t${d.tiempo}`).join(', ')}`);
      
      // Verificar si hubo expropiación
      const procesosUnicos = new Set(despachos.map(d => d.proceso));
      const huboExpropiacion = despachos.length > procesosUnicos.size;
      
      console.log(`   ¿Hubo expropiación?: ${huboExpropiacion ? '✅ SÍ' : '❌ NO'}`);
      
      if (huboExpropiacion) {
        console.log('   🎉 El algoritmo SÍ está implementando expropiación correctamente');
      } else {
        console.log('   ⚠️  El algoritmo NO está implementando expropiación (problema detectado)');
      }
      
      return {
        algoritmo,
        despachos: despachos.map(d => `${d.proceso}@t${d.tiempo}`),
        huboExpropiacion,
        tiempoFinal: resultado.estadoFinal.tiempoActual
      };
    } else {
      console.error(`❌ Error: ${resultado.error}`);
      return { algoritmo, error: resultado.error };
    }
  } catch (error) {
    console.error(`❌ Excepción: ${error}`);
    return { algoritmo, error: String(error) };
  }
}

async function main() {
  console.log('🚀 TEST DE EXPROPIACIÓN - Verificando algoritmos expropitativos');
  
  // Algoritmos que DEBEN implementar expropiación
  const algoritmosExpropitativos = ['PRIORITY', 'SRTN', 'RR'];
  // Algoritmo que NO debe implementar expropiación (para comparar)
  const algoritmosNoExpropitativos = ['FCFS', 'SPN'];
  
  const resultados = [];
  
  // Probar algoritmos expropitativos
  for (const algoritmo of algoritmosExpropitativos) {
    const resultado = await analizarExpropiacion(algoritmo);
    resultados.push(resultado);
  }
  
  // Probar algoritmos no expropitativos (control)
  for (const algoritmo of algoritmosNoExpropitativos) {
    const resultado = await analizarExpropiacion(algoritmo);
    resultados.push(resultado);
  }
  
  console.log('\n📋 ===== RESUMEN DE EXPROPIACIÓN =====');
  resultados.forEach(r => {
    if (r.error) {
      console.log(`${r.algoritmo.padEnd(8)}: ERROR - ${r.error}`);
    } else {
      const status = r.huboExpropiacion ? '✅ EXPROPIA' : '❌ NO EXPROPIA';
      console.log(`${r.algoritmo.padEnd(8)}: ${status} - ${r.despachos?.join(', ')}`);
    }
  });
  
  // Diagnóstico
  const expropiativos = resultados.filter(r => algoritmosExpropitativos.includes(r.algoritmo) && !r.error);
  const funcionanBien = expropiativos.filter(r => r.huboExpropiacion);
  const noFuncionan = expropiativos.filter(r => !r.huboExpropiacion);
  
  if (noFuncionan.length > 0) {
    console.log('\n⚠️  PROBLEMAS DETECTADOS:');
    noFuncionan.forEach(r => {
      console.log(`   ${r.algoritmo}: No implementa expropiación cuando debería`);
    });
    console.log('\n🔧 CAUSA PROBABLE: El simulador no verifica expropiación durante eventos de llegada');
  } else {
    console.log('\n✅ TODOS LOS ALGORITMOS EXPROPITATIVOS FUNCIONAN CORRECTAMENTE');
  }
}

main().catch(console.error);
