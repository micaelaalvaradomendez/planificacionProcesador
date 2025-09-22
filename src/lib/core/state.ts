import type { Workload, SimEvent, Policy } from '../domain/types';
import { EstadoProceso, TipoEvento } from '../domain/types';
import { Proceso } from '../domain/entities/Proceso';

// Usamos la entidad canónica del dominio - NO duplicaciones
export type ProcesoEstado = EstadoProceso;

// ELIMINADO: ProcesoRT interface - usar directamente Proceso del dominio

// Mapeo de eventos internos a tipos canónicos del dominio
export type TipoEventoInterno =
  | 'Arribo'                    // Nuevo→Listo (con TIP si corresponde)
  | 'FinTIP'                    // Nuevo→Listo (fin del tiempo de incorporación)
  | 'Despacho'                  // Listo→Corriendo (consume TCP)
  | 'FinRafagaCPU'              // Corriendo→(Bloqueado|Terminado)
  | 'AgotamientoQuantum'        // Corriendo→Listo (RR)
  | 'FinES'                     // Bloqueado→Listo (INSTANTÁNEO: Δt=0, NO consume TCP)
  | 'FinTFP';                   // cierre contable del proceso

/**
 * DOCUMENTACIÓN CRÍTICA DE TIEMPOS:
 * - Bloqueado→Listo (FinES): INSTANTÁNEO (Δt=0), sin overhead del SO
 * - Listo→Corriendo (Despacho): Consume TCP (tiempo de cambio de contexto)
 * - TCP se cobra ÚNICAMENTE en L→C, NUNCA en B→L
 * 
 * Mapea TipoEventoInterno a TipoEvento canónico del dominio
 */
export function mapearEventoADominio(tipoInterno: TipoEventoInterno): TipoEvento {
  const mapeo: Record<TipoEventoInterno, TipoEvento> = {
    'Arribo': TipoEvento.JOB_LLEGA,
    'FinTIP': TipoEvento.NUEVO_A_LISTO,
    'Despacho': TipoEvento.LISTO_A_CORRIENDO,
    'FinRafagaCPU': TipoEvento.FIN_RAFAGA_CPU,
    'AgotamientoQuantum': TipoEvento.QUANTUM_EXPIRES,
    'FinES': TipoEvento.BLOQUEADO_A_LISTO,
    'FinTFP': TipoEvento.PROCESO_TERMINA
  };
  return mapeo[tipoInterno];
}

export interface EventoInterno {
  tiempo: number;
  tipo: TipoEventoInterno;
  proceso?: string;             // name del proceso
  extra?: string;               // detalles adicionales
}

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
  
  // Procesos y colas - USA ENTIDADES DEL DOMINIO
  procesos: Map<string, Proceso>;
  colaListos: string[];         // orden depende de la política
  colaBloqueados: string[];
  procesoEjecutando?: string;
  
  // Costos pendientes por transiciones instantáneas
  costoBloqueadoListoPendiente: number;  // costo acumulado de transiciones Bloqueado→Listo instantáneas
  
  // Contabilidad y logs
  contadoresCPU: ContadoresCPU;
  eventosInternos: EventoInterno[];     // log interno detallado
  eventosExportacion: SimEvent[];       // para exportar al usuario
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
    procesos,
    colaListos: [],
    colaBloqueados: [],
    costoBloqueadoListoPendiente: 0,
    contadoresCPU: {
      ocioso: 0,
      sistemaOperativo: 0,
      procesos: 0
    },
    eventosInternos: [],
    eventosExportacion: []
  };
}

export function agregarEventoInterno(state: SimState, tipo: TipoEventoInterno, proceso?: string, extra?: string) {
  state.eventosInternos.push({
    tiempo: state.tiempoActual,
    tipo,
    proceso,
    extra
  });
}

export function agregarEventoExportacion(state: SimState, tipoInterno: TipoEventoInterno, proceso: string, extra?: string) {
  const tipoCanonica = mapearEventoADominio(tipoInterno);
  state.eventosExportacion.push({
    tiempo: state.tiempoActual,
    tipo: tipoCanonica,
    proceso,
    extra
  });
}
