/**
 * Helpers para Costos del Sistema Operativo (TIP/TFP/TCP)
 * Implementa las sub-secuencias de los diagramas de secuencia
 */

import type { Proceso } from '../entities/Proceso';
import { TipoEvento, EstadoProceso } from '../types';
import { EventoMejorado } from './EventoMejorado';

/**
 * Helper para aplicar TIP (Tiempo Ingreso Proceso)
 * NUEVO → estado intermedio (durante TIP) → programa FIN_TIP
 */
export function aplicarTIP(
  proceso: Proceso, 
  tiempoActual: number, 
  tip: number,
  colaEventos: any // PriorityQueue<EventoMejorado>
): void {
  // El proceso permanece en estado NUEVO durante TIP
  // Se programa FIN_TIP para completar transición N→L
  const eventoFinTIP = new EventoMejorado(
    tiempoActual + tip,
    TipoEvento.FIN_TIP,
    proceso.id,
    `TIP aplicado (+${tip}ms)`
  );
  
  colaEventos.enqueue(eventoFinTIP);
}

/**
 * Helper para aplicar TCP (Tiempo Cambio Contexto)
 * Solo se aplica en transición L→C (LISTO → CORRIENDO)
 */
export function aplicarTCP(
  proceso: Proceso,
  tiempoActual: number,
  tcp: number,
  colaEventos: any // PriorityQueue<EventoMejorado>
): number {
  // TCP se consume inmediatamente
  // Retorna el tiempo después del TCP para programar siguiente evento
  const tiempoDespuesTCP = tiempoActual + tcp;
  
  // El proceso ya está en estado CORRIENDO después del TCP
  proceso.estado = EstadoProceso.CORRIENDO;
  
  return tiempoDespuesTCP;
}

/**
 * Helper para aplicar TFP (Tiempo Finalización Proceso)
 * CORRIENDO → estado intermedio (durante TFP) → TERMINADO
 */
export function aplicarTFP(
  proceso: Proceso,
  tiempoActual: number,
  tfp: number,
  colaEventos: any // PriorityQueue<EventoMejorado>
): void {
  // Programar finalización definitiva después de TFP
  const eventoTerminacion = new EventoMejorado(
    tiempoActual + tfp,
    TipoEvento.FIN_PROCESO,
    proceso.id,
    `TFP aplicado (+${tfp}ms)`
  );
  
  colaEventos.enqueue(eventoTerminacion);
  
  // El proceso pasa a estado intermedio (técnicamente aún CORRIENDO hasta completar TFP)
}

/**
 * Verifica si un evento requiere aplicación de TCP
 */
export function requiereTCP(tipoEvento: TipoEvento): boolean {
  return tipoEvento === TipoEvento.DISPATCH || 
         tipoEvento === TipoEvento.LISTO_A_CORRIENDO;
}

/**
 * Verifica si un evento requiere aplicación de TIP
 */
export function requiereTIP(tipoEvento: TipoEvento): boolean {
  return tipoEvento === TipoEvento.JOB_LLEGA;
}

/**
 * Verifica si un evento requiere aplicación de TFP
 */
export function requiereTFP(tipoEvento: TipoEvento): boolean {
  return tipoEvento === TipoEvento.FIN_PROCESO ||
         tipoEvento === TipoEvento.CORRIENDO_A_TERMINADO;
}

/**
 * Obtiene la descripción del costo aplicado
 */
export function obtenerDescripcionCosto(tipo: 'TIP' | 'TCP' | 'TFP', valor: number): string {
  switch (tipo) {
    case 'TIP': return `Tiempo Ingreso Proceso: ${valor}ms`;
    case 'TCP': return `Tiempo Cambio Contexto: ${valor}ms`;
    case 'TFP': return `Tiempo Finalización Proceso: ${valor}ms`;
    default: return `Costo SO: ${valor}ms`;
  }
}
