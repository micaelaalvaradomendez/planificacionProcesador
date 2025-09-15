import type { ProcessSpec, RunConfig, Workload } from './types';

export function validarProceso(p: ProcessSpec): string[] {
  const e: string[] = [];
  if (!p.name) e.push('nombre vacío');
  if (!Number.isInteger(p.tiempoArribo) || p.tiempoArribo < 0) e.push('tiempoArribo inválido');
  if (!Number.isInteger(p.rafagasCPU) || p.rafagasCPU < 1) e.push('rafagasCPU debe ser >=1');
  if (!Number.isInteger(p.duracionRafagaCPU) || p.duracionRafagaCPU <= 0) e.push('duracionRafagaCPU debe ser >0');
  if (!Number.isInteger(p.duracionRafagaES) || p.duracionRafagaES < 0) e.push('duracionRafagaES debe ser >=0');
  if (!Number.isInteger(p.prioridad) || p.prioridad < 0 || p.prioridad > 100) e.push('prioridad debe estar en 0..100');
  return e;
}

export function validarConfiguracion(c: RunConfig): string[] {
  const e: string[] = [];
  if (!c.policy) e.push('política requerida');
  if (c.tip < 0 || c.tfp < 0 || c.tcp < 0) e.push('tip/tfp/tcp deben ser >=0');
  if (c.policy === 'RR' && (!c.quantum || c.quantum <= 0)) e.push('quantum requerido y >0 para RR');
  return e;
}

export function validarTandaDeProcesos(w: Workload): string[] {
  const e: string[] = [];
  if (!w.processes?.length) e.push('procesos vacío');
  e.push(...validarConfiguracion(w.config));
  w.processes.forEach((p, i) => {
    const pe = validarProceso(p);
    if (pe.length) e.push(`Proceso ${i + 1} (${p.name || 'sin nombre'}): ${pe.join(', ')}`);
  });
  return e;
}
