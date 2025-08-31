# Tests del Simulador de Planificación de Procesos

Esta carpeta contiene todos los tests del proyecto organizados por categorías.

## Estructura de Carpetas

### 📁 `core/`
Tests de funcionalidades principales del motor de simulación:
- `test-motor.ts` - Test principal del motor de simulación
- `test-fabrica-schedulers.ts` - Tests de la fábrica de schedulers
- `test-expropiacion-remanente.ts` - Tests de lógica de expropiación
- `test-tiebreak-comprehensivo.ts` - Tests de desempate entre eventos
- `test-arribos-simultaneos.ts` - Tests de llegadas simultáneas
- `test-cpu-*.ts` - Tests de uso de CPU y sistema operativo
- `test-debug-*.ts` - Tests de debugging y validación
- `tests.ts` - Tests unitarios del core

### 📁 `algorithms/`
Tests específicos de cada algoritmo de planificación:
- `test-fcfs-completo.ts` - First Come First Served
- `test-rr-completo.ts` - Round Robin
- `test-priority-completo.ts` - Prioridad Externa
- `test-spn-completo.ts` - Shortest Process Next
- `test-srtn-completo.ts` - Shortest Remaining Time Next

### 📁 `logging/`
Tests del sistema de logging de eventos:
- `test-logging-final.ts` - Test completo del sistema de logging
- `test-logging-simple.ts` - Tests básicos de logging
- `test-logging-eventos.ts` - Tests específicos de eventos

### 📁 `examples/`
Ejemplos prácticos de uso:
- `ejemplo-logging-completo.ts` - Ejemplo completo de uso del logging
- `ejemplo-logging.ts` - Ejemplo básico de logging

## Ejecutar Tests

### Test Principal
```bash
npm run test
# o directamente:
npx tsx tests/core/test-motor.ts
```

### Tests por Categoría
```bash
# Tests del core
npx tsx tests/core/test-motor.ts
npx tsx tests/core/test-fabrica-schedulers.ts

# Tests de algoritmos
npx tsx tests/algorithms/test-fcfs-completo.ts
npx tsx tests/algorithms/test-rr-completo.ts

# Tests de logging
npx tsx tests/logging/test-logging-final.ts

# Ejemplos
npx tsx tests/examples/ejemplo-logging-completo.ts
```

## Convenciones

- Todos los tests tienen el prefijo `test-`
- Los ejemplos tienen el prefijo `ejemplo-`
- Los tests están organizados por funcionalidad
- Cada test es independiente y puede ejecutarse por separado

## Cobertura

Los tests cubren:
- ✅ Todos los algoritmos de planificación (FCFS, RR, Priority, SPN, SRTN)
- ✅ Lógica de expropiación y tiempo remanente
- ✅ Sistema de eventos y cola de eventos
- ✅ Métricas y estadísticas
- ✅ Logging completo de eventos (JSON/CSV)
- ✅ Casos edge y escenarios complejos
