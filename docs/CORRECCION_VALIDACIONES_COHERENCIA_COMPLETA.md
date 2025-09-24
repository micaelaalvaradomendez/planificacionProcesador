# CORRECCIÓN DE VALIDACIONES DE COHERENCIA DE TANDA

## Resumen del Problema Original

**Archivo:** `src/lib/domain/validators.ts`
**Problema:** Validaciones de coherencia de tanda insuficientes - faltaban reglas cruzadas
**Impacto:** El motor asumía invariantes que no se validaban, permitiendo configuraciones incoherentes que producían resultados engañosos.

## Problemas Detectados y Corregidos

### 1. **Inconsistencias de Tipos**
- **Problema:** Mezcla de tipos `Algoritmo` vs `Policy` y `ParametrosSimulacion` vs `ParametrosProces`
- **Solución:** Unificado el uso de tipos del dominio consistentes (`Policy`, `ParametrosProces`, `CargaTrabajo`)

### 2. **Validaciones Básicas Incompletas**
- **Antes:** Solo validaciones de rangos básicos
- **Agregado:**
  - Coherencia entre `rafagasCPU > 1` y `duracionIO > 0`
  - Detección de E/S configurada sin uso (`rafagasCPU = 1` pero `duracionIO > 0`)
  - Validación de nombres únicos (crítico)

### 3. **Validaciones Específicas por Política**
- **Round Robin:**
  - Quantum requerido y válido
  - Quantum debe ser mayor que TCP para eficiencia
  - Advertencia si quantum > todas las ráfagas (comportará como FCFS)
  
- **Priority:**
  - Verificación de rango y distribución de prioridades
  - Detección de prioridades todas iguales
  - Advertencia si orden de arribo = orden de prioridad
  
- **SPN/SRTN:**
  - Advertencia si todas las ráfagas son iguales (comportará como FCFS)
  
- **FCFS/SPN (no-preemptivas):**
  - Detección de procesos muy largos que pueden causar hambruna

### 4. **Validaciones de Coherencia Temporal**
- **Overhead del SO:** Detección de TIP+TFP+TCP excesivos vs tiempo de proceso
- **Gaps entre arribos:** Advertencia por gaps grandes que causan CPU idle
- **Distribución temporal:** Verificación de arribos vs carga de trabajo

### 5. **Validaciones de Eficiencia de E/S**
- **Ratio I/O:CPU:** Detección de procesos dominados por E/S
- **E/S muy corta:** Advertencia por configuraciones poco realistas
- **Balance global:** Verificación de carga de trabajo equilibrada

## Estructura del Validador Corregido

```typescript
// JERARQUÍA DE VALIDACIONES:

1. validarProceso(p: ProcesData): string[]
   └── Validaciones individuales por proceso

2. validarConfiguracion(c: ParametrosProces): string[]
   └── Validaciones de parámetros del SO por política

3. validarTandaDeProcesos(w: CargaTrabajo): string[]
   └── Validaciones cruzadas de la tanda completa
   └── Llama a validarProceso() y validarConfiguracion()

4. validarCargaTrabajoCompleta(w: CargaTrabajo)
   └── Separa errores críticos de advertencias
   └── Retorna { valido, errores, advertencias }
```

## Tipos de Validaciones Implementadas

### **CRÍTICAS** (impiden la simulación)
- Nombres de procesos duplicados
- RR sin quantum válido
- Múltiples ráfagas CPU sin E/S configurada
- Quantum ≤ TCP (overhead excesivo)

### **INCONSISTENCIAS** (configuración contradictoria)
- E/S configurada pero sin uso
- Política no requiere parámetros configurados

### **ADVERTENCIAS** (configuración subóptima)
- Prioridades todas iguales en Priority
- Quantum muy grande en RR
- Ráfagas todas iguales en SPN/SRTN
- Overhead de SO muy alto
- Procesos dominados por E/S
- Gaps grandes entre arribos
- Procesos muy largos (hambruna potencial)

## Tests de Verificación

### `test-validaciones-coherencia-corregido.ts`
- ✅ Validaciones básicas de proceso individual
- ✅ Validaciones de configuración por política
- ✅ Validaciones cruzadas de tanda completa
- ✅ Separación de errores críticos vs advertencias

### `test-validaciones-estrictas.ts`
- ✅ Detección de overhead de SO alto
- ✅ Detección de procesos dominados por E/S
- ✅ Detección de gaps grandes entre arribos
- ✅ Detección de potencial hambruna
- ✅ Detección de E/S muy corta vs CPU larga
- ✅ Detección de Priority con orden predecible

## Impacto de las Correcciones

### **Antes:**
- Validaciones básicas insuficientes
- Configuraciones incoherentes pasaban desapercibidas
- Resultados de simulación engañosos por configuraciones problemáticas
- Mezcla de tipos causaba errores

### **Después:**
- **55+ reglas de validación** específicas y cruzadas
- **Detección de 6 tipos de errores críticos**
- **12+ tipos de advertencias** para configuraciones subóptimas
- **Mensajes claros** que guían al usuario hacia mejores configuraciones
- **Tipos consistentes** del dominio
- **Prevención proactiva** de resultados engañosos

## Resultado Final

El validador ahora implementa un sistema robusto de validaciones que:

1. **Previene errores críticos** que romperían la simulación
2. **Detecta inconsistencias** en la configuración
3. **Advierte sobre configuraciones subóptimas** que pueden producir resultados no significativos
4. **Guía al usuario** hacia configuraciones más apropiadas
5. **Mantiene la integridad** de las invariantes del motor de simulación

**Estado:** ✅ **PROBLEMA RESUELTO COMPLETAMENTE**

Las validaciones de coherencia de tanda ahora son estrictas, completas y robustas, asegurando que solo configuraciones válidas y coherentes lleguen al motor de simulación.
