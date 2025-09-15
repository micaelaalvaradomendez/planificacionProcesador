/**
 * Casos de prueba para validar el motor de simulación
 * Conjunto mínimo de pruebas para verificar funcionalidad básica
 */

import type { Workload } from '../../src/lib/domain/types.js';
import { ejecutarSimulacionCompleta } from '../../src/lib/application/usecases/runSimulation.js';
import { construirDiagramaGantt } from '../../src/lib/application/usecases/buildGantt.js';
import { calcularEstadisticasExtendidas } from '../../src/lib/application/usecases/computeStatistics.js';

/**
 * Caso de prueba básico: FCFS con un solo proceso sin E/S
 */
export const CASO_PRUEBA_FCFS_SIMPLE: Workload = {
  workloadName: 'FCFS Simple - Un Proceso',
  processes: [
    {
      name: 'P1',
      tiempoArribo: 0,
      rafagasCPU: 1,
      duracionRafagaCPU: 10,
      duracionRafagaES: 0,
      prioridad: 50
    }
  ],
  config: {
    policy: 'FCFS',
    tip: 1,
    tfp: 1,
    tcp: 1
  }
};

/**
 * Caso de prueba: FCFS con múltiples procesos y E/S
 */
export const CASO_PRUEBA_FCFS_MULTIPLE: Workload = {
  workloadName: 'FCFS Múltiple - Con E/S',
  processes: [
    {
      name: 'P1',
      tiempoArribo: 0,
      rafagasCPU: 2,
      duracionRafagaCPU: 5,
      duracionRafagaES: 3,
      prioridad: 50
    },
    {
      name: 'P2',
      tiempoArribo: 2,
      rafagasCPU: 1,
      duracionRafagaCPU: 8,
      duracionRafagaES: 0,
      prioridad: 30
    },
    {
      name: 'P3',
      tiempoArribo: 4,
      rafagasCPU: 3,
      duracionRafagaCPU: 3,
      duracionRafagaES: 2,
      prioridad: 70
    }
  ],
  config: {
    policy: 'FCFS',
    tip: 2,
    tfp: 1,
    tcp: 1
  }
};

/**
 * Caso de prueba: Round Robin
 */
export const CASO_PRUEBA_RR: Workload = {
  workloadName: 'Round Robin - Quantum 4',
  processes: [
    {
      name: 'P1',
      tiempoArribo: 0,
      rafagasCPU: 1,
      duracionRafagaCPU: 10,
      duracionRafagaES: 0,
      prioridad: 50
    },
    {
      name: 'P2',
      tiempoArribo: 1,
      rafagasCPU: 1,
      duracionRafagaCPU: 6,
      duracionRafagaES: 0,
      prioridad: 50
    },
    {
      name: 'P3',
      tiempoArribo: 2,
      rafagasCPU: 1,
      duracionRafagaCPU: 4,
      duracionRafagaES: 0,
      prioridad: 50
    }
  ],
  config: {
    policy: 'RR',
    tip: 1,
    tfp: 1,
    tcp: 1,
    quantum: 4
  }
};

/**
 * Caso de prueba: Prioridad Externa
 */
export const CASO_PRUEBA_PRIORIDAD: Workload = {
  workloadName: 'Prioridad Externa',
  processes: [
    {
      name: 'P_Baja',
      tiempoArribo: 0,
      rafagasCPU: 1,
      duracionRafagaCPU: 8,
      duracionRafagaES: 0,
      prioridad: 20
    },
    {
      name: 'P_Alta',
      tiempoArribo: 2,
      rafagasCPU: 1,
      duracionRafagaCPU: 4,
      duracionRafagaES: 0,
      prioridad: 90
    },
    {
      name: 'P_Media',
      tiempoArribo: 1,
      rafagasCPU: 1,
      duracionRafagaCPU: 6,
      duracionRafagaES: 0,
      prioridad: 50
    }
  ],
  config: {
    policy: 'PRIORITY',
    tip: 1,
    tfp: 1,
    tcp: 1
  }
};

/**
 * Ejecuta una prueba individual y muestra resultados
 */
export async function ejecutarPrueba(
  casoPrueba: Workload,
  mostrarDetalles: boolean = true
): Promise<boolean> {
  try {
    console.log(`\n=== EJECUTANDO: ${casoPrueba.workloadName} ===`);
    
    // Ejecutar simulación
    const resultado = await ejecutarSimulacionCompleta(casoPrueba);
    
    if (!resultado.exitoso) {
      console.error('❌ Error en simulación:', resultado.error);
      return false;
    }
    
    if (mostrarDetalles) {
      // Mostrar métricas básicas
      console.log('✅ Simulación exitosa');
      console.log(`⏱️  Tiempo total: ${resultado.tiempoTotal.toFixed(2)}`);
      console.log(`📊 Procesos terminados: ${resultado.metricas.porProceso.length}`);
      console.log(`🔄 Eventos generados: ${resultado.eventos.length}`);
      
      // Métricas de CPU
      const tanda = resultado.metricas.tanda;
      console.log('\n📈 Uso de CPU:');
      console.log(`   Procesos: ${tanda.cpuProcesos.toFixed(2)} (${tanda.porcentajeCpuProcesos?.toFixed(1)}%)`);
      console.log(`   SO: ${tanda.cpuSO.toFixed(2)} (${tanda.porcentajeCpuSO?.toFixed(1)}%)`);
      console.log(`   Ocioso: ${tanda.cpuOcioso.toFixed(2)} (${tanda.porcentajeCpuOcioso?.toFixed(1)}%)`);
      
      // Métricas por proceso
      console.log('\n📋 Métricas por proceso:');
      for (const proc of resultado.metricas.porProceso) {
        console.log(`   ${proc.name}: TR=${proc.tiempoRetorno.toFixed(2)}, TRn=${proc.tiempoRetornoNormalizado.toFixed(2)}, T_Listo=${proc.tiempoEnListo.toFixed(2)}`);
      }
      
      // Estadísticas extendidas
      const estadisticas = calcularEstadisticasExtendidas(
        resultado.metricas, 
        resultado.eventos, 
        resultado.tiempoTotal
      );
      
      console.log('\n🎯 Análisis de rendimiento:');
      console.log(`   Eficiencia CPU: ${estadisticas.analisis.eficienciaCPU.toFixed(1)}%`);
      console.log(`   Throughput: ${estadisticas.analisis.throughput.toFixed(3)} proc/tiempo`);
      console.log(`   Balance de carga: ${estadisticas.analisis.balanceCarga}`);
      console.log(`   Equidad: ${estadisticas.analisis.equidad}`);
      
      // Diagrama de Gantt
      const gantt = construirDiagramaGantt(resultado.eventos);
      console.log(`\n📊 Diagrama Gantt: ${gantt.segmentos.length} segmentos generados`);
      
      // Advertencias
      if (resultado.advertencias && resultado.advertencias.length > 0) {
        console.log('\n⚠️  Advertencias:');
        resultado.advertencias.forEach(adv => console.log(`   • ${adv}`));
      }
      
      // Recomendaciones
      if (estadisticas.recomendaciones.length > 0) {
        console.log('\n💡 Recomendaciones:');
        estadisticas.recomendaciones.forEach(rec => console.log(`   • ${rec}`));
      }
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
    return false;
  }
}

/**
 * Ejecuta todas las pruebas básicas
 */
export async function ejecutarTodasLasPruebas(): Promise<void> {
  console.log('🧪 INICIANDO PRUEBAS DEL MOTOR DE SIMULACIÓN');
  console.log('='.repeat(50));
  
  const casos = [
    CASO_PRUEBA_FCFS_SIMPLE,
    CASO_PRUEBA_FCFS_MULTIPLE,
    CASO_PRUEBA_RR,
    CASO_PRUEBA_PRIORIDAD
  ];
  
  let exitos = 0;
  
  for (const caso of casos) {
    const exitoso = await ejecutarPrueba(caso, true);
    if (exitoso) {
      exitos++;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`🏁 RESUMEN: ${exitos}/${casos.length} pruebas exitosas`);
  
  if (exitos === casos.length) {
    console.log('🎉 ¡Todas las pruebas pasaron correctamente!');
  } else {
    console.log('⚠️  Algunas pruebas fallaron. Revisar implementación.');
  }
}

/**
 * Prueba rápida para verificar funcionalidad básica
 */
export async function pruebaRapida(): Promise<boolean> {
  console.log('🔍 Ejecutando prueba rápida...');
  
  try {
    const resultado = await ejecutarSimulacionCompleta(CASO_PRUEBA_FCFS_SIMPLE);
    
    const valido = resultado.exitoso && 
                   resultado.metricas.porProceso.length === 1 &&
                   resultado.metricas.porProceso[0].tiempoRetorno > 0;
    
    if (valido) {
      console.log('✅ Prueba rápida exitosa - Motor funcionando correctamente');
    } else {
      console.log('❌ Prueba rápida falló - Revisar implementación');
    }
    
    return valido;
    
  } catch (error) {
    console.error('❌ Error en prueba rápida:', error);
    return false;
  }
}
