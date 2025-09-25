import type { ProcesData, ParametrosProces, CargaTrabajo, Policy } from './types';

/**
 * VALIDACIONES BÁSICAS DE PROCESO INDIVIDUAL
 */
export function validarProceso(p: ProcesData): string[] {
  const e: string[] = [];
  
  // Validaciones básicas de campos requeridos
  if (!p.nombre || p.nombre.trim() === '') e.push('nombre requerido y no vacío');
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
export function validarConfiguracion(c: ParametrosProces): string[] {
  const e: string[] = [];
  
  // Validaciones básicas
  if (!c.policy) e.push('política requerida');
  if (c.TIP < 0) e.push('TIP debe ser >=0');
  if (c.TFP < 0) e.push('TFP debe ser >=0'); 
  if (c.TCP < 0) e.push('TCP debe ser >=0');
  
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
      if (c.TCP > 0 && c.quantum < c.TCP * 2) {
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
  if (c.TCP > 100) {
    e.push('TCP muy alto: puede dominar el tiempo de simulación');
  }
  
  if (c.TIP > 50) {
    e.push('TIP muy alto: puede retrasar inicio de procesos significativamente');
  }
  
  if (c.TFP > 50) {
    e.push('TFP muy alto: puede extender artificialmente el tiempo total');
  }
  
  return e;
}

/**
 * VALIDACIONES CRUZADAS Y COHERENCIA DE TANDA COMPLETA
 */
export function validarTandaDeProcesos(w: CargaTrabajo): string[] {
  const e: string[] = [];
  
  // Validaciones estructurales básicas
  if (!w.procesos?.length) e.push('procesos vacío');
  if (!w.parametros) e.push('parámetros requeridos');
  
  // Validar configuración
  e.push(...validarConfiguracion(w.parametros));
  
  // Validar procesos individualmente
  w.procesos.forEach((p: ProcesData, i: number) => {
    const pe = validarProceso(p);
    if (pe.length) {
      pe.forEach(error => e.push(`Proceso ${i + 1} (${p.nombre || 'sin_nombre'}): ${error}`));
    }
  });
  
  // VALIDACIONES CRUZADAS ESPECÍFICAS POR POLÍTICA
  
  if (w.parametros?.policy === 'PRIORITY') {
    const prioridades = w.procesos.map((p: ProcesData) => p.prioridad);
    const prioridadMin = Math.min(...prioridades);
    const prioridadMax = Math.max(...prioridades);
    
    // Verificar rango válido (ya validado individualmente, pero verificar conjunto)
    if (prioridades.some((p: number) => p < 1 || p > 100)) {
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
  
  // NUEVAS VALIDACIONES DE COHERENCIA CRÍTICAS
  
  // Validación de nombres únicos
  const nombres = w.procesos.map((p: ProcesData) => p.nombre);
  const nombresUnicos = new Set(nombres);
  if (nombresUnicos.size !== nombres.length) {
    e.push('CRÍTICO: Nombres de procesos deben ser únicos');
  }
  
  // Validación de coherencia temporal por algoritmo
  if (w.parametros?.policy === 'RR' && w.parametros.quantum) {
    // RR: quantum debe ser mayor que TCP para ser efectivo
    if (w.parametros.quantum <= w.parametros.TCP) {
      e.push('CRÍTICO: quantum de RR debe ser mayor que TCP para evitar overhead excesivo');
    }
    
    // RR: verificar que hay procesos que puedan usar el quantum
    const tiemposRafaga = w.procesos.map((p: ProcesData) => p.duracionCPU);
    const todasRafagasMenores = tiemposRafaga.every(t => t <= w.parametros.quantum!);
    if (todasRafagasMenores) {
      e.push('ADVERTENCIA: RR con quantum muy grande - todas las ráfagas caben, comportará como FCFS');
    }
  }
  
  // Validación para SPN/SRTN: debe haber variación en tiempos
  if (w.parametros?.policy === 'SPN' || w.parametros?.policy === 'SRTN') {
    const tiemposCPU = w.procesos.map((p: ProcesData) => p.duracionCPU);
    const cpuMin = Math.min(...tiemposCPU);
    const cpuMax = Math.max(...tiemposCPU);
    
    if (cpuMin === cpuMax && w.procesos.length > 1) {
      e.push(`ADVERTENCIA: ${w.parametros.policy} con todas las ráfagas iguales - comportará como FCFS`);
    }
  }
  
  // VALIDACIONES DE COHERENCIA TEMPORAL DE LA TANDA
  
  const tiemposArribo = w.procesos.map((p: ProcesData) => p.arribo);
  const arriboMin = Math.min(...tiemposArribo);
  const arriboMax = Math.max(...tiemposArribo);
  
  // Verificar que hay distribución temporal razonable
  if (arriboMax - arriboMin === 0 && w.procesos.length > 1) {
    e.push('ADVERTENCIA: Todos los procesos arriban al mismo tiempo - considerar escalonar arribos');
  }
  
  // VALIDACIONES DE CARGA DE TRABAJO RAZONABLE
  
  const tiempoTotalCPU = w.procesos.reduce((sum: number, p: ProcesData) => sum + (p.rafagasCPU * p.duracionCPU), 0);
  const tiempoTotalIO = w.procesos.reduce((sum: number, p: ProcesData) => sum + (Math.max(0, p.rafagasCPU - 1) * p.duracionIO), 0);
  
  if (tiempoTotalCPU === 0) {
    e.push('CRÍTICO: Carga de trabajo inválida - tiempo total de CPU = 0');
  }
  
  if (tiempoTotalCPU > 10000) {
    e.push('ADVERTENCIA: Carga de trabajo muy pesada - tiempo total CPU > 10000u puede ser lenta de simular');
  }
  
  // Verificar balance CPU vs I/O
  if (tiempoTotalIO > 0) {
    const ratioIOCPU = tiempoTotalIO / tiempoTotalCPU;
    if (ratioIOCPU > 5) {
      e.push('ADVERTENCIA: Carga dominada por E/S - ratio I/O:CPU muy alto puede generar mucho tiempo idle');
    }
  }
  
  // NUEVAS VALIDACIONES ESPECÍFICAS DE COHERENCIA
  
  // Verificar consistencia entre rafagasCPU > 1 y duracionIO
  const procesosConMultiplesRafagas = w.procesos.filter((p: ProcesData) => p.rafagasCPU > 1);
  const procesosSinIO = procesosConMultiplesRafagas.filter((p: ProcesData) => p.duracionIO === 0);
  
  if (procesosSinIO.length > 0) {
    const nombresInconsistentes = procesosSinIO.map(p => p.nombre).join(', ');
    e.push(`CRÍTICO: Procesos con múltiples ráfagas pero sin E/S: ${nombresInconsistentes}`);
  }
  
  // Verificar que no hay procesos con duracionIO > 0 pero rafagasCPU = 1
  const procesosIOSinUso = w.procesos.filter((p: ProcesData) => p.duracionIO > 0 && p.rafagasCPU === 1);
  if (procesosIOSinUso.length > 0) {
    const nombresIOSinUso = procesosIOSinUso.map(p => p.nombre).join(', ');
    e.push(`INCONSISTENCIA: Procesos con E/S configurada pero solo 1 ráfaga: ${nombresIOSinUso}`);
  }
  
  // Validar tiempos de SO razonables vs tiempos de proceso
  const tiempoOverheadPorProceso = w.parametros.TIP + w.parametros.TFP;
  const tiempoMedioCPU = tiempoTotalCPU / w.procesos.length;
  
  if (tiempoOverheadPorProceso > tiempoMedioCPU / 2) {
    e.push('ADVERTENCIA: Overhead de SO (TIP+TFP) muy alto vs tiempo promedio de CPU');
  }
  
  // VALIDACIONES ADICIONALES ESPECÍFICAS DE COHERENCIA ESTRICTA
  
  // Validar que las prioridades tienen sentido según la política
  if (w.parametros?.policy === 'PRIORITY') {
    // Para Priority, verificar distribución de prioridades
    const prioridades = w.procesos.map((p: ProcesData) => p.prioridad);
    const rangoPrioridades = Math.max(...prioridades) - Math.min(...prioridades);
    
    // Verificar que hay suficiente rango de prioridades para que sea útil
    if (rangoPrioridades < 5 && w.procesos.length > 2) {
      e.push('ADVERTENCIA: Priority con poco rango de prioridades puede no mostrar diferencias significativas');
    }
    
    // Verificar distribución temporal vs prioridades
    const procesosOrdenadosPorArribo = [...w.procesos].sort((a, b) => a.arribo - b.arribo);
    const procesosOrdenadosPorPrioridad = [...w.procesos].sort((a, b) => b.prioridad - a.prioridad);
    
    // Comprobar si el orden de arribo ya coincide con el orden de prioridad
    const mismoOrden = procesosOrdenadosPorArribo.every((p, i) => 
      p.nombre === procesosOrdenadosPorPrioridad[i]?.nombre
    );
    
    if (mismoOrden && w.procesos.length > 2) {
      e.push('ADVERTENCIA: Priority con orden de arribo igual al orden de prioridad - considerar FCFS');
    }
  }
  
  // Validaciones específicas para políticas no-preemptivas vs preemptivas
  if (w.parametros?.policy === 'FCFS' || w.parametros?.policy === 'SPN') {
    // Para políticas no-preemptivas, verificar impacto de procesos largos
    const tiemposCPU = w.procesos.map((p: ProcesData) => p.duracionCPU);
    const tiempoMedio = tiemposCPU.reduce((a, b) => a + b, 0) / tiemposCPU.length;
    const tiempoMax = Math.max(...tiemposCPU);
    
    if (tiempoMax > tiempoMedio * 2.5) {
      e.push(`ADVERTENCIA: ${w.parametros.policy} con proceso muy largo puede causar hambruna (proceso más largo: ${tiempoMax}u vs promedio: ${tiempoMedio.toFixed(1)}u)`);
    }
  }
  
  // Validaciones de eficiencia de E/S
  w.procesos.forEach((p: ProcesData, i: number) => {
    if (p.rafagasCPU > 1 && p.duracionIO > 0) {
      // Verificar ratio E/S vs CPU por proceso
      const tiempoCPUTotal = p.rafagasCPU * p.duracionCPU;
      const tiempoIOTotal = (p.rafagasCPU - 1) * p.duracionIO;
      const ratioIOCPU = tiempoIOTotal / tiempoCPUTotal;
      
      if (ratioIOCPU > 2) {
        e.push(`ADVERTENCIA: Proceso ${p.nombre} dominado por E/S (ratio I/O:CPU = ${ratioIOCPU.toFixed(1)}:1)`);
      }
      
      // Verificar que la E/S no es demasiado corta para ser realista
      if (p.duracionIO < 2 && tiempoCPUTotal > 10) {
        e.push(`ADVERTENCIA: Proceso ${p.nombre} con E/S muy corta (${p.duracionIO}u) vs CPU (${p.duracionCPU}u) - poco realista`);
      }
    }
  });
  
  // Validación de carga de trabajo equilibrada
  const tiempoSimulacionEstimado = Math.max(...w.procesos.map(p => p.arribo)) + 
                                   w.procesos.reduce((sum, p) => sum + (p.rafagasCPU * p.duracionCPU) + 
                                   (Math.max(0, p.rafagasCPU - 1) * p.duracionIO), 0);
  
  const overheadSO = w.procesos.length * (w.parametros.TIP + w.parametros.TFP) + 
                     w.procesos.reduce((sum, p) => sum + Math.max(0, p.rafagasCPU - 1), 0) * w.parametros.TCP;
  
  const ratioOverhead = overheadSO / tiempoSimulacionEstimado;
  
  if (ratioOverhead > 0.3) {
    e.push(`ADVERTENCIA: Overhead de SO muy alto (${(ratioOverhead * 100).toFixed(1)}%) puede dominar la simulación`);
  }
  
  // Validación de arribos realistas
  const arribos = w.procesos.map(p => p.arribo).sort((a, b) => a - b);
  
  // Verificar que no hay gaps muy grandes entre arribos
  for (let i = 1; i < arribos.length; i++) {
    const gap = arribos[i] - arribos[i-1];
    if (gap > 50) {
      e.push(`ADVERTENCIA: Gap muy grande entre arribos (${gap}u) puede causar CPU idle prolongado`);
    }
  }
  
  // Verificar distribución temporal razonable
  const rangoArribos = arribos[arribos.length - 1] - arribos[0];
  const tiempoTotalCPUAribos = w.procesos.reduce((sum, p) => sum + (p.rafagasCPU * p.duracionCPU), 0);
  
  if (rangoArribos > tiempoTotalCPUAribos * 2) {
    e.push('ADVERTENCIA: Arribos muy distribuidos en el tiempo vs carga de trabajo - mucho tiempo idle esperado');
  }

  return e;
}

/**
 * FUNCIÓN DE CONVENIENCIA: Validación completa con resultado estructurado
 */
export function validarCargaTrabajoCompleta(w: CargaTrabajo): { valido: boolean; errores: string[]; advertencias: string[] } {
  const todosLosErrores = validarTandaDeProcesos(w);
  
  // Separar errores críticos de advertencias
  const errores = todosLosErrores.filter(e => 
    e.includes('CRÍTICO:') || 
    e.includes('INCONSISTENCIA:') ||
    (!e.includes('ADVERTENCIA:') && 
     !e.includes('considerar') && 
     !e.includes('puede') && 
     !e.includes('comportará como'))
  );
  
  const advertencias = todosLosErrores.filter(e => 
    e.includes('ADVERTENCIA:') ||
    e.includes('considerar') || 
    e.includes('puede') || 
    e.includes('comportará como')
  );
  
  return {
    valido: errores.length === 0,
    errores,
    advertencias
  };
}
