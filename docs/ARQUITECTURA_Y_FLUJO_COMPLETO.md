# 🏗️ ARQUITECTURA Y FLUJO COMPLETO DEL PROYECTO
**Guía Definitiva del Simulador de Planificación de Procesos**

---

## 📁 ESTRUCTURA GENERAL DEL PROYECTO

```
src/
├── lib/
│   ├── application/        # CASOS DE USO - LÓGICA DE APLICACIÓN
│   │   ├── usecases/
│   │   │   ├── runSimulation.ts     # ⭐ EJECUTAR SIMULACIÓN COMPLETA
│   │   │   ├── buildGantt.ts        # Construir diagrama de Gantt
│   │   │   ├── computeStatistics.ts # Calcular estadísticas
│   │   │   └── parseInput.ts        # Cargar archivos (⚠️ con bugs)
│   │   └── simuladorLogic.ts        # 🆕 LÓGICA SIMPLIFICADA PARA UI
│   ├── core/               # MOTOR PRINCIPAL DE SIMULACIÓN
│   │   ├── engine.ts       # Motor de eventos discretos
│   │   ├── scheduler.ts    # Factory de schedulers  
│   │   ├── state.ts        # Estado de simulación RT
│   │   ├── metrics.ts      # Cálculo de métricas
│   │   ├── priorityQueue.ts # Cola de prioridad
│   │   ├── adaptadorSimuladorDominio.ts # ⭐ ADAPTADOR PRINCIPAL
│   │   └── index.ts        # Punto de entrada del core
│   ├── domain/             # ENTIDADES DE DOMINIO PURAS
│   │   ├── entities/
│   │   │   ├── Proceso.ts  # ⭐ ENTIDAD PROCESO (PURA)
│   │   │   └── Simulador.ts# ⭐ ENTIDAD SIMULADOR (PURA)
│   │   ├── algorithms/     # ALGORITMOS DE PLANIFICACIÓN
│   │   │   ├── Scheduler.ts# Interfaces y base
│   │   │   ├── fcfs.ts     # First Come First Served
│   │   │   ├── sjf.ts      # Shortest Job First
│   │   │   ├── srtf.ts     # Shortest Remaining Time First
│   │   │   ├── rr.ts       # Round Robin
│   │   │   └── priority.ts # Priority Scheduling
│   │   ├── events/
│   │   │   └── gantt.types.ts # Tipos para eventos Gantt
│   │   ├── types.ts        # ⭐ TODOS LOS TIPOS DEL DOMINIO
│   │   └── utils.ts        # Utilidades del dominio
│   ├── infrastructure/     # SERVICIOS DE INFRAESTRUCTURA
│   │   ├── parsers/        # PARSERS DE ARCHIVOS
│   │   │   ├── jsonParser.ts     # ⭐ PARSER JSON (FUNCIONAL)
│   │   │   ├── txtParser.ts      # ⭐ PARSER TXT/CSV (FUNCIONAL)
│   │   │   └── ParseError.ts     # Errores de parsing
│   │   ├── exporters/      # EXPORTADORES
│   │   │   ├── csvExporter.ts    # Exportar a CSV
│   │   │   └── txtExporter.ts    # Exportar a TXT
│   │   ├── persistence/
│   │   │   └── localStorageRepo.ts # Persistencia local
│   │   └── io/
│   │       └── parseWorkload.ts   # ⭐ PARSER JSON ALTERNATIVO
│   ├── ui/                 # COMPONENTES DE INTERFAZ
│   │   ├── components/        # 🚫 (borrado por usuario)
│   │   └── styles/
│   │       └── tokens.css            # Tokens de diseño
│   └── stores/             # STORES DE SVELTE
│       ├── settings.ts     # Configuración global
│       └── simulation.ts   # Estado de simulación
├── routes/                 # PÁGINAS DE SVELTEKIT
│   ├── +page.svelte       # 🚫 PÁGINA PRINCIPAL (BORRADA)
│   ├── +layout.svelte     # Layout principal
│   ├── +layout.ts         # Configuración del layout
│   ├── resultados/
│   │   └── +page.svelte   # Página de resultados
│   └── simulacion/
│       └── +page.svelte   # Página de simulación
└── static/                # Archivos estáticos
```

---

## 🔄 FLUJO PRINCIPAL DE LA APLICACIÓN

### **1. ENTRADA DE DATOS** 
```
Usuario selecciona archivo → UploadFileWithPreview.svelte
    ↓
Detectar tipo (JSON/CSV/TXT) → simuladorLogic.ts:detectarTipoArchivo()
    ↓
JSON: analizarTandaJson() → Workload
CSV/TXT: parseWorkloadTxt() → Workload
    ↓
Convertir a ProcesoSimple[] → simuladorLogic.ts:cargarArchivoProcesos()
```

### **2. CONFIGURACIÓN**
```
Usuario configura parámetros:
- Policy: FCFS | PRIORITY | RR | SPN | SRTN  
- TIP: Tiempo ingreso al sistema
- TFP: Tiempo finalización proceso
- TCP: Tiempo cambio contexto
- Quantum: (solo para RR)
    ↓
Validar configuración → simuladorLogic.ts:validarConfiguracion()
```

### **3. EJECUCIÓN DE SIMULACIÓN**
```
simuladorLogic.ts:ejecutarSimulacion()
    ↓
Crear Workload completo con procesos + config
    ↓
ejecutarSimulacionCompleta() en runSimulation.ts
    ↓
AdaptadorSimuladorDominio.ejecutar()
    ↓
Simulador (entidad dominio) + algoritmo seleccionado
    ↓
Eventos discretos + Cola de prioridad → SimEvent[]
    ↓
Calcular métricas → Metrics
    ↓
ResultadoEjecucion con eventos + métricas
```

### **4. PRESENTACIÓN DE RESULTADOS**
```
ResultadoSimulacion → simuladorLogic.ts
    ↓
Guardar en localStorage → guardarDatosSimulacion()
    ↓
Navegar a /resultados
    ↓
Mostrar Gantt + Stats + Events
```

---

## ⭐ COMPONENTES PRINCIPALES Y RESPONSABILIDADES

### **DOMINIO PURO (Sin dependencias externas)**

#### **`src/lib/domain/entities/Proceso.ts`**
```typescript
class Proceso {
  // Estado del proceso
  id: string
  estado: EstadoProceso  
  arribo: number
  rafagasCPU: number
  duracionCPU: number
  // Métodos para transiciones de estado
  activar(), bloquear(), terminar()
  procesarCPU(), procesarIO()
}
```

#### **`src/lib/domain/entities/Simulador.ts`**
```typescript
class Simulador {
  // Estado global del sistema
  tiempoActual: number
  procesoActualCPU?: Proceso
  readyQueue: Proceso[]
  procesosBloqueados: Proceso[]
  colaEventos: PriorityQueue<Evento>
  
  // Operaciones principales
  programarEvento(), procesarSiguienteEvento()
  asignarProcesoACpu(), removerProcesoDeCpu()
  agregarAReadyQueue(), marcarComoTerminado()
}
```

#### **`src/lib/domain/algorithms/`**
**Patrón Strategy para algoritmos:**
- `fcfs.ts` - First Come First Served (no expropiativo)
- `sjf.ts` - Shortest Job First (no expropiativo)  
- `srtf.ts` - Shortest Remaining Time First (expropiativo)
- `rr.ts` - Round Robin (expropiativo por quantum)
- `priority.ts` - Priority Scheduling (expropiativo)

```typescript
interface EstrategiaScheduler {
  elegirSiguiente(colaListos: Proceso[]): Proceso | undefined
  debeExpropiar?(actual: Proceso, candidato: Proceso): boolean
  ordenarColaListos(cola: Proceso[]): void
}
```

### **MOTOR DE SIMULACIÓN**

#### **`src/lib/core/adaptadorSimuladorDominio.ts`**
⭐ **COMPONENTE MÁS IMPORTANTE**
```typescript
class AdaptadorSimuladorDominio {
  constructor(workload: Workload)
  ejecutar(): ResultadoSimulacionDominio
  // Convierte Workload → Entidades dominio
  // Ejecuta simulación con Simulador + algoritmo
  // Convierte resultado → formato esperado
}
```

#### **`src/lib/core/scheduler.ts`**
```typescript
// Factory Pattern para crear schedulers
function createScheduler(policy: Policy): Scheduler
```

#### **`src/lib/core/metrics.ts`**
```typescript
function calcularMetricasCompletas(eventos: SimEvent[]): Metrics
// Calcula: tiempo retorno, espera, respuesta, utilización CPU
```

### **CASOS DE USO (APLICACIÓN)**

#### **`src/lib/application/usecases/runSimulation.ts`**
⭐ **PUNTO DE ENTRADA PRINCIPAL**
```typescript
async function ejecutarSimulacionCompleta(workload: Workload): Promise<ResultadoEjecucion>
// Valida entrada → Ejecuta con dominio → Calcula métricas → Retorna resultado
```

#### **`src/lib/application/simuladorLogic.ts`**
⭐ **LÓGICA SIMPLIFICADA PARA UI**
```typescript
// Funciones para la interfaz:
cargarArchivoProcesos(file: File): Promise<{procesos: ProcesoSimple[], error?: string}>
validarConfiguracion(config: ConfiguracionSimulacion): {valida: boolean, errores: string[]}
ejecutarSimulacion(procesos: ProcesoSimple[], config: ConfiguracionSimulacion): Promise<ResultadoSimulacion>
guardarDatosSimulacion(), cargarDatosSimulacion(), limpiarDatosSimulacion()
```

### **INFRAESTRUCTURA**

#### **Parsers de Archivos:**
- **`jsonParser.ts`** - Formato JSON con procesos + configuración
- **`txtParser.ts`** - Formato CSV/TXT según consigna profesor
- **`parseWorkload.ts`** - Parser JSON alternativo (más potente)

#### **Componentes UI:**
- **`UploadFileWithPreview.svelte`** - Carga de archivos con preview
- **`Gantt.svelte`** - Diagrama de Gantt de ejecución
- **`StatsPanel.svelte`** - Panel de estadísticas/métricas

---

## 🚀 TIPOS DE DATOS PRINCIPALES

### **`ProcesoSimple` (UI)**
```typescript
interface ProcesoSimple {
  nombre: string
  llegada: number  
  rafaga: number
  prioridad: number
}
```

### **`ProcessSpec` (Dominio)**
```typescript
interface ProcessSpec {
  name: string
  tiempoArribo: number
  rafagasCPU: number
  duracionRafagaCPU: number
  duracionRafagaES: number
  prioridad: number
}
```

### **`Workload` (Entrada completa)**
```typescript
interface Workload {
  workloadName: string
  processes: ProcessSpec[]
  config: RunConfig
}
```

### **`ResultadoEjecucion` (Salida)**
```typescript
interface ResultadoEjecucion {
  exitoso: boolean
  eventos: SimEvent[]
  metricas: Metrics
  tiempoTotal: number
  error?: string
  advertencias?: string[]
}
```

---

## 🎯 PUNTOS CLAVE PARA DESARROLLO DE UI

### **LO QUE FUNCIONA PERFECTAMENTE:**
✅ **Motor de simulación** - Core + Dominio  
✅ **Parsers de archivos** - JSON y TXT/CSV  
✅ **Algoritmos** - Todos los 5 algoritmos implementados  
✅ **Cálculo de métricas** - Completo y validado  
✅ **Adaptador principal** - AdaptadorSimuladorDominio  
✅ **Caso de uso principal** - ejecutarSimulacionCompleta()  
✅ **Lógica simplificada** - simuladorLogic.ts (refactorizada)  

### **LO QUE HAY QUE RECREAR:**
🚫 **Página principal** - `/src/routes/+page.svelte` (borrada)  
🚫 **Componentes de control** - UI para configuración  
🚫 **Flujo de navegación** - Entre main page y resultados  

### **FLUJO RECOMENDADO PARA UI:**

1. **Página Principal (`+page.svelte`)**:
   ```typescript
   import { cargarArchivoProcesos, validarConfiguracion, ejecutarSimulacion, guardarDatosSimulacion } from '$lib/application/simuladorLogic'
   ```
   - UploadFileWithPreview para cargar archivo
   - Form para configurar TIP, TFP, TCP, Policy, Quantum
   - Botón para ejecutar simulación
   - Navegación automática a /resultados

2. **Página de Resultados (`/resultados/+page.svelte`)**:
   ```typescript
   import { cargarDatosSimulacion } from '$lib/application/simuladorLogic'
   ```
   - Cargar datos desde localStorage
   - Mostrar Gantt, Stats, Events
   - Botón "Nueva simulación" → volver a main

### **IMPORTS PRINCIPALES PARA UI:**
```typescript
// Para lógica de negocio simplificada
import { cargarArchivoProcesos, validarConfiguracion, ejecutarSimulacion } from '$lib/application/simuladorLogic'

// Para componentes UI
import UploadFileWithPreview from '$lib/ui/components/UploadFileWithPreview.svelte'
import StatsPanel from '$lib/ui/components/StatsPanel.svelte'
import Gantt from '$lib/ui/components/Gantt.svelte'

// Para tipos
import type { ProcesoSimple, ConfiguracionSimulacion } from '$lib/application/simuladorLogic'
```

---

## 📋 RESUMEN EJECUTIVO

**El proyecto tiene una arquitectura sólida con:**

1. **Dominio puro** - Entidades Proceso y Simulador sin dependencias
2. **Motor robusto** - Core con eventos discretos y algoritmos validados  
3. **Parsers funcionales** - JSON y TXT/CSV completamente implementados
4. **Caso de uso principal** - ejecutarSimulacionCompleta() probado y funcional
5. **Lógica simplificada** - simuladorLogic.ts para interfaz simplificada

**Solo necesitas recrear:**
- Página principal con form de configuración  
- Flujo de navegación entre páginas
- Integración con componentes UI existentes

**Todo el backend, parsers, algoritmos y motor de simulación están completos y funcionando.**
