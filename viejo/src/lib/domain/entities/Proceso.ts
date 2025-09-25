import { EstadoProceso, type ProcesData } from '../types';

export class Proceso {
  public readonly id: string;
  public readonly arribo: number;        // arribo
  public readonly rafagasCPU: number;        // # de ráfagas CPU
  public readonly duracionCPU: number;   // duración de ráfaga de CPU
  public readonly duracionIO: number;    // duración de I/O
  public readonly prioridad: number;   // prioridad externa
  public readonly tamaño: number;      // tamaño en memoria (MB)
  // estado dinámico durante simulación
  public estado: EstadoProceso = EstadoProceso.NUEVO;
  public rafagasRestantes: number;
  public restanteCPU: number;
  public restanteIO: number;
  public restanteTotalCPU: number;
  // timestamps para métricas
  public inicioTIP?: number;   // tiempo de inicio proceso
  public finTIP?: number;      // fin de TIP
  public pendienteTFP: boolean = false; // tiempo fin proceso
  public inicio?: number;      // primer dispatch
  public fin?: number;     // tras TFP
  public ultimoDispatch?: number;
  // acumuladores de tiempo
  public tiempoListoTotal: number = 0;
  public ultimoTiempoListo?: number;
  
  // campos adicionales para estrategias de scheduling
  public rafagasCompletadas: number = 0;
  public tiempoCPUConsumido: number = 0;
  public tiempoUltimoReady?: number;

  constructor(data: ProcesData) {
    this.id = data.nombre;
    this.arribo = data.arribo;
    this.rafagasCPU= data.rafagasCPU;
    this.duracionCPU = data.duracionCPU;
    this.duracionIO = data.duracionIO;
    this.prioridad = data.prioridad;
    this.tamaño = data.tamaño || 50; // 50MB por defecto
    // estado dinámico
    this.rafagasRestantes = this.rafagasCPU;
    this.restanteCPU = this.duracionCPU;
    this.restanteIO = 0;
    this.restanteTotalCPU = this.rafagasCPU * this.duracionCPU;
    
    // inicializar campos adicionales
    this.rafagasCompletadas = 0;
    this.tiempoCPUConsumido = 0;
  }

 iniciarTIP(tiempoActual: number): void {this.inicioTIP = tiempoActual;}


  finalizarTIP(tiempoActual: number): void {
    this.finTIP = tiempoActual;
    this.estado = EstadoProceso.LISTO;
    this.ultimoTiempoListo = tiempoActual;
    // CRÍTICO: Según consigna TP - "Un proceso no computará estado de listo 
    // hasta que no haya cumplido su TIP"
    // Por eso iniciamos ultimoTiempoListo aquí, no antes
  }

  activar(tiempoActual: number): void {
    if (this.estado !== EstadoProceso.LISTO) {
      throw new Error(`No se puede activar el proceso ${this.id} desde el estado ${this.estado}`);
    }
    // acumular tiempo en LISTO (tiempo de espera)
    if (this.ultimoTiempoListo !== undefined && this.finTIP !== undefined) {
      this.tiempoListoTotal += tiempoActual - this.ultimoTiempoListo;
    }
    this.estado = EstadoProceso.CORRIENDO;
    this.ultimoDispatch = tiempoActual;
    // primer dispatch → para calcular tiempo de respuesta
    if (!this.inicio) {this.inicio = tiempoActual;}
  }

  expropiar(tiempoActual: number): void {
    if (this.estado !== EstadoProceso.CORRIENDO) {
      throw new Error(`No se puede expropiar el proceso ${this.id} desde el estado ${this.estado}`);
    }
    this.estado = EstadoProceso.LISTO;
    this.ultimoTiempoListo = tiempoActual;
  }

  bloquearIO(tiempoActual: number): void {
    if (this.estado !== EstadoProceso.CORRIENDO) {
      throw new Error(`No se puede bloquear por I/O el proceso ${this.id} desde el estado ${this.estado}`);
    }
    this.estado = EstadoProceso.BLOQUEADO;
    this.restanteIO = this.duracionIO;
  }

  completarCPU(tiempoActual: number): void {
    // Descontar solo lo que queda de la ráfaga actual
    // (si fue expropiado, ya se descontó parte en procesarCPU)
    this.restanteTotalCPU -= this.restanteCPU;
    
    this.rafagasRestantes--;
    this.rafagasCompletadas++; // incrementar ráfagas completadas
    this.restanteCPU = this.duracionCPU; // Reset para próxima ráfaga

    if (this.rafagasRestantes > 0) {
      this.bloquearIO(tiempoActual);
    } else {
      this.estado = EstadoProceso.TERMINADO;
      this.pendienteTFP = true;
    }
  }

  completarIO(tiempoActual: number): void {
    if (this.estado !== EstadoProceso.BLOQUEADO) {
      throw new Error(`No se puede finalizar I/O del proceso ${this.id} desde el estado ${this.estado}`);
    }
    this.restanteIO = 0;
    this.estado = EstadoProceso.LISTO;
    this.ultimoTiempoListo = tiempoActual;
    // NOTA: Según consigna TP - "Un proceso pasa de bloqueado a listo instantáneamente 
    // y consume 0 unidades de tiempo (este tiempo lo consideramos dentro del TCP posterior)"
  }

  terminar(tiempoActual: number): void {
    this.fin = tiempoActual;
    this.pendienteTFP = false;
  }

  procesarCPU(tiempo: number): void {
    const tiempoReal = Math.min(tiempo, this.restanteCPU);
    this.restanteCPU = Math.max(0, this.restanteCPU - tiempo);
    this.restanteTotalCPU = Math.max(0, this.restanteTotalCPU - tiempoReal);
    this.tiempoCPUConsumido += tiempoReal; // acumular tiempo consumido
  }
  procesarIO(tiempo: number): void {this.restanteIO = Math.max(0, this.restanteIO - tiempo);}

  // consultas 

  estaCPUCompleta(): boolean {return this.restanteCPU <= 0;}
  estaIOCompleto(): boolean {return this.restanteIO <= 0;}
  estaCompleto(): boolean {return this.rafagasRestantes <= 0;}
  tiempoTotalCPU(): number {return this.rafagasCPU * this.duracionCPU;}

  clone(): Proceso {
    const copia = new Proceso({
      nombre: this.id,
      arribo: this.arribo,
      rafagasCPU: this.rafagasCPU,
      duracionCPU: this.duracionCPU,
      duracionIO: this.duracionIO,
      prioridad: this.prioridad
    });

    copia.estado = this.estado;
    copia.rafagasRestantes = this.rafagasRestantes;
    copia.restanteCPU = this.restanteCPU;
    copia.restanteIO = this.restanteIO;
    copia.restanteTotalCPU = this.restanteTotalCPU;
    copia.inicioTIP = this.inicioTIP;
    copia.finTIP = this.finTIP;
    copia.pendienteTFP = this.pendienteTFP;
    copia.inicio = this.inicio;
    copia.fin = this.fin;
    copia.ultimoDispatch = this.ultimoDispatch;
    copia.tiempoListoTotal = this.tiempoListoTotal;
    copia.ultimoTiempoListo = this.ultimoTiempoListo;
    
    // copiar campos adicionales
    copia.rafagasCompletadas = this.rafagasCompletadas;
    copia.tiempoCPUConsumido = this.tiempoCPUConsumido;
    copia.tiempoUltimoReady = this.tiempoUltimoReady;
    
    return copia;
  }
}