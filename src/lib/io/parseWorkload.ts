import type { Workload, ProcessSpec, RunConfig, Policy } from '../model/types';
import { validateWorkload } from '../model/validators';

function normalizePolicy(s: string | undefined): Policy {
  const up = (s || '').toUpperCase();
  const ok = ['FCFS','PRIORITY','RR','SPN','SRTN'] as const;
  if ((ok as readonly string[]).includes(up)) return up as Policy;
  throw new Error(`policy inválida: ${s}`);
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
export async function parseJsonWorkload(file: File): Promise<Workload> {
  const text = await file.text();
  const raw = JSON.parse(text);

  // soportamos dos variantes: {processes, policy, tip...} plano o {processes, config:{...}}
  const cfg: RunConfig = raw.config
    ? {
        policy: normalizePolicy(raw.config.policy),
        tip: Number(raw.config.tip ?? 0),
        tfp: Number(raw.config.tfp ?? 0),
        tcp: Number(raw.config.tcp ?? 0),
        quantum: raw.config.quantum != null ? Number(raw.config.quantum) : undefined
      }
    : {
        policy: normalizePolicy(raw.policy),
        tip: Number(raw.tip ?? 0),
        tfp: Number(raw.tfp ?? 0),
        tcp: Number(raw.tcp ?? 0),
        quantum: raw.quantum != null ? Number(raw.quantum) : undefined
      };

  const processes: ProcessSpec[] = (raw.processes || []).map((p: any) => ({
    name: String(p.name),
    arrivalTime: Number(p.arrivalTime),
    cpuBursts: Number(p.cpuBursts),
    cpuBurstDuration: Number(p.cpuBurstDuration),
    ioBurstDuration: Number(p.ioBurstDuration),
    priority: Number(p.priority)
  }));

  const wl: Workload = {
    workloadName: raw.workloadName || 'workload',
    processes,
    config: cfg
  };

  const errors = validateWorkload(wl);
  if (errors.length) throw new Error(`Entrada JSON inválida:\n- ${errors.join('\n- ')}`);
  return wl;
}

/** CSV/TXT opcional (una línea por proceso):
name,arrivalTime,cpuBursts,cpuBurstDuration,ioBurstDuration,priority
P1,0,3,5,4,50
*/
export async function parseCsvWorkload(file: File, config: Omit<RunConfig, 'policy'> & { policy: string }): Promise<Workload> {
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
  const iArr = idx('arrivalTime');
  const iCB = idx('cpuBursts');
  const iCBD = idx('cpuBurstDuration');
  const iIOD = idx('ioBurstDuration');
  const iPr  = idx('priority');

  const processes: ProcessSpec[] = rows.map((r, j) => {
    const c = r.split(',').map(s => s.trim());
    if (c.length !== cols.length) throw new Error(`CSV: fila ${j+2} con cantidad de columnas inválida`);
    return {
      name: c[iName],
      arrivalTime: Number(c[iArr]),
      cpuBursts: Number(c[iCB]),
      cpuBurstDuration: Number(c[iCBD]),
      ioBurstDuration: Number(c[iIOD]),
      priority: Number(c[iPr])
    };
  });

  const wl: Workload = {
    workloadName: 'csv-workload',
    processes,
    config: {
      policy: normalizePolicy(config.policy),
      tip: Number(config.tip ?? 0),
      tfp: Number(config.tfp ?? 0),
      tcp: Number(config.tcp ?? 0),
      quantum: config.quantum != null ? Number(config.quantum) : undefined
    }
  };

  const errors = validateWorkload(wl);
  if (errors.length) throw new Error(`Entrada CSV inválida:\n- ${errors.join('\n- ')}`);
  return wl;
}
