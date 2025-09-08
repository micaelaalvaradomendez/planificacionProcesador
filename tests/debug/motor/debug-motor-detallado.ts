/**
 * Debug del motor de simulación para encontrar por qué los procesos no terminan en la UI
 */

import { MotorSimulacion } from '../../../src/lib/core/engine';
import { analizarTandaJson } from '../../../src/lib/infrastructure/io/parseWorkload';
import { calcularMetricasCompletas } from '../../../src/lib/core/metrics';
import { readFile } from 'fs/promises';

async function debugMotorDetallado() {
  console.log('🔍 DEBUG DETALLADO DEL MOTOR DE SIMULACIÓN');
  
  // Usar el mismo archivo que en la UI
  const archivoEntrada = '../../../examples/workloads/procesos_tanda_7p.json';
  
  // Configuración idéntica a la UI
  const config = {
    policy: 'FCFS' as const,
    quantum: undefined,
    tcp: 2,
    tip: 3,
    tfp: 1
  };
  
  try {
    // Cargar archivo directamente
    console.log('\n1. CARGANDO ARCHIVO...');
    const contenido = await readFile(archivoEntrada, 'utf-8');
    const file = new File([contenido], 'procesos_tanda_7p.json', { type: 'application/json' });
    
    let workload = await analizarTandaJson(file);
    
    // Aplicar configuración de UI al workload JSON
    if (workload && workload.config) {
      workload.config.policy = config.policy;
      workload.config.tip = config.tip;
      workload.config.tfp = config.tfp;
      workload.config.tcp = config.tcp;
      workload.config.quantum = config.quantum;
    }
    
    console.log('Workload cargado:', {
      procesos: workload?.processes.length,
      config: workload?.config
    });
    
    if (!workload) {
      throw new Error('No se pudo cargar el workload');
    }
    
    // Crear motor
    console.log('\n2. CREANDO MOTOR...');
    const motor = new MotorSimulacion(workload);
    
    // Ejecutar simulación
    console.log('\n3. EJECUTANDO SIMULACIÓN...');
    const resultado = motor.ejecutar();
    
    console.log('\n4. RESULTADO DE LA SIMULACIÓN:');
    console.log('Exitoso:', resultado.exitoso);
    if (resultado.error) {
      console.log('Error:', resultado.error);
    }
    
    // Analizar estado final
    console.log('\n5. ANÁLISIS DEL ESTADO FINAL:');
    const procesosFinales = Array.from(resultado.estadoFinal.procesos.values());
    
    console.log('Estados de procesos:');
    procesosFinales.forEach(p => {
      console.log(`  ${p.name}: estado=${p.estado}, rafagasRestantes=${p.rafagasRestantes}, finTFP=${p.finTFP}`);
    });
    
    // Verificar cuántos procesos terminaron
    const procesosTerminados = procesosFinales.filter(p => p.estado === 'Terminado');
    const procesosConFinTFP = procesosFinales.filter(p => p.finTFP !== undefined);
    
    console.log(`\nProcesos terminados: ${procesosTerminados.length}/${procesosFinales.length}`);
    console.log(`Procesos con finTFP: ${procesosConFinTFP.length}/${procesosFinales.length}`);
    
    // Intentar calcular métricas
    console.log('\n6. CALCULANDO MÉTRICAS...');
    const metricas = calcularMetricasCompletas(resultado.estadoFinal);
    
    console.log('Métricas por proceso:', metricas.porProceso.length);
    console.log('Métricas de tanda:', {
      tiempoRetornoTanda: metricas.tanda.tiempoRetornoTanda,
      tiempoMedioRetorno: metricas.tanda.tiempoMedioRetorno,
      cpuOcioso: metricas.tanda.cpuOcioso,
      cpuSO: metricas.tanda.cpuSO,
      cpuProcesos: metricas.tanda.cpuProcesos
    });
    
    // Mostrar eventos críticos
    console.log('\n7. EVENTOS CRÍTICOS:');
    const eventosTerminacion = resultado.eventosInternos.filter(e => 
      e.tipo === 'FinTFP' || e.tipo === 'FinRafagaCPU'
    );
    
    console.log('Eventos de terminación:');
    eventosTerminacion.forEach(e => {
      console.log(`  ${e.tiempo}: ${e.tipo} - ${e.proceso} - ${e.extra || 'sin detalles'}`);
    });
    
    // Verificar si la simulación llegó hasta el final
    const tiempoFinal = resultado.estadoFinal.tiempoActual;
    console.log(`\nTiempo final de simulación: ${tiempoFinal}`);
    
    // Verificar si quedan eventos en cola
    console.log('\n8. VERIFICACIÓN DE TERMINACIÓN:');
    const hayProcesosPendientes = procesosFinales.some(p => p.estado !== 'Terminado');
    console.log('¿Hay procesos pendientes?', hayProcesosPendientes);
    
    if (hayProcesosPendientes) {
      console.log('Procesos pendientes:');
      procesosFinales.filter(p => p.estado !== 'Terminado').forEach(p => {
        console.log(`  ${p.name}: estado=${p.estado}, rafagasRestantes=${p.rafagasRestantes}`);
      });
    }
    
    // Verificar contadores de CPU
    console.log('\n9. CONTADORES DE CPU:');
    console.log('CPU contadores:', resultado.estadoFinal.contadoresCPU);
    
    return resultado;
    
  } catch (error) {
    console.error('❌ Error en debug del motor:', error);
    return null;
  }
}

// Ejecutar debug
debugMotorDetallado().then(resultado => {
  if (resultado) {
    console.log('\n✅ Debug completado');
  } else {
    console.log('\n❌ Debug falló');
  }
});