/**
 * Planificador Round Robin
 * - Expropiativo por quantum, reiniciado en cada despacho
 * - FIFO circular con re-encolado al final tras desalojo
 * - Cada proceso obtiene quantum completo al ser despachado
 */
import { BaseScheduler } from './scheduler';

export class SchedulerRR extends BaseScheduler {
  constructor(private readonly quantum: number) { super(); }
  getQuantum(): number { return this.quantum; }

  onDesalojoActual(pid: number): void {
    // En RR, cuando se expropia por quantum, el proceso vuelve al final
    // La ReadyQueue ya maneja duplicados, así que es seguro encolar
    this.rq.enqueue(pid);
  }

  next(): number | undefined {
    // RR: FIFO de la ready queue
    return this.rq.dequeue();
  }
}
