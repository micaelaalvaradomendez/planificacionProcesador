import { ejecutarSimulacionCompleta } from '$lib/application/usecases/runSimulation';
import { construirDiagramaGantt } from '$lib/application/usecases/buildGantt';
import { calcularEstadisticasExtendidas } from '$lib/application/usecases/computeStatistics';
import type { Workload, SimEvent, Metrics, GanttSlice } from '$lib/domain/types';
import type { EstadisticasExtendidas } from '$lib/domain/services';

export async function runSimulationWithTimeout(workload: Workload, timeoutMs = 30000) {
  let simulacionCompletada = false;
  let simulacionEnCurso = true;
  let events: SimEvent[] = [];
  let metrics: Metrics = {
    porProceso: [],
    tanda: { tiempoRetornoTanda: 0, tiempoMedioRetorno: 0, cpuOcioso: 0, cpuSO: 0, cpuProcesos: 0 }
  };
  let ganttSlices: GanttSlice[] = [];
  let estadisticasExtendidas: EstadisticasExtendidas | null = null;
  let tiempoTotalSimulacion = 0;
  let advertencias: string[] = [];
  let errors: string[] = [];
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    const simulacionPromise = ejecutarSimulacionCompleta(workload);
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('La simulación tardó demasiado tiempo (más de 30 segundos). Puede haber un bucle infinito.'));
      }, timeoutMs);
    });
    const resultado: any = await Promise.race([simulacionPromise, timeoutPromise]);
    clearTimeout(timeoutId);
    if (!resultado.exitoso) {
      errors.push(resultado.error || 'Error desconocido en la simulación');
      return { simulacionCompletada, simulacionEnCurso: false, events, metrics, ganttSlices, estadisticasExtendidas, tiempoTotalSimulacion, advertencias, errors };
    }
    events = resultado.eventos;
    metrics = resultado.metricas;
    tiempoTotalSimulacion = resultado.tiempoTotal;
    advertencias = resultado.advertencias || [];
        const diagramaGantt = construirDiagramaGantt(events, workload.config);
    ganttSlices = diagramaGantt.segmentos;
    estadisticasExtendidas = calcularEstadisticasExtendidas(metrics, events);
    simulacionCompletada = true;
    simulacionEnCurso = false;
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);
    errors.push(`Error durante la simulación: ${error instanceof Error ? error.message : error}`);
    simulacionEnCurso = false;
  }
  return { simulacionCompletada, simulacionEnCurso, events, metrics, ganttSlices, estadisticasExtendidas, tiempoTotalSimulacion, advertencias, errors };
}
