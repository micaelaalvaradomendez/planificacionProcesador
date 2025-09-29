// src/lib/engine/telemetry.ts
// Configuración de telemetría para desarrollo

import { EngineInvariants } from './invariants';
import type { Runtime } from './invariants';

/**
 * Configuración de telemetría - habilitar durante desarrollo
 */
// Usar variables de entorno de Vite que son seguras para el cliente
export const TELEMETRY_CONFIG = {
  // Habilitar invariants en puntos críticos (desarrollo)
  enableInvariants: (typeof import.meta !== 'undefined' && import.meta.env?.DEV) ?? false,
  
  // Habilitar logs detallados de slices
  enableSliceLogs: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DEBUG_SLICES === 'true') ?? false,
  
  // Habilitar warnings de enqueue
  enableEnqueueWarnings: true
};

/**
 * Wrapper condicional para invariants
 */
export class TelemetryGuards {
  static assertSingleCPU(cpu: any, context: string): void {
    if (TELEMETRY_CONFIG.enableInvariants) {
      EngineInvariants.assertSingleCPU(cpu, context);
    }
  }

  static assertNoNegativeRestante(rt: Map<number, Runtime>, context: string): void {
    if (TELEMETRY_CONFIG.enableInvariants) {
      EngineInvariants.assertNoNegativeRestante(rt, context);
    }
  }

  static assertValidEnqueue(pid: number, restante: number, context: string): void {
    if (TELEMETRY_CONFIG.enableInvariants) {
      EngineInvariants.assertValidEnqueue(pid, restante, context);
    } else if (TELEMETRY_CONFIG.enableEnqueueWarnings) {
      console.warn(`⚠️ ${context}: Intentando encolar P${pid} con restante=${restante}`);
    }
  }

  static logSliceEvent(
    event: string, 
    t: number, 
    pid: number | null, 
    restanteAntes: number | null, 
    restanteDespues: number | null, 
    cpuLibre: boolean
  ): void {
    if (TELEMETRY_CONFIG.enableSliceLogs) {
      EngineInvariants.logSliceEvent(event, t, pid, restanteAntes, restanteDespues, cpuLibre);
    }
  }
}