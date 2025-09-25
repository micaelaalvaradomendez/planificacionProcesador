import type { SimEvent, EventType } from './types';
import { EVENT_PRIORITY } from './types';

/** Evento interno: agrega _seq para estabilidad */
type InternalEvent = SimEvent & { _seq: number };

/** Comparador (t asc, prioridad asc, _seq asc) */
function cmp(a: InternalEvent, b: InternalEvent): number {
  if (a.t !== b.t) return a.t - b.t;
  const pa = EVENT_PRIORITY[a.type];
  const pb = EVENT_PRIORITY[b.type];
  if (pa !== pb) return pa - pb;
  return a._seq - b._seq; // estabilidad por orden de llegada
}

/** Min-heap clásico con comparador anterior */
export class EventQueue {
  private heap: InternalEvent[] = [];
  private seq: number = 0;

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  push(e: SimEvent): void {
    const ie: InternalEvent = { ...e, _seq: this.seq++ };
    this.heap.push(ie);
    this.siftUp(this.heap.length - 1);
  }

  /** pop() -> siguiente evento según (t, prioridad) con orden estable */
  pop(): SimEvent | undefined {
    const n = this.heap.length;
    if (n === 0) return undefined;
    this.swap(0, n - 1);
    const top = this.heap.pop()!;
    if (this.heap.length > 0) this.siftDown(0);
    // devolvemos sin _seq
    const { _seq, ...evt } = top;
    return evt;
  }

  // ---- heap helpers ----
  private parent(i: number) { return ((i - 1) >> 1); }
  private left(i: number) { return (i << 1) + 1; }
  private right(i: number) { return (i << 1) + 2; }

  private siftUp(i: number): void {
    while (i > 0) {
      const p = this.parent(i);
      if (cmp(this.heap[i], this.heap[p]) < 0) {
        this.swap(i, p);
        i = p;
      } else {
        break;
      }
    }
  }

  private siftDown(i: number): void {
    const n = this.heap.length;
    while (true) {
      const l = this.left(i);
      const r = this.right(i);
      let smallest = i;
      if (l < n && cmp(this.heap[l], this.heap[smallest]) < 0) smallest = l;
      if (r < n && cmp(this.heap[r], this.heap[smallest]) < 0) smallest = r;
      if (smallest !== i) {
        this.swap(i, smallest);
        i = smallest;
      } else {
        break;
      }
    }
  }

  private swap(i: number, j: number): void {
    const tmp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = tmp;
  }
}
