# 📊 ANÁLISIS DE ARQUITECTURA DEL SIMULADOR

## 🏗️ ESTRUCTURA DE LA CARPETA LIB

### **Core (`src/lib/core/`)**
- **Motor principal de simulación:**
  - `adaptadorSimuladorDominio.ts` - Adaptador principal que orquesta la simulación
  - `adaptadorEntidadesDominio.ts` - Mapeo entre entidades de dominio y estado de simulación
  - `eventQueue.ts` - Cola de eventos prioritaria para la simulación
  - `state.ts` - Estado global de la simulación (procesos, métricas, eventos)
  - `metrics.ts` - Cálculo de métricas y estadísticas
  - `workloadAdapter.ts` - Conversión entre formatos de entrada (JSON/TXT) y tipos del dominio

### **Domain (`src/lib/domain/`)**
- **Algoritmos de planificación (`algorithms/`):**
  - `fcfs.ts`, `priority.ts`, `rr.ts`, `sjf.ts`, `srtf.ts` - Implementaciones específicas
  - `Scheduler.ts` - Interfaz común para todos los algoritmos
- **Entidades (`entities/`):**
  - `Proceso.ts` - Modelo de proceso con estados y transiciones
  - `Simulador.ts` - Entidad raíz del dominio
- **Servicios (`services/`):**
  - `GanttBuilder.ts` - Construcción de diagramas de Gantt desde eventos
  - `MetricsCalculator.ts` - Cálculo avanzado de métricas
- **Tipos (`types.ts`)** - Interfaces y enums centrales del dominio

### **Application (`src/lib/application/`)**
- **Casos de uso (`usecases/`):**
  - `runSimulation.ts` - Ejecución completa de simulación
  - `buildGantt.ts` - Construcción de diagramas de Gantt
  - `computeStatistics.ts` - Cálculo de estadísticas extendidas
  - `simulationRunner.ts` - Runner con timeout y manejo de errores
- **Lógica de aplicación:**
  - `simuladorLogic.ts` - Fachada principal para la UI
  - `simulation.ts` - Estado de simulación para componentes

### **Infrastructure (`src/lib/infrastructure/`)**
- **Parsers (`parsers/`)** - Lectura de archivos TXT/JSON
- **I/O (`io/`)** - Entrada/salida y exportación

### **UI (`src/lib/ui/`)**
- **Componentes Svelte (`components/`)** - Componentes de interfaz
- **Tipos (`types.ts`)** - Tipos específicos para la UI

## 🔄 FLUJO PRINCIPAL DE EJECUCIÓN

1. **Entrada:** Archivo TXT/JSON → `parsers/` → `workloadAdapter`
2. **Simulación:** `simuladorLogic` → `usecases/runSimulation` → `adaptadorSimuladorDominio`
3. **Algoritmos:** `algorithms/` (FCFS, RR, SJF, SRTF, Priority)
4. **Estado:** `state.ts` + `entities/Proceso` + `eventQueue`
5. **Salida:** Eventos → `GanttBuilder` + `MetricsCalculator`
6. **UI:** Componentes Svelte consumen los resultados

## 🎯 SEPARACIÓN DE RESPONSABILIDADES

- **Core:** Motor de simulación, estado, eventos
- **Domain:** Lógica de negocio, algoritmos, entidades
- **Application:** Casos de uso, orquestación
- **Infrastructure:** Parsers, I/O
- **UI:** Presentación, interacción usuario

## 🔗 DEPENDENCIAS CLAVE

- Core ← Domain (usa entidades y algoritmos)
- Application ← Core + Domain (orquesta simulaciones)
- UI ← Application (consume casos de uso)
- Infrastructure → Domain (alimenta entidades)