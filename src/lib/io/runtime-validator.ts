// Validaciones adicionales antes de ejecutar la simulación

import type { Proceso } from '../model/proceso';
import type { SimulationConfig } from '../stores/simulacion';

export interface RuntimeValidationResult {
  canExecute: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

export function validateExecutionSafety(
  procesos: Proceso[], 
  config: SimulationConfig
): RuntimeValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // VALIDACIONES CRÍTICAS (bloquean ejecución)
  
  // Verificar procesos básicos
  if (!Array.isArray(procesos) || procesos.length === 0) {
    errors.push('No hay procesos cargados');
  }

  if (procesos.length > 500) {
    errors.push(`Demasiados procesos (${procesos.length}). Máximo recomendado: 500`);
  }

  // Verificar PIDs únicos
  const pids = new Set<number>();
  const duplicatedPids = new Set<number>();
  for (const proceso of procesos) {
    if (pids.has(proceso.pid)) {
      duplicatedPids.add(proceso.pid);
      errors.push(`PID duplicado encontrado: ${proceso.pid}`);
    }
    pids.add(proceso.pid);
  }

  // Validar cada proceso individualmente
  for (const proceso of procesos) {
    const procesoErrors = validateProcesoExecution(proceso);
    errors.push(...procesoErrors);
  }

  // Validar configuración
  const configErrors = validateConfigExecution(config);
  errors.push(...configErrors);

  // VALIDACIONES DE ADVERTENCIA
  
  // Detectar posibles problemas de rendimiento
  const totalRafagas = procesos.reduce((sum, p) => sum + (p.rafagasCPU?.length || 0), 0);
  if (totalRafagas > 1000) {
    warnings.push(`Alto número de ráfagas totales (${totalRafagas}). La simulación puede ser lenta.`);
  }

  // Detectar procesos con ráfagas muy largas
  const rafagasLargas = procesos.filter(p => 
    p.rafagasCPU?.some(r => r > 1000) || false
  );
  if (rafagasLargas.length > 0) {
    warnings.push(`${rafagasLargas.length} proceso(s) con ráfagas > 1000ms. PIDs: ${rafagasLargas.map(p => p.pid).join(', ')}`);
  }

  // Detectar procesos con arribos muy dispersos
  const arribos = procesos.map(p => p.arribo).sort((a, b) => a - b);
  const maxArribo = arribos[arribos.length - 1];
  const minArribo = arribos[0];
  if (maxArribo - minArribo > 10000) {
    warnings.push(`Arribos muy dispersos (rango: ${minArribo} - ${maxArribo}). Considera normalizar.`);
  }

  // Round Robin con quantum muy pequeño
  if (config.politica === 'RR' && config.quantum && config.quantum < 5) {
    recommendations.push(`Quantum muy pequeño (${config.quantum}). Considera aumentar para reducir overhead.`);
  }

  // PRIORITY sin especificar prioridades
  if (config.politica === 'PRIORITY') {
    const sinPrioridad = procesos.filter(p => !p.prioridadBase || p.prioridadBase === 10);
    if (sinPrioridad.length === procesos.length) {
      warnings.push('PRIORITY con todos los procesos en prioridad default (10). Considera especificar prioridades diferentes.');
    }
  }

  // Procesos sin E/S en políticas apropiativas
  if (['RR', 'SRTN', 'PRIORITY'].includes(config.politica)) {
    const sinES = procesos.filter(p => !p.rafagasES || p.rafagasES.length === 0);
    if (sinES.length === procesos.length) {
      recommendations.push('Políticas apropiativas funcionan mejor con procesos que tienen E/S.');
    }
  }

  // Costos altos
  if (config.costos) {
    const costosAltos = Object.entries(config.costos)
      .filter(([_, valor]) => typeof valor === 'number' && valor > 100);
    if (costosAltos.length > 0) {
      warnings.push(`Costos altos detectados: ${costosAltos.map(([k, v]) => `${k}=${v}`).join(', ')}`);
    }
  }

  return {
    canExecute: errors.length === 0,
    errors,
    warnings,
    recommendations
  };
}

/**
 * Valida un proceso individual para ejecución
 */
function validateProcesoExecution(proceso: Proceso): string[] {
  const errors: string[] = [];

  // Validar PID
  if (typeof proceso.pid !== 'number' || !Number.isInteger(proceso.pid) || proceso.pid <= 0) {
    errors.push(`PID inválido en proceso: ${proceso.pid}`);
  }

  // Validar arribo
  if (typeof proceso.arribo !== 'number' || !Number.isFinite(proceso.arribo) || proceso.arribo < 0) {
    errors.push(`Arribo inválido en PID ${proceso.pid}: ${proceso.arribo}`);
  }

  // Validar ráfagas CPU (crítico)
  if (!Array.isArray(proceso.rafagasCPU) || proceso.rafagasCPU.length === 0) {
    errors.push(`PID ${proceso.pid}: Sin ráfagas CPU válidas`);
  } else {
    for (let i = 0; i < proceso.rafagasCPU.length; i++) {
      const rafaga = proceso.rafagasCPU[i];
      if (typeof rafaga !== 'number' || !Number.isFinite(rafaga) || rafaga <= 0) {
        errors.push(`PID ${proceso.pid}: Ráfaga CPU[${i}] inválida: ${rafaga}`);
      }
    }
  }

  // Validar ráfagas E/S (no crítico, pero revisar si existen)
  if (proceso.rafagasES && Array.isArray(proceso.rafagasES)) {
    for (let i = 0; i < proceso.rafagasES.length; i++) {
      const rafaga = proceso.rafagasES[i];
      if (typeof rafaga !== 'number' || !Number.isFinite(rafaga) || rafaga < 0) {
        errors.push(`PID ${proceso.pid}: Ráfaga E/S[${i}] inválida: ${rafaga}`);
      }
    }
  }

  // Validar prioridad si existe
  if (proceso.prioridadBase !== undefined) {
    if (typeof proceso.prioridadBase !== 'number' || 
        !Number.isInteger(proceso.prioridadBase) || 
        proceso.prioridadBase < 1 || 
        proceso.prioridadBase > 10) {
      errors.push(`PID ${proceso.pid}: Prioridad inválida: ${proceso.prioridadBase}`);
    }
  }

  // Validar label
  if (typeof proceso.label !== 'string' || proceso.label.trim() === '') {
    errors.push(`PID ${proceso.pid}: Label inválido: ${proceso.label}`);
  }

  return errors;
}

/**
 * Valida configuración para ejecución
 */
function validateConfigExecution(config: SimulationConfig): string[] {
  const errors: string[] = [];

  // Validar política
  const validPoliticas = ['FCFS', 'RR', 'SPN', 'SRTN', 'PRIORITY'];
  if (!validPoliticas.includes(config.politica)) {
    errors.push(`Política inválida: ${config.politica}`);
  }

  // Validaciones específicas por política
  if (config.politica === 'RR') {
    if (!config.quantum || typeof config.quantum !== 'number' || config.quantum <= 0) {
      errors.push('Round Robin requiere quantum > 0');
    } else if (config.quantum > 1000) {
      errors.push(`Quantum demasiado alto: ${config.quantum}`);
    }
  }

  // Validar costos
  if (config.costos) {
    const costFields = ['TIP', 'TCP', 'TFP', 'bloqueoES'];
    for (const field of costFields) {
      const value = (config.costos as any)[field];
      if (value !== undefined) {
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
          errors.push(`Costo ${field} inválido: ${value}`);
        }
      }
    }
  }

  // Validar aging para PRIORITY (si existe en la configuración)
  if (config.politica === 'PRIORITY' && 'priorityAging' in config) {
    const aging = (config as any).priorityAging;
    if (aging && typeof aging === 'object') {
      if (typeof aging.enabled === 'boolean' && aging.enabled) {
        if (!aging.interval || aging.interval <= 0) {
          errors.push('Priority aging habilitado requiere interval > 0');
        }
        if (!aging.boost || aging.boost <= 0) {
          errors.push('Priority aging habilitado requiere boost > 0');
        }
      }
    }
  }

  return errors;
}

/**
 * Validación rápida para habilitar/deshabilitar botón de ejecución
 */
export function canExecuteQuickCheck(procesos: Proceso[], config: SimulationConfig): boolean {
  if (!Array.isArray(procesos) || procesos.length === 0) return false;
  if (!config || !config.politica) return false;
  
  // Check básico de ráfagas
  const hasValidRafagas = procesos.every(p => 
    Array.isArray(p.rafagasCPU) && 
    p.rafagasCPU.length > 0 && 
    p.rafagasCPU.every(r => typeof r === 'number' && r > 0)
  );
  
  if (!hasValidRafagas) return false;
  
  // Check específico para RR
  if (config.politica === 'RR') {
    return typeof config.quantum === 'number' && config.quantum > 0;
  }
  
  return true;
}