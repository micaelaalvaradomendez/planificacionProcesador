export interface Costos {
  TIP: number;        // tiempo ingreso proceso
  TCP: number;        // cambio de proceso / context switch
  TFP: number;        // tiempo fin de proceso
  bloqueoES: number;  // costo fijo de bloqueo E/S (si aplica)
}

/** Defaults: costos no negativos; bloqueoES por defecto = 25 ms */
export const COSTOS_DEF: Costos = {
  TIP: 0,
  TCP: 0,
  TFP: 0,
  bloqueoES: 25
};

export function validarCostos(c: Costos): boolean {
  if (c == null) return false;
  const vals = [c.TIP, c.TCP, c.TFP, c.bloqueoES];
  return vals.every(v => Number.isFinite(v) && v >= 0);
}

/** Crea un Costos saneado a partir de un parcial, usando defaults. */
export function makeCostos(input?: Partial<Costos>): Costos {
  const c: Costos = {
    TIP: input?.TIP ?? COSTOS_DEF.TIP,
    TCP: input?.TCP ?? COSTOS_DEF.TCP,
    TFP: input?.TFP ?? COSTOS_DEF.TFP,
    bloqueoES: input?.bloqueoES ?? COSTOS_DEF.bloqueoES
  };
  if (!validarCostos(c)) {
    throw new Error('Costos inválidos: deben ser números ≥ 0.');
  }
  return c;
}
