/**
 * Parser de archivos CSV para cargar workloads de procesos
 * Formato: name,tiempoArribo,rafagasCPU,duracionRafagaCPU,duracionRafagaES,prioridad
 */

import type { ProcessSpec, RunConfig, Workload, Policy } from '../../domain/types';
import { validarTandaDeProcesos } from '../../domain/validators';

function normalizarPolitica(s: string | undefined): Policy {
  const up = (s || '').toUpperCase();
  const ok = ['FCFS','PRIORITY','RR','SPN','SRTN'] as const;
  if ((ok as readonly string[]).includes(up)) return up as Policy;
  throw new Error(`política inválida: ${s}`);
}

/**
 * Parsea un archivo CSV y retorna un Workload completo
 */
export async function parseCsvToWorkload(file: File, config: Omit<RunConfig, 'policy'> & { policy: string }): Promise<Workload> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const [header, ...rows] = lines;
  const cols = header.split(',').map(s => s.trim());

  const idx = (k: string) => {
    const i = cols.indexOf(k);
    if (i < 0) throw new Error(`CSV: falta columna ${k}`);
    return i;
  };
  const iName = idx('name');
  const iArr = idx('tiempoArribo');
  const iCB = idx('rafagasCPU');
  const iCBD = idx('duracionRafagaCPU');
  const iIOD = idx('duracionRafagaES');
  const iPr  = idx('prioridad');

  const processes: ProcessSpec[] = rows.map((r, j) => {
    const c = r.split(',').map(s => s.trim());
    if (c.length !== cols.length) throw new Error(`CSV: fila ${j+2} con cantidad de columnas inválida`);
    return {
      name: c[iName],
      tiempoArribo: Number(c[iArr]),
      rafagasCPU: Number(c[iCB]),
      duracionRafagaCPU: Number(c[iCBD]),
      duracionRafagaES: Number(c[iIOD]),
      prioridad: Number(c[iPr])
    };
  });

  const wl: Workload = {
    workloadName: 'tanda-csv',
    processes,
    config: {
      policy: normalizarPolitica(config.policy),
      tip: Number(config.tip ?? 0),
      tfp: Number(config.tfp ?? 0),
      tcp: Number(config.tcp ?? 0),
      quantum: config.quantum != null ? Number(config.quantum) : undefined
    }
  };

  const errors = validarTandaDeProcesos(wl);
  if (errors.length) throw new Error(`Entrada CSV inválida:\n- ${errors.join('\n- ')}`);
  return wl;
}
