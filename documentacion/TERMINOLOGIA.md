# Terminología del Simulador de Planificación de Procesos

## Coherencia con la Teoría de Sistemas Operativos

Este documento explica la terminología utilizada en el simulador y su correspondencia directa con los conceptos teóricos de sistemas operativos según el apunte integrador.

## Estados de Procesos

| Término en el Simulador | Término Teórico | Explicación |
|------------------------|-----------------|-------------|
| `NUEVO` | **Nuevo (New)** | Proceso recién creado, BCP creado pero no cargado en memoria |
| `LISTO` | **Listo (Ready)** | Proceso en memoria principal, esperando asignación de CPU |
| `EJECUTANDO` | **Corriendo/En Ejecución (Running)** | Proceso actualmente ejecutándose en el procesador |
| `BLOQUEADO` | **Bloqueado (Blocked)** | Proceso esperando finalización de E/S o evento externo |
| `TERMINADO` | **Saliente/Terminado (Exit/Terminated)** | Proceso que completó su ejecución |

## Eventos del Sistema

| Evento en el Simulador | Evento Teórico | Descripción |
|----------------------|----------------|-------------|
| `ARRIBO_TRABAJO` | **Llegada/Creación** | Nuevo trabajo admitido en el sistema |
| `INCORPORACION_SISTEMA` | **Nuevo → Listo** | Proceso admitido tras TIP |
| `DESPACHO` | **Despacho (Dispatch)** | Listo → Ejecutando, selección del planificador |
| `CAMBIO_CONTEXTO` | **Context Switch** | Intercambio de procesos con overhead TCP |
| `INICIO_RAFAGA_CPU` | **CPU Burst Start** | Proceso comienza ejecución efectiva |
| `FIN_RAFAGA_CPU` | **CPU Burst Complete** | Finalización de ráfaga de CPU |
| `AGOTAMIENTO_QUANTUM` | **Fin de Quantum/Time-Out** | Interrupción por expiración de tiempo |
| `INICIO_ES` | **Inicio de E/S (Bloqueo)** | Ejecutando → Bloqueado por E/S |
| `FIN_ES` | **Fin de E/S (Desbloqueo)** | Bloqueado → Listo tras completar E/S |
| `ATENCION_INTERRUPCION_ES` | **E/S Interrupt Handled** | Manejo de interrupción de E/S |
| `TERMINACION_PROCESO` | **Terminación** | Proceso finaliza ejecución |

## Campos de Proceso

| Campo en el Simulador | Campo Teórico (Consigna) | Explicación |
|----------------------|---------------------------|-------------|
| `name` | **Nombre del proceso** | Identificador único del proceso |
| `tiempoArribo` | **Tiempo de arribo** | Momento de llegada al sistema |
| `rafagasCPU` | **Cantidad de ráfagas de CPU** | Número total de ráfagas para completarse |
| `duracionRafagaCPU` | **Duración de la ráfaga de CPU** | Tiempo de ejecución por ráfaga |
| `duracionRafagaES` | **Duración de la ráfaga de E/S** | Tiempo de entrada/salida entre ráfagas |
| `prioridad` | **Prioridad externa** | Nivel de prioridad (1-100, mayor = más prioridad) |

## Parámetros del Sistema Operativo

| Parámetro | Nombre Completo | Explicación Teórica |
|-----------|-----------------|-------------------|
| `TIP` | **Tiempo de Inicialización de Proceso** | Tiempo que utiliza el SO para aceptar nuevos procesos (Nuevo → Listo) |
| `TFP` | **Tiempo de Finalización de Proceso** | Tiempo que utiliza el SO para terminar procesos |
| `TCP` | **Tiempo de Cambio de Proceso** | Tiempo de conmutación entre procesos (context switching) |
| `quantum` | **Quantum/Rodaja de Tiempo** | Tiempo máximo asignado en Round Robin |

## Métricas de Rendimiento

### Por Proceso
| Métrica en el Simulador | Métrica Teórica | Fórmula |
|------------------------|-----------------|---------|
| `tiempoRetorno` | **Tiempo de Retorno (TRp)** | Tiempo desde arribo hasta finalización (incluye TFP) |
| `tiempoRetornoNormalizado` | **Tiempo de Retorno Normalizado (TRn)** | TRp / Tiempo efectivo de CPU |
| `tiempoEnListo` | **Tiempo en Estado de Listo** | Suma de períodos en cola de listos |

### Por Tanda
| Métrica en el Simulador | Métrica Teórica | Fórmula |
|------------------------|-----------------|---------|
| `tiempoRetornoTanda` | **Tiempo de Retorno de la Tanda (TRt)** | Desde primer arribo hasta último TFP |
| `tiempoMedioRetorno` | **Tiempo Medio de Retorno (TM_Rt)** | Σ(TRp) / cantidad de procesos |

### Uso de CPU
| Métrica en el Simulador | Métrica Teórica | Explicación |
|------------------------|-----------------|-------------|
| `cpuOcioso` | **Tiempo Ocioso** | CPU sin trabajo útil (todos los procesos bloqueados) |
| `cpuSO` | **Tiempo SO** | TIP + TFP + TCP (overhead del sistema operativo) |
| `cpuProcesos` | **Tiempo Procesos** | Tiempo efectivo de ejecución de código de usuario |

## Funciones del Simulador (Español Descriptivo)

### Análisis de Entrada (I/O)
| Función | Propósito | Explicación |
|---------|-----------|-------------|
| `analizarTandaJson()` | **Procesar archivo JSON** | Lee y valida tanda de procesos desde JSON |
| `analizarTandaCsv()` | **Procesar archivo CSV** | Lee y valida tanda de procesos desde CSV/TXT |
| `normalizarPolitica()` | **Normalizar política** | Convierte string a tipo Policy válido |

### Validación
| Función | Propósito | Explicación |
|---------|-----------|-------------|
| `validarProceso()` | **Validar proceso individual** | Verifica campos de un ProcessSpec |
| `validarConfiguracion()` | **Validar configuración** | Verifica parámetros del SO (TIP, TFP, TCP, quantum) |
| `validarTandaDeProcesos()` | **Validar tanda completa** | Valida toda la tanda de procesos |

### Exportación
| Función | Propósito | Explicación |
|---------|-----------|-------------|
| `exportarEventosCsv()` | **Exportar log de eventos** | Genera archivo CSV con eventos del sistema |
| `exportarMetricasJson()` | **Exportar métricas** | Genera archivo JSON con indicadores de rendimiento |
| `conPorcentajes()` | **Agregar porcentajes** | Calcula porcentajes de uso de CPU |

### Manejo de Eventos
| Función | Propósito | Explicación |
|---------|-----------|-------------|
| `ordenarEventosParaExportar()` | **Ordenar eventos** | Ordena cronológicamente para exportación |
| `eventoALineaCsv()` | **Formatear evento** | Convierte SimEvent a línea CSV |

### Diagrama de Gantt
| Función | Propósito | Explicación |
|---------|-----------|-------------|
| `ordenarGantt()` | **Ordenar segmentos** | Ordena GanttSlices cronológicamente |
| `validarSinSolapes()` | **Detectar solapes** | Verifica consistencia del diagrama |

### Interfaz de Usuario
| Función | Propósito | Explicación |
|---------|-----------|-------------|
| `cargarArchivo()` | **Cargar tanda de procesos** | Lee archivo seleccionado por el usuario |
| `descargarEventos()` | **Descargar log de eventos** | Descarga archivo CSV de eventos |
| `descargarMetricas()` | **Descargar métricas** | Descarga archivo JSON de indicadores |

## Políticas de Planificación

| Sigla | Nombre Completo | Descripción Teórica |
|-------|-----------------|-------------------|
| `FCFS` | **First Come, First Served** | No expropiativo, orden de llegada |
| `PRIORITY` | **Prioridad Externa** | Expropiativo, mayor prioridad primero |
| `RR` | **Round Robin** | Expropiativo, quantum fijo circular |
| `SPN` | **Shortest Process Next** | No expropiativo, trabajo más corto primero |
| `SRTN` | **Shortest Remaining Time Next** | Expropiativo, menor tiempo restante |

## Transiciones de Estados (Orden de Procesamiento)

Según la consigna del TP, el orden acordado es:
1. **Ejecutando → Terminado**
2. **Ejecutando → Bloqueado**
3. **Ejecutando → Listo**
4. **Bloqueado → Listo**
5. **Nuevo → Listo**
6. **Listo → Ejecutando** (Despacho)

## Consideraciones Especiales

- **Envejecimiento (Aging)**: Técnica para evitar inanición incrementando prioridad de procesos que esperan mucho
- **Expropiación (Preemption)**: Capacidad del SO de interrumpir un proceso en ejecución
- **Multiprogramación**: Múltiples procesos en memoria para mejorar utilización de CPU
- **Cambio de Contexto**: Salvar estado de un proceso y restaurar el de otro (overhead TCP)

## Beneficios de la Nomenclatura en Español

1. **Autoexplicación**: Los nombres de funciones explican exactamente lo que hacen
2. **Coherencia académica**: Coincide perfectamente con el apunte integrador
3. **Mantenibilidad**: Un nuevo desarrollador entiende inmediatamente cada función
4. **Alineación con el dominio**: La terminología refleja el dominio de sistemas operativos

### Ejemplos de Claridad:
- `analizarTandaJson()` → "Esta función analiza una tanda de procesos desde un archivo JSON"
- `validarTandaDeProcesos()` → "Esta función valida una tanda completa de procesos"
- `tiempoRetornoNormalizado` → "Este es el TRn: Tiempo de Retorno dividido tiempo de servicio"

Esta terminología asegura que cualquier estudiante familiarizado con la teoría de sistemas operativos pueda entender inmediatamente cada concepto y función sin ambigüedades.
