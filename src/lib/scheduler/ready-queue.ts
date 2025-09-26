// src/lib/scheduler/ready-queue.ts

export class ReadyQueue {
  private q: number[] = [];

  enqueue(pid: number): void {
    this.q.push(pid);
  }

  dequeue(): number | undefined {
    return this.q.shift();
  }

  isEmpty(): boolean {
    return this.q.length === 0;
  }

  clear(): void {
    this.q.length = 0;
  }

  toArray(): number[] {
    return [...this.q];
  }
}