// src/lib/engine/invariants.ts
// Invariantes y guards para evitar regresiones sutiles

export interface CPUState {
  pid: number | null;
  sliceStart: number | null;
}

export interface Runtime {
  idxRafaga: number;
  restante: number;
}

/**
 * Verificaciones de invariantes críticos del motor
 */
export class EngineInvariants {
  /**
   * Verificar que solo hay un proceso en CPU o ninguno
   */
  static assertSingleCPU(cpu: CPUState, context: string): void {
    if (cpu.pid !== null && cpu.sliceStart === null) {
      throw new Error(`${context}: CPU ocupada (pid=${cpu.pid}) pero sin sliceStart`);
    }
    if (cpu.pid === null && cpu.sliceStart !== null) {
      throw new Error(`${context}: CPU libre pero con sliceStart=${cpu.sliceStart}`);
    }
  }

  /**
   * Verificar que no hay restante negativo
   */
  static assertNoNegativeRestante(rt: Map<number, Runtime>, context: string): void {
    for (const [pid, r] of rt.entries()) {
      if (r.restante < 0) {
        throw new Error(`${context}: P${pid} tiene restante negativo (${r.restante})`);
      }
    }
  }

  /**
   * Verificar que el PID no se encola con restante <= 0
   */
  static assertValidEnqueue(pid: number, restante: number, context: string): void {
    if (restante <= 0) {
      console.warn(`⚠️ ${context}: Intentando encolar P${pid} con restante=${restante}`);
      // En desarrollo, throw error. En producción, solo warn.
      if (process.env.NODE_ENV === 'development') {
        throw new Error(`${context}: No se debe encolar P${pid} con restante <= 0`);
      }
    }
  }

  /**
   * Log de slice para debugging
   */
  static logSliceEvent(
    event: string, 
    t: number, 
    pid: number | null, 
    restanteAntes: number | null, 
    restanteDespues: number | null, 
    cpuLibre: boolean
  ): void {
    if (process.env.DEBUG_SLICES === 'true') {
      console.log(`🔍 [${t}] ${event} P${pid}: ${restanteAntes}→${restanteDespues}, CPU libre: ${cpuLibre}`);
    }
  }
}