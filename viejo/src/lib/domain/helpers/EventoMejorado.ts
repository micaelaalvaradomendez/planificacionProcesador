/**
 * Evento Mejorado con orden de prioridad para eventos simultáneos
 * Implementa el orden 1-6 documentado en los diagramas de secuencia
 */

import { Evento } from '../events/gantt.types';
import { TipoEvento } from '../types';

/**
 * Enum interno para prioridades de eventos simultáneos
 * Orden crítico según diagramas de secuencia
 */
enum PrioridadEventoSimultaneo {
  JOB_LLEGA = 0,           // Llegada al sistema (prioridad especial)
  FIN_PROCESO = 1,         // C→T (FIN_PROCESO)
  FIN_RAFAGA_CPU = 2,      // C→B (FIN_RAFAGA_CPU → I/O)
  EXPROPIACION = 3,        // C→L (EXPROPIACIÓN/QUANTUM)
  FIN_IO = 4,              // B→L (FIN_IO)
  FIN_TIP = 5,             // N→L (FIN_TIP)
  DISPATCH = 6,            // L→C (DISPATCH)
  SUSPENSION = 10,         // Eventos suspensión (prioridad media)
  DEFAULT = 99             // Eventos no críticos
}

/**
 * Evento mejorado que implementa orden académico de eventos simultáneos
 */
export class EventoMejorado extends Evento {
  public readonly prioridad: number;
  public readonly ordenSecundario: number; // Para desempate estable
  private static contadorSecuencia: number = 0;
  
  constructor(
    tiempo: number, 
    tipo: TipoEvento, 
    idProceso: string, 
    descripcion?: string
  ) {
    super(tiempo, tipo, idProceso, descripcion);
    this.prioridad = this.obtenerPrioridadPorTipo(tipo);
    this.ordenSecundario = EventoMejorado.contadorSecuencia++;
  }
  
  /**
   * Obtiene la prioridad según el tipo de evento
   * Implementa orden académico estricto (override del método base)
   */
  obtenerPrioridad(): number {
    return this.obtenerPrioridadPorTipo(this.tipo);
  }
  
  /**
   * Obtiene la prioridad según el tipo de evento específico
   * Implementa orden académico estricto
   */
  private obtenerPrioridadPorTipo(tipo: TipoEvento): number {
    switch (tipo) {
      // Prioridad 0: Llegada al sistema
      case TipoEvento.JOB_LLEGA:
        return PrioridadEventoSimultaneo.JOB_LLEGA;
      
      // Prioridad 1: Finalización de proceso (C→T)
      case TipoEvento.FIN_PROCESO:
      case TipoEvento.CORRIENDO_A_TERMINADO:
        return PrioridadEventoSimultaneo.FIN_PROCESO;
      
      // Prioridad 2: Finalización de ráfaga CPU (C→B)
      case TipoEvento.FIN_RAFAGA_CPU:
      case TipoEvento.CORRIENDO_A_BLOQUEADO:
        return PrioridadEventoSimultaneo.FIN_RAFAGA_CPU;
      
      // Prioridad 3: Expropiación (C→L)
      case TipoEvento.EXPROPIACION:
      case TipoEvento.QUANTUM_EXPIRES:
      case TipoEvento.CORRIENDO_A_LISTO:
        return PrioridadEventoSimultaneo.EXPROPIACION;
      
      // Prioridad 4: Fin I/O (B→L)
      case TipoEvento.FIN_IO:
      case TipoEvento.BLOQUEADO_A_LISTO:
      case TipoEvento.IO_COMPLETA:
        return PrioridadEventoSimultaneo.FIN_IO;
      
      // Prioridad 5: Fin TIP (N→L)
      case TipoEvento.FIN_TIP:
      case TipoEvento.NUEVO_A_LISTO:
      case TipoEvento.ENTRA_SISTEMA:
        return PrioridadEventoSimultaneo.FIN_TIP;
      
      // Prioridad 6: Dispatch (L→C)
      case TipoEvento.DISPATCH:
      case TipoEvento.LISTO_A_CORRIENDO:
        return PrioridadEventoSimultaneo.DISPATCH;
      
      // Prioridad 10: Eventos de suspensión
      case TipoEvento.LISTO_A_LISTO_SUSPENDIDO:
      case TipoEvento.BLOQUEADO_A_BLOQUEADO_SUSPENDIDO:
      case TipoEvento.LISTO_SUSPENDIDO_A_LISTO:
      case TipoEvento.BLOQUEADO_SUSPENDIDO_A_BLOQUEADO:
        return PrioridadEventoSimultaneo.SUSPENSION;
      
      // Prioridad por defecto para eventos no críticos
      default:
        return PrioridadEventoSimultaneo.DEFAULT;
    }
  }
  
  /**
   * Comparador que implementa orden correcto de eventos simultáneos
   * 1. Por tiempo (ascendente)
   * 2. Por prioridad (ascendente - menor número = mayor prioridad)
   * 3. Por orden secundario (FIFO estable)
   */
  compare(otro: Evento): number {
    // Si no es EventoMejorado, usar comparación por tiempo únicamente
    if (!(otro instanceof EventoMejorado)) {
      return this.tiempo - otro.tiempo;
    }
    
    // Primero por tiempo
    if (this.tiempo !== otro.tiempo) {
      return this.tiempo - otro.tiempo;
    }
    
    // En caso de empate temporal, por prioridad
    if (this.prioridad !== otro.prioridad) {
      return this.prioridad - otro.prioridad;
    }
    
    // En caso de empate de prioridad, por orden de creación (FIFO estable)
    return this.ordenSecundario - otro.ordenSecundario;
  }
  
  /**
   * Convierte a string para debugging
   */
  toString(): string {
    return `EventoMejorado{t=${this.tiempo}, tipo=${this.tipo}, proceso=${this.idProceso}, prio=${this.prioridad}, seq=${this.ordenSecundario}}`;
  }
  
  /**
   * Resetea el contador de secuencia (útil para testing)
   */
  static resetContador(): void {
    EventoMejorado.contadorSecuencia = 0;
  }
  
  /**
   * Verifica si este evento puede causar expropiación
   */
  puedeExpropiacion(): boolean {
    return this.tipo === TipoEvento.JOB_LLEGA || 
           this.tipo === TipoEvento.FIN_IO ||
           this.tipo === TipoEvento.BLOQUEADO_A_LISTO ||
           this.tipo === TipoEvento.QUANTUM_EXPIRES;
  }
  
  /**
   * Verifica si este evento es instantáneo (Δt=0)
   */
  esInstantaneo(): boolean {
    return this.tipo === TipoEvento.FIN_TIP ||
           this.tipo === TipoEvento.FIN_IO ||
           this.tipo === TipoEvento.FIN_RAFAGA_CPU ||
           this.tipo === TipoEvento.CORRIENDO_A_BLOQUEADO ||
           this.tipo === TipoEvento.BLOQUEADO_A_LISTO ||
           this.tipo === TipoEvento.NUEVO_A_LISTO;
  }
}
