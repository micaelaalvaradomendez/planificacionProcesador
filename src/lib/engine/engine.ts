// src/lib/engine/engine.ts
import type { Proceso } from '../model/proceso';
import type { Costos } from '../model/costos';
import type { EventType, SimEvent, Trace } from './types';
import { EventQueue } from './queue';
import { SchedulerFCFS } from '../scheduler/fcfs';
import { SchedulerRR } from '../scheduler/rr';

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
        if (e.pid == null) break;
        if (cpu.pid != null) { sched.onReady(e.pid); break; }   // defensivo

        const pid = e.pid;
        const r = rt.get(pid); if (!r) break;

        const tStart = e.t + TCP;            // inicio real del slice (TCP no es CPU)
        abrirSlice(tStart, pid);

        const qRest = sched.getQuantum?.() ?? quantum;   // quantum fresco por cada L→C
        const rBurst = r.restante;           // ráfaga total pendiente

        // NO usar min(rBurst,qRest); programar ambos y dejar que prioridad decida
        const tFinCPU = tStart + rBurst;     // fin natural (si llega)
        const tTimer = tStart + qRest;       // timer RR (desde t_s)

        // Fin de ráfaga: C→T(1) o C→B(2) según última o no
        const esUltima = (r.idxRafaga >= (getRafagas(pid).length - 1));
        if (esUltima) {
          // C→T tiene máxima prioridad (1)
          programar(tFinCPU + TFP, EVT.FINISH, pid, { realFinishTime: tFinCPU });
        } else {
          // C→B tiene prioridad 2 (gana a C→L=3)
          programar(tFinCPU, EVT.BLOCK, pid);
          programar(tFinCPU + bloqueoES, EVT.IO_OUT, pid);
        }

        // Timer RR: C→L(3) - pierde ante C→T(1) y C→B(2) en empates
        programar(tTimer, EVT.PREEMPT, pid);
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
        if (cpu.pid !== e.pid || cpu.sliceStart == null) break;   // stale → ignorar

        const pid = e.pid;
        const r = rt.get(pid); if (!r) break;

        const runFor = e.t - cpu.sliceStart;   // debe ser quantum exacto
        cerrarSlice(e.t);
        
        // Actualizar ráfaga restante (solo por quantum efectivo)
        r.restante = Math.max(0, r.restante - runFor);

        // Si justo llegó a 0, C→B/C→T ya debió ejecutarse (prioridad)
        if (r.restante > 0) {
          (sched as any).onDesalojoActual?.(pid);  // reencolar al final
        }
        despacharSiLibre(e.t);
        break;
      }

      case 'C→T': {
        if (e.pid == null) break;
        // Ya se cerró slice en tFinCPU (no despachar aquí; administrativo)
        // Si quedó algo abierto por empate con timer, cerrar en tiempo real
        const realFinishTime = (e.data?.realFinishTime as number) ?? e.t;
        if (cpu.pid === e.pid && cpu.sliceStart != null) {
          // Cerrar el slice en el tiempo real de fin de CPU
          cerrarSlice(realFinishTime);
          // Marcar CPU como libre pero no despachar (eso ya se hizo en C→B)
          cpu.pid = null;
          cpu.sliceStart = null;
        }
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
    if (pendingDispatchAt === t) return;      // ya agendé un L→C en este tick
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
