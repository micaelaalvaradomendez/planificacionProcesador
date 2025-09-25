# Plan de Implementación - Diagramas de Secuencia Corregidos

## Resumen Ejecutivo

Este documento detalla el plan para implementar las mejoras identificadas en los diagramas de secuencia del simulador de planificación de procesos, alineándolos con los requerimientos académicos del integrador y la arquitectura basada en eventos.

## Diagramas Corregidos Generados

### 1. Diagramas Mejorados
- ✅ `secuencia_general_corregido.uml` - Flujo general con orden de eventos explícito
- ✅ `fcfs_corregido.uml` - First Come First Served con TCP y tie-breakers
- ✅ `rr_corregido.uml` - Round Robin con quantum explícito y TCP por expropiación
- ✅ `sjf_corregido.uml` - Shortest Job First con terminología académica correcta
- ✅ `srtf_corregido.uml` - Shortest Remaining Time First con expropiación
- ✅ `priority_corregido.uml` - Priority Scheduling con manejo de prioridades

### 2. Mejoras Implementadas en Diagramas

#### A. Correcciones Globales Aplicadas
- **Orden de eventos simultáneos explícito** (C→T, C→B, C→L, B→L, N→L, L→C)
- **TCP (Tiempo de Cambio de Proceso) visible** en todas las transiciones L→C y C→L
- **EventLogger como fuente de verdad** registrando cada transición con metadatos
- **Estados de procesos explícitos** (NUEVO, LISTO, CORRIENDO, BLOQUEADO, TERMINADO)
- **CPU idle detectado** cuando ReadyQueue vacía
- **Tie-breakers definidos** para cada algoritmo

#### B. Correcciones por Algoritmo

**FCFS:**
- No expropiativo confirmado
- TCP solo en DISPATCH
- Orden de llegada estricto

**Round Robin:**
- Quantum explícito y programación de QUANTUM_EXPIRES
- TCP por expropiación quantum
- Cancelación de quantum cuando proceso termina antes
- Proceso expropiado va al final de la cola

**SJF vs SRTF:**
- Terminología académica correcta (Job vs Remaining Time)
- SJF: No expropiativo, ordena por trabajo total
- SRTF: Expropiativo, ordena por tiempo restante
- Evaluación de expropiación en cada N→L

**Priority Scheduling:**
- Convención menor número = mayor prioridad
- Expropiación por prioridad en cada N→L y B→L
- Tie-breaker por orden de llegada
- Consideraciones de starvation y aging

## Plan de Implementación

### Fase 1: Arquitectura del Motor de Eventos (Semana 1-2)

#### 1.1 EventLogger Mejorado
```typescript
interface EventoSimulacion {
  timestamp: number;
  tipo: TipoEvento;
  procesoId: string;
  transicion: string;
  metadatos: {
    tcp?: number;
    prioridad?: number;
    quantum?: number;
    tiempoRestante?: number;
    causa?: string;
  };
}
```

**Tareas:**
- [ ] Extender EventLogger para registrar metadatos detallados
- [ ] Implementar orden de eventos simultáneos configurable
- [ ] Añadir validación de consistencia de estados
- [ ] Crear métricas derivadas (tiempo de espera, TCP total, utilización CPU)

#### 1.2 Gestor de Estados Explícito
```typescript
class GestorEstados {
  private estadosProcesos: Map<string, EstadoProceso>;
  
  transicion(procesoId: string, estadoAnterior: Estado, estadoNuevo: Estado, causa: string): void;
  validarTransicion(desde: Estado, hacia: Estado): boolean;
  obtenerProcesosEnEstado(estado: Estado): Proceso[];
}
```

**Tareas:**
- [ ] Implementar máquina de estados explicita para procesos
- [ ] Validar transiciones permitidas según algoritmo
- [ ] Registrar causa de cada transición en EventLogger

### Fase 2: Algoritmos de Planificación Corregidos (Semana 3-4)

#### 2.1 Interfaz Común de Planificadores
```typescript
interface PlanificadorBase {
  nombre: string;
  esExpropiativo: boolean;
  manejarArriboProceso(proceso: Proceso, tiempoActual: number): EventosGenerados;
  seleccionarProximoProceso(readyQueue: Proceso[], tiempoActual: number): Proceso | null;
  evaluarExpropiacion?(procesoNuevo: Proceso, procesoActual: Proceso): boolean;
}
```

#### 2.2 Implementaciones Específicas

**FCFS Corregido:**
- [ ] No expropiación, orden estricto de llegada
- [ ] TCP solo en DISPATCH
- [ ] Tie-breaker por timestamp de llegada

**Round Robin Corregido:**
- [ ] Quantum configurable con timer explícito
- [ ] Manejo de QUANTUM_EXPIRES vs FIN_RAFAGA_CPU
- [ ] TCP por expropiación quantum
- [ ] Proceso expropiado al final de cola

**SJF Corregido:**
- [ ] No expropiativo, ordenación por trabajo total
- [ ] Terminología "Job" en lugar de "Burst"
- [ ] Tie-breaker por orden de llegada

**SRTF Corregido:**
- [ ] Expropiativo, evaluación en cada N→L
- [ ] Ordenación por tiempo restante dinámico
- [ ] TCP por expropiación en llegadas

**Priority Corregido:**
- [ ] Expropiación por prioridad (menor número = mayor prioridad)
- [ ] Evaluación en N→L y B→L
- [ ] Opciones de aging para evitar starvation

### Fase 3: Simulador de Eventos Mejorado (Semana 5-6)

#### 3.1 Cola de Eventos con Orden Explícito
```typescript
class ColaEventos {
  private eventos: EventoSimulacion[];
  private ordenEventosSimultaneos: TipoEvento[];
  
  programarEvento(evento: EventoSimulacion): void;
  procesarEventosEnTiempo(tiempo: number): EventoSimulacion[];
  resolverEventosSimultaneos(eventos: EventoSimulacion[]): EventoSimulacion[];
}
```

**Tareas:**
- [ ] Implementar orden de resolución de eventos simultáneos
- [ ] Manejo de cancelación de eventos (ej. QUANTUM_EXPIRES)
- [ ] Validación de coherencia temporal

#### 3.2 Gestor de TCP Explícito
```typescript
class GestorTCP {
  private tcp: number;
  
  cobrarTCP(causa: 'DISPATCH' | 'PREEMPTION', contexto: string): number;
  registrarTCP(procesoId: string, causa: string, tiempo: number): void;
  calcularTCPTotal(): number;
}
```

**Tareas:**
- [ ] Centralizar cobro de TCP con causas explícitas
- [ ] Registrar cada TCP en EventLogger
- [ ] Métricas de overhead por algoritmo

### Fase 4: Validación y Testing (Semana 7-8)

#### 4.1 Suite de Tests de Consistencia
```typescript
class ValidadorConsistencia {
  validarOrdenEventos(log: EventoSimulacion[]): ValidationResult;
  validarTCP(log: EventoSimulacion[]): ValidationResult;
  validarEstados(log: EventoSimulacion[]): ValidationResult;
  validarAlgoritmo(algoritmo: string, log: EventoSimulacion[]): ValidationResult;
}
```

**Casos de Prueba Críticos:**
- [ ] Eventos simultáneos en orden correcto
- [ ] TCP cobrado solo cuando corresponde
- [ ] Transiciones de estado válidas
- [ ] Quantum vs fin de ráfaga en RR
- [ ] Expropiación correcta en SRTF y Priority
- [ ] Tie-breakers aplicados consistentemente

#### 4.2 Comparación con Diagramas de Referencia
- [ ] Casos de prueba que replican exactamente los diagramas corregidos
- [ ] Validación de métricas esperadas (tiempo de espera, TCP, etc.)
- [ ] Detección de desviaciones del comportamiento esperado

### Fase 5: Integración UI y Exportación (Semana 9-10)

#### 5.1 Visualización de EventLog Detallado
- [ ] Timeline interactivo con eventos expandibles
- [ ] Filtros por tipo de evento, proceso, algoritmo
- [ ] Indicadores visuales de TCP y expropiaciones
- [ ] Comparación lado a lado de algoritmos

#### 5.2 Reportes Académicos Mejorados
- [ ] Tablas de métricas con desglose de TCP
- [ ] Análisis de starvation en Priority
- [ ] Comparación de eficiencia entre algoritmos
- [ ] Exportación en formato requerido por consigna

## Criterios de Éxito

### Funcionales
- ✅ **Orden de eventos:** Todos los eventos simultáneos se resuelven según orden definido
- ✅ **TCP visible:** Cada cobro de TCP registrado con causa explícita
- ✅ **Estados consistentes:** Transiciones de procesos siempre válidas
- ✅ **Algoritmos correctos:** Comportamiento exacto según literatura académica
- ✅ **Terminología:** SJF vs SRTF, Job vs Burst, correctos

### No Funcionales
- **Performance:** Simulación de 1000+ procesos en <5 segundos
- **Mantenibilidad:** Código alineado con diagramas UML corregidos
- **Testabilidad:** 100% cobertura en lógica de planificación
- **Documentación:** EventLogger permite auditoría completa

## Métricas de Validación

### Por Algoritmo
| Algoritmo | TCP Esperado | Expropiaciones | Casos Críticos |
|-----------|-------------|----------------|-----------------|
| FCFS | N procesos × 1 | 0 | Orden llegada |
| RR (Q=3) | N procesos × 1 + expropiac. | Según ráfagas vs Q | Quantum vs fin |
| SJF | N procesos × 1 | 0 | Tie-breaker trabajo |
| SRTF | N procesos × 1 + expropiac. | Según llegadas | Tiempo restante |
| Priority | N procesos × 1 + expropiac. | Según prioridades | Starvation |

### Globales
- **Consistencia temporal:** 0 eventos con timestamp inválido
- **Estados válidos:** 0 transiciones no permitidas detectadas
- **TCP accuracy:** Diferencia < 1% vs cálculo manual
- **Completitud:** 100% procesos terminan en tiempo finito

## Dependencias y Riesgos

### Dependencias Técnicas
- EventLogger debe estar implementado antes de algoritmos
- Gestor de estados independiente de algoritmos específicos
- Cola de eventos debe manejar cancelaciones (quantum)

### Riesgos y Mitigaciones
1. **Complejidad de eventos simultáneos**
   - Mitigación: Tests exhaustivos con casos sintéticos
2. **Performance con muchos procesos**
   - Mitigación: Profiling y optimización de estructuras de datos
3. **Consistencia entre UI y motor**
   - Mitigación: EventLogger como única fuente de verdad

## Conclusión

La implementación de estos diagramas corregidos transformará el simulador en una herramienta académicamente rigurosa que:

1. **Refleja exactamente** la teoría de sistemas operativos
2. **Permite auditoría completa** vía EventLogger detallado  
3. **Facilita comparaciones** objetivas entre algoritmos
4. **Cumple estándares** de evaluación académica del integrador

Los diagramas corregidos sirven como **especificación ejecutable** del comportamiento esperado, eliminando ambigüedades y asegurando implementación correcta.