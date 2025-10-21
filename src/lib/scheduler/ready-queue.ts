// src/lib/scheduler/ready-queue.ts

export class ReadyQueue {
  private q: number[] = [];
  private pidSet: Set<number> = new Set(); // Para evitar duplicados

  enqueue(pid: number): void {
    // Solo encolar si no está ya presente (evita duplicados)
    if (!this.pidSet.has(pid)) {
      this.q.push(pid);
      this.pidSet.add(pid);
    }
  }

  dequeue(): number | undefined {
    const pid = this.q.shift();
    if (pid !== undefined) {
      this.pidSet.delete(pid);
    }
    return pid;
  }

  isEmpty(): boolean {
    return this.q.length === 0;
  }

  clear(): void {
    this.q.length = 0;
    this.pidSet.clear();
  }

  toArray(): number[] {
    return [...this.q];
  }

  // Método para verificar si un PID está en la cola (útil para debugging)
  contains(pid: number): boolean {
    return this.pidSet.has(pid);
  }
}