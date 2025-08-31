# 📁 Examples

Esta carpeta contiene datos de ejemplo y archivos de salida generados por el simulador.

## 📋 Estructura

### `workloads/` - Datos de Entrada
- **`debug-simple.json`** - Workload simple para debug
- **`ejemplo-fcfs-simple.json`** - Ejemplo básico de FCFS  
- **`procesos_tanda_5p.json`** - Tanda de 5 procesos
- **`procesos_tanda_6p.json`** - Tanda de 6 procesos
- **`procesos_tanda_7p.json`** - Tanda de 7 procesos

### `outputs/` - Archivos Generados
- **`eventos.json`** - Eventos de simulación exportados
- **`demo-gantt.json`** - Ejemplo de Gantt en JSON
- **`test-exportacion-gantt.json`** - Test de exportación de Gantt

## 🔧 Uso

Los workloads pueden cargarse en el simulador:

```typescript
import workload from './examples/workloads/ejemplo-fcfs-simple.json';
const motor = new MotorSimulacion(workload);
```

Los archivos de output son ejemplos de los formatos que genera el simulador.
