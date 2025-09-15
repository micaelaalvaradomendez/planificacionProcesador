/**
 * Debug de eventos detallado para ver qué pasa con la cola de eventos
 */

import { MotorSimulacion } from '../../../src/lib/core/engine';
import { parseJsonToWorkload } from "../../src/lib/infrastructure/parsers/jsonParser"';
import { readFile } from 'fs/promises';

async function debugEventosDetallado() {
  console.log('🔍 DEBUG DE EVENTOS DETALLADO');
  
  // Configuración mínima para debug
  const config = {
    policy: 'FCFS' as const,
    quantum: undefined,
    tcp: 2,
    tip: 3,
    tfp: 1
  };
  
  try {
    // Cargar archivo
    const contenido = await readFile('../../../examples/workloads/procesos_tanda_7p.json', 'utf-8');
    const file = new File([contenido], 'procesos_tanda_7p.json', { type: 'application/json' });
    
    let workload = await parseJsonToWorkload(file);
    
    // Aplicar configuración
    if (workload && workload.config) {
      workload.config.policy = config.policy;
      workload.config.tip = config.tip;
      workload.config.tfp = config.tfp;
      workload.config.tcp = config.tcp;
      workload.config.quantum = config.quantum;
    }
    
    if (!workload) {
      throw new Error('No se pudo cargar el workload');
    }
    
    console.log('Procesos iniciales:');
    workload.processes.forEach(p => {
      console.log(`  ${p.name}: arribo=${p.tiempoArribo}, ráfagas=${p.rafagasCPU}, duración=${p.duracionRafagaCPU}`);
    });
    
    // Crear motor y ejecutar
    const motor = new MotorSimulacion(workload);
    const resultado = motor.ejecutar();
    
    console.log('\n📊 TODOS LOS EVENTOS INTERNOS:');
    resultado.eventosInternos.forEach((e, i) => {
      console.log(`${i+1}. T=${e.tiempo}: ${e.tipo} - ${e.proceso} - ${e.extra || 'sin detalles'}`);
    });
    
    console.log('\n📊 TODOS LOS EVENTOS DE EXPORTACIÓN:');
    resultado.eventosExportacion.forEach((e, i) => {
      console.log(`${i+1}. T=${e.tiempo}: ${e.tipo} - ${e.proceso} - ${e.detalle || 'sin detalles'}`);
    });
    
    console.log('\n📊 ESTADO FINAL:');
    const procesosFinales = Array.from(resultado.estadoFinal.procesos.values());
    console.log(`Tiempo final: ${resultado.estadoFinal.tiempoActual}`);
    console.log(`Proceso ejecutando: ${resultado.estadoFinal.procesoEjecutando || 'ninguno'}`);
    console.log(`Cola de listos: [${resultado.estadoFinal.colaListos.join(', ')}]`);
    console.log(`Cola de bloqueados: [${resultado.estadoFinal.colaBloqueados.join(', ')}]`);
    
    console.log('\nDetalles de cada proceso:');
    procesosFinales.forEach(p => {
      console.log(`  ${p.name}: estado=${p.estado}, ráfagasRestantes=${p.rafagasRestantes}, restanteEnRafaga=${p.restanteEnRafaga}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugEventosDetallado();