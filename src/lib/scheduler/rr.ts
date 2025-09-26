/**
 * Planificador Round Robin
 * - Expropiativo por quantum, reiniciado en cada despacho
 * - FIFO circular con re-encolado al final tras desalojo
 */
import { BaseScheduler } from './scheduler';

export class SchedulerRR extends BaseScheduler {
  constructor(private readonly quantum: number) { super(); }
  getQuantum(): number { return this.quantum; }

  onDesalojoActual(pid: number): void {
    this.rq.enqueue(pid);        // reencola al final
  }

  next(): number | undefined {
    return this.rq.dequeue();    // RR: FIFO de la ready
  }
}
