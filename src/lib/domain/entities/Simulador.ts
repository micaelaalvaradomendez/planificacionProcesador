import type { Proceso } from './Proceso';
import type { ParametrosSimulacion,EstadoProceso } from '../types';
import { TipoEvento } from '../types';
import { Evento } from '../events/gantt.types';
import { PriorityQueue } from '../utils';

/**
 * Simulador principal del sistema operativo
 * Maneja el reloj del sistema, CPU, colas y eventos
 */

export class Simulador {
  public tiempoActual: number = 0;
  public procesoActualCPU?: Proceso;
  public cpuOcupadaHasta: number = 0;
  public readyQueue: Proceso[] = [];
  public procesosBloqueados: Proceso[] = [];
  public procesosTerminados: Proceso[] = [];
  public todosLosProcesos: Map<string, Proceso> = new Map();
  public colaEventos: PriorityQueue<Evento>;
  public tiempoTotalInactivo: number = 0;
  public tiempoTotalSO: number = 0; // TIP + TFP + TCP
  public tiempoTotalUsuario: number = 0;

  // Log de eventos para bitácora
  public registroEventos: Evento[] = [];
  constructor(public readonly parametros: ParametrosSimulacion) {
    this.colaEventos = new PriorityQueue<Evento>((a, b) => a.compare(b));
  }

  agregarProceso(proceso: Proceso): void {
    this.todosLosProcesos.set(proceso.id, proceso);
    this.programarEvento(proceso.arribo, TipoEvento.JOB_LLEGA, proceso.id);
  }

  programarEvento(tiempo: number, tipo: TipoEvento, idProceso: string, descripcion?: string): void {
    const evento = new Evento(tiempo, tipo, idProceso, descripcion);
    this.colaEventos.enqueue(evento);
  }

  avanzarTiempo(nuevoTiempo: number): void {
    if (nuevoTiempo < this.tiempoActual) {
      throw new Error(`Cannot go back in time: ${nuevoTiempo} < ${this.tiempoActual}`);
    }
    if (this.cpuOcupadaHasta <= this.tiempoActual && !this.procesoActualCPU) {
      this.tiempoTotalInactivo += nuevoTiempo - this.tiempoActual;
    }
    this.tiempoActual = nuevoTiempo;
  }

  obtenerSiguienteEvento(): Evento | undefined {return this.colaEventos.peek();}

  procesarSiguienteEvento(): Evento | undefined {
    const evento = this.colaEventos.dequeue();
    if (!evento) return undefined;
    this.avanzarTiempo(evento.tiempo);
    this.registroEventos.push(evento);
    return evento;
  }

  esCpuDisponible(): boolean {return this.tiempoActual >= this.cpuOcupadaHasta && !this.procesoActualCPU;}

  ocuparCpu(hasta: number, actividad: 'TIP' | 'TFP' | 'TCP' | 'USER'): void {
    this.cpuOcupadaHasta = hasta;
    const duracion = hasta - this.tiempoActual;
    if (actividad === 'USER') {this.tiempoTotalUsuario += duracion;} 
    else { this.tiempoTotalSO += duracion;}
  }

  asignarProcesoACpu(proceso: Proceso): void {
    if (!this.esCpuDisponible()) {throw new Error('CPU not available');}
    this.procesoActualCPU = proceso;
    proceso.activar(this.tiempoActual);
  }

  removerProcesoDeCpu(): Proceso | undefined {
    const proceso = this.procesoActualCPU;
    this.procesoActualCPU = undefined;
    return proceso;
  }

  agregarAReadyQueue(proceso: Proceso): void {
    if (!this.readyQueue.find(p => p.id === proceso.id)) {
      this.readyQueue.push(proceso);
    }
  }

  removerDeReadyQueue(idProceso: string): Proceso | undefined {
    const indice = this.readyQueue.findIndex(p => p.id === idProceso);
    if (indice !== -1) {
      return this.readyQueue.splice(indice, 1)[0];
    }
    return undefined;
  }

  agregarAListaBloqueados(proceso: Proceso): void {
    if (!this.procesosBloqueados.find(p => p.id === proceso.id)) {
      this.procesosBloqueados.push(proceso);
    }
  }

  removerDeListaBloqueados(idProceso: string): Proceso | undefined {
    const indice = this.procesosBloqueados.findIndex(p => p.id === idProceso);
    if (indice !== -1) {
      return this.procesosBloqueados.splice(indice, 1)[0];
    }
    return undefined;
  }


  marcarComoTerminado(proceso: Proceso): void {
    if (!this.procesosTerminados.find(p => p.id === proceso.id)) {
      this.procesosTerminados.push(proceso);
    }
  }

  todosProcesosTerninados(): boolean {
    return this.procesosTerminados.length === this.todosLosProcesos.size;
  }

  obtenerProceso(idProceso: string): Proceso | undefined {
    return this.todosLosProcesos.get(idProceso);
  }

  obtenerProcesosPorEstado(estado: EstadoProceso): Proceso[] {
    return Array.from(this.todosLosProcesos.values()).filter(p => p.estado === estado);
  }

  reiniciar(): void {
    this.tiempoActual = 0;
    this.procesoActualCPU = undefined;
    this.cpuOcupadaHasta = 0;
    
    this.readyQueue = [];
    this.procesosBloqueados = [];
    this.procesosTerminados = [];
    this.todosLosProcesos.clear();
    
    this.colaEventos.clear();
    this.registroEventos = [];
    
    this.tiempoTotalInactivo = 0;
    this.tiempoTotalSO = 0;
    this.tiempoTotalUsuario = 0;
  }

  obtenerEstadisticas(): {
    tiempoActual: number;
    totalProcesos: number;
    cantidadEnReady: number;
    cantidadBloqueados: number;
    cantidadTerminados: number;
    utilizacionCpu: number;
    cantidadEventos: number;
  } {
    const tiempoTotal = this.tiempoActual || 1;
    
    return {
      tiempoActual: this.tiempoActual,
      totalProcesos: this.todosLosProcesos.size,
      cantidadEnReady: this.readyQueue.length,
      cantidadBloqueados: this.procesosBloqueados.length,
      cantidadTerminados: this.procesosTerminados.length,
      utilizacionCpu: ((this.tiempoTotalUsuario + this.tiempoTotalSO) / tiempoTotal) * 100,
      cantidadEventos: this.registroEventos.length
    };
  }

  obtenerSnapshot(): {
    tiempo: number;
    procesoActualCPU?: string;
    readyQueue: string[];
    procesosBloqueados: string[];
    procesosTerminados: string[];
  } {
    return {
      tiempo: this.tiempoActual,
      procesoActualCPU: this.procesoActualCPU?.id,
      readyQueue: this.readyQueue.map(p => p.id),
      procesosBloqueados: this.procesosBloqueados.map(p => p.id),
      procesosTerminados: this.procesosTerminados.map(p => p.id)
    };
  }
}
