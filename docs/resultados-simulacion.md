# Resultados de Simulación - Requisitos de la Consigna

Basándome en la consigna del Trabajo Práctico Integrador, después de ejecutar la simulación, el sistema debe mostrar los siguientes elementos:

## 📊 1. EVENTOS DE LA SIMULACIÓN

### Archivo de eventos
- **Descripción**: Un registro cronológico de todos los eventos que ocurren durante la simulación
- **Formato**: Tiempo + descripción del evento
- **Eventos a registrar**:
  - ✅ Arriba un trabajo al sistema
  - ✅ Se incorpora un trabajo al sistema (después del TIP)
  - ✅ Se completa la ráfaga del proceso que se está ejecutando
  - ✅ Se agota el quantum (Round Robin)
  - ✅ Termina una operación de entrada-salida
  - ✅ Se atiende una interrupción de entrada-salida
  - ✅ Termina un proceso (después del TFP)
  - ✅ Cambios de estado: Corriendo→Terminado, Corriendo→Bloqueado, etc.

### Orden de procesamiento de eventos (según consigna):
1. Corriendo a Terminado
2. Corriendo a Bloqueado  
3. Corriendo a Listo
4. Bloqueado a Listo
5. Nuevo a Listo
6. Finalmente el despacho de Listo a Corriendo


## 📋 6. TABLA RESUMEN COMPARATIVA

### Configuración utilizada:
- Algoritmo de planificación empleado
- TIP, TFP, TCP utilizados
- Quantum (si aplica)

### Resumen de resultados:
- Tiempo total de simulación
- Número total de procesos
- Número total de eventos
- Eficiencia de la CPU
- Tiempo promedio de respuesta

## 💾 7. EXPORTACIÓN DE DATOS

### Formatos de salida:
- **Archivo de eventos**: Formato CSV o TXT con timestamp y descripción
- **Tabla de métricas**: Exportable a CSV para análisis posterior
- **Diagrama de Gantt**: Exportable como imagen o datos estructurados

## 🔍 8. ANÁLISIS Y OBSERVACIONES

### Sección para comentarios:
- Características de la tanda de procesos
- Comportamiento del algoritmo seleccionado
- Puntos de mejora identificados
- Comparación con otras estrategias (si corresponde)

---

## ✅ IMPLEMENTACIÓN TÉCNICA

### Estructura de datos requerida:
```typescript
interface ResultadosSimulacion {
  // Configuración
  configuracion: ConfiguracionSimulacion;
  procesos: ProcesoSimple[];
  
  // Eventos cronológicos
  eventos: EventoSimulacion[];
  
  // Métricas por proceso
  metricasPorProceso: MetricasProceso[];
  
  // Métricas globales
  metricasGlobales: MetricasGlobales;
  
  // Utilización CPU
  utilizacionCPU: UtilizacionCPU;
  
  // Diagrama de Gantt
  gantt: EventoGantt[];
}
```

### Componentes UI necesarios:
1. **EventosPanel**: Lista cronológica de eventos
2. **MetricasPanel**: Tabla de métricas por proceso
3. **ResumenPanel**: Indicadores globales y utilización CPU
4. **GanttChart**: Visualización del diagrama de Gantt
5. **ExportPanel**: Botones de exportación a diferentes formatos