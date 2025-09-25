/**
 * Tipos simplificados para la interfaz de usuario
 */

import type { Policy } from '$lib/domain/types';

export interface ProcesoSimple {
  nombre: string;
  llegada: number;
  rafaga: number;
  prioridad: number;
}

export interface ConfiguracionSimulacion {
  policy: Policy;
  tip: number;
  tfp: number;
  tcp: number;
  quantum?: number;
}

export interface ResultadoSimulacion {
  events: any[];
  metrics: any;
  warnings: string[];
  tiempoTotal: number;
}

export interface DatosSimulacionCompleta {
  procesos: ProcesoSimple[];
  configuracion: ConfiguracionSimulacion;
  resultados: ResultadoSimulacion;
  timestamp: string;
}
