# Simulador de Planificación de Procesos

## Descripción

Este proyecto implementa un **simulador de planificación del procesador**, cuyo objetivo es reproducir el comportamiento de distintas políticas de planificación en un sistema **monoprocesador y multiprogramado**.  

El simulador permite cargar una tanda de procesos desde un archivo de entrada (TXT o JSON estandarizado) y, en función de los parámetros definidos, ejecuta la simulación mostrando los **eventos, indicadores y diagramas** correspondientes.

## 📁 Estructura del Proyecto

```
📁 planificacionProcesador/
├── 📄 README.md                    # Esta documentación
├── 📁 src/                         # Código fuente principal
│   ├── 📁 lib/ui/components/       # Componentes de interfaz
│   │   ├── EventosSimulacion.svelte # 🆕 Cronología de eventos
│   │   ├── TablaResumen.svelte     # 🆕 Tabla comparativa
│   │   ├── PanelExportacion.svelte # 🆕 Sistema de exportación
│   │   └── ...                     # Otros componentes
│   └── ...
├── 📁 demos/                       # 🆕 Demos de funcionalidades
├── 📁 examples/                    # 🆕 Datos de ejemplo y salidas
├── 📁 docs/                        # 🆕 Documentación técnica
│   ├── EVENTOS_SIMULACION_COMPONENTE.md # 📋 EventosSimulacion
│   └── ...
├── 📁 tests/                       # Suite de pruebas
└── 📁 static/                      # Archivos estáticos
```

### 🚀 Inicio Rápido

```bash
# Ejecutar demo principal
npx tsx demos/demo-exportacion-final.ts

# Ejecutar demo integrador
npx tsx demos/demo-integrador.ts

# Ejecutar tests
npx tsx test-motor.ts
```

## Objetivos

### Estrategias de Planificación de CPU
- **FCFS** (First Come, First Served)
- **Prioridad Externa**
- **Round Robin**
- **SPN** (Shortest Process Next)
- **SRTN** (Shortest Remaining Time Next)

### Parámetros del Sistema Operativo
- **TIP**: Tiempo de inicialización de proceso
- **TFP**: Tiempo de finalización de proceso
- **TCP**: Tiempo de cambio de contexto
- **Quantum**: En caso de Round Robin

### Reportes de Ejecución
- **Eventos del sistema**: Arribo, despacho, finalización, I/O, interrupciones
- **Indicadores por proceso y por tanda**:
  - Tiempo de retorno
  - Tiempo de retorno normalizado
  - Tiempo en estado de listo
  - Tiempos medios de retorno de la tanda
- **Estadísticas de uso de CPU**:
  - Tiempo ocioso
  - Tiempo utilizado por el SO
  - Tiempo utilizado por los procesos

## Entrada

El archivo de entrada contiene una **tanda de procesos**, con el siguiente formato (CSV/JSON):

| # | Campo | Descripción |
|---|-------|-------------|
| 1 | Nombre del proceso | Identificador único |
| 2 | Tiempo de arribo | Momento de llegada al sistema |
| 3 | Cantidad de ráfagas de CPU | Número total de ráfagas |
| 4 | Duración de ráfaga de CPU | Tiempo de ejecución |
| 5 | Duración de ráfaga de I/O | Tiempo de entrada/salida |
| 6 | Prioridad externa | Nivel de prioridad |

### Ejemplo (JSON):
```json
[
  {
    "nombre": "P1",
    "arribo": 0,
    "rafagasCPU": 3,
    "duracionCPU": 5,
    "duracionIO": 4,
    "prioridad": 80
  }
]
```

## Salida

- **Archivo de eventos** con la secuencia de lo ocurrido en la simulación
- **Diagrama de Gantt** que represente visualmente la planificación aplicada
- **Resultados por pantalla** con indicadores y métricas de la tanda procesada

## Estructura del Proyecto

```
planificacionProcesador/
├── src/lib/                    # Código fuente principal
│   ├── core/                   # Motor de simulación
│   ├── domain/                 # Entidades y algoritmos
│   ├── infrastructure/         # Exportadores y parsers
│   ├── io/                     # Logging y exportación de eventos
│   └── model/                  # Tipos y validadores
├── tests/                      # Suite completa de tests
│   ├── core/                   # Tests del motor y funcionalidades core
│   ├── algorithms/             # Tests específicos de cada algoritmo
│   ├── logging/                # Tests del sistema de logging
│   └── examples/               # Ejemplos prácticos de uso
├── documentacion/              # Documentación del proyecto
└── README.md                   # Este archivo
```

## Ejecutar Tests

```bash
# Test principal del motor
npm run test
# o
npm run test:core

# Tests específicos por categoría
npm run test:algorithms      # Tests de algoritmos
npm run test:logging         # Tests de logging
npm run test:all            # Todos los tests

# Tests individuales
npx tsx tests/core/test-motor.ts
npx tsx tests/algorithms/test-fcfs-completo.ts
npx tsx tests/logging/test-logging-final.ts
```

## Sistema de Logging

El simulador incluye un sistema completo de logging que exporta todos los eventos de la simulación:

- **Eventos registrados**: Arribo, incorporación, fin ráfaga, agotamiento quantum, fin I/O, atención interrupción I/O, terminación
- **Formatos de exportación**: JSON estructurado y CSV para análisis
- **Filtrado**: Por tipo de evento y por proceso
- **Estadísticas**: Resumen automático de eventos y distribución

```bash
# Ejemplo de uso del sistema de logging
npx tsx tests/examples/ejemplo-logging-completo.ts
```

## Condiciones de uso

- **Multiplataforma**: El simulador debe funcionar en cualquier sistema operativo sin necesidad de instalar dependencias externas
- **Interfaz intuitiva**: La ejecución es intuitiva: basta con cargar el archivo de entrada, seleccionar la política de planificación e iniciar la simulación
- **Casos de prueba**: Se deben realizar pruebas con mínimo cuatro tandas de procesos distintas, analizando y comentando los resultados de cada algoritmo de planificación

## Documentación

El proyecto incluye:

- **Diagramas UML**: Clases, flujo de procesos y arquitectura del simulador
- **Diagramas de Gantt**: Generados automáticamente, coherentes con los resultados de la ejecución
- **Explicación teórica**: De cada algoritmo
- **Tests exhaustivos**: Suite completa de tests organizados por funcionalidad

