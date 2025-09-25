# Plan de Refactorización - Diagrama de Clases Optimizado

## 🎯 Diagnóstico Arquitectónico

### ❌ **Problemas Identificados**

1. **Simulador = "Clase Dios"**
   - Maneja reloj, cola de eventos, CPU, colas READY/BLOCKED, transiciones, TCP/TIP/TFP y métricas
   - **Impacto**: Difícil de testear, mantener y extender
   - **Solución**: Partir en agregado raíz + recursos especializados

2. **API de Scheduler Ambigua**
   - Métodos `ordenarColaListos`, `elegirSiguiente`, `debeExpropiar` sin contexto claro
   - **Impacto**: Responsabilidades filtran al Simulador
   - **Solución**: API minimalista con contexto completo

3. **Services Mezclan Dominio y Presentación**
   - `GanttBuilder` "optimiza visualización", `MetricsCalculator` "compara y analiza"
   - **Impacto**: Dificulta reutilización y testing
   - **Solución**: Separar cálculo (dominio) de optimización (UI)

4. **Capa "Core" Redundante**
   - `AdaptadorSimuladorDominio` duplica orquestación de Application
   - **Impacto**: Complejidad innecesaria
   - **Solución**: Eliminar, mover responsabilidades a Application

5. **Infraestructura Acoplada al Dominio**
   - Parsers/Exporters dependen directamente de clases como `Proceso`, `DiagramaGantt`
   - **Impacto**: Acoplamiento rígido
   - **Solución**: DTOs como contratos entre capas

6. **Eventos Débilmente Tipados**
   - `Evento.compare(Function)` pierde tipo y orden estable
   - **Impacto**: Bugs sutiles en orden de eventos
   - **Solución**: Eventos sellados con orden natural (time, priority, seq)

7. **Reglas de SO Dispersas**
   - TCP/TIP/TFP aparecen en múltiples clases
   - **Impacto**: Inconsistencias y duplicación
   - **Solución**: Centralizar en motor único

---

## 🏗️ Arquitectura Objetivo

### **Dominio Puro (sin dependencias externas)**

#### 🎯 **Motor Único - `Simulation` (Agregado Raíz)**
- Orquesta: Clock, EventQueue, Cpu, ReadyQueue, Scheduler
- **Event Log como única fuente de verdad**
- Cobra overheads (TIP/TCP/TFP) en **únicos puntos correctos**
- API pública simple: `run(processes, scheduler) → DomainResult`

#### ⚙️ **Recursos Especializados**
- **`Clock`**: `now()`, `advanceTo(t)`
- **`Cpu`**: `running?`, `busyUntil`, cobra **TCP** en dispatch/preempt
- **`ReadyQueue`**: cola ordenable por política, encapsula FCFS/SJF/SRTF/Priority/RR
- **`EventQueue`**: priority queue estable y tipada

#### 🎛️ **Scheduler API Limpia**
```typescript
interface Scheduler {
  pick(ready: ReadyQueue, time: number): Process | null;
  shouldPreempt(current: Process, candidate: Process, time: number): boolean;
  onDispatch?(process: Process, time: number): void; // solo RR
}
```

#### 📅 **Eventos Sellados**
- `JobArrives | TipDone | Dispatch | CpuBurstDone | QuantumExpired | IoDone | ProcessDone`
- Orden natural: `(time, priority, sequence)`

### **Aplicación (casos de uso puros)**
- `RunSimulation`: WorkloadDTO → SimulationResultDTO
- `BuildGantt`: events → GanttDTO (solo mapeo)
- `ComputeMetrics`: domainResult → MetricsDTO (usa totals del dominio)

### **Infraestructura (adaptadores por puertos)**
- **WorkloadPort**: `file → WorkloadDTO`
- **ExportPort**: `DTOs → formatos`
- **Factories**: `DTOs → entidades de dominio`

---

## 🔥 ACCIONES ESPECÍFICAS DEL PROYECTO

### **FASE 1: ELIMINACIÓN DE REDUNDANCIAS**

#### 1.1 Eliminar Capa Core Redundante
```bash
# Eliminar archivos redundantes
rm src/lib/core/adaptadorSimuladorDominio.ts
rm src/lib/core/state.ts
rm src/lib/core/index.ts
```

#### 1.2 Eliminar Services que Mezclan Responsabilidades
```bash
# Mover a application/usecases/
mv src/lib/services/GanttBuilder.ts src/lib/application/usecases/buildGantt.ts
mv src/lib/services/MetricsCalculator.ts src/lib/application/usecases/computeMetrics.ts
rm src/lib/services/index.ts
```

#### 1.3 Limpiar Referencias Rotas
- [ ] Buscar y eliminar imports de archivos eliminados
- [ ] Actualizar barrel exports (`index.ts`)
- [ ] Limpiar tipos duplicados o no utilizados

---

### **FASE 2: RESTRUCTURACIÓN DEL DOMINIO**

#### 2.1 Partir Simulador en Agregado Raíz + Recursos

##### **Crear `domain/core/Simulation.ts`** (Motor Único)
```typescript
export class Simulation {
  // Estado privado
  private clock: Clock;
  private eventQueue: EventQueue;
  private cpu: Cpu;
  private readyQueue: ReadyQueue;
  private eventLog: SimEvent[] = [];
  
  // API pública simple
  public run(processes: Process[], scheduler: Scheduler): DomainResult {
    // Orquestación centralizada
    // Event log como única fuente de verdad
    // Overheads cobrados aquí únicamente
  }
  
  // Manejadores privados por tipo de evento
  private handleJobArrival(event: JobArrives): void { /* TIP aquí */ }
  private handleDispatch(event: Dispatch): void { /* TCP aquí */ }
  private handleProcessDone(event: ProcessDone): void { /* TFP aquí */ }
}
```

##### **Crear Recursos Especializados**
- [ ] **`domain/core/Clock.ts`**
  ```typescript
  export class Clock {
    private currentTime: number = 0;
    
    now(): number { return this.currentTime; }
    advanceTo(time: number): void { this.currentTime = time; }
    tick(delta: number): void { this.currentTime += delta; }
  }
  ```

- [ ] **`domain/core/Cpu.ts`**
  ```typescript
  export class Cpu {
    private running?: Process;
    private busyUntil: number = 0;
    
    dispatch(process: Process, time: number): number { /* retorna TCP */ }
    preempt(time: number): [Process?, number] { /* retorna proceso + TCP */ }
    isIdle(): boolean { return !this.running; }
  }
  ```

- [ ] **`domain/core/ReadyQueue.ts`**
  ```typescript
  export class ReadyQueue {
    private processes: Process[] = [];
    
    push(process: Process): void;
    pop(): Process?;
    reorderByPolicy(): void; // FCFS/SJF/SRTF/Priority interno
  }
  ```

#### 2.2 Migrar Sistema de Eventos

##### **Mover y Reescribir `domain/events/EventQueue.ts`**
```bash
mv src/lib/core/eventQueue.ts src/lib/domain/events/EventQueue.ts
```
- [ ] Integrar `PriorityQueue` como implementación interna
- [ ] Tipado fuerte: `EventQueue<Event>` en lugar de `Function`

##### **Crear Eventos Sellados `domain/events/Event.ts`**
```typescript
export abstract class Event {
  constructor(
    public readonly time: number,
    public readonly type: EventType,
    public readonly processId: string,
    public readonly priority: number,
    public readonly sequence: number
  ) {}
  
  compareTo(other: Event): number {
    // Orden: time, priority, sequence
  }
}

export class JobArrives extends Event { /* ... */ }
export class TipDone extends Event { /* ... */ }
// ... otros eventos
```

#### 2.3 Refactorizar Scheduler API

##### **Simplificar `domain/scheduling/Scheduler.ts`**
```typescript
export interface Scheduler {
  getName(): string;
  pick(readyQueue: ReadyQueue, currentTime: number): Process | null;
  shouldPreempt(current: Process, candidate: Process, time: number): boolean;
  onDispatch?(process: Process, time: number): void; // solo RR
}
```

##### **Reescribir Implementaciones**
- [ ] **`FCFSScheduler`**: `shouldPreempt = false` siempre
- [ ] **`SJFScheduler`**: `shouldPreempt = false` siempre  
- [ ] **`SRTFScheduler`**: `shouldPreempt` si `remaining < current.remaining`
- [ ] **`PriorityScheduler`**: `shouldPreempt` con aging interno
- [ ] **`RoundRobinScheduler`**: quantum encapsulado, programa `QuantumExpired`

#### 2.4 Simplificar Process

##### **Limpiar `domain/entities/Process.ts`**
```typescript
export class Process {
  // Solo transiciones de estado válidas
  startTip(time: number): void;
  finishTip(time: number): void;
  run(deltaTime: number): void;
  blockIo(time: number): void;
  finishIo(time: number): void;
  finishCpuBurst(time: number): void;
  finishAll(time: number): void;
  
  // Consultas de estado
  isCompleted(): boolean;
  needsIo(): boolean;
  getRemainingTotal(): number;
}
```

---

### **FASE 3: CAPA DE APLICACIÓN**

#### 3.1 Crear Casos de Uso Puros

##### **`application/usecases/runSimulation.ts`**
```typescript
export class RunSimulation {
  async execute(workload: WorkloadDTO, config: ConfigDTO): Promise<SimulationResultDTO> {
    // 1. DTOs → entidades de dominio
    const processes = ProcessFactory.createFromDTO(workload.processes);
    const scheduler = SchedulerFactory.createFromConfig(config);
    
    // 2. Ejecutar dominio
    const simulation = new Simulation();
    const result = simulation.run(processes, scheduler);
    
    // 3. Dominio → DTOs
    return this.mapToResultDTO(result);
  }
}
```

##### **`application/usecases/buildGantt.ts`**
```typescript
export class BuildGantt {
  fromEventLog(events: SimEvent[]): GanttDTO {
    // Solo mapeo puro desde event log
    // SIN "optimización visual" (eso va en UI)
    return {
      slices: this.mapEventsToSlices(events),
      totalTime: this.calculateTotalTime(events),
      processes: this.extractProcessIds(events)
    };
  }
}
```

##### **`application/usecases/computeMetrics.ts`**
```typescript
export class ComputeMetrics {
  fromDomainResult(result: DomainResult): MetricsDTO {
    // USA solo lo que devuelve el dominio
    // NO re-calcula overheads
    return {
      turnaroundTimes: this.calculateFromSnapshots(result.processes),
      avgTurnaround: this.averageFromTotals(result.totals),
      cpuUtilization: result.totals.totalUser / result.totals.makespan
    };
  }
}
```

#### 3.2 Crear DTOs de Aplicación

##### **`application/dto.ts`**
```typescript
// DTOs como contratos entre capas
export interface WorkloadDTO {
  processes: ProcessSpecDTO[];
  metadata: WorkloadMetadataDTO;
}

export interface ConfigDTO {
  algorithm: string;
  tip: number;
  tcp: number;
  tfp: number;
  quantum?: number;
}

export interface SimulationResultDTO {
  gantt: GanttDTO;
  metrics: MetricsDTO;
  events: EventLogDTO;
  summary: SummaryDTO;
}

// ... otros DTOs
```

---

### **FASE 4: INFRAESTRUCTURA DESACOPLADA**

#### 4.1 Crear Puertos

##### **`infrastructure/ports/WorkloadPort.ts`**
```typescript
export interface WorkloadPort {
  parse(file: File): Promise<WorkloadDTO>;
}
```

##### **`infrastructure/ports/ExportPort.ts`**
```typescript
export interface ExportPort {
  exportGantt(gantt: GanttDTO, format: string): string | Blob;
  exportMetrics(metrics: MetricsDTO, format: string): string | Blob;
}
```

#### 4.2 Crear Adaptadores

##### **`infrastructure/parsers/WorkloadParser.ts`**
```typescript
export class WorkloadParser implements WorkloadPort {
  async parse(file: File): Promise<WorkloadDTO> {
    // Solo devuelve DTOs, nunca clases de dominio
    const format = this.detectFormat(file);
    switch (format) {
      case 'json': return this.parseJson(await file.text());
      case 'txt': return this.parseTxt(await file.text());
      case 'csv': return this.parseCsv(await file.text());
      default: throw new Error(`Formato no soportado: ${format}`);
    }
  }
}
```

##### **`infrastructure/exporters/GanttExporter.ts`**
```typescript
export class GanttExporter implements ExportPort {
  exportGantt(gantt: GanttDTO, format: string): string | Blob {
    // Solo consume DTOs
    switch (format) {
      case 'json': return this.toJson(gantt);
      case 'svg': return this.toSvg(gantt);
      case 'pdf': return this.toPdf(gantt);
      default: throw new Error(`Formato no soportado: ${format}`);
    }
  }
}
```

#### 4.3 Crear Factories

##### **`infrastructure/factories/ProcessFactory.ts`**
```typescript
export class ProcessFactory {
  static createFromDTO(specs: ProcessSpecDTO[]): Process[] {
    return specs.map(spec => {
      this.validateSpec(spec);
      return new Process({
        id: spec.id,
        arrivalTime: spec.arrival,
        totalCpuTime: spec.cpuTime,
        totalIoTime: spec.ioTime,
        priority: spec.priority,
        burstCount: spec.bursts
      });
    });
  }
}
```

##### **`infrastructure/factories/SchedulerFactory.ts`**
```typescript
export class SchedulerFactory {
  static createFromConfig(config: ConfigDTO): Scheduler {
    switch (config.algorithm) {
      case 'FCFS': return new FCFSScheduler();
      case 'SJF': return new SJFScheduler();
      case 'SRTF': return new SRTFScheduler();
      case 'PRIORITY': return new PriorityScheduler();
      case 'RR': 
        if (!config.quantum) throw new Error('Quantum requerido para RR');
        return new RoundRobinScheduler(config.quantum);
      default: throw new Error(`Algoritmo no soportado: ${config.algorithm}`);
    }
  }
}
```

---

### **FASE 5: ACTUALIZACIÓN DE UI**

#### 5.1 Limpiar Componentes Svelte

##### **Revisar `ui/components/`**
- [ ] **`CargaArchivo.svelte`**: Solo usar `WorkloadParser`, devolver `WorkloadDTO`
- [ ] **`ConfiguracionPanel.svelte`**: Solo manejar `ConfiguracionDTO`
- [ ] **`GanttFixed.svelte`**: Consumir `GanttDTO`, aplicar "optimización visual" aquí
- [ ] **`MetricasPanel.svelte`**: Consumir `MetricsDTO`

#### 5.2 Crear DTOs de UI

##### **`ui/types.ts`**
```typescript
// Solo DTOs de presentación
export interface ProcesoSimpleDTO {
  nombre: string;
  llegada: number;
  rafaga: number;
  prioridad: number;
}

export interface ConfiguracionDTO {
  algoritmo: string;
  tip: number;
  tcp: number;
  tfp: number;
  quantum?: number;
}

export interface ResultadoVisualizacionDTO {
  gantt: GanttDTO;
  metrics: MetricsDTO;
  summary: ResumenDTO;
}
```

#### 5.3 Crear Composables

##### **`ui/composables/useSimulationUI.ts`**
```typescript
export function useSimulationUI() {
  const runSimulationUseCase = new RunSimulation();
  const buildGanttUseCase = new BuildGantt();
  const computeMetricsUseCase = new ComputeMetrics();
  
  // Estado reactivo (Svelte stores)
  const loading = writable(false);
  const result = writable<SimulationResultDTO | null>(null);
  const error = writable<string | null>(null);
  
  async function executeSimulation(workload: WorkloadDTO, config: ConfigDTO) {
    // Orquesta casos de uso
    // Maneja estado reactivo
  }
  
  return { loading, result, error, executeSimulation };
}
```

---

### **FASE 6: TESTING**

#### 6.1 Tests Unitarios del Dominio

##### **Tests del Motor Único**
- [ ] `tests/domain/core/Simulation.test.ts`
  - Cobro correcto de overheads (TIP/TCP/TFP)
  - Event log como fuente de verdad
  - Orquestación correcta de recursos

##### **Tests de Recursos**
- [ ] `tests/domain/core/Clock.test.ts`
- [ ] `tests/domain/core/Cpu.test.ts`  
- [ ] `tests/domain/core/ReadyQueue.test.ts`
- [ ] `tests/domain/events/EventQueue.test.ts`

##### **Tests de Schedulers**
- [ ] `tests/domain/scheduling/FCFSScheduler.test.ts`
- [ ] `tests/domain/scheduling/SRTFScheduler.test.ts`
- [ ] `tests/domain/scheduling/RoundRobinScheduler.test.ts`
- [ ] etc.

#### 6.2 Tests de Casos de Uso

##### **Tests de Aplicación**
- [ ] `tests/application/usecases/RunSimulation.test.ts`
- [ ] `tests/application/usecases/BuildGantt.test.ts`
- [ ] `tests/application/usecases/ComputeMetrics.test.ts`

#### 6.3 Tests de Adaptadores

##### **Tests de Infraestructura**
- [ ] `tests/infrastructure/parsers/WorkloadParser.test.ts`
- [ ] `tests/infrastructure/exporters/GanttExporter.test.ts`
- [ ] `tests/infrastructure/factories/ProcessFactory.test.ts`
- [ ] `tests/infrastructure/factories/SchedulerFactory.test.ts`

#### 6.4 Tests de Integración

##### **Tests End-to-End**
- [ ] `tests/integration/completeSimulation.test.ts`
- [ ] `tests/integration/eventLogConsistency.test.ts`
- [ ] `tests/integration/metricsVsGanttConsistency.test.ts`

---

### **FASE 7: MIGRACIÓN DE ARCHIVOS**

#### 7.1 Movimientos de Archivos

```bash
# Dominio
mkdir -p src/lib/domain/core src/lib/domain/entities src/lib/domain/events src/lib/domain/scheduling
mv src/lib/entities/Simulador.ts src/lib/domain/core/Simulation.ts # (reescribir)
mv src/lib/entities/Proceso.ts src/lib/domain/entities/Process.ts
mv src/lib/core/eventQueue.ts src/lib/domain/events/EventQueue.ts
mv src/lib/algorithms/ src/lib/domain/scheduling/

# Aplicación  
mkdir -p src/lib/application/usecases src/lib/application/dto
# (crear archivos nuevos según especificaciones arriba)

# Infraestructura
mkdir -p src/lib/infrastructure/parsers src/lib/infrastructure/exporters src/lib/infrastructure/factories
mv src/lib/utils/fileUtils.ts src/lib/infrastructure/parsers/WorkloadParser.ts
mv src/lib/utils/export/ src/lib/infrastructure/exporters/

# UI
mkdir -p src/lib/ui/components src/lib/ui/composables src/lib/ui/types
mv src/lib/components/ src/lib/ui/components/
```

#### 7.2 Actualizar Imports

- [ ] Buscar y reemplazar imports antiguos por nuevos paths
- [ ] Actualizar barrel exports (`index.ts`) 
- [ ] Verificar que no queden referencias rotas

---

### **FASE 8: VALIDACIÓN FINAL**

#### 8.1 Verificación Arquitectónica

##### **Reglas de Dependencia**
- [ ] **UI** → Application (solo DTOs)
- [ ] **Application** → Domain + Infrastructure (puertos)
- [ ] **Infrastructure** → Domain (solo para factories)
- [ ] **Domain** ← ninguna dependencia externa

##### **Event Log como Verdad Única**
- [ ] Gantt se reconstruye **solo** desde event log
- [ ] Métricas calculan **solo** desde event log + totals
- [ ] Overheads cobrados **solo** en Simulation

##### **Sin Clases "Dios"**
- [ ] Simulation orquesta, no ejecuta todo
- [ ] Scheduler decide, no gestiona estado
- [ ] Process solo transiciones, no lógica de simulación

#### 8.2 Testing Completo

##### **Suite de Tests**
```bash
npm run test:unit        # tests unitarios por capa
npm run test:integration # tests de integración  
npm run test:e2e        # tests end-to-end
npm run test:coverage   # cobertura > 90%
```

##### **Validación Funcional**
- [ ] Mismos resultados que versión anterior
- [ ] Performance igual o mejor
- [ ] Todos los casos de uso del integrador funcionan

---

## 📊 CRITERIOS DE ÉXITO

### ✅ **Arquitectura Limpia**
- [x] Motor único en `Simulation` (agregado raíz)
- [ ] Event Log como única fuente de verdad
- [ ] Scheduler API minimalista y clara
- [ ] Overheads (TIP/TCP/TFP) en un solo lugar
- [ ] Dependencias solo hacia abajo

### ✅ **Mantenibilidad**
- [ ] Eliminación de clase "Simulador" como dios
- [ ] Separación clara de responsabilidades
- [ ] Código testeable unitariamente
- [ ] DTOs como contratos entre capas

### ✅ **Correctitud**
- [ ] Todos los tests pasan
- [ ] Métricas consistentes con Gantt
- [ ] Event log inmutable e íntegro
- [ ] Overheads calculados correctamente

---

## ⚠️ RIESGOS Y MITIGACIONES

### 🚨 **Riesgos Identificados**

1. **Ruptura de Event Log**
   - **Mitigación**: Tests exhaustivos de consistencia
   - **Rollback**: Mantener versión anterior hasta validación

2. **Performance del Motor Único**  
   - **Mitigación**: Benchmarks antes/después
   - **Optimización**: Profiling si es necesario

3. **Complejidad de Migración de Scheduler**
   - **Mitigación**: Migrar uno por vez, tests por algoritmo
   - **Validación**: Comparar salidas con versión anterior

4. **Breaking Changes en UI**
   - **Mitigación**: DTOs compatibles hacia atrás
   - **Testing**: Suite completa de UI tests

---

## 📅 Cronograma Estimado

| Fase | Tiempo Estimado | Dependencias |
|------|------------------|--------------|
| 1. Eliminación | 2-3 horas | - |
| 2. Dominio | 8-12 horas | Fase 1 |
| 3. Aplicación | 4-6 horas | Fase 2 |
| 4. Infraestructura | 6-8 horas | Fase 3 |
| 5. UI | 4-6 horas | Fase 4 |
| 6. Testing | 6-8 horas | Todas anteriores |
| 7. Migración | 2-4 horas | Todas anteriores |
| 8. Validación | 3-4 horas | Fase 7 |

**Total: 35-51 horas**

---

## 🎯 **Beneficios Esperados**

### **Inmediatos**
- Tests unitarios triviales por componente
- Scheduler con responsabilidad única y clara
- Event Log como fuente única de verdad
- Eliminación de duplicación de overheads

### **A Mediano Plazo**  
- Fácil extensión con nuevos algoritmos
- UI desacoplada permite cambios visuales sin tocar dominio
- Infraestructura intercambiable (parsers, exporters)
- Código más legible y mantenible

### **A Largo Plazo**
- Base sólida para nuevas características
- Facilidad para optimizaciones de performance
- Posibilidad de múltiples frontends (web, desktop, CLI)
- Arquitectura escalable y profesional

---

*Este plan transforma el simulador de una arquitectura acoplada y compleja hacia un diseño limpio, testeable y mantenible, con el Event Log como única fuente de verdad y el motor unificado como corazón del sistema.*