import type { Workload, SimEvent, Policy } from '../model/types';

export type ProcesoEstado = 'Nuevo' | 'Listo' | 'Corriendo' | 'Bloqueado' | 'Terminado';

export interface ProcesoRT {
  name: string;
  // Especificación "estática" (del archivo)
  tiempoArribo: number;
  rafagasCPU: number;
  duracionRafagaCPU: number;
  duracionRafagaES: number;
  prioridad: number;
  
  // Estado de ejecución dinámico
  estado: ProcesoEstado;
  rafagasRestantes: number;
  restanteEnRafaga: number;     // cuánto falta de la ráfaga actual
  tiempoListoAcumulado: number; // para métricas - solo cuenta después de TIP
  tipCumplido: boolean;         // hasta que cumpla TIP no suma "tiempo en listo"
  tiempoInicioRafaga?: number;  // para calcular tiempo ejecutado en expropiaciones
  
  // Marcas temporales para métricas
  inicioTIP?: number;
  finTIP?: number;
  primerDespacho?: number;      // primer despacho real (post-TIP)
  finTFP?: number;              // fin completo con TFP
  ultimoTiempoEnListo?: number; // para acumular tiempo en listo
}

export type TipoEventoInterno =
  | 'Arribo'                    // Nuevo→Listo (con TIP si corresponde)
  | 'FinTIP'                    // Nuevo→Listo (fin del tiempo de incorporación)
  | 'Despacho'                  // Listo→Corriendo (consume TCP)
  | 'FinRafagaCPU'              // Corriendo→(Bloqueado|Terminado)
  | 'AgotamientoQuantum'        // Corriendo→Listo (RR)
  | 'FinES'                     // Bloqueado→Listo (instantáneo)
  | 'FinTFP';                   // cierre contable del proceso

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
  
  // Procesos y colas
  procesos: Map<string, ProcesoRT>;
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
  const procesos = new Map<string, ProcesoRT>();
  
  // Crear ProcesoRT para cada proceso del workload
  for (const p of wl.processes) {
    procesos.set(p.name, {
      name: p.name,
      tiempoArribo: p.tiempoArribo,
      rafagasCPU: p.rafagasCPU,
      duracionRafagaCPU: p.duracionRafagaCPU,
      duracionRafagaES: p.duracionRafagaES,
      prioridad: p.prioridad,
      estado: 'Nuevo',
      rafagasRestantes: p.rafagasCPU,
      restanteEnRafaga: p.duracionRafagaCPU,
      tiempoListoAcumulado: 0,
      tipCumplido: false
    });
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

export function agregarEventoExportacion(state: SimState, tipo: string, proceso: string, extra?: string) {
  state.eventosExportacion.push({
    tiempo: state.tiempoActual,
    tipo: tipo as any, // mapearemos los tipos después
    proceso,
    extra
  });
}
