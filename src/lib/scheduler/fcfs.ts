// src/lib/scheduler/fcfs.ts
import { BaseScheduler } from './scheduler';

export class SchedulerFCFS extends BaseScheduler {
  next(): number | undefined {
    // FCFS: simplemente saca el primero en llegar
    return this.rq.dequeue();
  }
}