# 🧪 SUITE DE TESTS DEL INTEGRADOR

## 📖 Descripción

Esta suite de tests valida que el simulador de planificación de procesos cumple completamente con:

1. **La consigna del integrador** - Todos los requerimientos especificados
2. **La teoría de algoritmos** - Comportamiento según literatura académica  
3. **Eficiencia y rendimiento** - Métricas consistentes y optimizadas
4. **Robustez de entrada** - Manejo correcto de todos los formatos
5. **Precisión de cálculos** - Métricas exactas según especificaciones

## 🗂️ Estructura de Tests

```
tests/
├── run-all-tests.ts           # 🎯 Suite principal - ejecuta todos
├── README.md                  # 📚 Esta documentación
├── 
├── consigna/                  # 🎯 Tests de cumplimiento de consigna
│   └── test-consigna-completa.ts
├── 
├── teoria/                    # 📚 Tests de teoría de algoritmos
│   ├── test-algoritmos-teoria.ts
│   ├── test-transiciones-estados.ts
│   └── test-eficiencia-rendimiento.ts
├── 
├── integracion/              # 🔗 Tests de integración
│   ├── test-formato-archivos.ts
│   └── test-metricas-calculo.ts
├── 
├── unitarios/                # 🔧 Tests unitarios
│   └── test-politicas-planificacion.ts
└── 
└── workloads-test/           # 📋 Datos de prueba canónicos
    ├── consigna-basica.json
    ├── consigna-basica.csv
    ├── efecto-convoy.json
    ├── inanicion-prioridades.json
    └── round-robin-equidad.json
```

## 🚀 Ejecución

### Ejecutar todos los tests
```bash
npx tsx tests/run-all-tests.ts
```

### Ejecutar tests individuales
```bash
# Tests de consigna
npx tsx tests/consigna/test-consigna-completa.ts

# Tests de teoría
npx tsx tests/teoria/test-algoritmos-teoria.ts
npx tsx tests/teoria/test-transiciones-estados.ts
npx tsx tests/teoria/test-eficiencia-rendimiento.ts

# Tests de integración
npx tsx tests/integracion/test-formato-archivos.ts
npx tsx tests/integracion/test-metricas-calculo.ts

# Tests unitarios
npx tsx tests/unitarios/test-politicas-planificacion.ts
```

## 📊 Cobertura de Tests

### 🎯 Tests de Consigna (`consigna/`)

**test-consigna-completa.ts**
- ✅ Formato de workload según especificación
- ✅ Configuración de parámetros requeridos
- ✅ Métricas TR, TRN, TRT, TMR según consigna
- ✅ Políticas FCFS, RR, PRIORITY, SPN, SRTN
- ✅ Manejo de tiempos TIP, TFP, TCP
- ✅ Salidas en formato esperado

### 📚 Tests de Teoría (`teoria/`)

**test-algoritmos-teoria.ts**
- ✅ FCFS: Sin expropiación, orden FIFO estricto
- ✅ RR: Expropiación por quantum, equidad
- ✅ PRIORITY: Expropiación por prioridad
- ✅ SPN: Sin expropiación, menor tiempo primero
- ✅ SRTN: Expropiación por tiempo restante
- ✅ Casos teóricos clásicos (convoy, inanición)

**test-transiciones-estados.ts**
- ✅ Transiciones NUEVO → LISTO → CORRIENDO → TERMINADO
- ✅ Transiciones CORRIENDO → BLOQUEADO → LISTO (I/O)
- ✅ Expropiaciones CORRIENDO → LISTO
- ✅ Orden de procesamiento según consigna
- ✅ Ciclo de vida completo de procesos

**test-eficiencia-rendimiento.ts**
- ✅ Throughput óptimo por política
- ✅ Utilización de CPU según workload
- ✅ Mitigation del efecto convoy (SPN vs FCFS)
- ✅ Equidad en Round Robin
- ✅ Escalabilidad con workloads grandes
- ✅ Consistencia en simulaciones determinísticas

### 🔗 Tests de Integración (`integracion/`)

**test-formato-archivos.ts**
- ✅ Parser JSON: formato válido e inválido
- ✅ Parser TXT: formato válido e inválido
- ✅ Parser CSV: formato válido e inválido
- ✅ Manejo de errores y validaciones
- ✅ Mensajes de error descriptivos

**test-metricas-calculo.ts**
- ✅ Precisión de TR (Tiempo Retorno)
- ✅ Precisión de TRT (Tiempo Retorno Turnaround)
- ✅ Precisión de TRN (Tiempo Retorno Normalizado)
- ✅ Precisión de TMR (Tiempo Medio Respuesta)
- ✅ Cálculos correctos por política
- ✅ Casos edge y valores extremos

### 🔧 Tests Unitarios (`unitarios/`)

**test-politicas-planificacion.ts**
- ✅ FCFS: Implementación aislada
- ✅ RR: Implementación aislada + quantum
- ✅ PRIORITY: Implementación aislada
- ✅ SPN: Implementación aislada
- ✅ SRTN: Implementación aislada
- ✅ Casos límite para cada política

## 📋 Workloads de Test

### Archivos Canónicos

**consigna-basica.json/csv**
- Workload estándar de la consigna
- Procesos con diferentes características
- Casos representativos para todas las políticas

**efecto-convoy.json**
- Proceso largo seguido de procesos cortos
- Demuestra problema de FCFS
- Valida mejora con SPN

**inanicion-prioridades.json**
- Procesos con prioridades muy diferentes
- Demuestra inanición potencial
- Valida fairness en RR

**round-robin-equidad.json**
- Múltiples procesos similares
- Demuestra equidad de RR
- Valida distribución justa de CPU

## ✅ Criterios de Éxito

### Por Suite
- **Consigna**: 100% cumplimiento de requerimientos
- **Teoría**: Comportamiento según literatura académica
- **Integración**: Robustez en parseo y cálculos
- **Unitarios**: Implementación correcta de cada política

### Métricas Generales
- ✅ Todos los tests deben pasar
- ✅ Tiempo de ejecución < 30 segundos total
- ✅ Sin errores de compilación o runtime
- ✅ Salidas determinísticas y reproducibles

## 🛠️ Mantenimiento

### Agregar Nuevos Tests
1. Crear archivo en carpeta apropiada
2. Implementar función `ejecutarTodosLosTests()`
3. Agregar import en `run-all-tests.ts`
4. Documentar en este README

### Modificar Workloads
1. Editar archivos en `workloads-test/`
2. Mantener compatibilidad con tests existentes
3. Validar que siguen formato de consigna

### Actualizar Criterios
1. Revisar implementación del simulador
2. Ajustar assertions según nuevos requerimientos
3. Mantener alineación con teoría y consigna

## 🎯 Objetivo Final

Esta suite de tests **demuestra inequívocamente** que:

> El simulador implementa **correctamente** todos los algoritmos de planificación según la **consigna del integrador** y está **alineado** con la **teoría de sistemas operativos** establecida en la literatura académica.

La validación exitosa de todos los tests constituye la **evidencia completa** de que el simulador cumple con todos los requerimientos académicos y técnicos del proyecto integrador.

---

**📅 Última actualización:** $(date +"%Y-%m-%d %H:%M:%S")  
**👥 Equipo:** Simulador de Planificación de Procesos  
**🎓 Contexto:** Trabajo Práctico Integrador - Sistemas Operativos