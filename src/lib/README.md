Estructura:
model

proceso.ts - Tipos de Proceso (pid, arribo, ráfagas), Estado del proceso (N, L, C, B, F), Utilidades básicas
rafaga.ts - Utilidades para manejar ráfagas, Índice/actual y chequeos de restantes
estados.ts - Definición de estados, Reglas de transición válidas (invariantes)
costos.ts - Parámetros TIP, TCP, TFP y bloqueo de E/S, Valores por defecto y helpers de costos
engine

types.ts - Tipos del motor (EventType, SimEvent), Estructura de traza (slices, eventos), Contratos de entrada/salida de run()
queue.ts - Cola de eventos, Orden por timestamp + prioridad de evento
engine.ts - Bucle principal de simulación (run), Manejo de reloj, despacho, E/S y costos, Construcción de la traza
sched

scheduler.ts - Interfaz/contrato de planificadores (IScheduler), Enum/Tipo de políticas soportadas
ready-queue.ts - Implementaciones de colas de listos, FIFO y utilidades base (min-queue opcional)
fcfs.ts - Planificador FCFS, Integración con cola FIFO
rr.ts - Planificador Round Robin, Manejo de quantum y reencolado
spn.ts - Planificador SPN (no expropiativo), Selección por ráfaga más corta siguiente
srtn.ts - Planificador SRTN (expropiativo), Selección por menor tiempo restante
priority.ts - Planificador por prioridades, (Opcional) Envejecimiento/ajuste de prioridad
io

parser.ts - Validación y normalización de entrada (JSON/CSV), Conversión a estructuras de Proceso
export.ts - Exportación de trazas/métricas (JSON/CSV), Helpers para descarga/serialización
metrics

metricas.ts - Cálculo de métricas por proceso y globales, TRp, TE, TRn, promedios y agregados
gantt

schema.ts - Tipos para el modelo de Gantt de UI, Items, inicio/fin y normalizaciones
builder.ts - Conversión de trace.slices a modelo de Gantt, Agrupación y orden cronológico para pintar
stores

simulacion.ts - Svelte stores para política seleccionada, Resultados (trace/fin) y costos en UI