/**
 * Punto de entrada principal del núcleo de simulación
 * USA ÚNICAMENTE las entidades del dominio (Proceso.ts + Simulador.ts)
 */

export * from './state';
export * from './priorityQueue';
export * from './adaptadorSimuladorDominio';
export * from './adaptadorEntidadesDominio';
export * from './metrics';

// Re-exportar tipos importantes
export type { 
  SimState, 
  ProcesoRT, 
  ProcesoEstado,
  TipoEventoInterno,
  EventoInterno,
  ContadoresCPU,
  ModoEjecucion 
} from './state';

export type { 
  ColaComparator 
} from './priorityQueue';

export type { 
  ResultadoSimulacionDominio 
} from './adaptadorSimuladorDominio';

// Funciones principales para usar desde fuera del núcleo
import { AdaptadorSimuladorDominio } from './adaptadorSimuladorDominio';
import { calcularMetricasCompletas } from './metrics';
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
  const metricas = calcularMetricasCompletas(resultado.estadoFinal);
  
  return {
    eventos: resultado.eventosExportacion,
    metricas,
    estadoFinal: resultado.estadoFinal,
    eventosInternos: resultado.eventosInternos // para debugging
  };
}

/**
 * Función para validar una configuración de workload antes de simular
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
  } else {
    if (workload.config.tip < 0) {
      errores.push('TIP debe ser mayor o igual a 0');
    }
    if (workload.config.tfp < 0) {
      errores.push('TFP debe ser mayor o igual a 0');
    }
    if (workload.config.tcp < 0) {
      errores.push('TCP debe ser mayor o igual a 0');
    }
    if (workload.config.policy === 'RR') {
      if (!workload.config.quantum || workload.config.quantum <= 0) {
        errores.push('Round Robin requiere un quantum válido mayor a 0');
      }
    }
  }
  
  // Validar procesos
  for (const proceso of workload.processes || []) {
    if (!proceso.name || proceso.name.trim() === '') {
      errores.push('Todos los procesos deben tener un nombre válido');
    }
    if (proceso.tiempoArribo < 0) {
      errores.push(`Proceso ${proceso.name}: tiempo de arribo debe ser mayor o igual a 0`);
    }
    if (proceso.rafagasCPU <= 0) {
      errores.push(`Proceso ${proceso.name}: debe tener al menos una ráfaga de CPU`);
    }
    if (proceso.duracionRafagaCPU <= 0) {
      errores.push(`Proceso ${proceso.name}: duración de ráfaga de CPU debe ser mayor a 0`);
    }
    if (proceso.duracionRafagaES < 0) {
      errores.push(`Proceso ${proceso.name}: duración de ráfaga de E/S no puede ser negativa`);
    }
    if (proceso.prioridad < 1 || proceso.prioridad > 100) {
      errores.push(`Proceso ${proceso.name}: prioridad debe estar entre 1 y 100`);
    }
  }
  
  // Validar unicidad de nombres
  const nombres = new Set();
  for (const proceso of workload.processes || []) {
    if (nombres.has(proceso.name)) {
      errores.push(`Nombre de proceso duplicado: ${proceso.name}`);
    }
    nombres.add(proceso.name);
  }
  
  return {
    valido: errores.length === 0,
    errores
  };
}
