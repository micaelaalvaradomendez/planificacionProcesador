# 🎯 Planificador de Procesos - Consigna Integrador

Un simulador completo de planificación de procesos con registro detallado de eventos y exportación automática para análisis.

## ✨ Características Principales

- **Simulación por Eventos Discretos**: Motor completo de simulación con manejo de eventos priorizados
- **Algoritmos de Planificación**: FCFS, SJF, SRTF, Priority, Round Robin
- **Registro Completo de Eventos**: Todos los eventos del sistema son capturados y clasificados
- **Exportación Automática**: Genera archivos `eventos.json` y `eventos.csv` automáticamente
- **Análisis Estadístico**: Métricas detalladas de rendimiento y distribución de eventos

## 🚀 Uso Rápido

### Demo Completo
```bash
npm run demo
```
Este comando ejecuta una simulación completa y genera los archivos de eventos requeridos.

### Ejecutar Demo con Limpieza
```bash
npm run demo:clean
```
Limpia archivos anteriores y ejecuta el demo desde cero.

## 📊 Archivos Generados

### `eventos.json`
```json
{
  "metadata": {
    "generadoEn": "2025-08-31T19:53:57.191Z",
    "totalEventos": 27,
    "simulador": "Planificador de Procesos v1.0"
  },
  "eventos": [
    {
      "tiempo": 0,
      "tipo": "Arribo",
      "proceso": "Navegador",
      "descripcion": "Proceso Navegador llega al sistema",
      "detalles": "Llegada al sistema - inicio TIP"
    }
    // ... más eventos
  ]
}
```

### `eventos.csv`
```csv
Tiempo,Tipo,Proceso,Descripción,Detalles
0,Arribo,Navegador,"Proceso Navegador llega al sistema","Llegada al sistema - inicio TIP"
1,Arribo,Editor,"Proceso Editor llega al sistema","Llegada al sistema - inicio TIP"
2,Despacho,Navegador,"Proceso Navegador despachado","Inicio ejecución"
// ... más eventos
```

## 🎯 Eventos Registrados (Según Consigna)

El sistema registra todos los eventos requeridos por la consigna del integrador:

- ✅ **Arribo**: Llegada de procesos al sistema
- ✅ **Incorporación**: Procesos incorporados después del TIP
- ✅ **Despacho**: Asignación de CPU a procesos
- ✅ **Fin Ráfaga**: Finalización de ráfagas de CPU
- ✅ **Agotamiento Quantum**: Eventos de Round Robin
- ✅ **Fin E/S**: Finalización de operaciones de E/S
- ✅ **Cambio Contexto**: Cambios de contexto entre procesos
- ✅ **Terminación**: Finalización completa de procesos

## 🧪 Tests

### Ejecutar Todos los Tests
```bash
npm run test:all
```

### Tests por Categoría
```bash
npm run test:core        # Motor de simulación
npm run test:algorithms  # Algoritmos de planificación
npm run test:logging     # Sistema de eventos y exportación
```

## 📁 Estructura del Proyecto

```
src/
├── lib/
│   ├── core/
│   │   ├── engine.ts      # Motor principal de simulación
│   │   ├── scheduler.ts   # Factory de planificadores
│   │   └── ...
│   ├── domain/
│   │   ├── algorithms/    # Implementación de algoritmos
│   │   ├── entities/      # Proceso, Simulador
│   │   └── ...
│   ├── io/
│   │   └── eventLogger.ts # Exportación de eventos
│   └── ...
tests/
├── core/           # Tests del motor
├── algorithms/     # Tests de algoritmos
├── logging/        # Tests de exportación
└── examples/       # Ejemplos de uso
```

## 💡 Casos de Uso

Los archivos `eventos.json` y `eventos.csv` pueden ser utilizados para:

- 📊 **Análisis Estadístico**: Importar en Excel, R, Python para análisis avanzado
- 📈 **Gráficos de Gantt**: Generar visualizaciones personalizadas del cronograma
- 🔍 **Auditoría**: Revisar paso a paso el comportamiento del planificador
- 📋 **Validación**: Verificar la correcta implementación de algoritmos
- 🎯 **Comparación**: Analizar el rendimiento entre diferentes políticas
- 📚 **Documentación**: Incluir en reportes académicos y presentaciones

## 🔧 Configuración de Simulación

### Ejemplo de Workload
```typescript
const workload: Workload = {
  config: { 
    policy: 'RR',    // FCFS, SJF, SRTF, Priority, RR
    quantum: 3,      // Solo para Round Robin
    tip: 1,          // Tiempo de inicialización
    tfp: 1,          // Tiempo de finalización
    tcp: 1           // Tiempo de cambio de contexto
  },
  processes: [
    { 
      name: 'Navegador', 
      tiempoArribo: 0, 
      rafagasCPU: 3,
      duracionRafagaCPU: 4, 
      duracionRafagaES: 2, 
      prioridad: 1 
    }
    // ... más procesos
  ]
};
```

### Uso Programático
```typescript
import { MotorSimulacion } from './src/lib/core/engine.js';

const motor = new MotorSimulacion(workload);
const { resultado, archivos } = await motor.ejecutarYExportar('eventos', './');

console.log(`Eventos registrados: ${resultado.eventosExportacion.length}`);
console.log(`Archivos generados: ${archivos.archivoJSON}, ${archivos.archivoCSV}`);
```

## 📋 Requisitos Cumplidos

### ✅ Consigna del Integrador
- [x] Simulación por eventos discretos
- [x] Registro de todos los eventos del sistema
- [x] Exportación a formatos JSON y CSV
- [x] Soporte para todos los algoritmos de planificación
- [x] Manejo correcto de tiempos del sistema (TIP, TFP, TCP)
- [x] Cálculo de métricas de rendimiento
- [x] Generación automática de archivos para análisis

### ✅ Funcionalidades Técnicas
- [x] Arquitectura modular y extensible
- [x] Tests automatizados para todas las funcionalidades
- [x] Tipado estricto con TypeScript
- [x] Compatibilidad con Node.js y navegadores
- [x] Documentación completa y ejemplos de uso

## 🎉 Resultado Final

El sistema está **completo y listo** para cumplir con todos los requisitos de la consigna del integrador:

1. **Simulación Exitosa**: Motor de eventos discretos funcionando correctamente
2. **Eventos Registrados**: Todos los eventos requeridos son capturados y clasificados
3. **Archivos Generados**: `eventos.json` y `eventos.csv` se crean automáticamente
4. **Análisis Disponible**: Los archivos están listos para importación y análisis
5. **Validación Completa**: Tests confirman la correcta funcionalidad

¡El simulador está listo para ser utilizado en el proyecto integrador! 🚀
