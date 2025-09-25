Acá tenés los **8 pasos** con lo que hacer, qué validar, y los **errores típicos** a evitar, alineados con la **teoría de planificación** y la **consigna del integrador** (TIP/TCP/TFP, bloqueos de E/S, prioridades de eventos, preempciones, métricas y Gantt).

---

# 1) Modelo + Reglas Base (src/lib/sim/model/*) IMPLEMENTADO

## Qué implementás

* `proceso.ts`: `Proceso{ pid, arribo, rafagasCPU:number[], estado:'N'|'L'|'C'|'B'|'F' }` + `servicioTotal(p)`.
* `rafaga.ts`: helpers: `rafagaActual(rafagas, idx)`, `quedanRafagas(rafagas, idx)`.
* `estados.ts`: **contrato de estados** y validador de **transición legal** (N→L, L→C, C→B, B→L, C→T).
* `costos.ts`: `Costos{ TIP, TCP, TFP, bloqueoES }` + `COSTOS_DEF`.

## Teoría a tener en cuenta

* **Estados canónicos**: Nuevo (N), Listo (L), Corriendo (C), Bloqueado (B), Terminado (F).
* **Transiciones legales** (mínimas):
  N→L (arribo efectivo), L→C (despacho), C→B (fin de ráfaga intermedia), B→L (fin de E/S), C→T (fin total).
* **Servicio** = suma de ráfagas CPU (sin costos).

## Gate (aceptación)

* `servicioTotal([a,b,c]) === a+b+c`.
* Rechazás transiciones ilegales (ej.: C→N).
* `Costos` no negativos; `bloqueoES` por defecto = 25 ms (salvo que especifiques otro).

## Errores típicos a evitar

* Mezclar costos con servicio: **TIP/TCP/TFP NO son CPU**.
* Permitir que un proceso esté simultáneamente en 2 estados.

---

# 2) Tipos del Motor + Cola de Eventos (engine/types.ts, engine/queue.ts) IMPLEMENTADO

## Qué implementás

* `EventType`: `'C→T'|'C→B'|'C→L'|'B→L'|'N→L'|'L→C'`.
* `EVENT_PRIORITY`: **1:C→T, 2:C→B, 3:C→L, 4:B→L, 5:N→L, 6:L→C**.
* `SimEvent{ t, type, pid?, data? }`.
* `Trace{ slices:[{pid,start,end}], events:[{t,type,pid}] }`.
* `EventQueue.push/pop/isEmpty()` que ordene por `(t asc, prioridad asc)` con **orden estable**.

## Teoría a tener en cuenta

* **Empates en t**: se resuelven por prioridad (acá “menor número = mayor prioridad”).
* Orden estable evita “saltos fantasma” (dos eventos iguales mantienen orden de llegada).

## Gate

* Con 3 eventos al mismo `t`, salen en orden de prioridad (1→2→3…).
* Con 2 eventos idénticos, sale primero el que entró primero (estable).

## Errores típicos

* Ordenar solo por `t` y no por prioridad → inconsistencias en empates.
* Perder estabilidad → alternancias no reproducibles.

---

# 3) FCFS “sandbox” sin costos (sched/fcfs.ts + engine/engine.ts)

## Qué implementás

* `IScheduler` simple y `SchedulerFCFS`: cola FIFO (`ready-queue.ts`).
* `run()` minimal:

  * Agenda **N→L** en `t = arribo` (sin TIP todavía).
  * Si CPU libre → `L→C` y crear **slice** desde `t`.
  * Decrementás `restante` de la ráfaga actual por tick.
  * Si termina ráfaga:

    * Si **quedan** más ráfagas → `C→B` y más tarde harás `B→L` (próximo paso).
    * Si **no quedan** → `C→T`.

> Por ahora podés setear `bloqueoES = 0` para validar el “esqueleto”.

## Teoría a tener en cuenta

* FCFS es **no expropiativo**: una vez en CPU, ejecuta hasta finalizar **esa ráfaga**.

## Gate (golden simple)

* Caso A (sin E/S):
  P1: arr=0, [5]; P2: arr=2, [4] → slices: **P1:0–5**, **P2:5–9**.
* Caso B (E/S=0):
  P1: arr=0, [3,2]; P2: arr=1, [4] → **P1:0–3, P2:3–7, P1:7–9**.

## Errores típicos

* Cerrar un slice con `start>=end`.
* “Olvidar” emitir `C→T` al final.

---

# 4) Bloqueos de E/S correctos (engine/engine.ts)

## Qué implementás

* Tras **cada ráfaga** (si quedan más):

  * Emite `C→B @ t_fin`.
  * Agenda `B→L @ t_fin + bloqueoES`.
* **B→L es instantáneo** (no ocupa CPU). El costo real de E/S es `bloqueoES`.

## Teoría a tener en cuenta

* En la consigna suele pedirse un **bloqueo fijo** (p.ej., 25 ms) **después de cada ráfaga** intermedia.
* Mientras un proceso está en B, **no compite** por CPU.

## Gate

* Caso B con `bloqueoES = 25`:
  P1:0–3 → `C→B@3`, `B→L@28`; P2 corre 3–7; CPU ociosa 7–28; P1 28–30.

## Errores típicos

* Cobrar “tiempo” al evento **B→L** (no corresponde).
* Reinsertar a Listo antes de tiempo.

---

# 5) Costos TIP / TCP / TFP (engine/engine.ts)

## Qué implementás

* **TIP** (Ingreso): agenda `N→L` en `arribo + TIP`.
* **TCP** (Cambio de contexto): al despachar `L→C @ t`, el **slice inicia en `t + TCP`**. **TCP no descuenta** ráfaga ni quantum.
* **TFP** (Finalización): al terminar proceso, emite `C→T @ t + TFP` (no CPU).

## Teoría a tener en cuenta

* **TIP**: latencia de entrada al sistema.
* **TCP**: costo administrativo de cambiar de contexto (no trabajo útil).
* **TFP**: costo administrativo de cierre (no CPU).

## Gate

* Caso A con TIP=1, TCP=1, TFP=1:
  Slices mantienen **misma duración** (5 y 4), pero **comienzos desplazados** (+1 para TIP y +1 en cada L→C).
  Ejemplo: **P1:1–6**, **P2:7–11**.

## Errores típicos

* Restarle TCP al tiempo de ráfaga o contarlo en el quantum.
* Aplicar TIP fuera de N→L (e.g., en cada retorno de B→L).
* Hacer que TFP “ocupe CPU”.

---

# 6) Round Robin (sched/rr.ts + engine/engine.ts)

## Qué implementás

* `SchedulerRR(quantum)` que, al **vencer quantum**, **desaloja** y reencola al final.
* En el engine:

  * Llevás `quantumRestante` del proceso actual.
  * Si `quantumRestante` llega a 0 **antes** de terminar ráfaga →

    * Cerrar slice en `t`, **emitir `C→L @ t`** (desalojo), `onDesalojoActual(pid)`, y despachar otro si hay (`L→C` + TCP del entrante).
  * Si termina ráfaga **exacto** cuando vence quantum, prevalece **fin de ráfaga** (teoría: “fin natural” > “time slice”).

## Teoría a tener en cuenta

* RR es **expropiativo** por reloj, no por arribos.
* **TCP** se cobra en cada **L→C** (incluidas las veces por expropiación).

## Gate

* TIP=TCP=TFP=0, E/S=0, q=2:
  P1: [5], P2: [5], ambos arr=0 →
  `[P1:0–2, P2:2–4, P1:4–6, P2:6–8, P1:8–9, P2:9–10]`
* Con **TCP=1**, los **comienzos** de cada tramo se mueven +1, pero **cada tramo dura 2**.

## Errores típicos

* Contar TCP adentro del quantum.
* No reencolar al desalojado.
* No distinguir empate “termina ráfaga vs vence quantum”.

---

# 7) SPN (no exprop.) y SRTN (exprop.) (sched/spn.ts, sched/srtn.ts)

## Qué implementás

* **SPN**: en `elegirSiguiente`, tomás **ráfaga inmediata más corta** entre los listos; **no expropia** (aunque llegue otro más corto).
* **SRTN**: mantenés una estructura (min-heap o sort) por **tiempo restante**; **expropia** si arriba/retorna uno con **menor restante** que el actual.

  * Al **expropiar**: cerrás slice en `t`, emitís `C→L @ t` del saliente, `onDesalojoActual(pid)`; despachás al nuevo (`L→C @ t` + TCP).

## Teoría a tener en cuenta

* **SPN** minimiza **tiempo de retorno promedio** sin expropiación (variante de SJF por job próximo).
* **SRTN** es la versión **preemptiva** de SJF (siempre el más corto restante).

## Gate

* SRTN clásico (TIP/TCP/TFP=0, E/S=0):
  P1: arr=0 [8], P2: arr=2 [3] →
  `[P1:0–2, P2:2–5, P1:5–11]` (preempción en t=2).

## Errores típicos

* No **recalcular** “restante” del actual al decidir expropiar.
* No aplicar **TCP** al **entrante** después de expropiar.
* Empates: definir **desempate estable** (arribo, PID) y **documentarlo**.

---

# 8) Prioridad (+ envejecimiento), Métricas y Gantt

(sched/priority.ts, metrics/metricas.ts, gantt/*)

## Qué implementás

* **Prioridad**: `getPri(pid)` con regla clara (menor número = mayor prioridad, o al revés, pero **documentalo**).

  * **Envejecimiento (anti-starvation)**: cada `interval` en Listo, ajustás `±delta` la prioridad efectiva.
  * Desempates: por arribo o PID (estable).
* **Métricas**:

  * Por proceso: `TRp = fin - arribo`, `TE = TRp - servicio`, `TRn = TRp / servicio`.
  * Globales: promedios simples.
  * **fin** = timestamp del **C→T** (incluye TFP).
* **Gantt**: desde `trace.slices` → `GanttModel{ pid, start, end }`; no incluyas TIP/TFP/TCP como CPU.

## Teoría a tener en cuenta

* Envejecimiento: sube prioridad de quien espera mucho para **evitar inanición** en colas dominadas por prioridades altas o ráfagas cortas.
* Las **métricas** deben basarse en **arribo original** y **fin real** (con TFP sumado).

## Gate

* Con una tanda donde un proceso corto se reinserta mucho (RR/SRTN), verificás que **TRp/TE** de largos no sea infinito y que el envejecimiento haga que “suban” a ejecutarse.
* El Gantt coincide 1:1 con `slices` (sin “huecos” indebidos salvo TCP/ociocidad).

## Errores típicos

* Calcular TRp con fin del último slice **sin sumar TFP**.
* Mostrar TCP en el Gantt como si fuera CPU.
* Envejecimiento que “explota” (sube sin techo) o que **no impacta** por valores ridículos (interval enorme, delta minúsculo).

---

## Fixtures (usalos SIEMPRE para no “romper” lo logrado)

1. **A_sinES_FCFS**

```
P1: arr 0 [5]
P2: arr 2 [4]
```

2. **B_conES_25**

```
P1: arr 0 [3,2]  (bloqueoES=25)
P2: arr 1 [4]
```

3. **RR_q2**

```
P1: arr 0 [5]
P2: arr 0 [5]   (q=2)
```

4. **SRTN_preempt**

```
P1: arr 0 [8]
P2: arr 2 [3]
```

---

## Checklist de invariantes (corré esto mentalmente en cada cambio)

* **Orden temporal**: eventos y slices tienen `start < end`, `t` no retrocede.
* **Un solo proceso en CPU** por instante.
* Cada `C→B` tiene su `B→L` posterior; cada PID finaliza con `C→T`.
* **B→L no ocupa CPU**; **TCP/TIP/TFP no son CPU**.
* **Prioridad de eventos** se respeta en empates.
* **RR**: quantum cuenta **solo** CPU real.
* **SRTN**: si llega uno más corto, **expropia** y **cobra TCP** al entrante.
* **Métricas** calculadas con `arribo` original y `fin (C→T)`.

---

## Consejitos anti-bug (aprendidos de tu proyecto anterior)

* Guardá en cada slice un `reason: 'start'|'rr'|'srtn'` (debug visual).
* Cuando cierres un slice, **empujá el siguiente evento primero** (C→B o C→T) y **recién después** intentes despachar. Eso respeta la prioridad y evita “saltear” B→L.
* En el engine, **no decidas** la política; limitate a: “¿Quién va ahora?” (`elegirSiguiente`).
* Si algo inexplicable pasa, **volvé a los 4 fixtures** y compará `trace.slices` con tus goldens.

---

Si querés, te dejo en un próximo mensaje los **stubs exactos** (TypeScript) para `IScheduler`, `FCFS`, `EventQueue`, `run()` y una `RR` mínima con `quantum`, de modo que puedas compilar y empezar a validar los **Gate 1–6** sin escribir todo desde cero.
