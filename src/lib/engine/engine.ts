// src/lib/engine/engine-fixed.ts
import { EventQueue } from './queue';
import { EVENT_PRIORITY, type EventType, type SimEvent, type Trace, type TraceSlice, type OverheadKind } from './types';
import { EngineInvariants } from './invariants';
import type { Proceso } from '../model/proceso';
import type { Costos } from '../model/costos';
import { SchedulerFCFS } from '../scheduler/fcfs';
import { SchedulerRR } from '../scheduler/rr';
import { SchedulerSPN } from '../scheduler/spn';
import { SchedulerSRTN } from '../scheduler/srtn';
import { SchedulerPriority } from '../scheduler/priority';

// ---- Tipos runtime (no forman parte del dominio estático) ----
type Runtime = {
  idxRafaga: number;      // índice de ráfaga actual
  restante: number;       // tiempo restante de esa ráfaga
  generation: number;     // para detectar eventos stale
};

type CPUState = {
  pid: number | null;
  sliceStart: number | null;
  generation: number;     // generación del proceso en CPU
};

// Eventos corregidos: separamos fin de CPU del overhead administrativo
const EVT: Record<string, EventType> = {
  CPU_DONE: 'CPU_DONE',   // NUEVO: fin de ráfaga de CPU (sin overhead)
  FINISH: 'C→T',          // fin definitivo del proceso
  ADMIN_FINISH: 'ADMIN_FINISH', // NUEVO: overhead TFP completado
  BLOCK: 'C→B',
  PREEMPT: 'C→L',
  IO_OUT: 'B→L',
  ADMIT: 'N→L',
  DISPATCH: 'L→C'
};

// Helper para trazar overheads (TIP/TCP/TFP) en el Gantt
function traceOverhead(trace: Trace, pid: number, kind: OverheadKind, t0: number, t1: number) {
  if (t1 <= t0) return;
  (trace.overheads ??= []).push({ pid, t0, t1, kind });
}

// Helper para logging de eventos con validación de pid obligatorio
function traceEvent(trace: Trace, t: number, type: EventType, pid: number, data?: Record<string, unknown>) {
  if (pid == null || pid === undefined) {
    throw new Error(`Event ${type} at t=${t} requires a valid pid, got: ${pid}`);
  }
  trace.events.push({ t, type, pid, data });
}

// Helper para logging de slices con validación
function traceSlice(trace: Trace, pid: number, start: number, end: number) {
  if (start >= end) return; // No crear slices vacíos o negativos
  if (pid == null || pid === undefined) {
    throw new Error(`Slice [${start}, ${end}) requires a valid pid, got: ${pid}`);
  }
  trace.slices.push({ pid, start, end });
}

/**
 * FCFS corregido con separación de eventos de fin y overhead
 */
export function runFCFS(procesos: Proceso[], costos: Partial<Costos> = {}): Trace {
  const TIP = Number.isFinite(costos.TIP as number) ? (costos.TIP as number) : 0;
  const TCP = Number.isFinite(costos.TCP as number) ? (costos.TCP as number) : 0;
  const TFP = Number.isFinite(costos.TFP as number) ? (costos.TFP as number) : 0;
  const bloqueoES = Number.isFinite(costos.bloqueoES as number) ? (costos.bloqueoES as number) : 25;

  const q = new EventQueue();
  const trace: Trace = { slices: [], events: [] };
  const rt = new Map<number, Runtime>();
  const cpu: CPUState = { pid: null, sliceStart: null, generation: 0 };
  const sched = new SchedulerFCFS();

  let currentTick = Number.NEGATIVE_INFINITY;
  let pendingDispatchAt: number | null = null;

  // Admisiones con TIP
  for (const p of procesos) {
    rt.set(p.pid, { idxRafaga: 0, restante: (p.rafagasCPU?.[0] ?? 0), generation: 0 });
    const tAdm = p.arribo + TIP;
    q.push({ t: tAdm, type: EVT.ADMIT, pid: p.pid });
    
    if (TIP > 0) {
      traceOverhead(trace, p.pid, 'TIP', p.arribo, tAdm);
    }
  }

  const programar = (t: number, type: EventType, pid?: number, data?: Record<string, unknown>) =>
    q.push({ t, type, pid, data });

  const abrirSlice = (t: number, pid: number) => { 
    cpu.pid = pid; 
    cpu.sliceStart = t; 
    const r = rt.get(pid);
    if (r) cpu.generation = r.generation;
  };

  const cerrarSlice = (t: number) => {
    if (cpu.pid != null && cpu.sliceStart != null && cpu.sliceStart < t) {
      traceSlice(trace, cpu.pid, cpu.sliceStart, t);
    }
    cpu.pid = null; 
    cpu.sliceStart = null;
  };

  const despacharSiLibre = (t: number) => {
    if (cpu.pid != null) return;
    if (pendingDispatchAt === t) return;
    const nextPid = sched.next();
    if (nextPid != null) {
      programar(t, EVT.DISPATCH, nextPid);
      pendingDispatchAt = t;
    }
  };

  const getRafagas = (pid: number) =>
    procesos.find(x => x.pid === pid)?.rafagasCPU ?? [];

  while (!q.isEmpty()) {
    const e = q.pop()!;
    if (e.t !== currentTick) { 
      currentTick = e.t; 
      pendingDispatchAt = null; 
    }

    // Solo logear eventos válidos después de verificar que no son stale
    const shouldLogEvent = () => {
      if (e.pid == null) return false;
      if (e.type === EVT.PREEMPT || e.type === EVT.CPU_DONE) {
        const r = rt.get(e.pid);
        return r && (e.data?.generation === r.generation);
      }
      return true;
    };

    switch (e.type) {
      case EVT.ADMIT: {
        if (e.pid == null) break;
        traceEvent(trace, e.t, e.type, e.pid);
        sched.onAdmit(e.pid);
        despacharSiLibre(e.t);
        break;
      }

      case EVT.DISPATCH: {
        if (e.pid == null) break;
        
        const r = rt.get(e.pid);
        if (!r || cpu.pid != null) {
          // Proceso ya no existe o CPU ocupada - evento stale
          break;
        }

        traceEvent(trace, e.t, e.type, e.pid);

        // TCP se aplica ANTES del inicio del slice
        const tStart = e.t + TCP;
        
        if (TCP > 0) {
          traceOverhead(trace, e.pid, 'TCP', e.t, tStart);
        }
        
        abrirSlice(tStart, e.pid);

        const rBurst = r.restante;
        const tEnd = tStart + rBurst;

        // Programar fin de CPU (SIN overhead)
        programar(tEnd, EVT.CPU_DONE, e.pid, { generation: r.generation });

        break;
      }

      case EVT.CPU_DONE: {
        if (e.pid == null) break;
        
        const r = rt.get(e.pid);
        if (!r || cpu.pid !== e.pid || e.data?.generation !== r.generation) {
          // Evento stale - ignorar
          break;
        }

        // Cerrar slice de CPU exactamente en tEnd (sin TFP)
        cerrarSlice(e.t);
        
        // Marcar ráfaga como terminada
        r.restante = 0;
        
        const esUltima = (r.idxRafaga >= (getRafagas(e.pid).length - 1));
        
        if (esUltima) {
          // Emitir C→T en el momento exacto de fin de CPU
          traceEvent(trace, e.t, EVT.FINISH, e.pid);
          
          // Programar overhead administrativo TFP si existe
          if (TFP > 0) {
            traceOverhead(trace, e.pid, 'TFP', e.t, e.t + TFP);
            programar(e.t + TFP, EVT.ADMIN_FINISH, e.pid);
          }
          
          sched.onFinish(e.pid);
        } else {
          // Emitir C→B y manejar E/S
          traceEvent(trace, e.t, EVT.BLOCK, e.pid);
          
          const proceso = procesos.find(p => p.pid === e.pid);
          if (proceso) {
            const durES = Number.isFinite(proceso.rafagasES?.[r.idxRafaga])
              ? (proceso.rafagasES as number[])[r.idxRafaga]
              : bloqueoES;

            programar(e.t + durES, EVT.IO_OUT, e.pid);
            sched.onBlock(e.pid);
          }
        }
        
        despacharSiLibre(e.t);
        break;
      }

      case EVT.IO_OUT: {
        if (e.pid == null) break;
        
        const r = rt.get(e.pid);
        if (!r) break;

        traceEvent(trace, e.t, e.type, e.pid);
        
        // Avanzar a siguiente ráfaga
        r.idxRafaga += 1;
        r.restante = getRafagas(e.pid)[r.idxRafaga] ?? 0;
        r.generation += 1; // Nueva generación para detectar eventos stale
        
        sched.onReady(e.pid);
        despacharSiLibre(e.t);
        break;
      }

      case EVT.ADMIN_FINISH: {
        // Overhead TFP completado - no hacer nada más
        break;
      }
    }
  }

  return trace;
}

/**
 * Round Robin corregido con epochs y manejo correcto de quantum
 */
export function runRR(
  procesos: Proceso[],
  costos: Partial<Costos> = {},
  quantum: number
): Trace {
  const TIP = Number.isFinite(costos.TIP as number) ? (costos.TIP as number) : 0;
  const TCP = Number.isFinite(costos.TCP as number) ? (costos.TCP as number) : 0;
  const TFP = Number.isFinite(costos.TFP as number) ? (costos.TFP as number) : 0;
  const bloqueoES = Number.isFinite(costos.bloqueoES as number) ? (costos.bloqueoES as number) : 25;

  const q = new EventQueue();
  const trace: Trace = { slices: [], events: [] };
  const rt = new Map<number, Runtime>();
  const cpu: CPUState = { pid: null, sliceStart: null, generation: 0 };
  const sched = new SchedulerRR(quantum);

  let currentTick = Number.NEGATIVE_INFINITY;
  let pendingDispatchAt: number | null = null;

  // Admisiones con TIP
  for (const p of procesos) {
    rt.set(p.pid, { idxRafaga: 0, restante: (p.rafagasCPU?.[0] ?? 0), generation: 0 });
    const tAdm = p.arribo + TIP;
    q.push({ t: tAdm, type: EVT.ADMIT, pid: p.pid });
    
    if (TIP > 0) {
      traceOverhead(trace, p.pid, 'TIP', p.arribo, tAdm);
    }
  }

  const programar = (t: number, type: EventType, pid?: number, data?: Record<string, unknown>) =>
    q.push({ t, type, pid, data });

  const abrirSlice = (t: number, pid: number) => { 
    cpu.pid = pid; 
    cpu.sliceStart = t; 
    const r = rt.get(pid);
    if (r) cpu.generation = r.generation;
  };

  const cerrarSlice = (t: number) => {
    if (cpu.pid != null && cpu.sliceStart != null && cpu.sliceStart < t) {
      traceSlice(trace, cpu.pid, cpu.sliceStart, t);
    }
    cpu.pid = null; 
    cpu.sliceStart = null;
  };

  const despacharSiLibre = (t: number) => {
    if (cpu.pid != null) return;
    if (pendingDispatchAt === t) return;
    const nextPid = sched.next();
    if (nextPid != null) {
      programar(t, EVT.DISPATCH, nextPid);
      pendingDispatchAt = t;
    }
  };

  const getRafagas = (pid: number) =>
    procesos.find(x => x.pid === pid)?.rafagasCPU ?? [];

  while (!q.isEmpty()) {
    const e = q.pop()!;
    if (e.t !== currentTick) { 
      currentTick = e.t; 
      pendingDispatchAt = null; 
    }

    switch (e.type) {
      case EVT.ADMIT: {
        if (e.pid == null) break;
        traceEvent(trace, e.t, e.type, e.pid);
        sched.onAdmit(e.pid);
        despacharSiLibre(e.t);
        break;
      }

      case EVT.DISPATCH: {
        if (e.pid == null) break;
        
        const r = rt.get(e.pid);
        if (!r || cpu.pid != null) break;

        traceEvent(trace, e.t, e.type, e.pid);

        const tStart = e.t + TCP;
        
        if (TCP > 0) {
          traceOverhead(trace, e.pid, 'TCP', e.t, tStart);
        }
        
        abrirSlice(tStart, e.pid);

        const rBurst = r.restante;
        const tEnd = tStart + rBurst;
        const tTimer = tStart + quantum;

        // Programar eventos con generation para detectar stale
        programar(tEnd, EVT.CPU_DONE, e.pid, { generation: r.generation });
        
        // Solo programar preemption si el quantum no alcanza
        if (rBurst > quantum) {
          programar(tTimer, EVT.PREEMPT, e.pid, { generation: r.generation, reason: 'quantum' });
        }

        break;
      }

      case EVT.CPU_DONE: {
        if (e.pid == null) break;
        
        const r = rt.get(e.pid);
        if (!r || cpu.pid !== e.pid || e.data?.generation !== r.generation) {
          // Evento stale
          break;
        }

        cerrarSlice(e.t);
        
        // Marcar ráfaga como terminada
        r.restante = 0;
        
        const esUltima = (r.idxRafaga >= (getRafagas(e.pid).length - 1));
        
        if (esUltima) {
          traceEvent(trace, e.t, EVT.FINISH, e.pid);
          
          if (TFP > 0) {
            traceOverhead(trace, e.pid, 'TFP', e.t, e.t + TFP);
            programar(e.t + TFP, EVT.ADMIN_FINISH, e.pid);
          }
          
          sched.onFinish(e.pid);
        } else {
          traceEvent(trace, e.t, EVT.BLOCK, e.pid);
          
          const proceso = procesos.find(p => p.pid === e.pid);
          if (proceso) {
            const durES = Number.isFinite(proceso.rafagasES?.[r.idxRafaga])
              ? (proceso.rafagasES as number[])[r.idxRafaga]
              : bloqueoES;

            programar(e.t + durES, EVT.IO_OUT, e.pid);
            sched.onBlock(e.pid);
          }
        }
        
        despacharSiLibre(e.t);
        break;
      }

      case EVT.PREEMPT: {
        if (e.pid == null) break;
        
        const r = rt.get(e.pid);
        if (!r || cpu.pid !== e.pid || e.data?.generation !== r.generation) {
          // Evento stale
          break;
        }

        // Actualizar tiempo restante
        const runFor = e.t - (cpu.sliceStart ?? e.t);
        r.restante = Math.max(0, r.restante - runFor);
        
        cerrarSlice(e.t);
        traceEvent(trace, e.t, EVT.PREEMPT, e.pid, { reason: e.data?.reason ?? 'quantum' });
        
        // ***invalidar eventos pendientes de la generación anterior***
        r.generation += 1;
        
        if (r.restante > 0) {
          sched.onReady(e.pid);
        }
        
        despacharSiLibre(e.t);
        break;
      }

      case EVT.IO_OUT: {
        if (e.pid == null) break;
        
        const r = rt.get(e.pid);
        if (!r) break;

        traceEvent(trace, e.t, e.type, e.pid);
        
        r.idxRafaga += 1;
        r.restante = getRafagas(e.pid)[r.idxRafaga] ?? 0;
        r.generation += 1;
        
        sched.onReady(e.pid);
        despacharSiLibre(e.t);
        break;
      }

      case EVT.ADMIN_FINISH: {
        break;
      }
    }
  }

  return trace;
}

/**
 * SPN (Shortest Process Next) - no expropiativo
 * Selecciona siempre el proceso con la ráfaga CPU más corta entre los listos
 */
export function runSPN(procesos: Proceso[], costos: Partial<Costos> = {}): Trace {
  const TIP = Number.isFinite(costos.TIP as number) ? (costos.TIP as number) : 0;
  const TCP = Number.isFinite(costos.TCP as number) ? (costos.TCP as number) : 0;
  const TFP = Number.isFinite(costos.TFP as number) ? (costos.TFP as number) : 0;
  const bloqueoES = Number.isFinite(costos.bloqueoES as number) ? (costos.bloqueoES as number) : 25;

  const q = new EventQueue();
  const trace: Trace = { slices: [], events: [] };
  const rt = new Map<number, Runtime>();
  const cpu: CPUState = { pid: null, sliceStart: null, generation: 0 };
  
  // SPN scheduler que selecciona por ráfaga más corta
  const sched = new SchedulerSPN((pid: number) => {
    const r = rt.get(pid);
    return r ? r.restante : Infinity; // ráfaga actual restante
  });

  let currentTick = Number.NEGATIVE_INFINITY;
  let pendingDispatchAt: number | null = null;

  // Admisiones con TIP
  for (const p of procesos) {
    rt.set(p.pid, { idxRafaga: 0, restante: (p.rafagasCPU?.[0] ?? 0), generation: 0 });
    const tAdm = p.arribo + TIP;
    q.push({ t: tAdm, type: EVT.ADMIT, pid: p.pid });
    
    if (TIP > 0) {
      traceOverhead(trace, p.pid, 'TIP', p.arribo, tAdm);
    }
  }

  const programar = (t: number, type: EventType, pid?: number, data?: Record<string, unknown>) =>
    q.push({ t, type, pid, data });

  const abrirSlice = (t: number, pid: number) => { 
    cpu.pid = pid; 
    cpu.sliceStart = t; 
    const r = rt.get(pid);
    if (r) cpu.generation = r.generation;
  };

  const cerrarSlice = (t: number) => {
    if (cpu.pid != null && cpu.sliceStart != null && cpu.sliceStart < t) {
      traceSlice(trace, cpu.pid, cpu.sliceStart, t);
    }
    cpu.pid = null; 
    cpu.sliceStart = null;
  };

  const despacharSiLibre = (t: number) => {
    if (cpu.pid != null) return;
    if (pendingDispatchAt === t) return;
    const nextPid = sched.next();
    if (nextPid != null) {
      programar(t, EVT.DISPATCH, nextPid);
      pendingDispatchAt = t;
    }
  };

  const getRafagas = (pid: number) =>
    procesos.find(x => x.pid === pid)?.rafagasCPU ?? [];

  while (!q.isEmpty()) {
    const e = q.pop()!;
    if (e.t !== currentTick) { 
      currentTick = e.t; 
      pendingDispatchAt = null; 
    }

    switch (e.type) {
      case EVT.ADMIT: {
        if (e.pid == null) break;
        traceEvent(trace, e.t, e.type, e.pid);
        sched.onAdmit(e.pid);
        despacharSiLibre(e.t);
        break;
      }

      case EVT.DISPATCH: {
        if (e.pid == null) break;
        
        const r = rt.get(e.pid);
        if (!r || cpu.pid != null) {
          // Proceso ya no existe o CPU ocupada - evento stale
          break;
        }

        traceEvent(trace, e.t, e.type, e.pid);

        // TCP se aplica ANTES del inicio del slice
        const tStart = e.t + TCP;
        
        if (TCP > 0) {
          traceOverhead(trace, e.pid, 'TCP', e.t, tStart);
        }
        
        abrirSlice(tStart, e.pid);

        const rBurst = r.restante;
        const tEnd = tStart + rBurst;

        // Programar fin de CPU (SIN overhead)
        programar(tEnd, EVT.CPU_DONE, e.pid, { generation: r.generation });

        break;
      }

      case EVT.CPU_DONE: {
        if (e.pid == null) break;
        
        const r = rt.get(e.pid);
        if (!r || cpu.pid !== e.pid || e.data?.generation !== r.generation) {
          // Evento stale - ignorar
          break;
        }

        // Cerrar slice de CPU exactamente en tEnd (sin TFP)
        cerrarSlice(e.t);
        
        // Marcar ráfaga como terminada
        r.restante = 0;
        
        const esUltima = (r.idxRafaga >= (getRafagas(e.pid).length - 1));
        
        if (esUltima) {
          // Emitir C→T en el momento exacto de fin de CPU
          traceEvent(trace, e.t, EVT.FINISH, e.pid);
          
          // Programar overhead administrativo TFP si existe
          if (TFP > 0) {
            traceOverhead(trace, e.pid, 'TFP', e.t, e.t + TFP);
            programar(e.t + TFP, EVT.ADMIN_FINISH, e.pid);
          }
          
          sched.onFinish(e.pid);
        } else {
          // Emitir C→B y manejar E/S
          traceEvent(trace, e.t, EVT.BLOCK, e.pid);
          
          const proceso = procesos.find(p => p.pid === e.pid);
          if (proceso) {
            const durES = Number.isFinite(proceso.rafagasES?.[r.idxRafaga])
              ? (proceso.rafagasES as number[])[r.idxRafaga]
              : bloqueoES;

            programar(e.t + durES, EVT.IO_OUT, e.pid);
            sched.onBlock(e.pid);
          }
        }
        
        despacharSiLibre(e.t);
        break;
      }

      case EVT.IO_OUT: {
        if (e.pid == null) break;
        
        const r = rt.get(e.pid);
        if (!r) break;

        traceEvent(trace, e.t, e.type, e.pid);
        
        // Avanzar a siguiente ráfaga
        r.idxRafaga += 1;
        r.restante = getRafagas(e.pid)[r.idxRafaga] ?? 0;
        r.generation += 1; // Nueva generación para detectar eventos stale
        
        sched.onReady(e.pid);
        despacharSiLibre(e.t);
        break;
      }

      case EVT.ADMIN_FINISH: {
        // Overhead TFP completado - no hacer nada más
        break;
      }
    }
  }

  return trace;
}

/**
 * SRTN corregido con preemption correcta
 */
export function runSRTN(procesos: Proceso[], costos: Partial<Costos> = {}): Trace {
  const TIP = Number.isFinite(costos.TIP as number) ? (costos.TIP as number) : 0;
  const TCP = Number.isFinite(costos.TCP as number) ? (costos.TCP as number) : 0;
  const TFP = Number.isFinite(costos.TFP as number) ? (costos.TFP as number) : 0;
  const bloqueoES = Number.isFinite(costos.bloqueoES as number) ? (costos.bloqueoES as number) : 25;

  const q = new EventQueue();
  const trace: Trace = { slices: [], events: [] };
  const rt = new Map<number, Runtime>();
  const cpu: CPUState = { pid: null, sliceStart: null, generation: 0 };
  const sched = new SchedulerSRTN(
    (pid: number, now: number) => rt.get(pid)?.restante ?? 0,
    () => currentTick
  );

  let currentTick = Number.NEGATIVE_INFINITY;
  let pendingDispatchAt: number | null = null;

  // Admisiones con TIP
  for (const p of procesos) {
    rt.set(p.pid, { idxRafaga: 0, restante: (p.rafagasCPU?.[0] ?? 0), generation: 0 });
    const tAdm = p.arribo + TIP;
    q.push({ t: tAdm, type: EVT.ADMIT, pid: p.pid });
    
    if (TIP > 0) {
      traceOverhead(trace, p.pid, 'TIP', p.arribo, tAdm);
    }
  }

  const programar = (t: number, type: EventType, pid?: number, data?: Record<string, unknown>) =>
    q.push({ t, type, pid, data });

  const abrirSlice = (t: number, pid: number) => { 
    cpu.pid = pid; 
    cpu.sliceStart = t; 
    const r = rt.get(pid);
    if (r) cpu.generation = r.generation;
  };

  const cerrarSlice = (t: number) => {
    if (cpu.pid != null && cpu.sliceStart != null && cpu.sliceStart < t) {
      traceSlice(trace, cpu.pid, cpu.sliceStart, t);
    }
    cpu.pid = null; 
    cpu.sliceStart = null;
  };

  const tryPreemptIfNeeded = (t: number, newPid: number) => {
    if (cpu.pid == null || cpu.sliceStart == null) return false;
    
    const currentPid = cpu.pid;
    const currentR = rt.get(currentPid);
    const newR = rt.get(newPid);
    
    if (!currentR || !newR || currentPid == null) return false;
    
    // Permitir evaluación en el mismo tick de inicio; si t==sliceStart ⇒ runFor=0
    // Esto evita consumir CPU por error pero permite preemption inmediata si corresponde
    
    // Calcular tiempo ejecutado y restante actual
    const runFor = t - cpu.sliceStart; // puede ser 0 si t == sliceStart
    
    if (newR.restante < currentR.restante - runFor) {
      // Preemptar: 1) descontar si corrió, 2) invalidar eventos pendientes, 3) a ready
      
      // 1) Solo modificar r.restante si hubo ejecución real (t > sliceStart)
      if (t > cpu.sliceStart) {
        currentR.restante = Math.max(0, currentR.restante - runFor);
        cerrarSlice(t);
      } else {
        // t == sliceStart: no hubo ejecución, solo limpiar estado CPU sin modificar r.restante
        cpu.pid = null;
        cpu.sliceStart = null;
      }
      
      // 2) ***INVALIDAR eventos ya programados (CPU_DONE viejo)***
      currentR.generation += 1;
      
      // 3) traza y a ready
      traceEvent(trace, t, EVT.PREEMPT, currentPid, { reason: 'preempt' });
      sched.onReady(currentPid);
      return true;
    }
    
    return false;
  };

  const despacharSiLibre = (t: number) => {
    if (cpu.pid != null) return;
    if (pendingDispatchAt === t) return;
    const nextPid = sched.next();
    if (nextPid != null) {
      programar(t, EVT.DISPATCH, nextPid);
      pendingDispatchAt = t;
    }
  };

  const getRafagas = (pid: number) =>
    procesos.find(x => x.pid === pid)?.rafagasCPU ?? [];

  while (!q.isEmpty()) {
    const e = q.pop()!;
    if (e.t !== currentTick) { 
      currentTick = e.t; 
      pendingDispatchAt = null; 
    }

    switch (e.type) {
      case EVT.ADMIT: {
        if (e.pid == null) break;
        traceEvent(trace, e.t, e.type, e.pid);
        sched.onAdmit(e.pid);
        
        // Intentar preemptar si llegó un proceso con menor tiempo restante
        if (!tryPreemptIfNeeded(e.t, e.pid)) {
          despacharSiLibre(e.t);
        } else {
          despacharSiLibre(e.t);
        }
        break;
      }

      case EVT.DISPATCH: {
        if (e.pid == null) break;
        
        const r = rt.get(e.pid);
        if (!r || cpu.pid != null) break;

        traceEvent(trace, e.t, e.type, e.pid);

        const tStart = e.t + TCP;
        
        if (TCP > 0) {
          traceOverhead(trace, e.pid, 'TCP', e.t, tStart);
        }
        
        abrirSlice(tStart, e.pid);

        const rBurst = r.restante;
        const tEnd = tStart + rBurst;

        programar(tEnd, EVT.CPU_DONE, e.pid, { generation: r.generation });
        break;
      }

      case EVT.CPU_DONE: {
        if (e.pid == null) break;
        
        const r = rt.get(e.pid);
        if (!r || cpu.pid !== e.pid || e.data?.generation !== r.generation) {
          break;
        }

        cerrarSlice(e.t);
        
        // Marcar ráfaga como terminada
        r.restante = 0;
        
        const esUltima = (r.idxRafaga >= (getRafagas(e.pid).length - 1));
        
        if (esUltima) {
          traceEvent(trace, e.t, EVT.FINISH, e.pid);
          
          if (TFP > 0) {
            traceOverhead(trace, e.pid, 'TFP', e.t, e.t + TFP);
            programar(e.t + TFP, EVT.ADMIN_FINISH, e.pid);
          }
          
          sched.onFinish(e.pid);
        } else {
          traceEvent(trace, e.t, EVT.BLOCK, e.pid);
          
          const proceso = procesos.find(p => p.pid === e.pid);
          if (proceso) {
            const durES = Number.isFinite(proceso.rafagasES?.[r.idxRafaga])
              ? (proceso.rafagasES as number[])[r.idxRafaga]
              : bloqueoES;

            programar(e.t + durES, EVT.IO_OUT, e.pid);
            sched.onBlock(e.pid);
          }
        }
        
        despacharSiLibre(e.t);
        break;
      }

      case EVT.PREEMPT: {
        // SRTN usa preemption sincrónica (tryPreemptIfNeeded)
        // Este case solo debe usarse para RR (events de quantum en cola)
        if (e.pid == null) break;
        
        const r = rt.get(e.pid);
        if (!r || cpu.pid !== e.pid || e.data?.generation !== r.generation) {
          // Evento stale - ignorar
          break;
        }

        // Solo procesar si es preemption por quantum (RR)
        if (e.data?.reason !== 'quantum') {
          // SRTN no debe usar eventos PREEMPT en cola
          break;
        }

        const runFor = e.t - (cpu.sliceStart ?? e.t);
        r.restante = Math.max(0, r.restante - runFor);
        
        cerrarSlice(e.t);
        traceEvent(trace, e.t, EVT.PREEMPT, e.pid, { reason: 'quantum' });
        
        // ***invalidar eventos pendientes de la generación anterior***
        r.generation += 1;
        
        if (r.restante > 0) {
          sched.onReady(e.pid);
        }
        
        despacharSiLibre(e.t);
        break;
      }

      case EVT.IO_OUT: {
        if (e.pid == null) break;
        
        const r = rt.get(e.pid);
        if (!r) break;

        traceEvent(trace, e.t, e.type, e.pid);
        
        r.idxRafaga += 1;
        r.restante = getRafagas(e.pid)[r.idxRafaga] ?? 0;
        r.generation += 1;
        
        sched.onReady(e.pid);
        
        // Intentar preemptar si retornó un proceso con menor tiempo restante
        if (!tryPreemptIfNeeded(e.t, e.pid)) {
          despacharSiLibre(e.t);
        } else {
          despacharSiLibre(e.t);
        }
        break;
      }

      case EVT.ADMIN_FINISH: {
        break;
      }
    }
  }

  return trace;
}

/**
 * Priority corregido con preemption
 */
export function runPriority(
  procesos: Proceso[],
  costos: Partial<Costos> = {},
  priorityAging?: { quantum: number; incremento: number }
): Trace {
  const TIP = Number.isFinite(costos.TIP as number) ? (costos.TIP as number) : 0;
  const TCP = Number.isFinite(costos.TCP as number) ? (costos.TCP as number) : 0;
  const TFP = Number.isFinite(costos.TFP as number) ? (costos.TFP as number) : 0;
  const bloqueoES = Number.isFinite(costos.bloqueoES as number) ? (costos.bloqueoES as number) : 25;

  const q = new EventQueue();
  const trace: Trace = { slices: [], events: [] };
  const rt = new Map<number, Runtime>();
  const cpu: CPUState = { pid: null, sliceStart: null, generation: 0 };
  
  // Priority scheduler que selecciona por prioridad más alta (menor número)
  const sched = new SchedulerPriority(
    (pid: number) => procesos.find(p => p.pid === pid)?.prioridadBase ?? 10, // Default priority 10 (low)
    (pid: number, now: number) => rt.get(pid)?.restante ?? 0,
    () => currentTick,
    priorityAging ? {
      ageQuantum: priorityAging.quantum,
      ageStep: priorityAging.incremento,
      minPriority: 0,
      maxPriority: 10
    } : undefined
  );

  let currentTick = Number.NEGATIVE_INFINITY;
  let pendingDispatchAt: number | null = null;

  // Admisiones con TIP
  for (const p of procesos) {
    rt.set(p.pid, { idxRafaga: 0, restante: (p.rafagasCPU?.[0] ?? 0), generation: 0 });
    const tAdm = p.arribo + TIP;
    q.push({ t: tAdm, type: EVT.ADMIT, pid: p.pid });
    
    if (TIP > 0) {
      traceOverhead(trace, p.pid, 'TIP', p.arribo, tAdm);
    }
  }

  const programar = (t: number, type: EventType, pid?: number, data?: Record<string, unknown>) =>
    q.push({ t, type, pid, data });

  const abrirSlice = (t: number, pid: number) => { 
    cpu.pid = pid; 
    cpu.sliceStart = t; 
    const r = rt.get(pid);
    if (r) cpu.generation = r.generation;
  };

  const cerrarSlice = (t: number) => {
    if (cpu.pid != null && cpu.sliceStart != null && cpu.sliceStart < t) {
      traceSlice(trace, cpu.pid, cpu.sliceStart, t);
    }
    cpu.pid = null; 
    cpu.sliceStart = null;
  };

  const tryPreemptIfNeeded = (t: number, newPid: number) => {
    if (cpu.pid == null || cpu.sliceStart == null) return false;
    
    const currentPid = cpu.pid;
    const currentR = rt.get(currentPid);
    const newR = rt.get(newPid);
    
    if (!currentR || !newR || currentPid == null) return false;
    
    // Obtener prioridades efectivas (menor número = mayor prioridad)
    const currentPriority = procesos.find(p => p.pid === currentPid)?.prioridadBase ?? 10;
    const newPriority = procesos.find(p => p.pid === newPid)?.prioridadBase ?? 10;
    
    // Preemptar si el nuevo proceso tiene mayor prioridad (menor número)
    if (newPriority < currentPriority) {
      // Calcular tiempo ejecutado
      const runFor = t - cpu.sliceStart; // puede ser 0 si t == sliceStart
      
      // 1) Solo modificar r.restante si hubo ejecución real (t > sliceStart)
      if (t > cpu.sliceStart) {
        currentR.restante = Math.max(0, currentR.restante - runFor);
        cerrarSlice(t);
      } else {
        // t == sliceStart: no hubo ejecución, solo limpiar estado CPU sin modificar r.restante
        cpu.pid = null;
        cpu.sliceStart = null;
      }
      
      // 2) ***INVALIDAR eventos ya programados (CPU_DONE viejo)***
      currentR.generation += 1;
      
      // 3) traza y a ready
      traceEvent(trace, t, EVT.PREEMPT, currentPid, { reason: 'preempt' });
      sched.onReady(currentPid);
      return true;
    }
    
    return false;
  };

  const despacharSiLibre = (t: number) => {
    if (cpu.pid != null) return;
    if (pendingDispatchAt === t) return;
    const nextPid = sched.next();
    if (nextPid != null) {
      programar(t, EVT.DISPATCH, nextPid);
      pendingDispatchAt = t;
    }
  };

  const getRafagas = (pid: number) =>
    procesos.find(x => x.pid === pid)?.rafagasCPU ?? [];

  while (!q.isEmpty()) {
    const e = q.pop()!;
    if (e.t !== currentTick) { 
      currentTick = e.t; 
      pendingDispatchAt = null; 
    }

    switch (e.type) {
      case EVT.ADMIT: {
        if (e.pid == null) break;
        traceEvent(trace, e.t, e.type, e.pid);
        sched.onAdmit(e.pid);
        
        // Intentar preemptar si llegó un proceso con mayor prioridad
        if (!tryPreemptIfNeeded(e.t, e.pid)) {
          despacharSiLibre(e.t);
        } else {
          despacharSiLibre(e.t);
        }
        break;
      }

      case EVT.DISPATCH: {
        if (e.pid == null) break;
        
        const r = rt.get(e.pid);
        if (!r || cpu.pid != null) {
          // Proceso ya no existe o CPU ocupada - evento stale
          break;
        }

        traceEvent(trace, e.t, e.type, e.pid);

        // TCP se aplica ANTES del inicio del slice
        const tStart = e.t + TCP;
        
        if (TCP > 0) {
          traceOverhead(trace, e.pid, 'TCP', e.t, tStart);
        }
        
        abrirSlice(tStart, e.pid);

        const rBurst = r.restante;
        const tEnd = tStart + rBurst;

        // Programar fin de CPU con generation para detectar eventos obsoletos
        programar(tEnd, EVT.CPU_DONE, e.pid, { generation: r.generation });

        break;
      }

      case EVT.CPU_DONE: {
        if (e.pid == null) break;
        
        const r = rt.get(e.pid);
        if (!r || cpu.pid !== e.pid || e.data?.generation !== r.generation) {
          // Evento stale - ignorar
          break;
        }

        // Cerrar slice de CPU exactamente en tEnd (sin TFP)
        cerrarSlice(e.t);
        
        // Marcar ráfaga como terminada
        r.restante = 0;
        
        const esUltima = (r.idxRafaga >= (getRafagas(e.pid).length - 1));
        
        if (esUltima) {
          // Emitir C→T en el momento exacto de fin de CPU
          traceEvent(trace, e.t, EVT.FINISH, e.pid);
          
          // Programar overhead administrativo TFP si existe
          if (TFP > 0) {
            traceOverhead(trace, e.pid, 'TFP', e.t, e.t + TFP);
            programar(e.t + TFP, EVT.ADMIN_FINISH, e.pid);
          }
          
          sched.onFinish(e.pid);
        } else {
          // Emitir C→B y manejar E/S
          traceEvent(trace, e.t, EVT.BLOCK, e.pid);
          
          const proceso = procesos.find(p => p.pid === e.pid);
          if (proceso) {
            const durES = Number.isFinite(proceso.rafagasES?.[r.idxRafaga])
              ? (proceso.rafagasES as number[])[r.idxRafaga]
              : bloqueoES;

            programar(e.t + durES, EVT.IO_OUT, e.pid);
            sched.onBlock(e.pid);
          }
        }
        
        despacharSiLibre(e.t);
        break;
      }

      case EVT.IO_OUT: {
        if (e.pid == null) break;
        
        const r = rt.get(e.pid);
        if (!r) break;

        traceEvent(trace, e.t, e.type, e.pid);
        
        // Avanzar a siguiente ráfaga
        r.idxRafaga += 1;
        r.restante = getRafagas(e.pid)[r.idxRafaga] ?? 0;
        r.generation += 1; // Nueva generación para detectar eventos stale
        
        sched.onReady(e.pid);
        
        // Intentar preemptar si el proceso que retorna tiene mayor prioridad
        if (!tryPreemptIfNeeded(e.t, e.pid)) {
          despacharSiLibre(e.t);
        } else {
          despacharSiLibre(e.t);
        }
        break;
      }

      case EVT.ADMIN_FINISH: {
        // Overhead TFP completado - no hacer nada más
        break;
      }
    }
  }

  return trace;
}

// Alias para mantener compatibilidad
export const runFCFSSandbox = runFCFS;