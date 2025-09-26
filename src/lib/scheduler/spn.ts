// src/lib/scheduler/spn.ts
import { BaseScheduler } from './scheduler';

/**
 * SPN (Shortest Process Next, no expropiativo)
 * Selecciona por RÁFAGA PRÓXIMA más corta entre listos.
 * Nunca pide expropiar al que está en CPU.
 */
export class SchedulerSPN extends BaseScheduler {
  private seq = 0;
  // pares (pid, key, seq) para desempate estable
  private ready: Array<{ pid: number; key: number; seq: number }> = [];

  constructor(
    // key para SPN = ráfaga próxima inmediata
    private readonly getNextBurst: (pid: number) => number
  ) {
    super();
  }

  override onAdmit(pid: number): void { this.push(pid); }
  override onReady(pid: number): void { this.push(pid); }
  override onDesalojoActual(pid: number): void { /* SPN no expropia, pero si llegara: */ this.push(pid); }

  private push(pid: number) {
    const key = this.getNextBurst(pid);
    this.ready.push({ pid, key, seq: this.seq++ });
  }

  /**
   * Devuelve el pid con MENOR ráfaga inmediata (estable ante empates).
   */
  next(): number | undefined {
    if (this.ready.length === 0) return undefined;
    let best = 0;
    for (let i = 1; i < this.ready.length; i++) {
      const a = this.ready[i], b = this.ready[best];
      if (a.key < b.key || (a.key === b.key && a.seq < b.seq)) best = i;
    }
    const { pid } = this.ready.splice(best, 1)[0];
    return pid;
  }

  /** SPN nunca expropia al que está corriendo */
  override compareForPreemption(_now: number, _pidNew: number, _getRemaining: (pid: number, now: number) => number, _currentPid: number): boolean {
    return false;
  }
}