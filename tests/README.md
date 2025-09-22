# 🧪 TESTS DEL SIMULADOR DE PLANIFICACIÓN

## 📁 ESTRUCTURA ORGANIZADA

### **`algorithms/`** - Tests de Algoritmos de Planificación
Tests específicos para cada algoritmo de planificación:
- `test-fcfs-completo.ts` - First Come First Served
- `test-priority-completo.ts` - Planificación por Prioridad
- `test-rr-completo.ts` - Round Robin
- `test-spn-completo.ts` - Shortest Process Next
- `test-srtn-completo.ts` - Shortest Remaining Time Next

### **`core/`** - Tests del Motor de Simulación
Tests del núcleo y funcionalidades básicas:
- `test-motor.ts` - Motor principal de simulación
- `test-cpu-so.ts` - Cálculo de tiempo CPU del SO (TIP+TCP+TFP)
- `test-cpu-ociosa.ts` - Detección de tiempo de CPU ociosa
- `test-arribos-simultaneos.ts` - Manejo de arribos simultáneos
- `test-orden-eventos-simultaneos.ts` - Ordenamiento de eventos
- `test-tiebreak-comprehensivo.ts` - Resolución de empates
- `test-expropiacion-remanente.ts` - Lógica de expropiación

### **`functional/`** - Tests Funcionales Específicos
Tests de funcionalidades complejas y casos especiales:
- `test-srtn-multirafaga.ts` - SRTN con múltiples ráfagas e I/O
- `test-politicas-planificacion.ts` - Comparación entre políticas
- `test-gantt-parametros.ts` - Construcción de Gantt con parámetros
- `test-exportacion.ts` - Exportación de resultados

### **`gantt/`** - Tests de Diagramas de Gantt
Tests específicos para construcción de diagramas:
- `test-construccion-gantt.ts` - Generación de segmentos de Gantt
- `test-exportacion-gantt.ts` - Exportación de diagramas

### **`examples/`** - Ejemplos y Demos
Ejemplos de uso y demostraciones

### **`integracion/`** - Tests de Integración
Tests que verifican la integración entre componentes

## 🚀 EJECUTAR TESTS

### Ejecutar Todos los Tests
```bash
npx tsx tests/run-all-tests.ts
```

### Ejecutar Tests por Categoría
```bash
# Tests de algoritmos
npx tsx tests/algorithms/test-fcfs-completo.ts

# Tests del motor
npx tsx tests/core/test-motor.ts

# Tests funcionales
npx tsx tests/functional/test-srtn-multirafaga.ts

# Tests de Gantt
npx tsx tests/gantt/test-construccion-gantt.ts
```

### Ejecutar Test Específico
```bash
npx tsx tests/functional/test-srtn-multirafaga.ts
```

## ✅ CRITERIOS DE TESTS

### **Tests de Algoritmos**
- Verifican implementación correcta de cada algoritmo
- Casos con y sin I/O, con y sin preempción
- Validación de métricas (tiempo respuesta, retorno, espera)

### **Tests del Motor**
- Correcta generación y orden de eventos
- Cálculo preciso de métricas del sistema
- Manejo de casos edge (arribos simultáneos, etc.)

### **Tests Funcionales**
- Escenarios complejos realistas
- Integración entre componentes
- Casos especiales y validaciones avanzadas

### **Tests de Gantt**
- Construcción correcta de diagramas
- Parámetros TIP/TCP/TFP (instantáneos vs segmentos)
- Exportación en diferentes formatos

## 🎯 TESTS CLAVE PARA VALIDACIÓN

1. **`test-motor.ts`** - Funcionalidad básica del simulador
2. **`test-srtn-multirafaga.ts`** - Caso complejo de SRTN
3. **`test-cpu-so.ts`** - Validación de métricas del SO
4. **`test-gantt-parametros.ts`** - Construcción correcta de Gantt

## 📊 COBERTURA

Los tests cubren:
- ✅ Todos los algoritmos de planificación (FCFS, RR, SJF, SRTF, Priority)
- ✅ Motor de simulación y cola de eventos
- ✅ Cálculo de métricas y estadísticas
- ✅ Construcción de diagramas de Gantt
- ✅ Manejo de I/O y múltiples ráfagas
- ✅ Casos edge y validaciones especiales
