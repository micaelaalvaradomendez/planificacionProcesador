import type { Workload, ProcessSpec, RunConfig, Policy } from '../model/types';
import { validarTandaDeProcesos } from '../model/validators';

function normalizarPolitica(s: string | undefined): Policy {
  const up = (s || '').toUpperCase();
  const ok = ['FCFS','PRIORITY','RR','SPN','SRTN'] as const;
  if ((ok as readonly string[]).includes(up)) return up as Policy;
  throw new Error(`política inválida: ${s}`);
}

/** JSON esperado:
{
  "workloadName":"tanda",
  "processes":[
    {"name":"P1","arrivalTime":0,"cpuBursts":3,"cpuBurstDuration":5,"ioBurstDuration":4,"priority":50}
  ],
  "policy":"RR",
  "tip":1,"tfp":1,"tcp":1,"quantum":4
}
*/
export async function analizarTandaJson(file: File): Promise<Workload> {
  const text = await file.text();
  const raw = JSON.parse(text);

  // soportamos dos variantes: {processes, policy, tip...} plano o {processes, config:{...}}
  const cfg: RunConfig = raw.config
    ? {
        policy: normalizarPolitica(raw.config.policy),
        tip: Number(raw.config.tip ?? 0),
        tfp: Number(raw.config.tfp ?? 0),
        tcp: Number(raw.config.tcp ?? 0),
        quantum: raw.config.quantum != null ? Number(raw.config.quantum) : undefined
      }
    : {
        policy: normalizarPolitica(raw.policy),
        tip: Number(raw.tip ?? 0),
        tfp: Number(raw.tfp ?? 0),
        tcp: Number(raw.tcp ?? 0),
        quantum: raw.quantum != null ? Number(raw.quantum) : undefined
      };

  const processes: ProcessSpec[] = (raw.processes || []).map((p: any) => ({
    name: String(p.name),
    tiempoArribo: Number(p.tiempoArribo || p.arrivalTime), // soporte para ambos nombres
    rafagasCPU: Number(p.rafagasCPU || p.cpuBursts),
    duracionRafagaCPU: Number(p.duracionRafagaCPU || p.cpuBurstDuration),
    duracionRafagaES: Number(p.duracionRafagaES || p.ioBurstDuration),
    prioridad: Number(p.prioridad || p.priority)
  }));

  const wl: Workload = {
    workloadName: raw.workloadName || 'tanda-trabajo',
    processes,
    config: cfg
  };

  const errors = validarTandaDeProcesos(wl);
  if (errors.length) throw new Error(`Entrada JSON inválida:\n- ${errors.join('\n- ')}`);
  return wl;
}

/** CSV/TXT opcional (una línea por proceso):
name,tiempoArribo,rafagasCPU,duracionRafagaCPU,duracionRafagaES,prioridad
P1,0,3,5,4,50
*/
export async function analizarTandaCsv(file: File, config: Omit<RunConfig, 'policy'> & { policy: string }): Promise<Workload> {
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
