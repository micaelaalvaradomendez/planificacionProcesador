import type { ProcessSpec, RunConfig, Workload } from './types';

export function validateProcess(p: ProcessSpec): string[] {
  const e: string[] = [];
  if (!p.name) e.push('name vacío');
  if (!Number.isInteger(p.arrivalTime) || p.arrivalTime < 0) e.push('arrivalTime inválido');
  if (!Number.isInteger(p.cpuBursts) || p.cpuBursts < 1) e.push('cpuBursts debe ser >=1');
  if (!Number.isInteger(p.cpuBurstDuration) || p.cpuBurstDuration <= 0) e.push('cpuBurstDuration debe ser >0');
  if (!Number.isInteger(p.ioBurstDuration) || p.ioBurstDuration < 0) e.push('ioBurstDuration debe ser >=0');
  if (!Number.isInteger(p.priority) || p.priority < 0 || p.priority > 100) e.push('priority debe estar en 0..100');
  return e;
}

export function validateConfig(c: RunConfig): string[] {
  const e: string[] = [];
  if (!c.policy) e.push('policy requerida');
  if (c.tip < 0 || c.tfp < 0 || c.tcp < 0) e.push('tip/tfp/tcp deben ser >=0');
  if (c.policy === 'RR' && (!c.quantum || c.quantum <= 0)) e.push('quantum requerido y >0 para RR');
  return e;
}

export function validateWorkload(w: Workload): string[] {
  const e: string[] = [];
  if (!w.processes?.length) e.push('processes vacío');
  e.push(...validateConfig(w.config));
  w.processes.forEach((p, i) => {
    const pe = validateProcess(p);
    if (pe.length) e.push(`Proceso ${i + 1} (${p.name || 'sin nombre'}): ${pe.join(', ')}`);
  });
  return e;
}
