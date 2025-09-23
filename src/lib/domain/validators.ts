import type { ProcessSpec, RunConfig, Workload } from './types';

/**
 * VALIDACIONES BÁSICAS DE PROCESO INDIVIDUAL
 */
export function validarProceso(p: ProcessSpec): string[] {
  const e: string[] = [];
  
  // Validaciones básicas de campos requeridos
  if (!p.id || p.id.trim() === '') e.push('id requerido y no vacío');
  if (!Number.isInteger(p.arribo) || p.arribo < 0) e.push('arribo debe ser entero >=0');
  if (!Number.isInteger(p.rafagasCPU) || p.rafagasCPU < 1) e.push('rafagasCPU debe ser entero >=1');
  if (!Number.isInteger(p.duracionCPU) || p.duracionCPU <= 0) e.push('duracionCPU debe ser entero >0');
  if (!Number.isInteger(p.duracionIO) || p.duracionIO < 0) e.push('duracionIO debe ser entero >=0');
  if (!Number.isInteger(p.prioridad) || p.prioridad < 1 || p.prioridad > 100) e.push('prioridad debe estar en 1..100');
  
  // REGLAS DE COHERENCIA ENTRE CAMPOS
  
  // Si hay múltiples ráfagas, debe haber E/S entre ellas
  if (p.rafagasCPU > 1 && p.duracionIO <= 0) {
    e.push(`con ${p.rafagasCPU} ráfagas CPU necesita duracionIO > 0 para E/S entre ráfagas`);
  }
  
  // Si hay E/S configurada, debe haber múltiples ráfagas para usarla
  if (p.duracionIO > 0 && p.rafagasCPU === 1) {
    e.push(`duracionIO > 0 pero rafagasCPU = 1 (inconsistente: no habrá E/S)`);
  }
  
  // ADVERTENCIAS PARA VALORES EXTREMOS
  if (p.duracionCPU > 1000) {
    e.push(`ráfaga CPU muy larga (${p.duracionCPU}u) puede afectar interactividad`);
  }
  
  if (p.rafagasCPU > 20) {
    e.push(`demasiadas ráfagas CPU (${p.rafagasCPU}) puede complicar análisis`);
  }
  
  if (p.duracionIO > 500) {
    e.push(`E/S muy larga (${p.duracionIO}u) puede dominar el tiempo de simulación`);
  }
  
  return e;
}

/**
 * VALIDACIONES DE CONFIGURACIÓN CON REGLAS ESPECÍFICAS POR POLÍTICA
 */
export function validarConfiguracion(c: RunConfig): string[] {
  const e: string[] = [];
  
  // Validaciones básicas
  if (!c.policy) e.push('política requerida');
  if (c.tip < 0) e.push('TIP debe ser >=0');
  if (c.tfp < 0) e.push('TFP debe ser >=0'); 
  if (c.tcp < 0) e.push('TCP debe ser >=0');
  
  // VALIDACIONES ESPECÍFICAS POR POLÍTICA
  
  if (c.policy === 'RR') {
    // Round Robin: requiere quantum válido
    if (!c.quantum || c.quantum <= 0) {
      e.push('Round Robin requiere quantum válido >0');
    } else {
      if (c.quantum < 1) {
        e.push('quantum debe ser al menos 1 unidad de tiempo');
      }
      // Advertencia de eficiencia: quantum vs TCP
      if (c.tcp > 0 && c.quantum < c.tcp * 2) {
        e.push('quantum muy pequeño: debe ser al menos 2× TCP para eficiencia');
      }
    }
  } else {
    // Para políticas no-RR, quantum es innecesario
    if (c.quantum !== undefined) {
      e.push(`política ${c.policy} no requiere quantum (ignorado)`);
    }
  }
  
  // Validaciones de coherencia temporal
  if (c.tcp > 100) {
    e.push('TCP muy alto: puede dominar el tiempo de simulación');
  }
  
  if (c.tip > 50) {
    e.push('TIP muy alto: puede retrasar inicio de procesos significativamente');
  }
  
  if (c.tfp > 50) {
    e.push('TFP muy alto: puede extender artificialmente el tiempo total');
  }
  
  return e;
}

/**
 * VALIDACIONES CRUZADAS Y COHERENCIA DE TANDA COMPLETA
 */
export function validarTandaDeProcesos(w: Workload): string[] {
  const e: string[] = [];
  
  // Validaciones estructurales básicas
  if (!w.processes?.length) e.push('procesos vacío');
  if (!w.config) e.push('configuración requerida');
  
  // Validar configuración
  e.push(...validarConfiguracion(w.config));
  
  // Validar procesos individualmente
  w.processes.forEach((p, i) => {
    const pe = validarProceso(p);
    if (pe.length) {
      pe.forEach(error => e.push(`Proceso ${i + 1} (${p.id || 'sin_nombre'}): ${error}`));
    }
  });
  
  // VALIDACIONES CRUZADAS ESPECÍFICAS POR POLÍTICA
  
  if (w.config?.policy === 'PRIORITY') {
    const prioridades = w.processes.map(p => p.prioridad);
    const prioridadMin = Math.min(...prioridades);
    const prioridadMax = Math.max(...prioridades);
    
    // Verificar rango válido (ya validado individualmente, pero verificar conjunto)
    if (prioridades.some(p => p < 1 || p > 100)) {
      e.push('Priority: todas las prioridades deben estar entre 1 y 100');
    }
    
    // Advertencia si todas las prioridades son iguales
    if (prioridadMin === prioridadMax && prioridades.length > 1) {
      e.push('Priority: todos los procesos tienen la misma prioridad - considerar usar FCFS');
    }
    
    // Advertencia si hay muy poca variación de prioridades
    if (prioridadMax - prioridadMin < 2 && prioridades.length > 3) {
      e.push('Priority: poca variación en prioridades, diferencias mínimas pueden no ser significativas');
    }
  }
  
  // VALIDACIONES DE COHERENCIA TEMPORAL DE LA TANDA
  
  const tiemposArribo = w.processes.map(p => p.arribo);
  const arriboMin = Math.min(...tiemposArribo);
  const arriboMax = Math.max(...tiemposArribo);
  
  // Verificar que hay distribución temporal razonable
  if (arriboMax - arriboMin === 0 && w.processes.length > 1) {
    e.push('Todos los procesos arriban al mismo tiempo - considerar escalonar arribotos');
  }
  
  // Verificar IDs únicos
  const ids = w.processes.map(p => p.id);
  const idsUnicos = new Set(ids);
  if (idsUnicos.size !== ids.length) {
    e.push('IDs de procesos deben ser únicos');
  }
  
  // VALIDACIONES DE CARGA DE TRABAJO RAZONABLE
  
  const tiempoTotalCPU = w.processes.reduce((sum, p) => sum + (p.rafagasCPU * p.duracionCPU), 0);
  const tiempoTotalIO = w.processes.reduce((sum, p) => sum + (Math.max(0, p.rafagasCPU - 1) * p.duracionIO), 0);
  
  if (tiempoTotalCPU === 0) {
    e.push('Carga de trabajo inválida: tiempo total de CPU = 0');
  }
  
  if (tiempoTotalCPU > 10000) {
    e.push('Carga de trabajo muy pesada: tiempo total CPU > 10000u puede ser lenta de simular');
  }
  
  // Verificar balance CPU vs I/O
  if (tiempoTotalIO > 0) {
    const ratioIOCPU = tiempoTotalIO / tiempoTotalCPU;
    if (ratioIOCPU > 5) {
      e.push('Carga dominada por E/S: ratio I/O:CPU muy alto puede generar mucho tiempo idle');
    }
  }
  
  // VALIDACIONES ESPECÍFICAS PARA ALGORITMOS SJF/SRTN
  
  if (w.config?.policy === 'SPN' || w.config?.policy === 'SRTN') {
    // Para SJF/SRTN, verificar que hay variación en tiempos de CPU
    const tiemposCPU = w.processes.map(p => p.rafagasCPU * p.duracionCPU);
    const cpuMin = Math.min(...tiemposCPU);
    const cpuMax = Math.max(...tiemposCPU);
    
    if (cpuMin === cpuMax && w.processes.length > 1) {
      e.push(`${w.config.policy}: todos los procesos tienen el mismo tiempo de CPU - comportamiento similar a FCFS`);
    }
  }
  
  return e;
}

/**
 * FUNCIÓN DE CONVENIENCIA: Validación completa con resultado estructurado
 */
export function validarWorkloadCompleto(w: Workload): { valido: boolean; errores: string[]; advertencias: string[] } {
  const todosLosErrores = validarTandaDeProcesos(w);
  
  // Separar errores críticos de advertencias
  const errores = todosLosErrores.filter(e => 
    !e.includes('considerar') && 
    !e.includes('puede') && 
    !e.includes('advertencia') &&
    !e.includes('muy') &&
    !e.includes('poca variación') &&
    !e.includes('comportamiento similar')
  );
  
  const advertencias = todosLosErrores.filter(e => 
    e.includes('considerar') || 
    e.includes('puede') || 
    e.includes('advertencia') ||
    e.includes('muy') ||
    e.includes('poca variación') ||
    e.includes('comportamiento similar')
  );
  
  return {
    valido: errores.length === 0,
    errores,
    advertencias
  };
}
