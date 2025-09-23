/**
 * Punto de entrada principal del núcleo de simulación
 * USA ÚNICAMENTE las entidades del dominio (Proceso.ts + Simulador.ts)
 */

export * from './state';
export * from './priorityQueue';
export * from './adaptadorSimuladorDominio';
export * from './adaptadorEntidadesDominio';

// Re-exportar tipos importantes
export type { 
  SimState, 
  TipoEventoInterno,
  EventoInterno,
  ContadoresCPU,
  ModoEjecucion 
} from './state';

// Re-exportar tipos del dominio para conveniencia
export { EstadoProceso } from '../domain/types';

export type { 
  ColaComparator 
} from './priorityQueue';

export type { 
  ResultadoSimulacionDominio 
} from './adaptadorSimuladorDominio';

// Funciones principales para usar desde fuera del núcleo
import { AdaptadorSimuladorDominio } from './adaptadorSimuladorDominio';
import { MetricsCalculator } from '../domain/services/MetricsCalculator';
import type { Workload } from '../domain/types';

/**
 * Función principal para ejecutar una simulación completa
 * USA SOLO LAS ENTIDADES DEL DOMINIO
 */
export async function ejecutarSimulacion(workload: Workload) {
  console.log('🏛️ Iniciando simulación con entidades del dominio...');
  
  const motor = new AdaptadorSimuladorDominio(workload);
  const resultado = motor.ejecutar();
  
  if (!resultado.exitoso) {
    throw new Error(resultado.error || 'Error desconocido en la simulación');
  }
  
  // Calcular métricas (ya incluye porcentajes)
  const metricas = MetricsCalculator.calcularMetricasCompletas(resultado.estadoFinal);
  
  return {
    eventos: resultado.eventosExportacion,
    metricas,
    estadoFinal: resultado.estadoFinal,
    eventosInternos: resultado.eventosInternos // para debugging
  };
}

/**
 * Función para validar una configuración de workload antes de simular
 * VERSION ENDURECIDA: Valida invariantes específicos por política y consistencias de datos
 */
export function validarWorkloadParaSimulacion(workload: Workload): {
  valido: boolean;
  errores: string[];
} {
  const errores: string[] = [];
  
  // Validar configuración básica
  if (!workload.processes || workload.processes.length === 0) {
    errores.push('La tanda debe contener al menos un proceso');
  }
  
  if (!workload.config) {
    errores.push('La configuración del sistema es requerida');
    return { valido: false, errores };
  }
  
  // Validaciones básicas de configuración
  if (workload.config.tip < 0) {
    errores.push('TIP debe ser mayor o igual a 0');
  }
  if (workload.config.tfp < 0) {
    errores.push('TFP debe ser mayor o igual a 0');
  }
  if (workload.config.tcp < 0) {
    errores.push('TCP debe ser mayor o igual a 0');
  }
  
  // === VALIDACIONES ESPECÍFICAS POR POLÍTICA ===
  
  if (workload.config.policy === 'RR') {
    // Round Robin: requiere quantum válido
    if (!workload.config.quantum || workload.config.quantum <= 0) {
      errores.push('Round Robin requiere un quantum válido mayor a 0');
    }
    if (workload.config.quantum && workload.config.quantum < 1) {
      errores.push('Quantum debe ser al menos 1 unidad de tiempo');
    }
    // Advertencia si quantum muy pequeño comparado con TCP
    if (workload.config.quantum && workload.config.tcp > 0 && 
        workload.config.quantum < workload.config.tcp * 2) {
      errores.push('Quantum muy pequeño: debe ser al menos 2× TCP para eficiencia');
    }
  }
  
  if (workload.config.policy === 'PRIORITY') {
    // Priority: verificar que las prioridades están en rango válido
    const prioridades = (workload.processes || []).map(p => p.prioridad);
    const prioridadMin = Math.min(...prioridades);
    const prioridadMax = Math.max(...prioridades);
    
    if (prioridades.some(p => p < 1 || p > 100)) {
      errores.push('Priority: todas las prioridades deben estar entre 1 y 100');
    }
    
    // Advertencia si todas las prioridades son iguales (PRIORITY sin sentido)
    if (prioridadMin === prioridadMax && prioridades.length > 1) {
      errores.push('Priority: todos los procesos tienen la misma prioridad - considerar usar FCFS');
    }
  }
  
  // Validar procesos individualmente
  for (const proceso of workload.processes || []) {
    const procesoId = proceso.id || 'sin_nombre';
    
    // Validaciones básicas
    if (!proceso.id || proceso.id.trim() === '') {
      errores.push('Todos los procesos deben tener un nombre válido');
    }
    if (proceso.arribo < 0) {
      errores.push(`Proceso ${procesoId}: tiempo de arribo debe ser mayor o igual a 0`);
    }
    
    // === VALIDACIONES ENDURECIDAS DE RÁFAGAS ===
    
    // Número de ráfagas de CPU debe ser >= 1
    if (!Number.isInteger(proceso.rafagasCPU) || proceso.rafagasCPU < 1) {
      errores.push(`Proceso ${procesoId}: debe tener al menos 1 ráfaga de CPU (rafagasCPU >= 1)`);
    }
    
    // Duración de ráfaga de CPU debe ser > 0
    if (!Number.isInteger(proceso.duracionCPU) || proceso.duracionCPU <= 0) {
      errores.push(`Proceso ${procesoId}: duración de ráfaga de CPU debe ser un entero mayor a 0`);
    }
    
    // Duración de E/S: si hay múltiples ráfagas, debe ser > 0
    if (proceso.rafagasCPU > 1 && proceso.duracionIO <= 0) {
      errores.push(`Proceso ${procesoId}: con ${proceso.rafagasCPU} ráfagas CPU necesita duracionIO > 0 para E/S entre ráfagas`);
    }
    
    // Duración de E/S no puede ser negativa
    if (proceso.duracionIO < 0) {
      errores.push(`Proceso ${procesoId}: duración de E/S no puede ser negativa`);
    }
    
    // === VALIDACIONES DE CONSISTENCIA TEMPORAL ===
    
    // Si hay E/S, verificar que es consistente
    if (proceso.duracionIO > 0 && proceso.rafagasCPU === 1) {
      errores.push(`Proceso ${procesoId}: duracionIO > 0 pero rafagasCPU = 1 (inconsistente: no habrá E/S)`);
    }
    
    // Advertencias para valores extremos
    if (proceso.duracionCPU > 1000) {
      errores.push(`Proceso ${procesoId}: ráfaga CPU muy larga (${proceso.duracionCPU}u) puede afectar interactividad`);
    }
    
    if (proceso.rafagasCPU > 20) {
      errores.push(`Proceso ${procesoId}: demasiadas ráfagas CPU (${proceso.rafagasCPU}) puede complicar análisis`);
    }
    
    // === VALIDACIONES DE PRIORIDAD ===
    
    if (!Number.isInteger(proceso.prioridad) || proceso.prioridad < 1 || proceso.prioridad > 100) {
      errores.push(`Proceso ${procesoId}: prioridad debe ser un entero entre 1 y 100`);
    }
  }
  
  // === VALIDACIONES DE CONSISTENCIA DE TANDA ===
  
  // Validar unicidad de nombres
  const nombres = new Set();
  for (const proceso of workload.processes || []) {
    if (nombres.has(proceso.id)) {
      errores.push(`Nombre de proceso duplicado: ${proceso.id}`);
    }
    nombres.add(proceso.id);
  }
  
  // Validar que no todos los procesos lleguen al mismo tiempo (para análisis útil)
  if (workload.processes && workload.processes.length > 1) {
    const tiemposArribo = workload.processes.map(p => p.arribo);
    const arriboMin = Math.min(...tiemposArribo);
    const arriboMax = Math.max(...tiemposArribo);
    
    if (arriboMin === arriboMax && workload.config.policy !== 'FCFS') {
      errores.push('Todos los procesos llegan al mismo tiempo - considerar escalonar arribos para análisis más rico');
    }
  }
  
  // Validación total de trabajo computacional
  const tiempoTotalCPU = (workload.processes || []).reduce((sum, p) => 
    sum + (p.rafagasCPU * p.duracionCPU), 0);
    
  if (tiempoTotalCPU === 0) {
    errores.push('La tanda no tiene trabajo computacional (tiempo total CPU = 0)');
  }
  
  return {
    valido: errores.length === 0,
    errores
  };
}
