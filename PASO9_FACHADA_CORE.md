# Paso 9 — Fachada del Core (API estable para la UI)

## ✅ IMPLEMENTACIÓN COMPLETADA

La fachada del core está implementada y proporciona una API estable y pura para que la UI consuma el simulador sin tocar directamente el engine ni los schedulers.

## 🏗️ **Estructura Creada**

```
src/lib/application/
  adapters/
    costosFactory.ts     - Factory para costos con defaults y validaciones
    schedulerFactory.ts  - Factory que selecciona runner según política
  usecases/
    runSimulation.ts     - Función pura principal de la fachada

src/lib/ui/services/importers/
  legacyTanda.ts        - Importador para archivos JSON legacy
```

## 🔧 **API Principal**

### `runSimulation(cfg, procesos)`

Función **pura** que:
- ✅ No muta la entrada (`procesos`)
- ✅ No toca DOM
- ✅ Devuelve POJOs listos para renderizar
- ✅ Encapsula engine, métricas y gantt

```typescript
export interface SimulationConfig extends SchedulerCfg {
  costos?: Partial<Costos>;
}

export interface SimulationResult {
  trace: Trace;
  metricas: {
    porProceso: ProcessMetrics[];
    global: GlobalMetrics;
  };
  gantt: GanttModel;
}

export function runSimulation(cfg: SimulationConfig, procesos: Proceso[]): SimulationResult
```

### `runSimulationFromLegacy(cfg, legacyData)`

Función conveniente que:
- ✅ Importa datos legacy (procesos_tanda_*.json)
- ✅ Extrae `bloqueoES` automáticamente
- ✅ Maneja warnings de valores mixtos
- ✅ Ejecuta simulación completa

## 🔄 **Políticas Soportadas**

| Política | Configuración | Estado |
|----------|---------------|--------|
| `FCFS` | - | ✅ |
| `RR` | `quantum > 0` | ✅ |
| `SPN` | - | ✅ |
| `SRTN` | - | ✅ |
| `PRIORITY` | `prioridadBase` en todos los procesos | ✅ |

## 📥 **Importador Legacy**

### Mapeo de Campos

| Campo Legacy | Campo Core | Descripción |
|--------------|------------|-------------|
| `nombre: "P1"` | `pid: 1, label: "P1"` | PID numérico + etiqueta |
| `tiempo_arribo` | `arribo` | Tiempo de llegada |
| `cantidad_rafagas_cpu + duracion_rafaga_cpu` | `rafagasCPU[]` | Array repetido N veces |
| `prioridad_externa` | `prioridadBase` | Para PRIORITY (menor = mayor prioridad) |
| `duracion_rafaga_es` | **IGNORADO** | Se usa `costos.bloqueoES` global |

### Funciones

```typescript
// Importar procesos
export function importLegacyTanda(items: ProcesoLegacy[]): Proceso[]

// Extraer bloqueoES común
export function extractBloqueoESGlobal(items: ProcesoLegacy[]): { bloqueoES: number; warning?: string }
```

## 🧪 **Validación Completa**

### Tests Implementados

1. **`test-runSimulation.ts`**: Tests unitarios de la fachada
   - ✅ No mutación de entrada
   - ✅ Validación `quantum > 0` para RR
   - ✅ Validación `prioridadBase` para PRIORITY
   - ✅ Todas las políticas funcionan

2. **`test-import-legacy.ts`**: Tests del importador
   - ✅ Mapeo correcto de campos
   - ✅ Extracción `bloqueoES` global
   - ✅ Validaciones de entrada
   - ✅ Warnings con valores mixtos

3. **`test-integration-tanda5p.ts`**: Test de integración
   - ✅ FCFS con tanda completa
   - ✅ RR con quantum=4
   - ✅ PRIORITY con aging
   - ✅ Comparación SPN vs SRTN

## 📊 **Resultados de Pruebas**

### Tanda 5 Procesos - Métricas Comparativas

| Política | TRp Promedio | Throughput | Cambios Contexto | Expropiaciones |
|----------|--------------|------------|------------------|----------------|
| FCFS | 32.00 | 0.1020 | 11 | 0 |
| RR (q=4) | 22.60 | - | 12 | 0 |
| SPN | 23.00 | - | 9 | 0 |
| SRTN | 23.00 | - | 9 | 0 |
| PRIORITY | **12.80** | - | 7 | **2** |

> **Priority** muestra el mejor tiempo de respuesta promedio gracias a la expropiación inteligente.

## 🔒 **Antibugs Implementados**

### Pureza
- ✅ Clonado defensivo de `procesos` y `rafagasCPU`
- ✅ No mutación de entrada
- ✅ Estados canónicos (`estado: 'N'`)

### Encapsulación
- ✅ UI nunca llama `runRR/runSPN/...` directamente
- ✅ UI nunca calcula métricas/Gantt
- ✅ Todo pasa por la fachada

### Validaciones Tempranas
- ✅ `quantum > 0` para RR
- ✅ `prioridadBase` obligatorio para PRIORITY
- ✅ `aging.step ≥ 1` y `aging.quantum ≥ 1`
- ✅ Validación de formato en importador legacy

### Compatibilidad Futura
- ✅ Agregar nuevas políticas solo requiere modificar `schedulerFactory`
- ✅ UI no se entera de cambios internos
- ✅ API estable y versionada

## 📋 **Checklist Completado**

- [✅] Existe `src/lib/application/usecases/runSimulation.ts` y compila
- [✅] Existe `adapters/costosFactory.ts` y `adapters/schedulerFactory.ts`
- [✅] `runSimulation(cfg, procesos)` **no** muta entrada, **no** toca DOM, devuelve **POJOs**
- [✅] Test del Paso 9 verde (incluye guard `RR` con `quantum > 0`)
- [✅] `src/lib/index.ts` exporta la fachada
- [✅] Importador legacy con validaciones y warnings
- [✅] Integración completa con archivos JSON reales
- [✅] Todas las políticas (FCFS, RR, SPN, SRTN, PRIORITY) funcionan

## 🎯 **Uso desde la UI**

```typescript
import { runSimulation, runSimulationFromLegacy } from '$lib';

// Opción 1: Con procesos del core
const result = runSimulation({
  politica: 'PRIORITY',
  aging: { step: 1, quantum: 5 },
  costos: { TIP: 1, TCP: 1, TFP: 1, bloqueoES: 10 }
}, procesos);

// Opción 2: Con datos legacy
const result = runSimulationFromLegacy({
  politica: 'RR',
  quantum: 4
}, legacyData);

// Renderizar resultado
console.log(result.metricas.global.TRpPromedio);
console.log(result.gantt.tracks);
```

## 🚀 **Estado Final**

**Paso 9 - COMPLETAMENTE IMPLEMENTADO**

La fachada proporciona una API limpia, pura y estable que:
- Abstrae completamente el engine
- Soporta importación legacy sin fricción  
- Incluye validaciones robustas
- Está completamente testeada
- Es compatible hacia el futuro

La UI ahora puede consumir **una sola función** (`runSimulation`) y obtener todos los resultados listos para renderizar, sin tocar código interno del simulador.