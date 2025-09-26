// src/lib/scheduler/scheduler.ts
import { ReadyQueue } from './ready-queue';

export interface IScheduler {
  onAdmit(pid: number): void;   // N→L (admitido)
  onReady(pid: number): void;   // B→L u otros ingresos a ready
  onBlock(pid: number): void;   // C→B (informativo en FCFS)
  onFinish(pid: number): void;  // C→T (informativo en FCFS)
  next(): number | undefined;   // elige próximo para L→C
}

export abstract class BaseScheduler implements IScheduler {
  protected rq = new ReadyQueue();

  onAdmit(pid: number): void {
    this.rq.enqueue(pid);
  }
  onReady(pid: number): void {
    this.rq.enqueue(pid);
  }
  onBlock(_pid: number): void { /* no-op default */ }
  onFinish(_pid: number): void { /* no-op default */ }

  abstract next(): number | undefined;
}