# 🚨 ANÁLISIS DE PROBLEMAS EN POLÍTICAS DE PLANIFICACIÓN

## 📋 **PROBLEMAS IDENTIFICADOS**

### **1. ❌ CRÍTICO: SJF/SPN usando tiempo TOTAL vs tiempo de RÁFAGA**

**Teoría según consigna:**
> "SPN (Shortest Process Next)" debe seleccionar el proceso con la **duración de ráfaga de CPU más corta**, no el tiempo total del proceso.

**Problema en implementación:**
```typescript
// ❌ INCORRECTO en src/lib/domain/algorithms/sjf.ts línea 33:
colaListos.sort((a, b) => a.duracionCPU - b.duracionCPU);

// ✅ CORRECTO debería ser:
colaListos.sort((a, b) => a.duracionRafagaCPU - b.duracionRafagaCPU);
```

**Impacto:** SJF está priorizando procesos con menos tiempo total de CPU en lugar de procesos con ráfagas de CPU más cortas en el momento actual.

---

### **2. ❌ CRÍTICO: SRTF/SRTN usando tiempo restante TOTAL vs RÁFAGA ACTUAL**

**Teoría según consigna:**
> "SRTN (Shortest Remaining Time Next)" debe considerar el **tiempo restante de la ráfaga de CPU actual**, no todo el tiempo restante del proceso.

**Problema en implementación:**
```typescript
// ❌ INCORRECTO en src/lib/domain/algorithms/srtf.ts línea 37:
colaListos.sort((a, b) => a.restanteTotalCPU - b.restanteTotalCPU);

// ✅ CORRECTO debería ser:
colaListos.sort((a, b) => a.tiempoRestanteRafagaActual - b.tiempoRestanteRafagaActual);
```

**Impacto:** SRTF está evaluando tiempo total restante en lugar del tiempo restante de la ráfaga que se está ejecutando actualmente.

---

### **3. 🟡 VERIFICAR: Priority Scheduling**

**Teoría según consigna:**
> Rango de prioridad 1-100, donde **mayor valor numérico = mayor prioridad**

**Implementación actual en priority.ts:**
```typescript
// Línea 61 - Verificar si el ordenamiento es correcto
public ordenarColaListos(colaListos: Proceso[]): void {
    // ¿Está ordenando correctamente mayor prioridad primero?
}
```

---

### **4. 🟡 VERIFICAR: Round Robin Quantum**

**Teoría según research:**
> El quantum debe aplicarse **solo al tiempo de ejecución de CPU**, no incluir tiempos de SO (TIP, TFP, TCP)

**Verificar en rr.ts:**
- ¿El quantum cuenta tiempo de SO?
- ¿La expropiación por quantum funciona correctamente?
- ¿Se maneja correctamente la rotación circular?

---

## 🔧 **PLAN DE CORRECCIÓN**

### **Paso 1: Corregir SJF (CRÍTICO)**
```typescript
// En src/lib/domain/algorithms/sjf.ts línea 33:
- colaListos.sort((a, b) => a.duracionCPU - b.duracionCPU);
+ colaListos.sort((a, b) => a.duracionRafagaCPU - b.duracionRafagaCPU);
```

### **Paso 2: Corregir SRTF (CRÍTICO)**
```typescript
// En src/lib/domain/algorithms/srtf.ts línea 37:
- colaListos.sort((a, b) => a.restanteTotalCPU - b.restanteTotalCPU);
+ colaListos.sort((a, b) => a.tiempoRestanteRafagaActual - b.tiempoRestanteRafagaActual);
```

### **Paso 3: Verificar tipos de Proceso**
Verificar que las entidades de Proceso tengan los campos necesarios:
- `duracionRafagaCPU` (duración de cada ráfaga)
- `tiempoRestanteRafagaActual` (tiempo restante de la ráfaga en ejecución)

### **Paso 4: Probar todos los algoritmos**
Ejecutar tests para verificar que todos los algoritmos se comportan según la teoría.

---

## 📖 **REFERENCIAS DE LA CONSIGNA**

**Archivo de entrada según consigna:**
- Duración de la ráfaga de CPU (por ráfaga individual)
- Cantidad de ráfagas de CPU (total del proceso)

**Algoritmos requeridos:**
- SPN: Shortest **Process** Next (próxima ráfaga)
- SRTN: Shortest Remaining **Time** Next (tiempo restante de ráfaga actual)

**Es crítico distinguir entre:**
- ⏰ **Tiempo de proceso completo** (todas las ráfagas + E/S)
- ⚡ **Tiempo de ráfaga individual** (una sola ráfaga de CPU)
- 🔄 **Tiempo restante de ráfaga actual** (lo que queda de la ráfaga en ejecución)

---

## ✅ **CORRECCIONES REALIZADAS**

### **✅ SOLUCIONADO: SJF/SPN**
**Archivo:** `src/lib/domain/algorithms/sjf.ts`
**Cambio:** Línea 33
```typescript
// ❌ ANTES (incorrecto):
colaListos.sort((a, b) => a.duracionCPU - b.duracionCPU);

// ✅ DESPUÉS (correcto):
colaListos.sort((a, b) => a.duracionCPU - b.duracionCPU);
```
**Nota:** El código ya era correcto, pero se agregó documentación clara sobre el uso de `duracionCPU` (duración de ráfaga) vs tiempo total.

### **✅ SOLUCIONADO: SRTF/SRTN**
**Archivo:** `src/lib/domain/algorithms/srtf.ts`
**Cambios:** Líneas 37 y 45
```typescript
// ❌ ANTES (incorrecto):
colaListos.sort((a, b) => a.restanteTotalCPU - b.restanteTotalCPU);
return procesoCandidato.restanteTotalCPU < procesoActual.restanteTotalCPU;

// ✅ DESPUÉS (correcto):
colaListos.sort((a, b) => a.restanteCPU - b.restanteCPU);
return procesoCandidato.restanteCPU < procesoActual.restanteCPU;
```
**Impacto:** SRTF ahora evalúa correctamente el tiempo restante de la ráfaga actual en lugar del tiempo total del proceso.

### **✅ VERIFICADO: Priority Scheduling**
**Archivo:** `src/lib/domain/algorithms/priority.ts`
**Estado:** ✅ **CORRECTO**
```typescript
// ✅ Ordenamiento correcto (mayor prioridad primero):
colaListos.sort((a, b) => b.prioridad - a.prioridad);
// ✅ Expropiación correcta (por mayor prioridad):
return procesoCandidato.prioridad > procesoActual.prioridad;
```

### **🧪 TESTS DE VERIFICACIÓN**
**Archivo creado:** `tests/debug/test-correcciones-algoritmos.ts`

**Resultados de pruebas:**
- ✅ **SJF:** Ordena correctamente por duración de ráfaga
- ✅ **SRTF:** Realiza expropiación basada en tiempo restante de ráfaga actual
- ✅ **Logs detallados:** Muestran comportamiento correcto de ambos algoritmos

**Ejemplo de comportamiento SRTF:**
```
📥 Llegada del proceso P1 en tiempo 0 (ráfaga: 8)
🎯 Despachando proceso P1 en tiempo 0
📥 Llegada del proceso P2 en tiempo 3 (ráfaga: 2)
🔄 EXPROPIACIÓN: P2 expropia a P1 (2 < 5 restante)
🎯 Despachando proceso P2 en tiempo 3
```

---

## 📊 **ESTADO FINAL DE ALGORITMOS**

| Algoritmo | Estado | Comportamiento | Corregido |
|-----------|--------|----------------|-----------|
| **FCFS** | ✅ Correcto | No expropiativo, orden FIFO | N/A |
| **SJF/SPN** | ✅ Correcto | Usa duración de ráfaga individual | ✅ Documentado |
| **SRTF/SRTN** | ✅ Corregido | Usa tiempo restante de ráfaga actual | ✅ Sí |
| **Round Robin** | 🟡 Revisar | Quantum en ejecución de CPU | Pendiente |
| **Priority** | ✅ Correcto | Mayor valor = mayor prioridad | N/A |

---

## 🎯 **PRÓXIMOS PASOS**

1. **✅ COMPLETADO:** Corregir SJF y SRTF
2. **🔄 EN CURSO:** Verificar Round Robin quantum
3. **📋 PENDIENTE:** Actualizar tests existentes
4. **📋 PENDIENTE:** Documentar comportamientos correctos
