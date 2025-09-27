// src/lib/stores/schedulerFactory.ts
import type { Proceso } from '../model/proceso';
import type { Costos } from '../model/costos';
import type { Trace } from '../engine/types';
import { runRR, runFCFSSandbox, runSPN, runSRTN, runPriority } from '../engine/engine';

export type Politica = 'FCFS' | 'RR' | 'SPN' | 'SRTN' | 'PRIORITY';

export interface PriorityAgingCfg {
  step: number;      // cuánto "mejora" la prioridad por quantum de espera
  quantum: number;   // tamaño del bucket de espera (ticks/ms)
}

export interface SchedulerCfg {
  politica: Politica;
  quantum?: number;           // para RR
  aging?: PriorityAgingCfg;   // para PRIORITY
}

type Runner = (procesos: Proceso[], costos: Costos, cfg: SchedulerCfg) => Trace;

/**
 * Factory que devuelve el runner correcto según la política de scheduling
 * Encapsula la lógica de selección de algoritmo y validaciones específicas
 */
export function getRunner(cfg: SchedulerCfg): Runner {
  switch (cfg.politica) {
    case 'FCFS':
      return (ps, c) => runFCFSSandbox(ps, c);
    
    case 'RR':
      return (ps, c, scfg) => {
        const q = scfg.quantum ?? 4;
        if (!(q > 0)) throw new Error('RR requiere quantum > 0');
        return runRR(ps, c, q);
      };
    
    case 'SPN':
      return (ps, c) => runSPN(ps, c);
    
    case 'SRTN':
      return (ps, c) => runSRTN(ps, c);
    
    case 'PRIORITY':
      return (ps, c, scfg) => {
        // Extraer prioridades de los procesos
        const prioridades: Record<number, number> = {};
        for (const p of ps) {
          if (p.prioridadBase !== undefined) {
            prioridades[p.pid] = p.prioridadBase;
          }
        }
        
        // Validar que todos los procesos tengan prioridad
        const sinPrioridad = ps.filter(p => p.prioridadBase === undefined);
        if (sinPrioridad.length > 0) {
          throw new Error(`PRIORITY requiere prioridadBase en todos los procesos. Faltan: ${sinPrioridad.map(p => p.pid).join(', ')}`);
        }
        
        // Validar aging config
        const aging = scfg.aging ?? { step: 1, quantum: 5 };
        if (aging.step < 1) throw new Error('aging.step debe ser >= 1');
        if (aging.quantum < 1) throw new Error('aging.quantum debe ser >= 1');
        
        return runPriority(ps, prioridades, c);
      };
    
    default:
      const never: never = cfg.politica;
      throw new Error(`Política no soportada: ${never}`);
  }
}