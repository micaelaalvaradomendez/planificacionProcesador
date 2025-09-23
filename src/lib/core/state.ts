import type { Workload, SimEvent, Policy } from '../domain/types';
import { EstadoProceso, TipoEvento } from '../domain/types';
import { Proceso } from '../domain/entities/Proceso';
import { RegistroEventos, type TipoEventoInterno, type EventoInterno } from './registroEventos';

// Ya no es necesario el alias ProcesoEstado - usamos directamente EstadoProceso del dominio

// ELIMINADO: ProcesoRT interface - usar directamente Proceso del dominio

// ELIMINADO: Duplicación de tipos de eventos - están centralizados en registroEventos.ts

export interface ContadoresCPU {
  ocioso: number;               // tiempo CPU idle
  sistemaOperativo: number;     // TIP + TFP + todos los TCP
  procesos: number;             // tiempo ejecutando código de usuario
}

export type ModoEjecucion = 'idle' | 'so' | 'user';

export interface SimState {
  // Reloj del sistema
  tiempoActual: number;
  modoActual: ModoEjecucion;
  tiempoInicioModo: number;     // para calcular deltas
  
  // Configuración
  policy: Policy;
  tip: number; 
  tfp: number; 
  tcp: number; 
  quantum?: number;
  maxIterations?: number;  // límite de iteraciones
  
  // Procesos y colas - USA ENTIDADES DEL DOMINIO
  procesos: Map<string, Proceso>;
  colaListos: string[];         // orden depende de la política
  colaBloqueados: string[];
  procesoEjecutando?: string;
  
  // Costos pendientes por transiciones instantáneas
  costoBloqueadoListoPendiente: number;  // costo acumulado de transiciones Bloqueado→Listo instantáneas
  
  // Contabilidad y logs
  contadoresCPU: ContadoresCPU;
  
  // SISTEMA CENTRALIZADO DE EVENTOS
  registroEventos: RegistroEventos;     // registro único centralizado
}

export function crearEstadoInicial(wl: Workload): SimState {
  const procesos = new Map<string, Proceso>();
  
  // Crear entidades Proceso del dominio para cada proceso del workload
  for (const p of wl.processes) {
    const proceso = new Proceso({
      nombre: p.id,
      arribo: p.arribo,
      rafagasCPU: p.rafagasCPU,
      duracionCPU: p.duracionCPU,
      duracionIO: p.duracionIO,
      prioridad: p.prioridad
    });
    
    procesos.set(p.id, proceso);
  }

  return {
    tiempoActual: 0,
    modoActual: 'idle',
    tiempoInicioModo: 0,
    policy: wl.config.policy,
    tip: wl.config.tip,
    tfp: wl.config.tfp,
    tcp: wl.config.tcp,
    quantum: wl.config.quantum,
    maxIterations: wl.config.maxIterations,
    procesos,
    colaListos: [],
    colaBloqueados: [],
    costoBloqueadoListoPendiente: 0,
    contadoresCPU: {
      ocioso: 0,
      sistemaOperativo: 0,
      procesos: 0
    },
    registroEventos: new RegistroEventos()
  };
}

/**
 * Registra un evento en el sistema centralizado
 */
export function registrarEvento(state: SimState, tipo: TipoEventoInterno, proceso?: string, extra?: string) {
  state.registroEventos.registrar(state.tiempoActual, tipo, proceso, extra);
}

/**
 * Obtiene eventos internos del registro centralizado
 */
export function obtenerEventosInternos(state: SimState): EventoInterno[] {
  return state.registroEventos.obtenerEventosInternos();
}

/**
 * Obtiene eventos de exportación proyectados desde los internos
 */
export function obtenerEventosExportacion(state: SimState): SimEvent[] {
  return state.registroEventos.proyectarEventosExportacion();
}

// FUNCIONES DEPRECADAS - Mantener compatibilidad temporal
export function agregarEventoInterno(state: SimState, tipo: TipoEventoInterno, proceso?: string, extra?: string) {
  console.warn('⚠️ agregarEventoInterno está deprecada, usar registrarEvento()');
  registrarEvento(state, tipo, proceso, extra);
}

export function agregarEventoExportacion(state: SimState, tipoInterno: TipoEventoInterno, proceso: string, extra?: string) {
  console.warn('⚠️ agregarEventoExportacion está deprecada, el registro es automático via proyección');
  // No hacer nada - la proyección se maneja automáticamente
}
