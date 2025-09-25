# Simulador de Planificación de Procesos

Una aplicación web interactiva para simular y visualizar algoritmos de planificación de procesos del sistema operativo, construida con SvelteKit y TypeScript.

## 🎯 Características

- **Múltiples algoritmos**: FCFS, SJF, SRTF, Round Robin, Priority
- **Visualización**: Diagrama de Gantt interactivo
- **Métricas**: Tiempo de espera, retorno, respuesta y uso de CPU
- **Carga de datos**: Desde archivos TXT o datos de ejemplo
- **Exportación**: Resultados en CSV y TXT
- **Historial**: Persistencia de simulaciones anteriores

## 🏗️ Arquitectura

El proyecto sigue una **arquitectura hexagonal (clean architecture)** por capas, garantizando separación de responsabilidades y escalabilidad:

```
src/
├─ routes/                         # Páginas (SvelteKit)
│  ├─ +layout.svelte / +layout.ts
│  ├─ +page.svelte                 # Home (carga TXT y demo)
│  ├─ simulacion/+page.svelte      # Controles + Gantt + métricas
│  └─ resultados/+page.svelte      # Historial / exportes
│
└─ lib/
   ├─ domain/                      # LÓGICA DE NEGOCIO (TS puro)
   │  ├─ entities/                 # Entidades y value-objects
   │  │  ├─ Proceso.ts
   │  │  └─ Simulador.ts
   │  ├─ algorithms/               # Estrategias de planificación
   │  │  ├─ Scheduler.ts           # interfaz común
   │  │  ├─ fcfs.ts
   │  │  ├─ sjf.ts
   │  │  ├─ srtf.ts
   │  │  ├─ rr.ts
   │  │  └─ priority.ts
   │  ├─ events/                   # Modelos para timeline/Gantt
   │  │  └─ gantt.types.ts
   │  ├─ types.ts                  # Enums (Estado, Algoritmo), DTOs
   │  └─ utils.ts                  # Helpers puros (colas, tiempos)
   │
   ├─ application/                 # ORQUESTACIÓN (casos de uso)
   │  ├─ usecases/
   │  │  ├─ runSimulation.ts       # arma simulación y ejecuta estrategia
   │  │  ├─ computeStatistics.ts   # KPI: espera, retorno, resp., uso CPU
   │  │  └─ buildGantt.ts          # adapta eventos para el componente
   │  └─ ports/                    # Interfaces a infra (parser, storage, export)
   │     ├─ FileParserPort.ts
   │     ├─ HistoryRepoPort.ts
   │     └─ ExporterPort.ts
   │
   ├─ infrastructure/              # ADAPTERS (implementan ports)
   │  ├─ parsers/
   │  │  └─ txtParser.ts           # "LectorEntrada" (TXT → Proceso[])
   │  ├─ persistence/
   │  │  └─ localStorageRepo.ts    # guarda/lee corridas
   │  └─ exporters/
   │     ├─ csvExporter.ts
   │     └─ txtExporter.ts
   │
   ├─ stores/                      # Estado reactivo (Svelte stores)
   │  ├─ simulation.ts             # procesos, config, timeline, stats
   │  └─ settings.ts               # algoritmo, quantum, tcp/tip/tfp
   │
   ├─ ui/                          # Presentación (componentes Svelte)
   │  ├─ components/
   │  │  ├─ UploadFile.svelte
   │  │  ├─ Controls.svelte        # selects, sliders, botones
   │  │  ├─ Gantt.svelte
   │  │  ├─ StatsPanel.svelte
   │  │  └─ LogViewer.svelte
   │  └─ styles/
   │     └─ tokens.css             # variables y utilidades globales
   │
   ├─ mocks/                       # Datos de ejemplo (para pruebas rápidas)
   │  └─ sample.txt
   └─ utils/                       # Utilidades transversales (no de dominio)
      └─ format.ts
```

## 🧩 Responsabilidades por Capa

### **Domain** (Lógica de Negocio)
- **TS puro**: No importa Svelte ni APIs del navegador
- **Entidades**: Clases `Proceso`, `Simulador`
- **Algoritmos**: Implementaciones de estrategias de planificación
- **Tipos**: Enums, interfaces y DTOs

```ts
// algorithms/Scheduler.ts (interfaz común)
export interface Scheduler {
  name: string;
  run(input: {
    procesos: Proceso[];
    quantum?: number;
    tcp?: number; tip?: number; tfp?: number;
  }): { timeline: GanttEvent[]; tiempoTotal: number; finalizados: Proceso[] };
}
```

### **Application** (Casos de Uso)
- **Orquestación**: Coordina qué algoritmo usar y cómo transformar resultados
- **Use Cases**: `runSimulation`, `computeStatistics`, `buildGantt`
- **Ports**: Interfaces que definen contratos con la infraestructura

### **Infrastructure** (Adaptadores)
- **Implementa ports**: Conexión con el mundo exterior
- **Parsers**: Lectura de archivos TXT
- **Persistence**: LocalStorage para historial
- **Exporters**: Generación de CSV/TXT

### **Stores** (Estado Reactivo)
- **Settings**: Algoritmo seleccionado, quantum, costos de contexto
- **Simulation**: Procesos cargados, timeline, estadísticas, logs

### **UI** (Presentación)
- **Componentes Svelte**: Interfaz de usuario
- **Solo usa**: Stores y casos de uso
- **No accede**: Directamente al dominio

##     Flujo de Datos

1. **UI** → Llama casos de uso → **Application**
2. **Application** → Usa entidades y algoritmos → **Domain**
3. **Application** → Implementa ports → **Infrastructure**
4. **Stores** → Mantiene estado reactivo → **UI**

## 🎮 Rutas de la Aplicación

- **`/`** (Home): Carga de archivos TXT y datos de ejemplo
- **`/simulacion`**: Controles, visualización Gantt y métricas
- **`/resultados`**: Historial de simulaciones y exportación

## 🚀 Desarrollo

### Instalación
```sh
npm install
```

### Desarrollo
```sh
npm run dev

# Con apertura automática del navegador
npm run dev -- --open
```

### Construcción
```sh
npm run build
```

### Preview
```sh
npm run preview
```

### Despliegue en GitHub Pages
```sh
npm run deploy:gh
```

## 📋 Convenciones

- **Imports**: Siempre desde `$lib/...` (evita paths relativos frágiles)
- **Naming**: 
  - PascalCase para clases (`Proceso`)
  - camelCase para funciones/variables
  - kebab-case para archivos Svelte
- **Dependencias**:
  - `domain/` **no** importa nada de `ui/`, `stores/` ni `infrastructure/`
  - `application/` puede importar `domain/` y `ports/` (interfaces), pero **no** implementaciones
  - `ui/` solo usa **stores** y **usecases**

## 🧪 Datos de Prueba

El proyecto incluye datos de ejemplo en `src/lib/mocks/sample.txt` para pruebas rápidas sin necesidad de cargar archivos externos.

## 🏛️ Arquitectura Técnica

Esta aplicación implementa los principios de **Clean Architecture**:
- **Independencia de frameworks**: La lógica de negocio no depende de Svelte
- **Testabilidad**: Cada capa puede probarse independientemente  
- **Independencia de UI**: Los algoritmos funcionan sin interfaz gráfica
- **Independencia de base de datos**: Los puertos abstraen la persistencia
