// src/lib/scheduler/scheduler.ts
import { ReadyQueue } from './ready-queue';

export interface IScheduler {
  onAdmit(pid: number): void;   // N→L (admitido)
  onReady(pid: number): void;   // B→L u otros ingresos a ready
  onBlock(pid: number): void;   // C→B (informativo en FCFS)
  onFinish(pid: number): void;  // C→T (informativo en FCFS)
  onDesalojoActual?(pid: number): void; // C→L (re-encolado por RR/SRTN)
  next(): number | undefined;   // elige próximo para L→C
  
  // Método opcional para schedulers expropiativso
  compareForPreemption?(now: number, pidNew: number, getRemaining: (pid: number, now: number) => number, currentPid: number): boolean;
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
  onDesalojoActual?(pid: number): void { /* no-op default */ }

  abstract next(): number | undefined;
  
  // Por defecto, no expropia (FCFS, SPN)
  compareForPreemption?(_now: number, _pidNew: number, _getRemaining: (pid: number, now: number) => number, _currentPid: number): boolean {
    return false;
  }
}