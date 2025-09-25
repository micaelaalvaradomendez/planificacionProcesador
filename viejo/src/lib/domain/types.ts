export enum EstadoProceso {
  NUEVO = 'NUEVO',
  LISTO = 'LISTO',
  CORRIENDO = 'CORRIENDO',
  BLOQUEADO = 'BLOQUEADO',
  TERMINADO = 'TERMINADO',
  
  // Estados suspendidos (punto 4 del análisis)
  LISTO_SUSPENDIDO = 'LISTO_SUSPENDIDO',        // Ready/Suspend - sin memoria pero puede ejecutar
  BLOQUEADO_SUSPENDIDO = 'BLOQUEADO_SUSPENDIDO' // Blocked/Suspend - sin memoria y esperando I/O
}

/**
 * Enum de tipos de eventos con orden de prioridad para eventos simultáneos
 * Según diagrama de secuencia: 1-FIN_PROCESO, 2-FIN_RAFAGA_CPU, 3-EXPROPIACION, 4-FIN_IO, 5-FIN_TIP, 6-DISPATCH
 */
export enum TipoEvento {
  // Evento prioridad 0: Llegada al sistema
  JOB_LLEGA = 'JOB_LLEGA',                    // Llegada de trabajo al sistema (ARRIBO)
  
  // Evento prioridad 1: Finalización de proceso (C→T)
  FIN_PROCESO = 'FIN_PROCESO',                // Proceso termina (CORRIENDO → TERMINADO)
  CORRIENDO_A_TERMINADO = 'CORRIENDO_A_TERMINADO',   // Alias para compatibilidad
  
  // Evento prioridad 2: Finalización de ráfaga CPU (C→B)
  FIN_RAFAGA_CPU = 'FIN_RAFAGA_CPU',         // Finalización de ráfaga de CPU (inicio I/O)
  CORRIENDO_A_BLOQUEADO = 'CORRIENDO_A_BLOQUEADO',   // Corriendo → Bloqueado (por E/S)
  
  // Evento prioridad 3: Expropiación (C→L)
  EXPROPIACION = 'EXPROPIACION',             // Expropiación genérica
  QUANTUM_EXPIRES = 'QUANTUM_EXPIRES',        // Expiración del quantum (Round Robin)
  CORRIENDO_A_LISTO = 'CORRIENDO_A_LISTO',           // Corriendo → Listo (expropiación)
  
  // Evento prioridad 4: Fin I/O (B→L)
  FIN_IO = 'FIN_IO',                         // Finalización de operación E/S
  BLOQUEADO_A_LISTO = 'BLOQUEADO_A_LISTO',           // Bloqueado → Listo (fin E/S)
  IO_COMPLETA = 'IO_COMPLETA',               // Alias para compatibilidad
  
  // Evento prioridad 5: Fin TIP (N→L)
  FIN_TIP = 'FIN_TIP',                       // Finalización TIP (NUEVO → LISTO)
  NUEVO_A_LISTO = 'NUEVO_A_LISTO',                   // Nuevo → Listo (admisión)
  ENTRA_SISTEMA = 'ENTRA_SISTEMA',            // Alias para compatibilidad
  
  // Evento prioridad 6: Dispatch (L→C)
  DISPATCH = 'DISPATCH',                      // Activación del dispatcher
  LISTO_A_CORRIENDO = 'LISTO_A_CORRIENDO',           // Listo → Corriendo (dispatch)
  
  // Eventos de suspensión por memoria (prioridad 10)
  LISTO_A_LISTO_SUSPENDIDO = 'LISTO_A_LISTO_SUSPENDIDO',         // Listo → Listo/Suspendido
  BLOQUEADO_A_BLOQUEADO_SUSPENDIDO = 'BLOQUEADO_A_BLOQUEADO_SUSPENDIDO', // Bloqueado → Bloqueado/Suspendido
  LISTO_SUSPENDIDO_A_LISTO = 'LISTO_SUSPENDIDO_A_LISTO',         // Listo/Suspendido → Listo
  BLOQUEADO_SUSPENDIDO_A_BLOQUEADO = 'BLOQUEADO_SUSPENDIDO_A_BLOQUEADO',  // Bloqueado/Suspendido → Bloqueado
  
  // Eventos legacy para compatibilidad
  IO_INTERRUPCION_ATENDIDA = 'IO_INTERRUPCION_ATENDIDA',
  PROCESO_TERMINA = 'PROCESO_TERMINA'
}

export type Algoritmo = 'FCFS' | 'SJF' | 'SRTF' | 'RR' | 'PRIORITY';

export interface ProcesData {
  nombre: string;
  arribo: number;
  rafagasCPU: number;
  duracionCPU: number;
  duracionIO: number;
  prioridad: number; // mayor número = mayor prioridad
  tamaño?: number;    // tamaño en memoria (MB) - opcional para compatibilidad
}

export interface ParametrosProces {
  TIP: number; // Tiempo que utiliza el SO para aceptar nuevos procesos
  TFP: number; // Tiempo que utiliza el SO para terminar procesos
  TCP: number; // Tiempo de conmutación entre procesos (context switching)
  quantum?: number; // Rodaja de tiempo para Round Robin
  policy: Policy;
}

export interface ParametrosSimulacion {
  TIP: number; // Tiempo para aceptar nuevos procesos (Nuevo → Listo)
  TFP: number; // Tiempo para terminar procesos (después de completar todas las ráfagas)
  TCP: number; // Tiempo de conmutación entre procesos
  quantum?: number; // Rodaja de tiempo (Round Robin)
  algoritmo: Algoritmo;
}

export interface CargaTrabajo {
  procesos: ProcesData[];
  parametros: ParametrosProces;
}

export interface MetricaProceso {
  idProceso: string;
  tiempoArribo: number;
  tiempoInicio: number;              // Primer dispatch
  tiempoFinalizacion: number;        // Tras completar TFP (incluye TFP)
  TRp: number;                       // Tiempo de Retorno = desde arribo hasta terminar (después de TFP, incluyéndolo)
  TRn: number;                       // TRp / tiempo efectivo de CPU que utilizó  
  tiempoEnListo: number;             // Tiempo acumulado en estado LISTO (después de TIP)
  tiempoRespuesta: number;           // Primer dispatch - arribo
}

export interface TandaMetricas {
  TRt: number;                        // Desde que arriba el primer proceso hasta último TFP (incluyendo TFP)
  TMRt: number;                       // Suma de TRp de todos los procesos / cantidad de procesos
  promedioTRn: number;                // Promedio de Tiempos de Retorno Normalizados
  promedioTiempoEnListo: number;      // Promedio de tiempo de espera en LISTO
  promedioTiempoRespuesta: number;    // Promedio de tiempo de respuesta
}

// Estadísticas de utilización del procesador
export interface EstadisticasCPU {
  tiempoTotal: number;                // Duración total de la simulación
  tiempoInactivo: number;             // CPU idle (todos los procesos bloqueados/terminados)
  tiempoOS: number;                   // Overhead del SO (TCP + TFP + TIP)
  tiempoUsuario: number;              // Tiempo efectivo ejecutando código de usuario
  porcentajeInactivo: number;         // % tiempo idle (objetivo: minimizar)
  porcentajeOS: number;               // % overhead del sistema
  porcentajeUsuario: number;          // % utilización productiva (objetivo: maximizar)
}

export interface EstadisticasCompletas {
  metricasProcesos: MetricaProceso[];
  metricasTanda: TandaMetricas;
  estadisticasCPU: EstadisticasCPU;
}

// ==========================================
// TIPOS MODERNOS PARA I/O DEL SIMULADOR
// ==========================================

/**
 * Tipos modernos para entrada/salida del simulador
 * Compatible con los tipos existentes arriba
 */

export type Policy = 'FCFS' | 'PRIORITY' | 'RR' | 'SPN' | 'SRTN';

export interface ProcessSpec {
  id: string;
  arribo: number;
  rafagasCPU: number;
  duracionCPU: number;
  duracionIO: number;
  prioridad: number; // 1..100 (mayor = más prioridad)
}

export interface RunConfig {
  policy: Policy;
  tip: number;   // tiempo de ingreso al sistema
  tfp: number;   // tiempo de finalización de proceso
  tcp: number;   // tiempo de cambio de contexto
  quantum?: number; // requerido si policy=RR
  maxIterations?: number; // límite de iteraciones (default: 10000), 0 = sin límite
}

export interface Workload {
  workloadName?: string;
  processes: ProcessSpec[];
  config: RunConfig;
}

export interface MetricsPerProcess {
  name: string;
  tiempoRetorno: number;        // TRp
  tiempoRetornoNormalizado: number;     // TRn
  tiempoEnListo: number;        // tiempo en estado listo
}

export interface BatchMetrics {
  tiempoRetornoTanda: number;          // TRt
  tiempoMedioRetorno: number;    // TM_Rt
  cpuOcioso: number;          // tiempo ocioso
  cpuSO: number;            // TIP + TFP + TCP
  cpuProcesos: number;          // tiempo de CPU efectiva de procesos
  porcentajeCpuOcioso?: number;
  porcentajeCpuSO?: number;
  porcentajeCpuProcesos?: number;
}

export interface Metrics {
  porProceso: MetricsPerProcess[];
  tanda: BatchMetrics;
}

export type EventType =
  | 'ARRIBO_TRABAJO'
  | 'INCORPORACION_SISTEMA'     // NUEVO->LISTO tras TIP
  | 'DESPACHO'                  // LISTO->EJECUTANDO con TCP
  | 'CAMBIO_CONTEXTO'           // cobro de TCP
  | 'INICIO_RAFAGA_CPU'
  | 'FIN_RAFAGA_CPU'
  | 'AGOTAMIENTO_QUANTUM'
  | 'INICIO_ES'
  | 'FIN_ES'
  | 'ATENCION_INTERRUPCION_ES'
  | 'EXPROPIACION'              // cuando un proceso expropia a otro
  | 'INICIO_TERMINACION'        // inicio del proceso de terminación (TFP)
  | 'TERMINACION_PROCESO';

export interface SimEvent {
  tiempo: number;
  tipo: TipoEvento;  // Cambiado de EventType a TipoEvento para consistencia
  proceso: string;   // nombre/id del proceso; para eventos globales podés usar '-'
  extra?: string;    // TIP=, TFP=, TCP=, restante=, etc.
}

export interface GanttSlice {
  process: string;        // nombre o 'SO'/'OCIOSO'/'CTX'
  tStart: number;
  tEnd: number;
  kind: 'CPU' | 'ES' | 'TIP' | 'TFP' | 'TCP' | 'OCIOSO';
}

// Mapeos para compatibilidad con tipos existentes
export const POLICY_MAP: Record<Policy, Algoritmo> = {
  'FCFS': 'FCFS',
  'PRIORITY': 'PRIORITY', 
  'RR': 'RR',
  'SPN': 'SJF',
  'SRTN': 'SRTF'
};

export const ALGORITHM_MAP: Record<Algoritmo, Policy> = {
  'FCFS': 'FCFS',
  'PRIORITY': 'PRIORITY',
  'RR': 'RR', 
  'SJF': 'SPN',
  'SRTF': 'SRTN'
};

// ==========================================
// INTERFACES PARA ADAPTADOR SIMULADOR DOMINIO
// ==========================================

export interface MetricasProceso {
  id: string;
  arribo: number;
  inicio: number;
  fin: number;
  tiempoTurnaround: number;
  tiempoEspera: number;
  tiempoRespuesta: number;
  tiempoServicio: number;
  ratioRespuesta: number;
  estado: EstadoProceso;
}

export interface ResultadosSimulacion {
  algoritmo: string;
  parametros: ParametrosSimulacion;
  procesos: MetricasProceso[];
  metricas: any;
  timeline: any[];
  estadisticas: any;
  logger: any[];
}

// Re-export entidades del dominio
export * from './entities/Proceso';
export * from './entities/Simulador';
export * from './algorithms/Scheduler';
