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

## 🔍 8. ANÁLISIS Y OBSERVACIONES

### Sección para comentarios:
- Características de la tanda de procesos
- Comportamiento del algoritmo seleccionado
- Puntos de mejora identificados
- Comparación con otras estrategias (si corresponde)

---


### Componentes UI necesarios:
1. **EventosPanel**: Lista cronológica de eventos
2. **MetricasPanel**: Tabla de métricas por proceso
3. **ResumenPanel**: Indicadores globales y utilización CPU
4. **GanttChart**: Visualización del diagrama de Gantt
5. **ExportPanel**: Botones de exportación a diferentes formatos