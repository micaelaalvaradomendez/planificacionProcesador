# Simulador de Planificación de Procesos

## Descripción

Este proyecto implementa un **simulador de planificación del procesador**, cuyo objetivo es reproducir el comportamiento de distintas políticas de planificación en un sistema **monoprocesador y multiprogramado**.  

El simulador permite cargar una tanda de procesos desde un archivo de entrada (TXT o JSON estandarizado) y, en función de los parámetros definidos, ejecuta la simulación mostrando los **eventos, indicadores y diagramas** correspondientes.

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

## Condiciones de uso

- **Multiplataforma**: El simulador debe funcionar en cualquier sistema operativo sin necesidad de instalar dependencias externas
- **Interfaz intuitiva**: La ejecución es intuitiva: basta con cargar el archivo de entrada, seleccionar la política de planificación e iniciar la simulación
- **Casos de prueba**: Se deben realizar pruebas con mínimo cuatro tandas de procesos distintas, analizando y comentando los resultados de cada algoritmo de planificación

## Documentación

El proyecto incluye:

- **Diagramas UML**: Clases, flujo de procesos y arquitectura del simulador
- **Diagramas de Gantt**: Generados automáticamente, coherentes con los resultados de la ejecución
- **Explicación teórica**: De cada algoritmo, fundamentada en *Stallings – Operating Systems: Internals and Design Principles (7ª Ed.)*

