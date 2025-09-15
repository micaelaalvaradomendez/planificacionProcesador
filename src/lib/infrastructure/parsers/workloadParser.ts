import { parseJsonToWorkload } from '$lib/infrastructure/parsers/jsonParser';
import { parseTxtToWorkload } from '$lib/infrastructure/parsers/txtParser';
import type { Workload, Policy } from '$lib/domain/types';

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
      workload = await parseJsonToWorkload(file);
      // Aplicar configuración de UI al workload JSON
      if (workload && workload.config) {
        workload.config.policy = policy;
        workload.config.tip = tip;
        workload.config.tfp = tfp;
        workload.config.tcp = tcp;
        workload.config.quantum = policy === 'RR' ? quantum : undefined;
      }
      loaded = true;
    } else {
      // Para CSV/TXT usamos el parser TXT que maneja el formato de la consigna del profesor
      const content = await file.text();
      workload = parseTxtToWorkload(content, {
        separator: ',', // Usar coma para CSV/TXT según la consigna
        policy,
        tip,
        tfp,
        tcp,
        quantum
      }, file.name);
      loaded = true;
    }
  } catch (e) {
    errors.push((e as Error).message);
  }
  return { workload, errors, loaded };
}
