¡Dale! Abrí y repasé a fondo tus dos adjuntos: **/src** y **archivospuml**. Te dejo un informe accionable, con ruta de archivo, síntoma y la **explicación conceptual** de por qué está mal o puede darte salidas erróneas.

---

# Hallazgos clave en `src/` (código)

## 1) Cálculo de métricas del SO (TIP/TFP/TCP) – **subestimado/simplificado**

* **Archivo**: `src/lib/domain/services/MetricsCalculator.ts`
* **Qué vi**: se suma “a mano” overhead del SO con un atajo (`cpuSO += 2; // TIP + TFP simplificado`) en lugar de **medir** TIP/TFP/TCP reales a partir de eventos/estado.
* **Por qué está mal (conceptual)**: TIP, TFP y TCP forman parte del **tiempo del sistema** y deben computarse exactamente según los eventos del motor (admisión, finalización, conmutaciones). Si los aproximás, las métricas de utilización de CPU y tiempos de retorno/espera **no cuadran** con la simulación.
* **Cómo corregir**:

  * Usar los contadores **reales** del simulador (`tiempoTotalSO`, `tiempoTotalUsuario`, `cpuOcioso`) que ya existen en `Simulador.ts`.
  * O, alternativamente, reconstruirlos desde el **log de eventos** (TIP/TFP/TCP) en GanttBuilder y alimentar a MetricsCalculator con esos totales exactos.

## 2) Generación/consumo de eventos: **`DISPATCH` no lo emite el motor**

* **Archivo**: `src/lib/domain/entities/Simulador.ts` (motor)
* **Qué vi**: en el dominio sí existe `TipoEvento.DISPATCH`, y GanttBuilder/Types lo contemplan, pero el **motor** no lo genera de forma explícita (no aparece su programación en el simulador; sólo lo usan GanttBuilder, types y runSimulation).
* **Por qué está mal (conceptual)**: si el **despacho** (Listo→Corriendo) no deja traza como evento, se hace difícil cobrar correctamente **TCP** y alimentar cronología/Gantt de manera consistente, sobre todo con expropiaciones.
* **Cómo corregir**:

  * Al efectuar un **despacho**, programar/registrar un `DISPATCH` (o usar consistentemente `LISTO_A_CORRIENDO`) y **cobrar TCP** ahí (ver punto 3).
  * Asegurar el orden de prioridades del evento de despacho (ver punto 4).

## 3) **TCP pendiente por expropiación**: patrón correcto, verificar uso en todos los flujos

* **Archivo**: `src/lib/domain/entities/Simulador.ts`
* **Qué vi**: implementaste `marcarTCPPendiente` / `cobrarTCPPendiente` / `tieneTCPPendiente`. Excelente.
* **Riesgo conceptual**: si **no** invocás **siempre** `marcarTCPPendiente()` al expropiar y **siempre** `cobrarTCPPendiente()` **antes** de un nuevo `DISPATCH`, se perderán conmutaciones → métricas y Gantt **inconsistentes**.
* **Cómo corregir/validar**:

  * En cada **expropiación** (RR por quantum; SRTF por llegada de más corto), **marcar** el TCP pendiente.
  * **Antes** de activar el próximo proceso (despacho), **cobrar** el TCP pendiente y avanzar reloj/estadísticos.

## 4) **Orden de prioridad de eventos**: está definido, validá que sea **estable**

* **Archivo**: `src/lib/domain/events/gantt.types.ts` → `Evento.obtenerPrioridad()` y `compare()`
* **Qué vi**: el mapa de prioridades refleja exactamente el orden esperado (1) C→T, (2) C→B, (3) C→L, (4) B→L, (5) N→L, (6) L→C; además ponen `PROCESO_TERMINA` con prioridad 0 y `JOB_LLEGA` con 7 (bien).
* **Riesgo conceptual**: la **cola** debe ordenar por **(tiempo, prioridad, desempate determinista)**. Tu `compare()` lo hace bien (tiempo → prioridad → id proceso). Perfecto. Sólo chequeá que **todo el motor** use **siempre** esa cola (PriorityQueue con `a.compare(b)` ya está ok).

## 5) **RR (Round Robin)**: preempción por quantum OK, ojo con “reinicios” del quantum

* **Archivo**: `src/lib/domain/algorithms/rr.ts`
* **Qué vi**: `asignarQuantum()` valida > 0; `alTickQuantum()` compara contra `tiempoInicioQuantum`. Correcto.
* **Riesgo conceptual**: cada vez que **vuelve** el proceso a CPU (sea tras I/O o después de dar una vuelta por READY) debe **reiniciarse** `tiempoInicioQuantum`. Ya lo haces en `elegirSiguiente` asignando `tiempoInicioQuantum = tiempoActual`. Asegurate de **resetearlo** también cuando un proceso **continúa** tras una expropiación por quantum (porque sale y reingresa) para no “heredar” ticks viejos.

## 6) **SRTF (SRTN)**: usás `restanteTotalCPU` (bien), validar decrementos

* **Archivo**: `src/lib/domain/algorithms/srtf.ts` y `entities/Proceso.ts`
* **Qué vi**: ordenás por `restanteTotalCPU` (SRTN **verdadero**). En `Proceso.finalizarRafagaCPU()` descontás la **ráfaga actual** y reseteás para la próxima, marcando `pendienteTFP` al terminar (bien).
* **Riesgo conceptual**: que `restanteTotalCPU` se **descuente** también con ejecuciones **parciales** (cuando SRTF expropia a mitad de ráfaga). Veo que descontás en `procesarCPU` al avanzar CPU; validá esa ruta. Si sólo descontás al final de ráfaga, SRTF elegiría mal.

## 7) **FCFS**: FIFO de READY (bien) – recordatorio conceptual

* **Archivo**: `src/lib/domain/algorithms/fcfs.ts`
* **Qué vi**: no reordenás por arribo original; usás **orden de llegada a READY** (incluye retornos de I/O al final). Correcto.

## 8) **Priority (con envejecimiento)**: chequeo de “aging” por tiempo en READY

* **Archivo**: `src/lib/domain/algorithms/priority.ts`
* **Qué vi**: parámetros `prevencionInanicionHabilitada`, `incrementoPrioridadPorEspera`, `intervaloIncrementoPrioridad`.
* **Riesgo conceptual**: aplicar el **aging** sólo mientras **LISTO** (no en BLOQUEADO/CPU) y que el incremento **no** altere la prioridad “externa” persistente si tu modelo la debería conservar aparte. Asegurate de documentar si la prioridad **efectiva** es la incrementada y cómo la reseteás.

## 9) **GanttBuilder**: mezcla de lógica y `console.log` + TIP/TCP/TFP condicionados

* **Archivo**: `src/lib/domain/services/GanttBuilder.ts`
* **Qué vi**: construís segmentos **TIP/TCP/TFP** si `config` lo indica; además hay `console.log` dentro de la lib de dominio.
* **Por qué está mal (conceptual)**: la salida de dominio debe ser **pura**; logs ruidosos distorsionan usos (tests/producción) y complican debugging.
* **Cómo corregir**: eliminar `console.log` del dominio; dejar flags de depuración **fuera** (o inyectar un logger). Y **forzar** que TIP/TFP/TCP **siempre** aparezcan en Gantt si tienen duración > 0 (coherente con métricas).

## 10) **`simulationRunner.ts`** usa `any`

* **Archivo**: `src/lib/application/usecases/simulationRunner.ts`
* **Qué vi**: `any` en tipos.
* **Por qué está mal (conceptual)**: rompe la **seguridad de tipos** y deja pasar estados/eventos inválidos, generando **salidas inconsistentes**.
* **Cómo corregir**: tipar con `SimEvent`, `RunConfig`, `Workload`, `Policy` del dominio y evitar `any`.

## 11) **Validaciones**: muy bien encaminadas, pero faltan reglas cruzadas

* **Archivo**: `src/lib/domain/validators.ts`
* **Qué vi**: buenas validaciones de rangos/enteros.
* **Faltantes conceptuales**:

  * Si `policy = 'RR'`, `quantum` **obligatorio** y > 0.
  * Rango sensato de `prioridad` y coherencia con aging.
  * Alertas por **arribos simultáneos** + **colisiones** con TCP/TIP (esto afecta el orden exacto de eventos al mismo timestamp).
  * Verificar que **TIP** y **TFP** no “pisen” CPU de usuario (deben consumirse como tiempo de **SO**).

## 12) **UI/estilos**: `style.css` vacío

* **Archivo**: `src/lib/ui/styles/style.css` (0 bytes)
* **Impacto**: no es error de simulación, pero explica por qué la UI “se siente vacía”. Podés mover tokens a utilidades y aplicar estilos básicos a tablas, timeline y estados.

---

# Hallazgos en `archivospuml` (diagramas)

> En general, tus PUML están **bien alineados** con el dominio que codificaste. Señalo desajustes que pueden confundir o llevar a documentación incoherente con el comportamiento real del simulador.

## A) **Diagrama de clases (`uml/clases.puml`) vs código**

* **Qué vi**: Clases principales (`Simulador`, `Proceso`, `Scheduler`, `GanttBuilder`, `MetricsCalculator`) están.
* **Detalle a ajustar**:

  * Incluir atributos **dinámicos** que usás y son críticos: `tcpPendientePorExpropiacion`, `tiempoTotalSO/Usuario/Ocioso`, `colaEventos: PriorityQueue<Evento>`.
  * Aclarar que **`PriorityQueue`** ordena por `(tiempo, prioridad, id)` (estabilidad de la simulación).
  * Documentar que `EstrategiaScheduler…` determinan sólo **selección**; el **motor** cobra TIP/TFP/TCP.

## B) **Diagramas de secuencia (`secuencia/*.uml`)**

* **Qué vi**: Muy claros (ej. `srtf_detallado.uml`) con notas TIP/TFP/TCP y cronología.
* **Desacoples conceptuales**:

  * Aparece lifeline “**SRTFQueue**” pero en código usás `EstrategiaSchedulerSrtf` y `readyQueue` administrada por el **motor**. Renombralo a “**Scheduler (SRTF)**” o “Estrategia SRTF” para que coincida con el código.
  * Asegurate de **representar** la **expropiación** como dos eventos: (1) **C→L** del actual y (2) **L→C/Dispatch** del nuevo, con **TCP** cobrado entre medio (o marcado/cobrado como lo modelás en el motor).
  * Cuando muestres **JOB\_LLEGA** y **NUEVO→LISTO (TIP)**, reflejá que el tiempo **en LISTO** **no** corre **antes** de finalizar TIP (esto ya lo respetás en `Proceso.finalizarTIP`).

## C) **Diagramas de actividad/flujo**

* **Qué vi**: Están bien; marcá explícito el **camino de errores** (p.ej., validaciones de input) y los nodos donde el **orden de eventos simultáneos** cambia el resultado (cola estable por prioridad).

---

# Prioridades de arreglo (en orden)

1. **Métricas exactas**: que `MetricsCalculator` consuma **tiempos reales** del `Simulador` (o reconstruya de eventos) y no atajos.
2. **Despacho como evento** + **TCP pendiente**: asegurar la dupla `expropiar → marcar` y `despachar → cobrar`.
3. **Gantt sin logs** + TIP/TFP/TCP siempre que **duración>0**, y alineado a las métricas.
4. **RR/SRTF**: reset del quantum en cada (re)entrada y decremento exacto de `restanteTotalCPU` también en ráfagas **parciales**.
5. **Validaciones**: reforzar cruces (RR→quantum, prioridades, simultaneidad).
6. **PUML**: renombrar lifelines (“SRTFQueue” → “Scheduler SRTF”), agregar campos dinámicos del simulador y explicitar la prioridad estable de eventos.

---

# Mini checklist de verificación (te sirve para probar rápido)

* **Caso 1**: 2 procesos, sin I/O, `RR(q=2)`, `TIP=TFP=TCP=1`. Verificar que cada expropiación **cobre 1** y que **CPU usuario + SO + ocioso = makespan**.
* **Caso 2**: Llegada simultánea de 3 procesos + 1 `IO_COMPLETA` en el **mismo timestamp**. Chequear que el orden sea **C→T**, **C→B**, **C→L**, **B→L**, **N→L**, **L→C**, y que Gantt respete esa resolución.
* **Caso 3**: `SRTF` con un proceso corto que arriba tarde: debe **expropiar** al largo instantáneamente; el **TCP** aparece entre ambas asignaciones en Gantt y en métricas del SO.

Si querés, puedo **ajustar el código** de `MetricsCalculator` y el punto del **despacho** dejándolo coherente con tu `Simulador` y tu `GanttBuilder` (sin preguntar nada más).
