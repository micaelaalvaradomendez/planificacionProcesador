export enum EstadoProceso {
  NUEVO = 'NUEVO',
  LISTO = 'LISTO',
  CORRIENDO = 'CORRIENDO',        // Cambio: más fiel a la teoría
  BLOQUEADO = 'BLOQUEADO',
  TERMINADO = 'TERMINADO'
}

export enum TipoEvento {
  // eventos principales del sistema
  JOB_LLEGA = 'JOB_LLEGA',                    // Llegada de trabajo al sistema
  ENTRA_SISTEMA = 'ENTRA_SISTEMA',            // Admisión al sistema (Nuevo → Listo)
  DISPATCH = 'DISPATCH',                      // Activación del dispatcher
  FIN_RAFAGA_CPU = 'FIN_RAFAGA_CPU',         // Finalización de ráfaga de CPU
  QUANTUM_EXPIRES = 'QUANTUM_EXPIRES',        // Expiración del quantum (Round Robin)
  IO_COMPLETA = 'IO_COMPLETA',               // Finalización de operación E/S
  IO_INTERRUPCION_ATENDIDA = 'IO_INTERRUPCION_ATENDIDA',
  PROCESO_TERMINA = 'PROCESO_TERMINA',
  // transiciones de estado (según teoría de SO)
  CORRIENDO_A_TERMINADO = 'CORRIENDO_A_TERMINADO',   // Corriendo → Terminado
  CORRIENDO_A_BLOQUEADO = 'CORRIENDO_A_BLOQUEADO',   // Corriendo → Bloqueado (por E/S)
  CORRIENDO_A_LISTO = 'CORRIENDO_A_LISTO',           // Corriendo → Listo (expropiación)
  BLOQUEADO_A_LISTO = 'BLOQUEADO_A_LISTO',           // Bloqueado → Listo (fin E/S)
  NUEVO_A_LISTO = 'NUEVO_A_LISTO',                   // Nuevo → Listo (admisión)
  LISTO_A_CORRIENDO = 'LISTO_A_CORRIENDO'            // Listo → Corriendo (dispatch)
}

export type Algoritmo = 'FCFS' | 'SJF' | 'SRTF' | 'RR' | 'PRIORITY';

export interface ProcesData {
  nombre: string;
  arribo: number;
  rafagasCPU: number;
  duracionCPU: number;
  duracionIO: number;
  prioridad: number; // mayor número = mayor prioridad
}

export interface ParametrosProces {
  TIP: number; // Tiempo que utiliza el SO para aceptar nuevos procesos
  TFP: number; // Tiempo que utiliza el SO para terminar procesos
  TCP: number; // Tiempo de conmutación entre procesos (context switching)
  quantum?: number; // Rodaja de tiempo para Round Robin
  policy: Algoritmo;
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
