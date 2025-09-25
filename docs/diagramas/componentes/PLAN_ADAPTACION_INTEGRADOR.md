# Plan de Adaptación - Motor Único y Event Log como Fuente de Verdad

## 🎯 Diagnóstico: Problemas en el Diagrama Actual

### ❌ **Problemas Críticos Identificados**

1. **Falta un único motor de eventos discretos en Dominio**
   - No se ve un "MotorSimulación" explícito con **Reloj**, **EventQueue** (estable), **Cpu**, **ReadyQueue** y **Scheduler**
   - Sin esto, la política se desparrama y aparecen inconsistencias
   - Motor debe ser único y centralizado

2. **Eventos del sistema no son fuente de verdad**
   - Falta el set **cerrado** de eventos con orden de desempate (mismo timestamp)
   - **Orden obligatorio**: **1) C→T**, **2) C→B**, **3) C→L**, **4) B→L**, **5) N→L**, **6) L→C**
   - Sin esto, Gantt y métricas divergen

3. **Overheads de SO dispersos en múltiples lugares**
   - TIP (N→L), TCP (L→C y expropiación C→L), TFP (C→T) deben cobrarse **sólo** dentro del motor
   - No en services ni UI - evita duplicación y inconsistencias

4. **RR sin programar Expiración de Quantum en el despacho**
   - RR debe **agendar** `QuantumExpires` al hacer `Dispatch`
   - Si no está en el diagrama, suele omitirse en implementación

5. **Application recalcula en lugar de mapear**
   - `BuildGantt` y `ComputeMetrics` deben **mapear** desde el **event log** únicamente
   - Nada de "optimizar visual" ni de "estimar" TIP/TFP/TCP

6. **Infra y UI conocen clases de dominio**
   - Parsers/Exporters/Componentes deben trabajar con **DTOs únicamente**
   - Faltan **puertos/DTOs** claros

---

## 🏗️ Arquitectura Corregida con Motor Único

## 🔥 PLAN DE ADAPTACIÓN CORREGIDO

### **Fase 1 — Dominio (Motor único)**

#### 1.1 Crear Simulation.ts (reemplaza cualquier motor paralelo en "core")
```bash
touch src/lib/domain/Simulation.ts
```

**Implementar motor único:**
```typescript
export class Simulation {
  private eventQueue: EventQueue;
  private cpu: Cpu;
  private readyQueue: ReadyQueue;
  private scheduler: Scheduler;
  private eventLog: EventoRegistrado[] = [];
  
  ejecutarSimulacion(workload: WorkloadDTO, config: ConfigDTO): ResultDTO {
    // 1. Inicializar componentes
    this.inicializar(config);
    
    // 2. Programar eventos de arribo
    this.programarArribos(workload.processes);
    
    // 3. Bucle principal eventos discretos
    while (!this.eventQueue.isEmpty()) {
      const eventos = this.eventQueue.extractEventsAt(this.currentTime);
      
      // Procesar en orden 1-6
      for (const evento of this.ordenarEventos(eventos)) {
        this.procesarEvento(evento);
        this.eventLog.push(evento); // FUENTE DE VERDAD
      }
    }
    
    return {
      events: this.eventLog,
      processes: this.processes,
      totals: this.calcularTotales()
    };
  }
  
  private procesarEvento(evento: EventoSistema): void {
    switch (evento.tipo) {
      case 'Arribo': this.procesarArribo(evento); break;
      case 'FinTIP': this.procesarFinTIP(evento); break; // Cobra TIP aquí
      case 'Dispatch': this.procesarDispatch(evento); break; // Cobra TCP aquí
      case 'FinRafaga': this.procesarFinRafaga(evento); break;
      case 'FinES': this.procesarFinES(evento); break;
      case 'FinTFP': this.procesarFinTFP(evento); break; // Cobra TFP aquí
      case 'QuantumExpires': this.procesarQuantumExpires(evento); break; // Cobra TCP aquí
    }
  }
  
  private procesarDispatch(evento: EventoDispatch): void {
    const proceso = this.getProcess(evento.processId);
    
    // Cobrar TCP (único lugar)
    this.currentTime += this.config.tcp;
    
    // Asignar CPU
    this.cpu.assign(proceso);
    proceso.estado = 'CORRIENDO';
    
    // RR: programar QuantumExpires
    if (this.scheduler instanceof RoundRobinScheduler) {
      const quantumEvent = new QuantumExpiresEvent(
        this.currentTime + this.config.quantum,
        evento.processId
      );
      this.eventQueue.schedule(quantumEvent);
    }
    
    // Programar fin de ráfaga
    const finRafagaEvent = new FinRafagaEvent(
      this.currentTime + proceso.tiempoRestante,
      evento.processId
    );
    this.eventQueue.schedule(finRafagaEvent);
  }
}
```

#### 1.2 Crear EventQueue.ts (orden estable por `time, priority, seq`)
```bash
touch src/lib/domain/EventQueue.ts
```

**Implementar cola con orden de desempate:**
```typescript
export class EventQueue {
  private events: EventoSistema[] = [];
  private sequence: number = 0;
  
  schedule(evento: EventoSistema): void {
    evento.sequence = this.sequence++;
    this.events.push(evento);
    this.events.sort(this.compareEvents);
  }
  
  extractEventsAt(tiempo: number): EventoSistema[] {
    const eventsAtTime: EventoSistema[] = [];
    
    while (this.events.length > 0 && this.events[0].tiempo === tiempo) {
      eventsAtTime.push(this.events.shift()!);
    }
    
    // Orden de prioridad 1-6 para eventos simultáneos
    return eventsAtTime.sort((a, b) => this.getEventPriority(a) - this.getEventPriority(b));
  }
  
  private getEventPriority(evento: EventoSistema): number {
    const priorities = {
      'FinProceso': 1,    // C→T
      'FinRafaga': 2,     // C→B  
      'QuantumExpires': 3, // C→L (expropiación)
      'FinES': 4,         // B→L
      'FinTIP': 5,        // N→L
      'Dispatch': 6       // L→C
    };
    return priorities[evento.tipo] || 999;
  }
}
```

#### 1.3 Crear Cpu.ts, ReadyQueue.ts (RR con ring + quantum)
```bash
touch src/lib/domain/Cpu.ts
touch src/lib/domain/ReadyQueue.ts
```

#### 1.4 Definir Events.ts con los 7 eventos y el **orden 1–6**
```bash
touch src/lib/domain/Events.ts
```

#### 1.5 Unificar cobro TIP/TCP/TFP **solo** dentro de `Simulation`

### **Fase 2 — Scheduler minimalista**

#### 2.1 `domain/Scheduler.ts`: `pick`, `shouldPreempt`, `onDispatch?`
```typescript
export interface Scheduler {
  pick(readyQueue: Process[]): Process | null;
  shouldPreempt?(current: Process, candidate: Process): boolean;
  onDispatch?(process: Process, currentTime: number): EventoSistema[];
}
```

#### 2.2 RR: en `onDispatch`, **programar `QuantumExpires(t+q)`**
```typescript
export class RoundRobinScheduler implements Scheduler {
  constructor(private quantum: number) {}
  
  pick(readyQueue: Process[]): Process | null {
    return readyQueue.shift() || null; // FIFO circular
  }
  
  onDispatch(process: Process, currentTime: number): EventoSistema[] {
    // Programar expiración de quantum
    return [new QuantumExpiresEvent(currentTime + this.quantum, process.id)];
  }
}
```

#### 2.3 Empates SRTF/Priority ⇒ **no expropiar** (documentado)
```typescript
export class SRTFScheduler implements Scheduler {
  shouldPreempt(current: Process, candidate: Process): boolean {
    // Solo si candidato tiene MENOR tiempo restante (empates NO expropian)
    return candidate.tiempoRestante < current.tiempoRestante;
  }
}
```

### **Fase 3 — Application en modo "mapper"**

#### 3.1 `usecases/RunSimulation.ts`: orquesta y devuelve `ResultDTO` con `{events, processes, totals}` del dominio
```bash
touch src/lib/application/usecases/RunSimulation.ts
```

**Implementar orquestador (NO recalcula):**
```typescript
export class RunSimulation {
  constructor(
    private simulation: Simulation,
    private parsers: { txt: ParserTXT; json: ParserJSON; csv: ParserCSV }
  ) {}
  
  async execute(archivo: File, config: ConfigDTO): Promise<ResultDTO> {
    // 1. Parsear entrada con adapter apropiado
    const workload = await this.parseWorkload(archivo);
    
    // 2. Ejecutar simulación única (dominio hace todo)
    const result = this.simulation.ejecutarSimulacion(workload, config);
    
    // 3. Devolver directamente (NO recalcular)
    return result;
  }
  
  private async parseWorkload(archivo: File): Promise<WorkloadDTO> {
    if (archivo.name.endsWith('.txt')) return this.parsers.txt.parse(archivo);
    if (archivo.name.endsWith('.json')) return this.parsers.json.parse(archivo);
    if (archivo.name.endsWith('.csv')) return this.parsers.csv.parse(archivo);
    throw new Error('Formato no soportado');
  }
}
```

#### 3.2 `usecases/BuildGantt.ts` y `ComputeMetrics.ts`: **mapear** desde `events/totals`
```bash
touch src/lib/application/usecases/BuildGantt.ts
touch src/lib/application/usecases/ComputeMetrics.ts
```

**BuildGantt (mapper puro):**
```typescript
export class BuildGantt {
  map(events: EventoRegistrado[]): GanttDTO {
    const tramos: TramoGantt[] = [];
    
    // Mapear desde event log únicamente
    for (const event of events) {
      switch (event.tipo) {
        case 'FinTIP':
          tramos.push({
            proceso: event.processId,
            tipo: 'TIP',
            inicio: event.tiempo - event.metadata.tip,
            fin: event.tiempo
          });
          break;
        case 'Dispatch':
          tramos.push({
            proceso: event.processId, 
            tipo: 'CPU',
            inicio: event.tiempo,
            fin: event.tiempo + event.metadata.duracion
          });
          break;
        // ... más mapeos desde eventos
      }
    }
    
    return { tramos, metadata: this.buildMetadata(events) };
  }
}
```

**ComputeMetrics (mapper puro):**
```typescript
export class ComputeMetrics {
  map(events: EventoRegistrado[], processes: Process[]): MetricsDTO {
    // Calcular solo desde event log, NO recalcular overheads
    return {
      porProceso: processes.map(p => ({
        id: p.id,
        TR: this.calcularTR(p, events),
        TRn: this.calcularTRn(p, events),
        tiempoListo: this.calcularTiempoListo(p, events)
      })),
      porTanda: {
        TRt: this.calcularTRtPromedio(processes, events),
        throughput: this.calcularThroughput(processes, events),
        utilizacion: this.calcularUtilizacion(events)
      }
    };
  }
  
  private calcularTR(proceso: Process, events: EventoRegistrado[]): number {
    const finProceso = events.find(e => e.tipo === 'FinProceso' && e.processId === proceso.id);
    return finProceso ? finProceso.tiempo - proceso.tiempoArribo : 0;
  }
}
```

### **Fase 4 — Infra/DTOs**

#### 4.1 Crear `application/dto.ts` y migrar Parsers/Exporters a **usar solo DTOs**
```bash
touch src/lib/application/dto.ts
```

**Definir contratos DTO:**
```typescript
export interface WorkloadDTO {
  processes: ProcessInputDTO[];
  metadata?: { formato: string; archivo: string; };
}

export interface ProcessInputDTO {
  id: string;
  arrivalTime: number;
  burstTime: number;
  priority: number;
}

export interface ConfigDTO {
  algoritmo: 'FCFS' | 'SJF' | 'SRTF' | 'RR' | 'Priority';
  tip: number;
  tcp: number;
  tfp: number;
  quantum?: number;
}

export interface EventDTO {
  tiempo: number;
  tipo: string;
  processId: string;
  metadata?: Record<string, any>;
}

export interface GanttDTO {
  tramos: TramoGantt[];
  metadata: { algoritmo: string; tiempoTotal: number; };
}

export interface MetricsDTO {
  porProceso: ProcessMetricsDTO[];
  porTanda: BatchMetricsDTO;
}

export interface ResultDTO {
  events: EventDTO[];
  gantt: GanttDTO;
  metrics: MetricsDTO;
  totals: TotalsDTO;
}
```

#### 4.2 Migrar Parsers para trabajar solo con DTOs
```bash
touch src/lib/infrastructure/parsers/ParserTXT.ts
touch src/lib/infrastructure/parsers/ParserJSON.ts
touch src/lib/infrastructure/parsers/ParserCSV.ts
```

**ParserTXT (adapter puro):**
```typescript
export class ParserTXT {
  async parse(archivo: File): Promise<WorkloadDTO> {
    const contenido = await archivo.text();
    const lineas = contenido.split('\n').filter(l => l.trim());
    
    const processes: ProcessInputDTO[] = lineas.map((linea, indice) => {
      const campos = linea.split(',').map(c => c.trim());
      
      if (campos.length !== 4) {
        throw new Error(`Línea ${indice + 1}: formato inválido. Esperado: ID,Arribo,Ráfaga,Prioridad`);
      }
      
      return {
        id: campos[0],
        arrivalTime: Number(campos[1]),
        burstTime: Number(campos[2]),
        priority: Number(campos[3])
      };
    });
    
    return {
      processes,
      metadata: { formato: 'TXT_CONSIGNA', archivo: archivo.name }
    };
  }
}
```

#### 4.3 `ValidadorIntegridad`: overlaps, continuidad y secuencia de estados válidos
```bash
touch src/lib/infrastructure/validators/ValidadorIntegridad.ts
```

**Validador de integridad:**
```typescript
export class ValidadorIntegridad {
  validarGantt(gantt: GanttDTO): ValidationResult {
    const errores: string[] = [];
    
    // 1. Validar no overlaps por proceso
    this.validarNoOverlaps(gantt.tramos, errores);
    
    // 2. Validar continuidad temporal
    this.validarContinuidad(gantt.tramos, errores);
    
    // 3. Conservación de tiempo: user+os+idle = makespan
    this.validarConservacionTiempo(gantt, errores);
    
    return {
      esValido: errores.length === 0,
      errores,
      timestamp: new Date().toISOString()
    };
  }
  
  private validarNoOverlaps(tramos: TramoGantt[], errores: string[]): void {
    const tramosPorProceso = this.agruparPorProceso(tramos);
    
    for (const [proceso, tramosProc] of tramosPorProceso) {
      tramosProc.sort((a, b) => a.inicio - b.inicio);
      
      for (let i = 0; i < tramosProc.length - 1; i++) {
        const actual = tramosProc[i];
        const siguiente = tramosProc[i + 1];
        
        if (actual.fin > siguiente.inicio) {
          errores.push(`Proceso ${proceso}: overlap temporal entre tramos`);
        }
      }
    }
  }
  
  private validarConservacionTiempo(gantt: GanttDTO, errores: string[]): void {
    const tiempoUsuario = gantt.tramos.filter(t => t.tipo === 'CPU').reduce((sum, t) => sum + t.duracion, 0);
    const tiempoSO = gantt.tramos.filter(t => ['TIP', 'TCP', 'TFP'].includes(t.tipo)).reduce((sum, t) => sum + t.duracion, 0);
    const tiempoIdle = gantt.tramos.filter(t => t.tipo === 'IDLE').reduce((sum, t) => sum + t.duracion, 0);
    
    const makespan = gantt.metadata.tiempoTotal;
    const suma = tiempoUsuario + tiempoSO + tiempoIdle;
    
    if (Math.abs(suma - makespan) > 0.001) {
      errores.push(`Conservación tiempo violada: usuario(${tiempoUsuario}) + SO(${tiempoSO}) + idle(${tiempoIdle}) ≠ makespan(${makespan})`);
    }
  }
}
```

### **Fase 5 — UI**

#### 5.1 Componentes leen **DTOs**; nada de clases del dominio
```bash
# Actualizar componentes UI para usar solo DTOs
# Modificar src/lib/components/GanttFixed.svelte
# Modificar src/lib/components/EventosSimulacion.svelte
```

**GanttFixed.svelte (solo DTOs):**
```typescript
<script lang="ts">
  import type { GanttDTO, TramoGantt } from '$lib/application/dto';
  
  export let gantt: GanttDTO;
  
  // Colores por tipo (TIP/CPU/ES/TFP/IDLE)
  const coloresTipo = {
    'TIP': '#ff9999',    // Tiempo ingreso sistema (rojo claro)
    'CPU': '#66cc66',    // Ejecución CPU (verde)
    'ES': '#ffcc66',     // Entrada/Salida (amarillo)
    'TFP': '#cc99ff',    // Tiempo finalización (morado claro)
    'IDLE': '#cccccc'    // CPU ociosa (gris)
  };
  
  function renderTramos(tramos: TramoGantt[]) {
    return tramos.map(tramo => ({
      ...tramo,
      color: coloresTipo[tramo.tipo] || '#ffffff',
      tooltip: `${tramo.proceso}: ${tramo.tipo} (${tramo.inicio}-${tramo.fin})`
    }));
  }
</script>

<div class="gantt-container">
  <!-- Renderizado usando solo GanttDTO -->
</div>
```

#### 5.2 `EventosSimulacion`: tabla cronológica con filtros por tipo
```typescript
<script lang="ts">
  import type { EventDTO } from '$lib/application/dto';
  
  export let eventos: EventDTO[];
  
  // Filtros por tipo de evento
  const tiposEvento = [
    'Arribo', 'FinTIP', 'Dispatch', 'FinRafaga', 
    'FinES', 'FinTFP', 'QuantumExpires'
  ];
  
  let filtroTipo: string = '';
  
  $: eventosFiltrados = filtroTipo 
    ? eventos.filter(e => e.tipo === filtroTipo)
    : eventos;
</script>

<div class="eventos-container">
  <table class="eventos-table">
    <thead>
      <tr>
        <th>Instante</th>
        <th>Evento</th>
        <th>Proceso</th>
        <th>Metadata</th>
      </tr>
    </thead>
    <tbody>
      {#each eventosFiltrados as evento}
        <tr>
          <td>{evento.tiempo}</td>
          <td>{evento.tipo}</td>
          <td>{evento.processId}</td>
          <td>{JSON.stringify(evento.metadata || {})}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
```

### **Fase 6 — Pruebas mínimas**

#### 6.1 Tests críticos
```bash
touch tests/domain/Simulation.test.ts
touch tests/application/RunSimulation.test.ts
touch tests/infrastructure/ValidadorIntegridad.test.ts
```

**Tests esenciales:**
```typescript
describe('Motor Único - Validaciones Críticas', () => {
  test('Conservación de tiempo: user+os+idle = makespan', () => {
    const resultado = simulation.ejecutarSimulacion(workloadTXT, configFCFS);
    const gantt = buildGantt.map(resultado.events);
    const validacion = validador.validarConservacionTiempo(gantt);
    
    expect(validacion.esValido).toBe(true);
  });
  
  test('RR: Dispatch agenda QuantumExpires', () => {
    const resultado = simulation.ejecutarSimulacion(workloadTXT, configRR);
    
    // Buscar eventos Dispatch seguidos de QuantumExpires
    const dispatches = resultado.events.filter(e => e.tipo === 'Dispatch');
    const quantumExpires = resultado.events.filter(e => e.tipo === 'QuantumExpires');
    
    expect(quantumExpires.length).toBeGreaterThan(0);
    
    dispatches.forEach(dispatch => {
      const quantum = quantumExpires.find(q => 
        q.processId === dispatch.processId && 
        q.tiempo === dispatch.tiempo + configRR.quantum
      );
      expect(quantum).toBeDefined();
    });
  });
  
  test('Empates por timestamp siguen orden 1–6', () => {
    const eventos = [
      { tiempo: 5, tipo: 'Dispatch' },      // Prioridad 6
      { tiempo: 5, tipo: 'FinRafaga' },     // Prioridad 2
      { tiempo: 5, tipo: 'FinTIP' }         // Prioridad 5
    ];
    
    const eventQueue = new EventQueue();
    eventos.forEach(e => eventQueue.schedule(e));
    
    const eventosOrdenados = eventQueue.extractEventsAt(5);
    
    expect(eventosOrdenados[0].tipo).toBe('FinRafaga');    // 2
    expect(eventosOrdenados[1].tipo).toBe('FinTIP');       // 5  
    expect(eventosOrdenados[2].tipo).toBe('Dispatch');     // 6
  });
  
  test('B→L instantáneo sin TCP', () => {
    const resultado = simulation.ejecutarSimulacion(workloadConIO, configFCFS);
    
    const finES = resultado.events.find(e => e.tipo === 'FinES');
    const siguienteEvento = resultado.events.find(e => 
      e.tiempo === finES!.tiempo && e.processId === finES!.processId && e.tipo === 'Dispatch'
    );
    
    // FinES y siguiente Dispatch deben ser en mismo timestamp (sin TCP intermedio)
    expect(siguienteEvento?.tiempo).toBe(finES?.tiempo);
  });
  
  test('Gantt sin overlaps', () => {
    const resultado = simulation.ejecutarSimulacion(workloadTXT, configFCFS);
    const gantt = buildGantt.map(resultado.events);
    const validacion = validador.validarGantt(gantt);
    
    expect(validacion.esValido).toBe(true);
    expect(validacion.errores).toHaveLength(0);
  });
});
```

---

## 📊 CRITERIOS DE ÉXITO (Corregidos)

### ✅ **Motor Único Funcional**
- [ ] Un solo `Simulation.ts` que maneja todos los eventos
- [ ] EventQueue estable con orden 1-6 para eventos simultáneos  
- [ ] TIP/TCP/TFP cobrados únicamente dentro del motor
- [ ] Event log como fuente de verdad para Gantt y métricas

### ✅ **Algoritmos Correctos**
- [ ] RR programa QuantumExpires en cada Dispatch
- [ ] SRTF/Priority: empates NO expropian (mantener actual)
- [ ] SJF por próxima ráfaga, SRTF por resto de ráfaga actual
- [ ] Priority con aging solo en READY

### ✅ **Application Como Mappers**
- [ ] BuildGantt mapea desde event log únicamente
- [ ] ComputeMetrics mapea desde event log únicamente  
- [ ] RunSimulation orquesta sin recalcular overheads SO
- [ ] DTOs como contratos entre capas

### ✅ **Validación de Integridad**
- [ ] Gantt sin overlaps temporales
- [ ] Conservación tiempo: user+os+idle = makespan
- [ ] B→L instantáneo (sin TCP)
- [ ] Secuencia estados válida por proceso

### ✅ **UI Desacoplada**
- [ ] Componentes usan DTOs únicamente
- [ ] GanttFixed con colores TIP/CPU/ES/TFP/IDLE
- [ ] EventosSimulacion con filtros por tipo
- [ ] No dependencias de clases dominio

---

## 📅 Cronograma Corregido

| Fase | Tiempo | Tareas Críticas | Validación |
|------|---------|----------------|------------|
| **1. Dominio** | 6-8h | Simulation.ts único, EventQueue orden 1-6 | Tests motor |
| **2. Scheduler** | 2-3h | RR programa quantum, empates no expropian | Tests algoritmos |
| **3. Application** | 3-4h | Mappers puros, DTOs | Tests mapeo |
| **4. Infra/DTOs** | 4-5h | Parsers DTOs, ValidadorIntegridad | Tests validación |
| **5. UI** | 3-4h | Componentes DTOs únicamente | Tests UI |
| **6. Pruebas** | 4-6h | Conservación tiempo, RR quantum, overlaps | Tests críticos |

**Total: 22-30 horas**

---

## 🎯 **Resultado Final**

### **Motor Único Correcto**
- ✅ Event log como única fuente de verdad
- ✅ Overheads SO centralizados en motor únicamente  
- ✅ Orden eventos simultáneos documentado y respetado
- ✅ RR programa quantum correctamente al dispatch

### **Arquitectura Limpia**
- ✅ Application solo mapea, no recalcula
- ✅ DTOs como contratos entre capas
- ✅ UI desacoplada del dominio
- ✅ Validación integridad rigurosa

### **Comportamiento Académicamente Correcto** 
- ✅ Empates en SRTF/Priority mantienen actual
- ✅ SJF por próxima ráfaga, SRTF por resto actual
- ✅ B→L instantáneo sin TCP
- ✅ Conservación tiempo garantizada

*Este plan corrige los problemas arquitectónicos críticos y asegura que el simulador tenga un motor único, event log como fuente de verdad, y comportamiento académicamente correcto.*

#### 3.1 Parser para Formato TXT del Integrador
```bash
touch src/lib/infrastructure/parsers/ParserTXT.ts
touch src/lib/infrastructure/parsers/ValidadorEntrada.ts
```

**Implementar `ParserTXT.ts` según consigna:**
```typescript
export class ParserTXT {
  parsearArchivo(archivo: File): Promise<WorkloadDTO> {
    const contenido = await archivo.text();
    const lineas = contenido.split('\n').filter(l => l.trim());
    
    const procesos: ProcesoDTO[] = lineas.map((linea, indice) => {
      const campos = linea.split(',').map(c => c.trim());
      
      if (campos.length !== 4) {
        throw new Error(`Línea ${indice + 1}: formato inválido. Esperado: ID,Arribo,Ráfaga,Prioridad`);
      }
      
      return {
        id: campos[0],                           // P1, P2, P3...
        tiempoArribo: Number(campos[1]),         // ≥0
        tiempoRafaga: Number(campos[2]),         // >0
        prioridad: Number(campos[3])             // 1-100
      };
    });
    
    return {
      procesos,
      metadata: {
        formato: 'TXT_CONSIGNA',
        archivo: archivo.name,
        fechaParseo: new Date().toISOString()
      }
    };
  }
}
```

#### 3.2 Exportadores de Salidas Requeridas
```bash
touch src/lib/infrastructure/exporters/ExportadorEventos.ts
touch src/lib/infrastructure/exporters/ExportadorGantt.ts
touch src/lib/infrastructure/exporters/ExportadorMetricas.ts
```

**Implementar `ExportadorEventos.ts`:**
```typescript
export class ExportadorEventos {
  exportarJSON(eventos: EventoRegistrado[], algoritmo: string): string {
    return JSON.stringify({
      metadata: {
        algoritmo,
        totalEventos: eventos.length,
        tiempoSimulacion: eventos[eventos.length - 1]?.tiempo || 0,
        fechaGeneracion: new Date().toISOString()
      },
      eventos: eventos.map(e => ({
        instante: e.tiempo,
        evento: e.tipo,
        proceso: e.procesoId,
        descripcion: e.descripcion || '',
        estadoAnterior: e.estadoAnterior,
        estadoNuevo: e.estadoNuevo
      }))
    }, null, 2);
  }
  
  exportarCSV(eventos: EventoRegistrado[]): string {
    const cabecera = 'instante,evento,proceso,estadoAnterior,estadoNuevo,descripcion\n';
    const filas = eventos.map(e => 
      `${e.tiempo},${e.tipo},${e.procesoId},${e.estadoAnterior || ''},${e.estadoNuevo || ''},${e.descripcion || ''}`
    ).join('\n');
    return cabecera + filas;
  }
}
```

**Implementar `ExportadorGantt.ts`:**
```typescript
export class ExportadorGantt {
  exportarJSON(gantt: DiagramaGanttDTO): string {
    return JSON.stringify({
      metadata: {
        titulo: `Diagrama de Gantt - ${gantt.algoritmo}`,
        algoritmo: gantt.algoritmo,
        tiempoTotal: gantt.tiempoTotal,
        procesos: gantt.procesos,
        fechaGeneracion: new Date().toISOString()
      },
      tramos: gantt.tramos.map(t => ({
        id: `tramo_${t.secuencia}`,
        proceso: t.proceso,
        tipo: t.tipo,           // TIP, CPU, ES, TFP
        tiempoInicio: t.tiempoInicio,
        tiempoFin: t.tiempoFin,
        duracion: t.tiempoFin - t.tiempoInicio,
        color: this.obtenerColor(t.tipo)
      })),
      validacion: this.validarIntegridad(gantt)
    }, null, 2);
  }
  
  exportarSVG(gantt: DiagramaGanttDTO): string {
    // Generar SVG del diagrama temporal
    // Con timeline, barras de procesos, leyenda
    // Colores diferenciados por tipo de actividad
  }
  
  exportarASCII(gantt: DiagramaGanttDTO): string {
    // Representación textual para consola
    // Formato timeline con caracteres ASCII
  }
  
  private validarIntegridad(gantt: DiagramaGanttDTO): ValidacionDTO {
    // Verificar que no hay overlaps temporales
    // Validar continuidad de procesos
    // Chequear que todos los procesos terminan
  }
}
```

#### 3.3 Validador de Integridad Temporal
```bash
touch src/lib/infrastructure/validators/ValidadorIntegridad.ts
```

**Implementar validaciones del integrador:**
```typescript
export class ValidadorIntegridad {
  validarSinOverlaps(gantt: DiagramaGanttDTO): ValidacionDTO {
    const errores: string[] = [];
    
    // Agrupar tramos por proceso
    const tramosPorProceso = this.agruparPorProceso(gantt.tramos);
    
    for (const [proceso, tramos] of tramosPorProceso) {
      // Ordenar por tiempo inicio
      const tramosOrdenados = tramos.sort((a, b) => a.tiempoInicio - b.tiempoInicio);
      
      // Verificar no overlaps
      for (let i = 0; i < tramosOrdenados.length - 1; i++) {
        const actual = tramosOrdenados[i];
        const siguiente = tramosOrdenados[i + 1];
        
        if (actual.tiempoFin > siguiente.tiempoInicio) {
          errores.push(
            `Proceso ${proceso}: overlap entre tramos. ` +
            `Tramo ${actual.secuencia} termina en ${actual.tiempoFin}, ` +
            `pero tramo ${siguiente.secuencia} inicia en ${siguiente.tiempoInicio}`
          );
        }
      }
    }
    
    return {
      esValido: errores.length === 0,
      errores,
      tiempoValidacion: new Date().toISOString()
    };
  }
  
  validarSecuenciaEstados(eventos: EventoRegistrado[]): ValidacionDTO {
    // Verificar transiciones de estado válidas según integrador
    // NUEVO → LISTO → EJECUTANDO → BLOQUEADO → LISTO → ... → TERMINADO
  }
}
```

---

### **FASE 4: ADAPTACIÓN DE COMPONENTES UI**

#### 4.1 Actualizar Componentes de Entrada
**Modificar `CargaArchivo.svelte`:**
```typescript
// Aceptar formato TXT específico de la consigna
const formatosPermitidos = ['.txt', '.json', '.csv'];

async function procesarArchivo(archivo: File) {
  if (archivo.name.endsWith('.txt')) {
    // Usar ParserTXT específico de la consigna
    const resultado = await parserTXT.parsearArchivo(archivo);
    workload.set(resultado);
  }
}
```

**Modificar `ConfiguracionPanel.svelte`:**
```typescript
// Configuración específica del integrador
export let configuracion: ConfiguracionDTO = {
  algoritmo: 'FCFS',  // FCFS|SJF|SRTF|RR|Priority
  tip: 1,             // Tiempo ingreso sistema
  tcp: 1,             // Tiempo cambio contexto  
  tfp: 1,             // Tiempo finalización proceso
  quantum: 3          // Solo para RR
};

// Validaciones según integrador
function validarConfiguracion(): boolean {
  const errores: string[] = [];
  
  if (configuracion.tip < 0) errores.push('TIP debe ser ≥ 0');
  if (configuracion.tcp < 0) errores.push('TCP debe ser ≥ 0');
  if (configuracion.tfp < 0) errores.push('TFP debe ser ≥ 0');
  if (configuracion.algoritmo === 'RR' && (!configuracion.quantum || configuracion.quantum <= 0)) {
    errores.push('Round Robin requiere quantum > 0');
  }
  
  return errores.length === 0;
}
```

#### 4.2 Actualizar Componentes de Salida
**Modificar `GanttFixed.svelte`:**
```typescript
// Mostrar Gantt según formato del integrador
export let gantt: DiagramaGanttDTO;

// Colores específicos por tipo de actividad según integrador
const coloresTipo = {
  'TIP': '#ff9999',    // Tiempo ingreso sistema (rojo claro)
  'CPU': '#66cc66',    // Ejecución CPU (verde)
  'ES': '#ffcc66',     // Entrada/Salida (amarillo)
  'TFP': '#cc99ff',    // Tiempo finalización (morado claro)
  'IDLE': '#cccccc'    // CPU ociosa (gris)
};

// Renderizar tramos temporales
function renderizarTramos(tramos: TramoGanttDTO[]) {
  return tramos.map(tramo => ({
    ...tramo,
    color: coloresTipo[tramo.tipo],
    tooltip: `${tramo.proceso}: ${tramo.tipo} (${tramo.tiempoInicio}-${tramo.tiempoFin})`
  }));
}
```

**Modificar `EventosSimulacion.svelte`:**
```typescript
// Mostrar log cronológico del sistema según integrador
export let eventos: EventoRegistrado[];

// Filtros específicos por tipo de evento
const tiposEvento = [
  'Arribo', 'FinTIP', 'Despacho', 'FinRafaga', 
  'FinES', 'FinTFP', 'ExpiracionQuantum'
];

// Formato de tabla según consigna
const columnasTabla = [
  { key: 'tiempo', label: 'Instante' },
  { key: 'tipo', label: 'Evento' },
  { key: 'procesoId', label: 'Proceso' },
  { key: 'estadoAnterior', label: 'Estado Anterior' },
  { key: 'estadoNuevo', label: 'Estado Nuevo' },
  { key: 'descripcion', label: 'Descripción' }
];
```

#### 4.3 Actualizar Panel de Exportación
**Modificar `PanelExportacion.svelte`:**
```typescript
// Exportación según formatos del integrador
const formatosDisponibles = [
  { id: 'eventos-json', label: 'Eventos JSON', extension: '.json' },
  { id: 'eventos-csv', label: 'Eventos CSV', extension: '.csv' },
  { id: 'gantt-json', label: 'Gantt JSON', extension: '.json' },
  { id: 'gantt-svg', label: 'Gantt SVG', extension: '.svg' },
  { id: 'gantt-ascii', label: 'Gantt ASCII', extension: '.txt' },
  { id: 'metricas-json', label: 'Métricas JSON', extension: '.json' },
  { id: 'reporte-completo', label: 'Reporte Completo', extension: '.json' }
];

async function exportarFormato(formatoId: string) {
  switch (formatoId) {
    case 'eventos-json':
      const eventosJSON = exportadorEventos.exportarJSON(eventos, algoritmo);
      descargarArchivo(eventosJSON, `eventos_${algoritmo}.json`);
      break;
    
    case 'gantt-svg':
      const ganttSVG = exportadorGantt.exportarSVG(gantt);
      descargarArchivo(ganttSVG, `gantt_${algoritmo}.svg`);
      break;
      
    // ... más formatos según integrador
  }
}
```

---

### **FASE 5: TESTING Y VALIDACIÓN**

#### 5.1 Tests del Motor de Eventos Discretos
```bash
touch tests/domain/MotorSimulacion.test.ts
touch tests/domain/GestionEventos.test.ts
touch tests/domain/algorithms/FCFS.test.ts
touch tests/domain/algorithms/RoundRobin.test.ts
```

**Test del motor principal:**
```typescript
describe('MotorSimulacion - Integrador', () => {
  test('debe procesar workload según formato TXT consigna', async () => {
    const workloadTXT = `P1,0,8,3\nP2,1,4,1\nP3,2,9,2`;
    const archivo = new File([workloadTXT], 'test.txt', { type: 'text/plain' });
    
    const resultado = await ejecutarSimulacion.ejecutar(archivo, {
      algoritmo: 'FCFS',
      tip: 1,
      tcp: 1, 
      tfp: 1
    });
    
    // Validar eventos generados
    expect(resultado.eventos).toHaveLength(18); // 6 eventos × 3 procesos
    expect(resultado.eventos[0]).toMatchObject({
      tipo: 'Arribo',
      tiempo: 0,
      procesoId: 'P1'
    });
    
    // Validar Gantt sin overlaps
    const validacion = validadorIntegridad.validarSinOverlaps(resultado.gantt);
    expect(validacion.esValido).toBe(true);
    
    // Validar métricas calculadas
    expect(resultado.metricas.porProceso).toHaveLength(3);
    expect(resultado.metricas.porTanda.utilizacionCPU).toBeGreaterThan(0);
  });
});
```

#### 5.2 Tests de Casos de Uso
```bash
touch tests/application/EjecutarSimulacion.test.ts
touch tests/application/ConstruirGantt.test.ts
touch tests/application/CalcularMetricas.test.ts
```

#### 5.3 Tests de Infraestructura
```bash
touch tests/infrastructure/ParserTXT.test.ts
touch tests/infrastructure/ExportadorGantt.test.ts
touch tests/infrastructure/ValidadorIntegridad.test.ts
```

---

### **FASE 6: DOCUMENTACIÓN Y FINALIZACIÓN**

#### 6.1 Actualizar Documentación
```bash
# Actualizar documentación técnica
echo "# Motor de Eventos Discretos del Integrador" > docs/MOTOR_EVENTOS_DISCRETOS.md
echo "# Formato de Entrada TXT" > docs/FORMATO_ENTRADA_CONSIGNA.md
echo "# Salidas y Exportación" > docs/SALIDAS_INTEGRADOR.md
```

#### 6.2 Casos de Prueba del Integrador
```bash
mkdir examples/integrador/
touch examples/integrador/workload_basico.txt
touch examples/integrador/workload_complejo.txt
touch examples/integrador/test_todos_algoritmos.ts
```

**Crear `workload_basico.txt` según consigna:**
```
P1,0,8,3
P2,1,4,1
P3,2,9,2
P4,3,5,1
P5,4,2,4
```

---

## 📊 CRITERIOS DE ÉXITO PARA EL INTEGRADOR

### ✅ **Cumplimiento de Consigna**
- [x] **Motor de eventos discretos**: Tiempo discreto (t=0 → eventos)
- [ ] **5 estados de proceso**: NUEVO→LISTO→EJECUTANDO→BLOQUEADO→TERMINADO
- [ ] **7 eventos del sistema**: Arribo, FinTIP, Despacho, FinRáfaga, FinE/S, FinTFP, ExpQuantum
- [ ] **5 algoritmos requeridos**: FCFS, SJF, SRTF, RR (con quantum), Priority (1-100)
- [ ] **Overheads diferenciados**: TIP (ingreso), TCP (contexto), TFP (finalización)
- [ ] **Multiprogramación**: Múltiples procesos en memoria simultáneamente

### ✅ **Formato de Entrada**
- [ ] **Parser TXT específico**: "ID,Arribo,Ráfaga,Prioridad" según consigna
- [ ] **Validación de campos**: ID único, tiempos ≥0, prioridad 1-100
- [ ] **Compatibilidad extendida**: JSON y CSV como formatos adicionales

### ✅ **Salidas Requeridas**
- [ ] **Diagrama de Gantt**: Timeline por proceso con tipos de actividad
- [ ] **Log de eventos**: Cronológico completo en JSON/CSV
- [ ] **Métricas por proceso**: TR, TRn, tiempo en listo
- [ ] **Métricas por tanda**: TRt promedio, throughput, utilización CPU
- [ ] **Validación temporal**: Sin overlaps, continuidad garantizada

### ✅ **Calidad Técnica**
- [ ] **Arquitectura limpia**: 4 capas bien definidas y desacopladas
- [ ] **Testing exhaustivo**: Casos de prueba por componente
- [ ] **Validación rigurosa**: Integridad temporal y consistencia de estados
- [ ] **Documentación completa**: Casos de uso, formatos, API

---

## ⚠️ RIESGOS Y MITIGACIONES

### 🚨 **Riesgos del Refactoring**

1. **Ruptura de funcionalidad existente**
   - **Mitigación**: Tests de regresión exhaustivos
   - **Plan B**: Mantener versión anterior hasta validación completa

2. **Complejidad del motor de eventos**
   - **Mitigación**: Implementación incremental por tipo de evento
   - **Validación**: Comparar salidas con implementación actual

3. **Performance del nuevo motor**
   - **Mitigación**: Benchmarks antes/después de cambios
   - **Optimización**: Profiling si es necesario

4. **Cambios en UI existente**
   - **Mitigación**: DTOs compatibles hacia atrás
   - **Testing**: Suite completa de UI tests

---

## 📅 Cronograma de Implementación

| Fase | Tiempo | Dependencias | Prioridad |
|------|---------|--------------|-----------|
| 1. Componentes Dominio | 8-12h | - | Alta |
| 2. Casos de Uso | 4-6h | Fase 1 | Alta |
| 3. Infraestructura | 6-8h | Fase 1-2 | Media |
| 4. Adaptación UI | 4-6h | Fase 2-3 | Media |
| 5. Testing | 6-8h | Todas anteriores | Alta |
| 6. Documentación | 2-3h | Fase 5 | Baja |

**Total estimado: 30-43 horas**

---

## 🎯 **Resultado Final Esperado**

### **Simulador Completamente Alineado con Integrador**
- ✅ Motor de eventos discretos robusto y correcto
- ✅ Formato de entrada TXT según consigna exacta
- ✅ 5 algoritmos implementados según especificaciones
- ✅ Salidas en formatos requeridos (Gantt, eventos, métricas)
- ✅ Validación temporal rigurosa (sin overlaps)
- ✅ Métricas calculadas según definiciones académicas

### **Arquitectura de Calidad Profesional**
- ✅ 4 capas bien definidas y desacopladas
- ✅ Componentes con responsabilidad única
- ✅ Testing automatizado por capa
- ✅ Documentación técnica completa

### **Herramienta Didáctica Completa**
- ✅ Casos de ejemplo variados
- ✅ Análisis comparativo entre algoritmos  
- ✅ Exportación para análisis posterior
- ✅ Validación académica rigurosa

*Este plan transforma el simulador hacia una herramienta que cumple exactamente con la consigna del integrador, manteniendo calidad arquitectónica y agregando valor educativo significativo.*