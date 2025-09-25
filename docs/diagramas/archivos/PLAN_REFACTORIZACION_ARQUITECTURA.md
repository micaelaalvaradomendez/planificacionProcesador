# Plan de Refactorización Arquitectónica - Simulador de Planificación

## 🎯 Objetivo General
Simplificar la arquitectura a **4 capas reales**, eliminando redundancias, unificando el motor de simulación, y estableciendo el **Event Log como única fuente de verdad**.

## 📋 Resumen de Cambios

### 🏗️ Nueva Arquitectura (4 Capas)
1. **UI** - Solo Svelte + DTOs de presentación
2. **Application** - Casos de uso + DTOs de aplicación  
3. **Domain** - Motor único + Event Log como verdad
4. **Infrastructure** - Adaptadores + detalles técnicos

---

## 🔥 FASE 1: ELIMINACIÓN Y LIMPIEZA

### 1.1 Eliminar archivos redundantes de `core/`
```bash
# Eliminar capa core redundante
rm src/lib/core/index.ts
rm src/lib/core/state.ts
rm src/lib/core/registroEventos.ts
rm src/lib/core/events.ts
rm src/lib/core/adaptadorSimuladorDominio.ts
rm src/lib/core/workloadAdapter.ts
rm src/lib/services/index.ts
```

### 1.2 Eliminar imports y dependencias rotas
- [ ] Buscar y eliminar todas las referencias a archivos eliminados
- [ ] Limpiar imports no utilizados en toda la codebase
- [ ] Eliminar tipos duplicados o redundantes

---

## 🏢 FASE 2: CREACIÓN DE LA NUEVA ESTRUCTURA

### 2.1 Crear estructura de directorios
```bash
mkdir -p src/lib/application/usecases
mkdir -p src/lib/application/dto
mkdir -p src/lib/domain/core
mkdir -p src/lib/domain/entities
mkdir -p src/lib/domain/events
mkdir -p src/lib/domain/scheduling
mkdir -p src/lib/infrastructure/parsers
mkdir -p src/lib/infrastructure/exporters
mkdir -p src/lib/infrastructure/adapters
mkdir -p src/lib/ui/components
mkdir -p src/lib/ui/composables
mkdir -p src/lib/ui/styles
```

### 2.2 Crear archivos de DTOs
- [ ] **`src/lib/application/dto.ts`** - Todos los DTOs de aplicación
- [ ] **`src/lib/ui/types.ts`** - Solo DTOs de UI

---

## 🔄 FASE 3: MIGRACIÓN Y REESCRITURA DEL DOMINIO

### 3.1 Motor Único - `domain/core/Simulation.ts`
- [ ] **REESCRIBIR COMPLETAMENTE** `entities/Simulador.ts` como `domain/core/Simulation.ts`
- [ ] Unificar toda la lógica de simulación en una sola clase
- [ ] Implementar Event Log como única fuente de verdad
- [ ] Manejar TIP/TCP/TFP en un solo lugar

#### Responsabilidades del Motor Único:
```typescript
class Simulation {
  // Event Log como única fuente de verdad
  private eventLog: SimEvent[] = [];
  
  // Estados internos (privados)
  private clock: Clock;
  private cpu: Cpu;
  private readyQueue: ReadyQueue;
  private eventQueue: EventQueue;
  
  // API pública simple
  public run(processes: Process[], scheduler: Scheduler): DomainOutput;
  
  // Métodos privados para transiciones de SO
  private handleJobArrival(event: JobArrives): void;
  private handleTipDone(event: TipDone): void;
  private handleDispatch(event: Dispatch): void;
  private handleCpuBurstDone(event: CpuBurstDone): void;
  private handleQuantumExpired(event: QuantumExpired): void;
  private handleIoDone(event: IoDone): void;
  private handleProcessDone(event: ProcessDone): void;
}
```

### 3.2 Componentes del Dominio
- [ ] **`domain/core/Clock.ts`** - Reloj del sistema
- [ ] **`domain/core/Cpu.ts`** - Estado de CPU + medición de TCP
- [ ] **`domain/core/EventQueue.ts`** - Mover de `core/eventQueue.ts`
- [ ] **`domain/core/ReadyQueue.ts`** - Cola de procesos listos con políticas
- [ ] **`domain/events/Event.ts`** - Eventos sellados del sistema
- [ ] **`domain/scheduling/Scheduler.ts`** - Interfaz minimalista

### 3.3 Entidades Simplificadas
- [ ] **`domain/entities/Process.ts`** - Simplificar, solo estados + transiciones
- [ ] Eliminar lógica duplicada de estado distribuida

---

## 📦 FASE 4: CAPA DE APLICACIÓN

### 4.1 Casos de Uso Puros
- [ ] **`application/usecases/runSimulation.ts`**
  ```typescript
  export function runSimulation(
    workload: WorkloadDTO, 
    config: ConfigDTO
  ): Promise<DomainOutputDTO>
  ```

- [ ] **`application/usecases/buildGantt.ts`**
  ```typescript
  export function buildGantt(events: SimEvent[]): GanttDTO
  ```

- [ ] **`application/usecases/computeMetrics.ts`**
  ```typescript
  export function computeMetrics(
    events: SimEvent[], 
    totals: TotalsDTO
  ): MetricsDTO
  ```

### 4.2 Fachada de Aplicación
- [ ] **`application/simuladorLogic.ts`** - Orquesta casos de uso
- [ ] Migrar desde `services/` existentes

---

## 🔌 FASE 5: CAPA DE INFRAESTRUCTURA

### 5.1 Factories y Adaptadores
- [ ] **`infrastructure/adapters/processFactory.ts`**
  ```typescript
  export function createProcesses(workload: WorkloadDTO): Process[]
  ```

- [ ] **`infrastructure/adapters/schedulerFactory.ts`**
  ```typescript
  export function createScheduler(config: ConfigDTO): Scheduler
  ```

### 5.2 Parsers (migrar existentes)
- [ ] Mover `utils/fileUtils.ts` → `infrastructure/parsers/`
- [ ] Asegurar que solo trabajen con DTOs

### 5.3 Exporters (migrar existentes)
- [ ] Mover `utils/export/` → `infrastructure/exporters/`
- [ ] Asegurar que solo trabajen con DTOs

---

## 🎨 FASE 6: CAPA DE UI

### 6.1 Componentes Svelte
- [ ] Revisar todos los componentes en `ui/components/`
- [ ] Asegurar que solo usen DTOs, nunca clases de dominio
- [ ] Limpiar imports de `core/` eliminado

### 6.2 Composables
- [ ] **`ui/composables/useSimulationUI.ts`** - Estado reactivo
- [ ] **`ui/composables/useFileDownload.ts`** - Manejo de descargas

---

## 🧪 FASE 7: ACTUALIZACIÓN DE TESTS

### 7.1 Tests del Dominio
- [ ] Actualizar tests de `core/` → `domain/`
- [ ] Tests del motor único `Simulation.ts`
- [ ] Tests de componentes `Clock`, `Cpu`, `EventQueue`, `ReadyQueue`

### 7.2 Tests de Casos de Uso
- [ ] Tests de `runSimulation`, `buildGantt`, `computeMetrics`
- [ ] Tests de integración entre capas

### 7.3 Tests de Infraestructura
- [ ] Tests de parsers, exporters, factories
- [ ] Mocks de DTOs, no de clases de dominio

---

## 📚 FASE 8: DOCUMENTACIÓN

### 8.1 Actualizar Diagramas
- [ ] Generar imagen del nuevo diagrama `mejoraarchivos.puml`
- [ ] Actualizar otros diagramas para reflejar nueva arquitectura
- [ ] Eliminar diagramas obsoletos

### 8.2 Actualizar README y Docs
- [ ] Documentar nueva arquitectura en `README.md`
- [ ] Actualizar guías de desarrollo
- [ ] Documentar flujo de DTOs entre capas

---

## 🎯 FASE 9: VALIDACIÓN FINAL

### 9.1 Verificación Arquitectónica
- [ ] **Regla de Dependencias**: Solo hacia abajo
  - UI → Application
  - Application → Domain + Infrastructure  
  - Domain ← Infrastructure (adaptadores)
- [ ] **Sin referencias circulares**
- [ ] **DTOs como contratos entre capas**

### 9.2 Testing Completo
- [ ] Ejecutar suite completa de tests
- [ ] Tests de integración end-to-end
- [ ] Validar que Event Log es única fuente de verdad

### 9.3 Performance y Correctitud
- [ ] Benchmarks de performance
- [ ] Validar salidas vs versión anterior
- [ ] Pruebas de carga con workloads complejos

---

## 📊 CRITERIOS DE ÉXITO

### ✅ Arquitectura
- [x] Solo 4 capas reales (UI, Application, Domain, Infrastructure)
- [ ] Motor único en `domain/core/Simulation.ts`
- [ ] Event Log como única fuente de verdad
- [ ] Dependencias solo hacia abajo
- [ ] DTOs como contratos puros entre capas

### ✅ Mantenibilidad
- [ ] Eliminación de redundancias en `core/`
- [ ] Separación clara de responsabilidades
- [ ] Código más testeable y modular
- [ ] Documentación actualizada

### ✅ Correctitud
- [ ] Todos los tests pasan
- [ ] Misma funcionalidad que versión anterior
- [ ] Performance igual o mejor
- [ ] UI funciona sin cambios para el usuario

---

## ⚠️ RIESGOS Y MITIGACIONES

### 🚨 Riesgos Identificados
1. **Ruptura de funcionalidad existente** → Tests exhaustivos antes/después
2. **Performance degradada** → Benchmarks y profiling
3. **Complejidad del Event Log** → Implementación incremental
4. **Breaking changes en UI** → Migración gradual de DTOs

### 🛡️ Mitigaciones
- Implementar por fases con rollback posible
- Mantener suite de tests funcionando en cada paso  
- Documentar cada cambio arquitectónico
- Validar con casos de uso reales del integrador

---

## 📅 Estimación de Tiempo

| Fase | Descripción | Tiempo Estimado |
|------|-------------|-----------------|
| 1 | Eliminación y Limpieza | 1-2 horas |
| 2 | Creación de Estructura | 30 min |
| 3 | Migración del Dominio | 4-6 horas |
| 4 | Capa de Aplicación | 2-3 horas |
| 5 | Capa de Infraestructura | 2-3 horas |
| 6 | Capa de UI | 2-3 horas |
| 7 | Actualización de Tests | 3-4 horas |
| 8 | Documentación | 1-2 horas |
| 9 | Validación Final | 2-3 horas |

**Total Estimado: 17-26 horas**

---

## 🚀 ORDEN DE EJECUCIÓN RECOMENDADO

1. **FASE 2** (Estructura) → Base para todo lo demás
2. **FASE 1** (Limpieza) → Eliminar conflictos  
3. **FASE 3** (Dominio) → Núcleo de la aplicación
4. **FASE 5** (Infraestructura) → Adaptadores necesarios
5. **FASE 4** (Aplicación) → Casos de uso sobre dominio sólido
6. **FASE 6** (UI) → Presentación sobre aplicación estable
7. **FASE 7** (Tests) → Validación de cada capa
8. **FASE 8-9** (Docs + Validación) → Finalización

---

*Este plan asegura una transición ordenada hacia una arquitectura más limpia, mantenible y correcta, con el Event Log como única fuente de verdad y el motor unificado como corazón del sistema.*