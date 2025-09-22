# 🧪 AUDITORÍA Y REORGANIZACIÓN DE TESTS

## 📊 ANÁLISIS DE TESTS ACTUALES

### ❌ **TESTS OBSOLETOS/DUPLICADOS PARA ELIMINAR**

#### **En `/tests/` (raíz)**
- `test-correcciones-completo.ts` - ❌ OBSOLETO: Correcciones ya implementadas
- `test-eventos-componente.ts` - ❌ DUPLICADO: Similar a otros tests de eventos  
- `test-eventos-corregido.ts` - ❌ OBSOLETO: Ya corregido
- `test-srtn-correcciones.ts` - ❌ OBSOLETO: Correcciones ya implementadas
- `test-srtn-io-fix.ts` - ❌ OBSOLETO: Fix ya implementado
- `test-srtn-simple.ts` - ❌ DUPLICADO: Cubierto por test-srtn-multirafaga.ts
- `test-proceso-simple.ts` - ❌ DUPLICADO: Cubierto por tests de algoritmos

#### **En `/tests/core/`**
- `test-debug-p2-clean.ts` - ❌ DEBUG: Solo para debugging
- `test-debug-p2.ts` - ❌ DEBUG: Solo para debugging  
- `test-debug-so.ts` - ❌ DEBUG: Solo para debugging
- `test-motor-unico.ts` - ❌ DUPLICADO: Similar a test-motor.ts
- `tests.ts` - ❌ OBSOLETO: Tests antiguos

#### **En `/tests/debug/`** 
- Toda la carpeta `debug/` - ❌ DEBUG: Solo para debugging temporal

#### **En `/tests/logging/`**
- Si existe - ❌ DEBUG: Solo para debugging

#### **En `/tests/raiz/`** 
- Si contiene tests obsoletos - ❌ REVISAR: Posiblemente obsoleto

### ✅ **TESTS ESENCIALES PARA MANTENER**

#### **Tests de Algoritmos (`/tests/algorithms/`)**
- `test-fcfs-completo.ts` ✅ MANTENER
- `test-priority-completo.ts` ✅ MANTENER  
- `test-rr-completo.ts` ✅ MANTENER
- `test-spn-completo.ts` ✅ MANTENER
- `test-srtn-completo.ts` ✅ MANTENER

#### **Tests Core Funcionales (`/tests/core/`)**
- `test-arribos-simultaneos.ts` ✅ MANTENER
- `test-cpu-ociosa.ts` ✅ MANTENER
- `test-cpu-so.ts` ✅ MANTENER
- `test-expropiacion-remanente.ts` ✅ MANTENER
- `test-motor.ts` ✅ MANTENER
- `test-orden-eventos-simultaneos.ts` ✅ MANTENER
- `test-tiebreak-comprehensivo.ts` ✅ MANTENER

#### **Tests Específicos (`/tests/`)**
- `test-srtn-multirafaga.ts` ✅ MANTENER (más completo que test-srtn-simple)
- `test-exportacion.ts` ✅ MANTENER
- `test-gantt-parametros.ts` ✅ MANTENER
- `test-politicas-planificacion.ts` ✅ MANTENER

#### **Tests de Integración (`/tests/integracion/`)**
- Revisar contenido - Probablemente ✅ MANTENER

#### **Tests de Gantt (`/tests/gantt/`)**
- `test-construccion-gantt.ts` ✅ MANTENER
- `test-exportacion-gantt.ts` ✅ MANTENER

## 🎯 **ESTRUCTURA PROPUESTA FINAL**

```
tests/
├── algorithms/           # Tests de algoritmos específicos
│   ├── test-fcfs-completo.ts
│   ├── test-priority-completo.ts  
│   ├── test-rr-completo.ts
│   ├── test-spn-completo.ts
│   └── test-srtn-completo.ts
├── core/                # Tests del motor de simulación
│   ├── test-arribos-simultaneos.ts
│   ├── test-cpu-ociosa.ts
│   ├── test-cpu-so.ts
│   ├── test-expropiacion-remanente.ts
│   ├── test-motor.ts
│   ├── test-orden-eventos-simultaneos.ts
│   └── test-tiebreak-comprehensivo.ts
├── gantt/               # Tests de construcción de Gantt
│   ├── test-construccion-gantt.ts
│   └── test-exportacion-gantt.ts
├── integration/         # Tests de integración (si existen)
│   └── ...
└── functional/          # Tests funcionales específicos
    ├── test-srtn-multirafaga.ts
    ├── test-exportacion.ts
    ├── test-gantt-parametros.ts
    └── test-politicas-planificacion.ts
```

## 📝 **ACCIONES RECOMENDADAS**

1. **ELIMINAR** tests obsoletos y de debug
2. **CONSOLIDAR** tests duplicados
3. **REORGANIZAR** en estructura propuesta
4. **MANTENER** solo tests esenciales y funcionales
5. **CREAR** un test runner principal que ejecute todos los tests válidos