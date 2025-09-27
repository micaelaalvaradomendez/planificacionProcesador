// src/lib/io/validate.ts
import type { Proceso } from '$lib/model/proceso';
import type { SimulationConfig } from '$lib/stores/simulacion';

export interface ValidationIssue { kind: string; msg: string; pid?: number }
export interface ValidationResult { ok: boolean; issues: ValidationIssue[] }

export function validateInputs(procesos: Proceso[], cfg: SimulationConfig): ValidationResult {
  const issues: ValidationIssue[] = [];

  // PIDs únicos
  const ids = new Set<number>();
  for (const p of procesos) {
    if (ids.has(p.pid)) issues.push({ kind: 'pid-duplicate', msg: `PID duplicado ${p.pid}`, pid: p.pid });
    ids.add(p.pid);
  }

  for (const p of procesos) {
    if (p.arribo < 0) issues.push({ kind: 'arribo-neg', msg: `Arribo negativo en PID ${p.pid}`, pid: p.pid });
    if (!p.rafagasCPU || p.rafagasCPU.length === 0) {
      issues.push({ kind: 'sin-rafagas', msg: `Sin ráfagas CPU en PID ${p.pid}`, pid: p.pid });
    }
    for (const d of p.rafagasCPU) {
      if (d < 0) issues.push({ kind: 'rafaga-neg', msg: `Ráfaga negativa en PID ${p.pid}`, pid: p.pid });
      if (d === 0) issues.push({ kind: 'rafaga-cero', msg: `Ráfaga 0 detectada en PID ${p.pid} (definí política)`, pid: p.pid });
    }
  }

  if (cfg.politica === 'RR') {
    if (!(cfg.quantum && cfg.quantum > 0)) issues.push({ kind: 'rr-quantum', msg: 'RR requiere quantum > 0' });
  }

  if (cfg.politica === 'PRIORITY') {
    // Documentar: menor número = mayor prioridad
    // Si tu modelo define prioridadBase, podrías validar >=1 acá.
  }

  return { ok: issues.length === 0, issues };
}