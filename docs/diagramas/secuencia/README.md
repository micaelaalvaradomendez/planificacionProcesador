# Diagramas de Secuencia UML - Simulador de Planificación de Procesos

Este directorio contiene diagramas de secuencia detallados que documentan el comportamiento del simulador para cada algoritmo de planificación implementado.

## Archivos de Diagramas

### `secuencia.uml` 
Diagrama comprensivo que incluye:
- Flujo general de ejecución de procesos
- Comportamiento específico de cada algoritmo
- Interacciones I/O del sistema
- Transiciones de estado críticas

### Diagramas Detallados por Algoritmo

#### `fcfs_detallado.uml` - First Come First Served
- **Características**: Non-preemptive, orden FIFO estricto
- **Comportamiento TCP**: Solo en cambios de contexto L→C
- **Ready Queue**: Cola FIFO simple
- **Particularidades**: Efecto convoy posible, predecible pero no óptimo

#### `rr_detallado.uml` - Round Robin  
- **Características**: Preemptive con quantum fijo (Q=4)
- **Comportamiento TCP**: SOLO por expiración de quantum, NO por fin natural
- **Ready Queue**: Cola circular con timer
- **Particularidades**: Fairness garantizado, overhead TCP vs throughput

#### `priority_detallado.uml` - Priority Scheduling
- **Características**: Preemptive por prioridad (1=alta, 3=baja)
- **Comportamiento TCP**: Por expropiación inmediata si nueva prioridad > actual
- **Ready Queue**: Cola ordenada por prioridad
- **Particularidades**: Riesgo de starvation, óptimo para workloads heterogéneos

#### `sjf_detallado.uml` - Shortest Job First
- **Características**: Non-preemptive, selección por duración CPU mínima
- **Comportamiento TCP**: Solo en cambios naturales de proceso
- **Ready Queue**: Cola ordenada por tiempo CPU estimado
- **Particularidades**: Minimiza tiempo promedio respuesta, predicción necesaria

#### `srtf_detallado.uml` - Shortest Remaining Time First  
- **Características**: Preemptive agresivo, comparación continua remaining time
- **Comportamiento TCP**: En cada arribo/retorno I/O si hay menor remaining
- **Ready Queue**: Cola dinámica reordenada por tiempo restante
- **Particularidades**: Óptimo para response time, alta frecuencia context switch

#### `io_sistema_completo.uml` - Sistema I/O
- **Transiciones Estado**: B→L instantáneo, TCP solo en L→C
- **Modelo I/O**: Operaciones paralelas independientes
- **Validaciones**: Estados inválidos, I/O doble, duraciones
- **Métricas**: Utilización I/O, impacto multiprogramming

## Datos de Prueba

Todos los diagramas utilizan la misma tanda de ejemplo:
```
P1: arribo=0, rafagas=3, CPU=5, IO=4, prio=2
P2: arribo=1, rafagas=2, CPU=6, IO=3, prio=1  
P3: arribo=3, rafagas=4, CPU=3, IO=2, prio=3
P4: arribo=5, rafagas=3, CPU=4, IO=2, prio=2
P5: arribo=6, rafagas=2, CPU=7, IO=5, prio=1
```

**Configuración sistema**: TIP=1, TFP=1, TCP=1, Quantum=4 (RR)

## Conceptos Clave Documentados

### Transiciones de Estado Críticas
- **NUEVO → LISTO**: TIP (Tiempo Ingreso Proceso)
- **LISTO → CORRIENDO**: TCP (Tiempo Cambio Proceso) - ÚNICO lugar con TCP
- **CORRIENDO → BLOQUEADO**: Instantáneo (0u) - SIN TCP
- **BLOQUEADO → LISTO**: Instantáneo (0u) - SIN TCP  
- **CORRIENDO → TERMINADO**: TFP (Tiempo Finalización Proceso)

### Políticas de Scheduling
- **FCFS**: Orden arribo, sin expropiación
- **RR**: Quantum fijo, expropiación temporal
- **Priority**: Expropiación por prioridad
- **SJF**: Duración mínima, sin expropiación
- **SRTF**: Tiempo restante mínimo, expropiación agresiva

### Gestión I/O
- Operaciones paralelas independientes por proceso
- No hay cola de espera I/O explícita
- Retorno simultáneo de múltiples procesos posible
- Impacto en utilización CPU y throughput sistema

## Visualización

Para visualizar los diagramas:
1. **PlantUML Plugin VS Code**: Instalar extensión PlantUML
2. **Online**: [plantuml.com/plantuml](http://plantuml.com/plantuml)  
3. **Local**: Instalar PlantUML con Java

```bash
# Generar imágenes desde terminal
java -jar plantuml.jar *.uml
```

## Validación con Código

Estos diagramas reflejan la implementación actual en:
- `src/lib/domain/entities/Simulador.ts`
- `src/lib/domain/algorithms/*.ts` 
- `examples/workloads/procesos_tanda_5p.json`

Cualquier discrepancia entre diagramas y código debe ser reportada y corregida.