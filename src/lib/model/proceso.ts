export type Estado = 'N' | 'L' | 'C' | 'B' | 'F';

export interface Proceso {
  pid: number;
  arribo: number;           // tiempo de arribo (ms o ticks)
  rafagasCPU: number[];     // solo duraciones de ráfagas de CPU
  /** Nuevo: ráfagas de E/S entre CPU[i] y CPU[i+1]. Largo = rafagasCPU.length - 1 */
  rafagasES?: number[];     // bloqueos específicos del proceso
  estado: Estado;           // 'N'|'L'|'C'|'B'|'F'
  label?: string;           // nombre descriptivo (ej: "P1", "P2")
  prioridadBase?: number;   // prioridad para PRIORITY (menor número = mayor prioridad)
}

/**
 * servicioTotal(p) = suma de las ráfagas de CPU
 * Importante: NO incluye TIP, TCP, TFP ni bloqueoES (no son CPU).
 */
export function servicioTotal(p: Pick<Proceso, 'rafagasCPU'>): number {
  // Gate: servicioTotal([a,b,c]) === a+b+c
  return (p.rafagasCPU ?? []).reduce((acc, d) => acc + (d ?? 0), 0);
}

/** Helpers opcionales para validaciones triviales del Paso 1 */
export function isProcesoValido(p: Proceso): boolean {
  if (p.pid == null || p.pid < 0) return false;
  if (p.arribo == null || p.arribo < 0) return false;
  if (!Array.isArray(p.rafagasCPU) || p.rafagasCPU.length === 0) return false;
  if (!['N','L','C','B','F'].includes(p.estado)) return false;
  if (p.rafagasCPU.some(x => x == null || x < 0)) return false;
  return true;
}
