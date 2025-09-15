/**
 * Test para verificar que diferentes algoritmos generan diferentes Gantt charts
 */

import { AdaptadorSimuladorDominio } from './src/lib/core/adaptadorSimuladorDominio';
import type { Workload, Policy } from './src/lib/domain/types';

// Workload de prueba
const workloadPrueba: Workload = {
  processes: [
    {
      name: 'P1',
      tiempoArribo: 0,
      rafagasCPU: 1,
      duracionRafagaCPU: 6,
      duracionRafagaES: 0,
      prioridad: 2
    },
    {
      name: 'P2',
      tiempoArribo: 1,
      rafagasCPU: 1,
      duracionRafagaCPU: 2,
      duracionRafagaES: 0,
      prioridad: 1
    },
    {
      name: 'P3',
      tiempoArribo: 2,
      rafagasCPU: 1,
      duracionRafagaCPU: 4,
      duracionRafagaES: 0,
      prioridad: 3
    }
  ],
  config: {
    policy: 'FCFS' as Policy,
    quantum: 4,
    tip: 1,
    tfp: 1,
    tcp: 1
  }
};

async function probarAlgoritmo(algoritmo: Policy) {
  console.log(`\n🧪 ===== Probando algoritmo: ${algoritmo} =====`);
  
  const workload: Workload = {
    ...workloadPrueba,
    config: {
      ...workloadPrueba.config,
      policy: algoritmo
    }
  };
  
  try {
    const motor = new AdaptadorSimuladorDominio(workload);
    const resultado = motor.ejecutar();
    
    if (resultado.exitoso) {
      console.log(`✅ ${algoritmo}: Simulación exitosa`);
      console.log(`   Eventos internos: ${resultado.eventosInternos.length}`);
      console.log(`   Tiempo final: ${resultado.estadoFinal.tiempoActual}`);
      
      // Mostrar algunos eventos de despacho para verificar diferencias
      const despachos = resultado.eventosInternos.filter(e => e.tipo === 'Despacho');
      console.log(`   Despachos (orden): ${despachos.map(d => d.proceso).join(', ')}`);
      
      return {
        algoritmo,
        exitoso: true,
        orden: despachos.map(d => d.proceso),
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
  console.log('🚀 Verificando que diferentes algoritmos generan diferentes resultados');
  console.log('📊 Procesos de prueba:');
  workloadPrueba.processes.forEach(p => {
    console.log(`   ${p.name}: arribo=${p.tiempoArribo}, CPU=${p.duracionRafagaCPU}, prioridad=${p.prioridad}`);
  });
  
  const algoritmos: Policy[] = ['FCFS', 'SPN', 'SRTN', 'RR', 'PRIORITY'];
  const resultados: any[] = [];
  
  for (const algoritmo of algoritmos) {
    const resultado = await probarAlgoritmo(algoritmo);
    resultados.push(resultado);
  }
  
  console.log('\n📈 ===== RESUMEN DE RESULTADOS =====');
  resultados.forEach(r => {
    if (r.exitoso) {
      console.log(`${r.algoritmo.padEnd(8)}: ${r.orden?.join(' → ')} (T=${r.tiempoFinal})`);
    } else {
      console.log(`${r.algoritmo.padEnd(8)}: ERROR - ${r.error}`);
    }
  });
  
  // Verificar que al menos algunos algoritmos dan resultados diferentes
  const ordenesDiferentes = new Set(resultados.filter(r => r.exitoso).map(r => r.orden?.join(',')));
  if (ordenesDiferentes.size > 1) {
    console.log(`\n✅ ÉXITO: Se encontraron ${ordenesDiferentes.size} secuencias diferentes de despacho`);
    console.log('   Esto confirma que el algoritmo de scheduling sí está afectando los resultados');
  } else {
    console.log('\n❌ PROBLEMA: Todos los algoritmos generan la misma secuencia');
    console.log('   Esto indica que el algoritmo no está siendo aplicado correctamente');
  }
}

main().catch(console.error);
