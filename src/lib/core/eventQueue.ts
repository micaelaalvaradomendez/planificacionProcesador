/**
 * Cola de eventos con prioridad para el motor de simulación
 * Implementa el orden de procesamiento específico según la consigna del integrador
 */

import type { EventoInterno, TipoEventoInterno } from './state';

/**
 * Prioridades según la consigna del integrador:
 * 1. Corriendo a Terminado (FinRafagaCPU cuando es última ráfaga)
 * 2. Corriendo a Bloqueado (FinRafagaCPU cuando NO es última ráfaga)  
 * 3. Corriendo a Listo (AgotamientoQuantum)
 * 4. Bloqueado a Listo (FinES)
 * 5. Nuevo a Listo (Arribo, FinTIP)
 * 6. Despacho de Listo a Corriendo (Despacho)
 * 7. Cierre contable posterior (FinTFP)
 */
const PRIORIDADES_EVENTO: Record<TipoEventoInterno, number> = {
  'FinRafagaCPU': 1, // Se determinará dinámicamente si es terminado (1) o bloqueado (2)
  'AgotamientoQuantum': 3,
  'FinES': 4,
  'Arribo': 5,
  'FinTIP': 5, // Nuevo a Listo (fin del tiempo de incorporación)
  'Despacho': 6,
  'FinTFP': 7  // Cierre contable - No compite con admisión/arribos
};

export interface EventoConPrioridad extends EventoInterno {
  secuencia: number; // Para mantener orden de inserción en caso de empate
  esUltimaRafaga?: boolean; // Para diferenciar terminado vs bloqueado en FinRafagaCPU
}

export class ColaEventos {
  private eventos: EventoConPrioridad[] = [];
  private contadorSecuencia = 0;

  /**
   * Agrega un evento a la cola manteniendo el orden de prioridad
   */
  agregar(evento: EventoInterno, esUltimaRafaga?: boolean): void {    
    const eventoConPrioridad: EventoConPrioridad = {
      ...evento,
      secuencia: this.contadorSecuencia++,
      esUltimaRafaga
    };

    this.eventos.push(eventoConPrioridad);
    this.reordenar();
  }

  /**
   * Obtiene y remueve el próximo evento a procesar
   */
  siguiente(): EventoConPrioridad | undefined {
    return this.eventos.shift();
  }

  /**
   * Verifica si la cola está vacía
   */
  estaVacia(): boolean {
    return this.eventos.length === 0;
  }

  /**
   * Obtiene el tamaño de la cola
   */
  tamaño(): number {
    return this.eventos.length;
  }

  /**
   * Obtiene todos los eventos sin removerlos (para debug)
   */
  verEventos(): EventoConPrioridad[] {
    return [...this.eventos];
  }

  /**
   * Reordena la cola según las prioridades especificadas
   */
  private reordenar(): void {
    this.eventos.sort((a, b) => {
      // 1. Primero por tiempo
      if (a.tiempo !== b.tiempo) {
        return a.tiempo - b.tiempo;
      }

      // 2. Luego por prioridad de tipo de evento
      const prioridadA = this.obtenerPrioridad(a);
      const prioridadB = this.obtenerPrioridad(b);
      
      if (prioridadA !== prioridadB) {
        return prioridadA - prioridadB;
      }

      // 3. Para eventos del mismo tipo y tiempo: tie-break estable
      if (a.tipo === b.tipo) {
        // Para eventos de arribo simultáneo: ordenar por nombre del proceso (lexicográfico)
        if (a.tipo === 'Arribo' || a.tipo === 'FinTIP' || a.tipo === 'FinTFP') {
          const procesoA = a.proceso || '';
          const procesoB = b.proceso || '';
          return procesoA.localeCompare(procesoB);
        }
        
        // Para otros eventos del mismo tipo: mantener orden de inserción (FIFO)
        return a.secuencia - b.secuencia;
      }

      // 4. Para eventos de diferentes tipos pero misma prioridad: por secuencia
      return a.secuencia - b.secuencia;
    });
  }

  /**
   * Obtiene la prioridad de un evento específico
   */
  private obtenerPrioridad(evento: EventoConPrioridad): number {
    switch (evento.tipo) {
      case 'FinRafagaCPU':
        // Determinar si es corriendo a terminado (1) o corriendo a bloqueado (2)
        return evento.esUltimaRafaga ? 1 : 2;
      
      default:
        // Usar la constante PRIORIDADES_EVENTO para mantener consistencia
        return PRIORIDADES_EVENTO[evento.tipo] || 99;
    }
  }

  /**
   * Limpia todos los eventos de la cola
   */
  limpiar(): void {
    this.eventos = [];
    this.contadorSecuencia = 0;
  }

  /**
   * Agrega múltiples eventos de una vez
   */
  agregarMultiples(eventos: Array<{ evento: EventoInterno; esUltimaRafaga?: boolean }>): void {
    for (const { evento, esUltimaRafaga } of eventos) {
      const eventoConPrioridad: EventoConPrioridad = {
        ...evento,
        secuencia: this.contadorSecuencia++,
        esUltimaRafaga
      };
      this.eventos.push(eventoConPrioridad);
    }
    this.reordenar();
  }

  /**
   * Busca eventos de un tipo específico (para debugging/testing)
   */
  buscarEventosTipo(tipo: TipoEventoInterno): EventoConPrioridad[] {
    return this.eventos.filter(e => e.tipo === tipo);
  }

  /**
   * Busca eventos de un proceso específico (para debugging/testing)
   */
  buscarEventosProceso(nombreProceso: string): EventoConPrioridad[] {
    return this.eventos.filter(e => e.proceso === nombreProceso);
  }
}
