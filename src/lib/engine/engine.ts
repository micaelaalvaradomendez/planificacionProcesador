// src/lib/engine/engine.ts
import type { Proceso } from '../model/proceso';
import type { Costos } from '../model/costos';
import type { EventType, SimEvent, Trace } from './types';
import { EventQueue } from './queue';
import { SchedulerFCFS } from '../scheduler/fcfs';
import { SchedulerRR } from '../scheduler/rr';
import { SchedulerSPN } from '../scheduler/spn';
import { SchedulerSRTN } from '../scheduler/srtn';

// ---- Tipos runtime (no forman parte del dominio estático) ----
type Runtime = {
  idxRafaga: number;      // índice de ráfaga actual
  restante: number;       // tiempo restante de esa ráfaga
};

type CPUState = {
  pid: number | null;
  sliceStart: number | null;
};

const EVT: Record<string, EventType> = {
  FINISH: 'C→T',
  BLOCK:  'C→B',
  PREEMPT:'C→L',
  IO_OUT: 'B→L',
  ADMIT:  'N→L',
  DISPATCH:'L→C'
};


/** 
 * Ejecuta Round Robin con quantum, con TIP/TCP/TFP/bloqueoES respetados.
 * 
 * Reglas críticas:
 * - Quantum se REINICIA en cada L→C (no hay quantum restante entre despachos)
 * - Timer se programa desde t_s = t + TCP (no desde t)
 * - TCP no cuenta dentro del quantum (solo desplaza t_s)
 * - Se programan siempre ambos eventos (fin ráfaga y timer)
 * - Si coinciden, C→T/C→B (prio 1/2) gana a C→L (prio 3)
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
  const cpu: CPUState = { pid: null, sliceStart: null };
  const sched = new SchedulerRR(quantum);

  let currentTick = Number.NEGATIVE_INFINITY;
  let pendingDispatchAt: number | null = null;

  // admisiones con TIP
  for (const p of procesos) {
    rt.set(p.pid, { idxRafaga: 0, restante: (p.rafagasCPU?.[0] ?? 0) });
    q.push({ t: p.arribo + TIP, type: EVT.ADMIT, pid: p.pid });
  }

  const programar = (t: number, type: EventType, pid?: number, data?: Record<string, unknown>) =>
    q.push({ t, type, pid, data });

  const logEvent = (e: SimEvent) => trace.events.push({ t: e.t, type: e.type, pid: e.pid });

  const abrirSlice = (t: number, pid: number) => { cpu.pid = pid; cpu.sliceStart = t; };
  const cerrarSlice = (t: number) => {
    if (cpu.pid != null && cpu.sliceStart != null && cpu.sliceStart < t) {
      trace.slices.push({ pid: cpu.pid, start: cpu.sliceStart, end: t });
    }
    cpu.pid = null; cpu.sliceStart = null;
  };

  const despacharSiLibre = (t: number) => {
    if (cpu.pid != null) return;
    if (pendingDispatchAt === t) return; // guard por tick
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
    if (e.t !== currentTick) { currentTick = e.t; pendingDispatchAt = null; }
    logEvent(e);

    switch (e.type) {
      case 'N→L': {
        if (e.pid == null) break;
        sched.onAdmit(e.pid);
        despacharSiLibre(e.t);
        break;
      }

      case 'L→C': {


        const pid = e.pid;
        if (pid == null) break;
        
        if (cpu.pid != null) { sched.onReady(pid); break; }   // defensivo

        const r = rt.get(pid); if (!r) break;

        const tStart = e.t + TCP;        // inicio real del slice
        abrirSlice(tStart, pid);

        const rBurst = r.restante;       // snapshot de ráfaga restante (no tocar!!)
        const qRest  = sched.getQuantum?.() ?? quantum;  // reinicio de quantum

        const tFinCPU = tStart + rBurst;
        const tTimer  = tStart + qRest;



        const esUltima = (r.idxRafaga >= (getRafagas(pid).length - 1));
        if (esUltima) {
          // Para fin total: programar C→T (prioridad 1) que libera CPU en su tiempo real
          programar(tFinCPU + TFP, EVT.FINISH, pid, { 
            realFinishTime: tFinCPU, 
            expectedSliceStart: tStart 
          });
        } else {
          programar(tFinCPU, EVT.BLOCK, pid);
          programar(tFinCPU + bloqueoES, EVT.IO_OUT, pid);
        }

        programar(tTimer, EVT.PREEMPT, pid); // C→L del timer (empate lo resuelven prioridades)
        break;
      }

      case 'C→B': {
        // Bloqueo: cerrar slice y liberar CPU
        cerrarSlice(e.t);
        if (e.pid != null) sched.onBlock(e.pid);
        despacharSiLibre(e.t);
        break;
      }

      case 'B→L': {
        if (e.pid == null) break;
        const r = rt.get(e.pid); if (!r) break;
        r.idxRafaga += 1;
        r.restante = getRafagas(e.pid)[r.idxRafaga] ?? 0;
        sched.onReady(e.pid);
        despacharSiLibre(e.t);
        break;
      }

      case 'C→L': {
        if (e.pid == null) break;
        if (cpu.pid !== e.pid || cpu.sliceStart == null) break; // stale

        const pid = e.pid;
        const r = rt.get(pid); if (!r) break;

        const runFor = e.t - cpu.sliceStart;
        cerrarSlice(e.t);
        r.restante = Math.max(0, r.restante - runFor);

        if (r.restante > 0) {
          (sched as any).onDesalojoActual?.(pid);
        }
        despacharSiLibre(e.t);
        break;
      }

      case 'C→T': {
        if (e.pid == null) break;
        
        const realFinishTime = (e.data?.realFinishTime as number) ?? e.t;
        const expectedSliceStart = (e.data?.expectedSliceStart as number) ?? null;
        
        // Verificar si el proceso está ejecutando desde exactamente el slice esperado
        if (cpu.pid !== e.pid || cpu.sliceStart !== expectedSliceStart) {
          break; // C→T stale - corresponde a un slice anterior
        }
        
        // Proceso realmente terminó - descontar lo que ejecutó y cerrar
        const r = rt.get(e.pid);
        if (r) {
          const executed = realFinishTime - cpu.sliceStart;
          r.restante = Math.max(0, r.restante - executed);
        }
        
        cerrarSlice(realFinishTime);
        despacharSiLibre(realFinishTime);
        sched.onFinish(e.pid);
        break;
      }
    }
  }

  return trace;
}

export function runFCFSSandbox(processos: Proceso[], costos: Partial<Costos> = {}): Trace {
  const TIP = Number.isFinite(costos.TIP as number) ? (costos.TIP as number) : 0;
  const TCP = Number.isFinite(costos.TCP as number) ? (costos.TCP as number) : 0;
  const TFP = Number.isFinite(costos.TFP as number) ? (costos.TFP as number) : 0;
  const bloqueoES = Number.isFinite(costos.bloqueoES as number) ? (costos.bloqueoES as number) : 25;

  const q = new EventQueue();
  const trace: Trace = { slices: [], events: [] };

  // Estado runtime por PID
  const rt: Map<number, Runtime> = new Map();

  // CPU
  const cpu: CPUState = { pid: null, sliceStart: null };

  // Planificador FCFS
  const sched = new SchedulerFCFS();

  // Guard por tick: evita múltiples L→C en el mismo instante
  let currentTick = Number.NEGATIVE_INFINITY;
  let pendingDispatchAt: number | null = null;

  // Programar admisiones N→L (con TIP)
  for (const p of processos) {
    // inicialización runtime
    rt.set(p.pid, {
      idxRafaga: 0,
      restante: (p.rafagasCPU?.[0] ?? 0)
    });
    // agenda N→L en t=arribo + TIP
    const tAdm = p.arribo + TIP;
    q.push({ t: tAdm, type: EVT.ADMIT, pid: p.pid });
  }

  // Helpers de scheduling
  const programar = (t: number, type: EventType, pid?: number, data?: Record<string, unknown>) => {
    q.push({ t, type, pid, data });
  };

  const abrirSlice = (t: number, pid: number) => {
    cpu.pid = pid;
    cpu.sliceStart = t;
  };

  const cerrarSlice = (t: number) => {
    if (cpu.pid != null && cpu.sliceStart != null && cpu.sliceStart < t) {
      trace.slices.push({ pid: cpu.pid, start: cpu.sliceStart, end: t });
    }
    cpu.pid = null;
    cpu.sliceStart = null;
  };

  const logEvent = (e: SimEvent) => {
    trace.events.push({ t: e.t, type: e.type, pid: e.pid });
  };

  const despacharSiLibre = (t: number) => {
    if (cpu.pid != null) return;              // CPU ocupada
    if (pendingDispatchAt === t) return;      // ya agendé un L→C en el mismo tick
    const nextPid = sched.next();
    if (nextPid != null) {
      programar(t, EVT.DISPATCH, nextPid);
      pendingDispatchAt = t;                  // marca: ya hay un L→C@t
    }
  };

  // ---- Event loop ----
  while (!q.isEmpty()) {
    const e = q.pop()!;
    // reset del guard cuando cambia el tiempo
    if (e.t !== currentTick) {
      currentTick = e.t;
      pendingDispatchAt = null;
    }
    logEvent(e);

    switch (e.type) {
      case 'N→L': {
        // Admitir a ready
        if (e.pid == null) break;
        sched.onAdmit(e.pid);
        // Si la CPU está libre, intentamos despachar en el mismo t
        despacharSiLibre(e.t);
        break;
      }

      case 'L→C': {
        // --- liberar CPU y cerrar slice si viene como "gatillo de release" ---
        const releasePid = (e.data?.releasePid as number) ?? null;
        const releaseAt  = (e.data?.releaseAt  as number) ?? null;

        if (releasePid != null && releaseAt != null) {
          // Cerrar el slice del que terminó CPU exactamente en releaseAt
          if (cpu.pid === releasePid && cpu.sliceStart != null && cpu.sliceStart < releaseAt) {
            trace.slices.push({ pid: releasePid, start: cpu.sliceStart, end: releaseAt });
          }
          // liberar CPU para que podamos despachar a otro
          cpu.pid = null;
          cpu.sliceStart = null;
          // ojo: seguimos en el mismo handler, ahora intentaremos abrir un nuevo slice
        }
        // ---------------------------------------------------------------------

        if (cpu.pid != null) {
          // defensivo: CPU ocupada -> reencolar
          if (e.pid != null) sched.onReady(e.pid);
          break;
        }

        let pid = e.pid ?? sched.next();   // si no vino pid, elegimos ahora
        if (pid == null) break;

        const r = rt.get(pid);
        if (!r) break;

        // TCP: el slice inicia en t + TCP (no contamina ráfaga/quantum)
        const tStart = e.t + TCP;
        abrirSlice(tStart, pid);

        // Programar fin de ráfaga actual
        const dur = r.restante;
        const esUltima = (r.idxRafaga >= (getRafagas(processos, pid).length - 1));
        const tFinCPU = tStart + dur; // fin del trabajo útil (CPU)

        if (esUltima) {
          // 1) Evento administrativo (NO CPU)
          programar(tFinCPU + TFP, EVT.FINISH, pid, { realFinishTime: tFinCPU });
          // 2) Gatillo de despacho en tFinCPU (cierra slice y libera CPU ANTES de elegir next)
          programar(tFinCPU, EVT.DISPATCH, undefined, { releasePid: pid, releaseAt: tFinCPU });
        } else {
          programar(tFinCPU, EVT.BLOCK, pid);              // C→B @ fin
          programar(tFinCPU + bloqueoES, EVT.IO_OUT, pid); // B→L @ fin + bloqueoES
        }
        break;
      }

      case 'C→B': {
        // Bloqueo: cerrar slice y liberar CPU
        cerrarSlice(e.t);
        if (e.pid != null) {
          // FCFS no necesita nada especial aquí
          sched.onBlock(e.pid);
        }
        // Tras un bloqueo, intentamos despachar otro
        despacharSiLibre(e.t);
        break;
      }

      case 'B→L': {
        if (e.pid == null) break;
        // Avanza a la próxima ráfaga
        const r = rt.get(e.pid);
        if (!r) break;
        r.idxRafaga += 1;
        r.restante = getRafagas(processos, e.pid)[r.idxRafaga] ?? 0;

        // Vuelve a ready
        sched.onReady(e.pid);
        // Intentar despacho si CPU libre
        despacharSiLibre(e.t);
        break;
      }

      case 'C→T': {
        if (e.pid == null) break;
        // El slice YA se cerró en tFinCPU (releaseAt) cuando procesamos el gatillo
        // Este evento es administrativo: registrar y avisar al scheduler
        sched.onFinish(e.pid);
        // Nada de despachar aquí (la CPU está liberada desde tFinCPU)
        break;
      }

      case 'C→L': {
        // En FCFS sandbox NO usamos expropiación (no debería llegar)
        // Si llegara por error, cerramos slice y devolvemos a ready.
        if (e.pid != null) {
          cerrarSlice(e.t);
          sched.onReady(e.pid);
          despacharSiLibre(e.t);
        }
        break;
      }
    }
  }

  return trace;
}

// ---- util: obtener ráfagas por pid ----
function getRafagas(processos: Proceso[], pid: number): number[] {
  const p = processos.find(x => x.pid === pid);
  return p?.rafagasCPU ?? [];
}

// Helper functions for SPN/SRTN
function getNextBurst(procesos: Proceso[], rt: Map<number, Runtime>, pid: number): number {
  const r = rt.get(pid);
  const arr = procesos.find(p => p.pid === pid)?.rafagasCPU ?? [];
  const i = r?.idxRafaga ?? 0;
  return arr[i] ?? 0;
}

function getRemainingNow(rt: Map<number, Runtime>, cpu: CPUState, pid: number, now: number): number {
  const r = rt.get(pid);
  if (!r) return 0;
  if (cpu.pid === pid && cpu.sliceStart != null) {
    // restante dinámico: lo que queda del burst menos lo ya corrido en este slice
    const ran = now - cpu.sliceStart;
    return Math.max(0, r.restante - ran);
  }
  // si no está ejecutando, su restante coincide con r.restante
  return r.restante;
}

/** 
 * Ejecuta SPN (Shortest Process Next) - no expropiativo
 * Selecciona siempre el proceso con la ráfaga próxima más corta
 */
export function runSPN(
  procesos: Proceso[],
  costos: Partial<Costos> = {}
): Trace {
  const TIP = Number.isFinite(costos.TIP as number) ? (costos.TIP as number) : 0;
  const TCP = Number.isFinite(costos.TCP as number) ? (costos.TCP as number) : 0;
  const TFP = Number.isFinite(costos.TFP as number) ? (costos.TFP as number) : 0;
  const bloqueoES = Number.isFinite(costos.bloqueoES as number) ? (costos.bloqueoES as number) : 25;

  const q = new EventQueue();
  const trace: Trace = { slices: [], events: [] };
  const rt = new Map<number, Runtime>();
  const cpu: CPUState = { pid: null, sliceStart: null };
  
  const sched = new SchedulerSPN((pid: number) => getNextBurst(procesos, rt, pid));

  let currentTick = Number.NEGATIVE_INFINITY;
  let pendingDispatchAt: number | null = null;

  // admisiones con TIP
  for (const p of procesos) {
    rt.set(p.pid, { idxRafaga: 0, restante: (p.rafagasCPU?.[0] ?? 0) });
    q.push({ t: p.arribo + TIP, type: EVT.ADMIT, pid: p.pid });
  }

  const programar = (t: number, type: EventType, pid?: number, data?: Record<string, unknown>) =>
    q.push({ t, type, pid, data });

  const logEvent = (e: SimEvent) => trace.events.push({ t: e.t, type: e.type, pid: e.pid });

  const abrirSlice = (t: number, pid: number) => { cpu.pid = pid; cpu.sliceStart = t; };
  const cerrarSlice = (t: number) => {
    if (cpu.pid != null && cpu.sliceStart != null && cpu.sliceStart < t) {
      trace.slices.push({ pid: cpu.pid, start: cpu.sliceStart, end: t });
    }
    cpu.pid = null; cpu.sliceStart = null;
  };

  const despacharSiLibre = (t: number) => {
    if (cpu.pid != null) return;
    if (pendingDispatchAt === t) return; // guard por tick
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
    if (e.t !== currentTick) { currentTick = e.t; pendingDispatchAt = null; }
    logEvent(e);

    switch (e.type) {
      case 'N→L': {
        if (e.pid == null) break;
        sched.onAdmit(e.pid);
        despacharSiLibre(e.t);
        break;
      }

      case 'L→C': {
        if (e.pid == null) break;
        if (cpu.pid != null) { sched.onReady(e.pid); break; }   

        const pid = e.pid;
        const r = rt.get(pid); if (!r) break;

        const tStart = e.t + TCP;        
        abrirSlice(tStart, pid);

        const rBurst = r.restante;       
        const tFinCPU = tStart + rBurst;

        const esUltima = (r.idxRafaga >= (getRafagas(pid).length - 1));
        if (esUltima) {
          programar(tFinCPU + TFP, EVT.FINISH, pid, { 
            realFinishTime: tFinCPU, 
            expectedSliceStart: tStart 
          });
        } else {
          programar(tFinCPU, EVT.BLOCK, pid);
          programar(tFinCPU + bloqueoES, EVT.IO_OUT, pid);
        }
        break;
      }

      case 'C→B': {
        cerrarSlice(e.t);
        if (e.pid != null) sched.onBlock(e.pid);
        despacharSiLibre(e.t);
        break;
      }

      case 'B→L': {
        if (e.pid == null) break;
        const r = rt.get(e.pid); if (!r) break;
        r.idxRafaga += 1;
        r.restante = getRafagas(e.pid)[r.idxRafaga] ?? 0;
        sched.onReady(e.pid);
        despacharSiLibre(e.t);
        break;
      }

      case 'C→T': {
        if (e.pid == null) break;
        const realFinishTime = (e.data?.realFinishTime as number) ?? e.t;
        const expectedSliceStart = (e.data?.expectedSliceStart as number) ?? null;
        
        if (cpu.pid !== e.pid || cpu.sliceStart !== expectedSliceStart) {
          break; // C→T stale
        }
        
        const r = rt.get(e.pid);
        if (r) {
          const executed = realFinishTime - cpu.sliceStart!;
          r.restante = Math.max(0, r.restante - executed);
        }
        
        cerrarSlice(realFinishTime);
        despacharSiLibre(realFinishTime);
        sched.onFinish(e.pid);
        break;
      }
    }
  }

  return trace;
}

/** 
 * Ejecuta SRTN (Shortest Remaining Time Next) - expropiativo
 * Expropia cuando llega un proceso con menor tiempo restante
 */
export function runSRTN(
  procesos: Proceso[],
  costos: Partial<Costos> = {}
): Trace {
  const TIP = Number.isFinite(costos.TIP as number) ? (costos.TIP as number) : 0;
  const TCP = Number.isFinite(costos.TCP as number) ? (costos.TCP as number) : 0;
  const TFP = Number.isFinite(costos.TFP as number) ? (costos.TFP as number) : 0;
  const bloqueoES = Number.isFinite(costos.bloqueoES as number) ? (costos.bloqueoES as number) : 25;

  const q = new EventQueue();
  const trace: Trace = { slices: [], events: [] };
  const rt = new Map<number, Runtime>();
  const cpu: CPUState = { pid: null, sliceStart: null };
  
  let NOW = 0; // tiempo actual para SRTN
  
  const sched = new SchedulerSRTN(
    (pid: number, at: number) => getRemainingNow(rt, cpu, pid, at),
    () => NOW
  );

  let currentTick = Number.NEGATIVE_INFINITY;
  let pendingDispatchAt: number | null = null;

  // admisiones con TIP
  for (const p of procesos) {
    rt.set(p.pid, { idxRafaga: 0, restante: (p.rafagasCPU?.[0] ?? 0) });
    q.push({ t: p.arribo + TIP, type: EVT.ADMIT, pid: p.pid });
  }

  const programar = (t: number, type: EventType, pid?: number, data?: Record<string, unknown>) =>
    q.push({ t, type, pid, data });

  const logEvent = (e: SimEvent) => trace.events.push({ t: e.t, type: e.type, pid: e.pid });

  const abrirSlice = (t: number, pid: number) => { cpu.pid = pid; cpu.sliceStart = t; };
  const cerrarSlice = (t: number) => {
    if (cpu.pid != null && cpu.sliceStart != null && cpu.sliceStart < t) {
      trace.slices.push({ pid: cpu.pid, start: cpu.sliceStart, end: t });
    }
    cpu.pid = null; cpu.sliceStart = null;
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

  const tryPreemptIfNeeded = (t: number, pidNew: number) => {
    if (!sched.compareForPreemption) return;
    const current = cpu.pid;
    if (current == null) return;

    const wants = sched.compareForPreemption(t, pidNew,
      (pid: number, at: number) => getRemainingNow(rt, cpu, pid, at),
      current
    );
    if (wants) {
      // Expropiar: cerrar actual en t (C→L@t) y despachar nuevo (L→C@t)
      programar(t, 'C→L', current);
      programar(t, 'L→C', pidNew);
    }
  };

  const getRafagas = (pid: number) =>
    procesos.find(x => x.pid === pid)?.rafagasCPU ?? [];

  while (!q.isEmpty()) {
    const e = q.pop()!;
    NOW = e.t; // actualizar tiempo actual
    if (e.t !== currentTick) { currentTick = e.t; pendingDispatchAt = null; }
    logEvent(e);

    switch (e.type) {
      case 'N→L': {
        if (e.pid == null) break;
        sched.onAdmit(e.pid);
        tryPreemptIfNeeded(e.t, e.pid);
        despacharSiLibre(e.t);
        break;
      }

      case 'L→C': {
        if (e.pid == null) break;
        if (cpu.pid != null) { sched.onReady(e.pid); break; }   

        const pid = e.pid;
        const r = rt.get(pid); if (!r) break;

        const tStart = e.t + TCP;        
        abrirSlice(tStart, pid);

        const rBurst = r.restante;       
        const tFinCPU = tStart + rBurst;

        const esUltima = (r.idxRafaga >= (getRafagas(pid).length - 1));
        if (esUltima) {
          programar(tFinCPU + TFP, EVT.FINISH, pid, { 
            realFinishTime: tFinCPU, 
            expectedSliceStart: tStart 
          });
        } else {
          programar(tFinCPU, EVT.BLOCK, pid);
          programar(tFinCPU + bloqueoES, EVT.IO_OUT, pid);
        }
        break;
      }

      case 'C→B': {
        cerrarSlice(e.t);
        if (e.pid != null) sched.onBlock(e.pid);
        despacharSiLibre(e.t);
        break;
      }

      case 'B→L': {
        if (e.pid == null) break;
        const r = rt.get(e.pid); if (!r) break;
        r.idxRafaga += 1;
        r.restante = getRafagas(e.pid)[r.idxRafaga] ?? 0;
        sched.onReady(e.pid);
        tryPreemptIfNeeded(e.t, e.pid);
        despacharSiLibre(e.t);
        break;
      }

      case 'C→L': {
        if (e.pid == null) break;
        if (cpu.pid !== e.pid || cpu.sliceStart == null) break; // stale

        const pid = e.pid;
        const r = rt.get(pid); if (!r) break;

        const runFor = e.t - cpu.sliceStart;
        cerrarSlice(e.t);
        r.restante = Math.max(0, r.restante - runFor);

        if (r.restante > 0) {
          sched.onDesalojoActual?.(pid);
        }
        despacharSiLibre(e.t);
        break;
      }

      case 'C→T': {
        if (e.pid == null) break;
        const realFinishTime = (e.data?.realFinishTime as number) ?? e.t;
        const expectedSliceStart = (e.data?.expectedSliceStart as number) ?? null;
        
        if (cpu.pid !== e.pid || cpu.sliceStart !== expectedSliceStart) {
          break; // C→T stale
        }
        
        const r = rt.get(e.pid);
        if (r) {
          const executed = realFinishTime - cpu.sliceStart!;
          r.restante = Math.max(0, r.restante - executed);
        }
        
        cerrarSlice(realFinishTime);
        despacharSiLibre(realFinishTime);
        sched.onFinish(e.pid);
        break;
      }
    }
  }

  return trace;
}
