import { analizarTandaJson, analizarTandaCsv } from '$lib/io/parseWorkload';
import type { Workload, Policy } from '$lib/model/types';

export async function cargarArchivo(file: File | null, mode: 'json' | 'csv', policy: Policy, tip: number, tfp: number, tcp: number, quantum?: number): Promise<{workload: Workload | null, errors: string[], loaded: boolean}> {
  const errors: string[] = [];
  let workload: Workload | null = null;
  let loaded = false;
  if (!file) {
    errors.push('Seleccioná un archivo');
    return { workload, errors, loaded };
  }
  try {
    if (mode === 'json') {
      workload = await analizarTandaJson(file);
      loaded = true;
    } else {
      workload = await analizarTandaCsv(file, { policy, tip, tfp, tcp, quantum });
      loaded = true;
    }
  } catch (e) {
    errors.push((e as Error).message);
  }
  return { workload, errors, loaded };
}
