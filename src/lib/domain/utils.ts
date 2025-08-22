import type { Proceso } from './entities/Proceso';

/**
 * Cola de prioridad genérica para eventos y procesos
 */
export class PriorityQueue<T> {
  private elementos: T[] = [];
  
  constructor(private funcionComparacion: (a: T, b: T) => number) {}

  enqueue(elemento: T): void {
    this.elementos.push(elemento);
    this.elementos.sort(this.funcionComparacion);
  }

  dequeue(): T | undefined {
    return this.elementos.shift();
  }

  peek(): T | undefined {
    return this.elementos[0];
  }

  isEmpty(): boolean {
    return this.elementos.length === 0;
  }

  size(): number {
    return this.elementos.length;
  }

  toArray(): T[] {
    return [...this.elementos];
  }

  clear(): void {
    this.elementos = [];
  }

  remove(predicado: (elemento: T) => boolean): T | undefined {
    const indice = this.elementos.findIndex(predicado);
    if (indice !== -1) {
      return this.elementos.splice(indice, 1)[0];
    }
    return undefined;
  }
}

/**
 * Cola FIFO simple para procesos
 */
export class ColaProcesos {
  private elementos: Proceso[] = [];

  enqueue(proceso: Proceso): void {
    this.elementos.push(proceso);
  }

  dequeue(): Proceso | undefined {
    return this.elementos.shift();
  }

  peek(): Proceso | undefined {
    return this.elementos[0];
  }

  isEmpty(): boolean {
    return this.elementos.length === 0;
  }

  size(): number {
    return this.elementos.length;
  }

  toArray(): Proceso[] {
    return [...this.elementos];
  }

  clear(): void {
    this.elementos = [];
  }

  remove(idProceso: string): Proceso | undefined {
    const indice = this.elementos.findIndex(p => p.id === idProceso);
    if (indice !== -1) {
      return this.elementos.splice(indice, 1)[0];
    }
    return undefined;
  }

  contains(idProceso: string): boolean {
    return this.elementos.some(p => p.id === idProceso);
  }
}

/**
 * Utilidades para manejo de tiempo
 */
export class TimeUtils {
  /**
   * Formatea tiempo en unidades legibles
   */
  static formatTime(time: number): string {
    if (time === 0) return '0';
    if (time < 1) return `${time.toFixed(3)}`;
    return time.toString();
  }

  /**
   * Calcula tiempo transcurrido entre dos puntos
   */
  static elapsed(start: number, end: number): number {
    return Math.max(0, end - start);
  }

  /**
   * Redondea tiempo a precisión especificada
   */
  static round(time: number, precision: number = 3): number {
    return Math.round(time * Math.pow(10, precision)) / Math.pow(10, precision);
  }
}

/**
 * Utilidades para comparación de procesos
 */
export class ProcessComparators {
  /**
   * Comparador para FCFS (por tiempo de arribo)
   */
  static fcfs(a: Proceso, b: Proceso): number {
    return a.arribo - b.arribo;
  }

  /**
   * Comparador para SJF/SPN (por tiempo total de CPU)
   */
  static sjf(a: Proceso, b: Proceso): number {
    return a.restanteTotalCPU - b.restanteTotalCPU;
  }

  /**
   * Comparador para SRTF/SRTN (por tiempo restante)
   */
  static srtf(a: Proceso, b: Proceso): number {
    return a.restanteTotalCPU - b.restanteTotalCPU;
  }

  /**
   * Comparador para prioridad (mayor valor = mayor prioridad)
   */
  static priority(a: Proceso, b: Proceso): number {
    // Mayor prioridad primero (orden descendente)
    const priorityDiff = b.prioridad - a.prioridad;
    if (priorityDiff !== 0) return priorityDiff;
    
    // En caso de empate, usar FCFS
    return ProcessComparators.fcfs(a, b);
  }

  /**
   * Comparador para Round Robin (FCFS básicamente)
   */
  static roundRobin(a: Proceso, b: Proceso): number {
    return ProcessComparators.fcfs(a, b);
  }
}

/**
 * Utilidades para validación
 */
export class ValidationUtils {
  /**
   * Valida que un proceso tenga datos válidos
   */
  static validateProcess(process: Proceso): string[] {
    const errors: string[] = [];

    if (!process.id || process.id.trim() === '') {
      errors.push('El ID del proceso no puede estar vacío');
    }

    if (process.arribo < 0) {
      errors.push('El tiempo de arribo debe ser mayor o igual a 0');
    }

    if (process.rafagasCPU <= 0) {
      errors.push('El número de ráfagas debe ser mayor a 0');
    }

    if (process.duracionCPU <= 0) {
      errors.push('La duración de ráfaga de CPU debe ser mayor a 0');
    }

    if (process.duracionIO < 0) {
      errors.push('La duración de ráfaga de I/O debe ser mayor o igual a 0');
    }

    if (process.prioridad < 1 || process.prioridad > 100) {
      errors.push('La prioridad debe estar entre 1 y 100');
    }

    return errors;
  }

  /**
   * Valida parámetros de simulación
   */
  static validateSimulationParams(params: { TIP: number; TFP: number; TCP: number; quantum?: number }): string[] {
    const errors: string[] = [];

    if (params.TIP < 0) {
      errors.push('TIP debe ser mayor o igual a 0');
    }

    if (params.TFP < 0) {
      errors.push('TFP debe ser mayor o igual a 0');
    }

    if (params.TCP < 0) {
      errors.push('TCP debe ser mayor o igual a 0');
    }

    if (params.quantum !== undefined && params.quantum <= 0) {
      errors.push('El quantum debe ser mayor a 0');
    }

    return errors;
  }
}

/**
 * Utilidades para logging y debug
 */
export class LogUtils {
  /**
   * Genera un ID único para eventos
   */
  static generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Formatea mensaje de log con timestamp
   */
  static formatLogMessage(level: 'INFO' | 'WARN' | 'ERROR', message: string, time?: number): string {
    const timestamp = time !== undefined ? `[t=${time}]` : `[${new Date().toISOString()}]`;
    return `${timestamp} ${level}: ${message}`;
  }
}
