Acá tenés los **8 pasos** con lo que hacer, qué validar, y los **errores típicos** a evitar, alineados con la **teoría de planificación** y la **consigna del integrador** (TIP## Errores típicos

* Contar TCP adentro del quantum.
* No reencolar al desalojado.
* No distinguir empate "termina ráfag## 🎉 **ESTADO ACTUAL: PASOS 1-7 COMPLETADOS Y BLINDADOS**

### ✅ **Implementado y Validado:**
- **Paso 1-3**: Modelo, cola de eventos, FCFS sandbox ✅
- **Paso 4**: Bloqueos E/S (B→L automático con bloqueoES) ✅  
- **Paso 5**: Costos TIP/TCP/TFP (con release+dispatch fix) ✅
- **Paso 6**: Round Robin con quantum (no expropiativo por llegadas) ✅
- **Paso 7**: SPN (no expropiativo) + SRTN (expropiativo) ✅

### 🛡️ **Blindajes Implementados:**
- **Purga multicapa**: onFinish() + guards en push() + filtro en next()
- **Expropiación estricta**: SRTN usa `<` (no `<=`) para evitar thrashing  
- **Orden total de eventos**: Prioridades 1:C→T, 2:C→B, 3:C→L, 4:B→L, 5:N→L, 6:L→C
- **Telemetría de desarrollo**: Invariants y guards para detectar regresiones
- **Tests de casos edge**: Empates, quantum puro, expropiación E/S, no expropiación SPN

### 📊 **Gates Pasando:**
- **FCFS**: P1[5]@0, P2[4]@2 → slices P1:0-5, P2:5-9 ✅
- **RR**: Quantum respetado, TCP/TFP no consumen quantum ✅
- **SPN**: Orden por ráfaga más corta, sin expropiación ✅  
- **SRTN**: Gate clásico [P1:0-2, P2:2-5, P1:5-11] ✅
- **Edge cases**: 4/4 tests pasando ✅

### 🚀 **Próximos Pasos (Opcionales):**
- **Paso 8**: Métricas (tiempo de retorno, espera, turnaround normalizado)
- **Paso 9**: Gantt interactivo (visualización de slices y eventos)
- **Paso 10**: UI/UX (carga de procesos, selección de algoritmo, exportación)

---

## Consejitos anti-bug aprendidos

* **Purga en origen**: onFinish() remueve de ready antes que next() filtre
* **Guard por tick**: `pendingDispatchAt` previene doble despacho
* **Expropiación estricta**: Solo con ventaja clara (`<`, no `<=`)
* **Order total**: Procesar todos los arribos/retornos antes de despachar
* **Contratos explícitos**: ORDEN_EVENTOS.md documenta invariantes críticos quantum".
* **❌ Bug C→T prematuro**: Usar `min(r,q)` para programar fin de ráfaga o eventos C→T obsoletos de slices anteriores → **✅ CORREGIDO**: Programar siempre `tFinCPU = t_s + rRestante` completo y validar que C→T corresponda al slice actual mediante `expectedSliceStart`.TFP, bloqueos de E/S, prioridades de eventos, preempciones, métricas y Gantt).

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

# 3) FCFS “sandbox” sin costos (sched/fcfs.ts + engine/engine.ts) IMPLEMENTADO

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

# 4) Bloqueos de E/S correctos (engine/engine.ts) IMPLEMENTADO

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

# 5) Costos TIP / TCP / TFP (engine/engine.ts) IMPLEMENTADO

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

# 6) Round Robin (sched/rr.ts + engine/engine.ts) ✅ IMPLEMENTADO

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

# 7) SPN (no exprop.) y SRTN (exprop.) (sched/spn.ts, sched/srtn.ts) IMPLEMENTADO

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

# 8) Prioridad (+ envejecimiento), Métricas y Gantt IMPLEMENTADO

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

¡Bien, Mica! Con el **Paso 8** (Prioridad+aging, Métricas y Gantt) ya definido, te paso una **ruta de cierre** para terminar la migración sin arrastrar errores del proyecto viejo. La idea es ir de adentro hacia afuera: **fachada del core → casos de uso → UI → exportes → pruebas E2E → documentación**.


## Paso 9 — Fachada del Core (API estable para la UI) IMPLEMENTADO

**Objetivo:** que el front **no toque** directamente el engine ni los schedulers.

**Qué crear (src/lib/application/):**

* `usecases/runSimulation.ts`

  * `runSimulation(cfg: SimulationConfig, procesos: Proceso[]): { trace, metricas, gantt }`
  * Internamente:

    1. Selecciona **scheduler** (FCFS/RR/SPN/SRTN/PRIORITY).
    2. Ejecuta engine con `Costos`.
    3. Construye **Metrics** con `MetricsBuilder`.
    4. Construye **GanttModel** con `GanttBuilder`.
* `adapters/schedulerFactory.ts`

  * Devuelve la instancia según `cfg.politica`.
* `adapters/costosFactory.ts`

  * Aglutina TIP/TCP/TFP/bloqueoES desde la UI.

**Definición de “hecho”:**

* `runSimulation` es **pura** (sin efectos en DOM).
* Solo retorna **POJOs**: `trace`, `metricas`, `gantt`.
* Unit tests: inyectar 4 fixtures y comparar contra goldens.

**Antibugs (lecciones del viejo.zip):**

* La UI **nunca** calcula métricas; solo muestra lo que viene de `MetricsBuilder`.
* La UI **nunca** recalcula Gantt; usa `GanttModel` intacto.

---

## reorganizacion IMPLEMENTADO

REORGANIZACIÓN COMPLETADA EXITOSAMENTE
🔄 Cambios Realizados:

1. Movido importador a io
✅ parser.ts: Importador de tandas JSON (antes ui/services/importers/legacyTanda.ts)
Renombrado: importLegacyTanda → parseTandaJSON
Renombrado: ProcesoLegacy → ProcesoTanda
Funciones: parseTandaJSON(), extractBloqueoESGlobal()

2. Creado export.ts
✅ Exportación completa: JSON/CSV para resultados, métricas, trace
✅ Funciones: exportToJSON(), exportMetricsToCSV(), exportTraceToCSV()
✅ Helpers browser: Descarga automática de archivos

3. Reorganizado simulacion.ts
✅ Stores principales: simulationConfig, procesos, simulationResult
✅ Derived stores: hasProcesses, canExecute, metricas, gantt
✅ Funciones puras: runSimulation(), runSimulationFromTanda()
✅ Acciones: loadFromTanda(), executeSimulation(), clearSimulation()

4. Movido factories a stores
✅ stores/costosFactory.ts: Factory de costos con validaciones
✅ stores/schedulerFactory.ts: Factory de runners por política

5. Eliminado directorios vacíos
✅ Eliminados: src/lib/application/, src/lib/ui/
✅ Limpieza: Referencias actualizadas en todos los tests
📋 Estructura Final (según README.md original):
src/lib/
├── model/          ✅ Tipos base (Proceso, Costos, Estados)
├── engine/         ✅ Motor de simulación (types, queue, engine)  
├── scheduler/      ✅ Algoritmos (FCFS, RR, SPN, SRTN, PRIORITY)
├── io/             ✅ Parser tandas + Export resultados  
├── metrics/        ✅ Cálculo métricas (TRp, TE, TRn, globales)
├── gantt/          ✅ Schema + Builder para diagramas
└── stores/         ✅ Simulación + factories (lógica UI)

🧪 Validación Completa:
✅ test-import-legacy.ts: Parser funcionando
✅ test-runSimulation.ts: Stores y funciones puras OK
✅ test-integration-tanda5p.ts: Todas las políticas funcionando

📊 Estructura.puml Actualizado:
✅ Reflejan realidad: Todos los archivos implementados marcados como ✅
✅ io/: Parser + Export documentados correctamente
✅ stores/: Simulación + factories integrados
✅ Dependencias: Actualizadas según nueva estructura
✅ Leyenda: Paso 9 completado + reorganización explicada
El proyecto ahora sigue fielmente la estructura original del README.md, con toda la lógica de entrada/salida en io/ y la coordinación de la UI centralizada en simulacion.ts. ¡Todo funciona perfectamente! 🎯


## Paso 10 — Casos de uso y stores (UI-side) IMPLEMENTADO

**Objetivo:** orquestar interacciones de la UI sin lógica de negocio.

**Qué crear (src/lib/ui/):**

* `stores/simStore.ts` (Svelte store)

  * `{ cfg, procesos, resultado? }`
* `services/importExport.ts`

  * `fromJSON`, `fromCSV`, `toJSON`, `toCSV`
* `services/fixtures.ts`

  * Carga rápida de **A_sinES_FCFS**, **B_conES_25**, **RR_q2**, **SRTN_preempt**.

**Definición de “hecho”:**

* Cambiar `cfg` o `procesos` **no** ejecuta automáticamente; el usuario dispara **Simular**.
* Import/Export **no muta** estructuras internas (clonado defensivo).

**Antibugs:**

* Validar entrada: `arribo >= 0`, ráfagas **> 0** (permitir 0 solo si lo trataste explícitamente), PIDs únicos.
* Si `politica='RR'`, exigir `quantum > 0`.
* `PRIORITY`: documentar convención “menor número = mayor prioridad”.

---

¡perfecto, Mica! Ajusté tus **Pasos 11–15** a la **estructura real** de tu repo (con `io/`, `stores/`, `engine/`, `scheduler/`, `metrics/`, `gantt/` y **sin** `application/` ni `ui/`). Abajo tenés **qué va en cada carpeta, nombres de archivos, responsabilidades y antibugs**, más **stubs mínimos** para conectar rápido.

---

# Paso 11 — UI: pantallas y componentes

## Rutas (SvelteKit)

* `src/routes/simulacion/+page.svelte` → Entrada de datos, configuración y botón **Simular**.
* `src/routes/resultados/+page.svelte` → **Gantt + Métricas + Trace** (o podés hacerlo como tabs en una sola página; a elección).

> Estado compartido: usás tus stores en `src/lib/stores/simulacion.ts`. No metas lógica de negocio en componentes; solo orquestá acciones del store.

## Componentes (colocalos en `src/lib/components/`)

* `ProcessTableEditor.svelte` — ABM + paste desde CSV/Excel (usa `procesos` store).
* `PolicySelector.svelte` — `politica`, `quantum`, y (cuando uses) `aging.step/aging.quantum`.
* `CostConfigForm.svelte` — `TIP/TCP/TFP/bloqueoES` (ligado a `simulationConfig`).
* `RunButton.svelte` — dispara `executeSimulation()` del store.
* `GanttView.svelte` — pinta **solo CPU** a partir de tu `GanttModel`.
* `MetricsTable.svelte` — `TRp`, `TE`, `TRn` por PID + promedios globales.
* `TraceViewer.svelte` (opcional) — tabla simple de eventos `{t, type, pid}`.

## Conexión desde la página

```svelte
<!-- src/routes/simulacion/+page.svelte -->
<script lang="ts">
  import ProcessTableEditor from '$lib/components/ProcessTableEditor.svelte';
  import PolicySelector from '$lib/components/PolicySelector.svelte';
  import CostConfigForm from '$lib/components/CostConfigForm.svelte';
  import RunButton from '$lib/components/RunButton.svelte';
  import { loadFixture, loadFromTanda, canExecute, executeSimulation } from '$lib/stores/simulacion';
  import { parseTandaJSON } from '$lib/io/parser';

  function onImportJson(evt: Event) {
    const input = evt.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    file.text().then(txt => {
      const json = JSON.parse(txt);
      // soporte doble: tanda legacy {nombre, tiempo_arribo,...} o escenario {cfg, procesos}
      if (Array.isArray(json)) {
        loadFromTanda(json); // usa parseTandaJSON adentro
      } else if (json.cfg && json.procesos) {
        // escenario completo
        // setear cfg + procesos pero NO ejecutar
      }
    });
  }
</script>

<h1>Simulación</h1>
<PolicySelector/>
<CostConfigForm/>
<ProcessTableEditor/>

<div class="actions">
  <button on:click={() => loadFixture('A_sinES_FCFS')}>Cargar Fixture A</button>
  <input type="file" accept="application/json" on:change={onImportJson}/>
  <RunButton on:click={() => executeSimulation()} disabled={!$canExecute}/>
</div>
```

```svelte
<!-- src/routes/resultados/+page.svelte -->
<script lang="ts">
  import GanttView from '$lib/components/GanttView.svelte';
  import MetricsTable from '$lib/components/MetricsTable.svelte';
  import TraceViewer from '$lib/components/TraceViewer.svelte';
  import { simulationResult } from '$lib/stores/simulacion';
</script>

{#if $simulationResult}
  <GanttView { $simulationResult }/>
  <MetricsTable metricas={$simulationResult.metricas}/>
  <details><summary>Ver Trace</summary>
    <TraceViewer trace={$simulationResult.trace}/>
  </details>
{:else}
  <p>No hay resultados. Corré una simulación en /simulacion.</p>
{/if}
```

### Antibugs (UI)

* **Gantt:** dibuja **solo** segmentos `tipo=CPU` del `GanttModel`. TIP/TCP/TFP/IO solo como hitos/tooltip si querés, **no barras**.
* **Sin side-effects en derived**: ningún `derived` debe ejecutar `executeSimulation()`.
* **Clonado defensivo**: import/export **no** deben mutar arrays originales (ya lo resolviste moviendo a `io/`).
* **RR**: deshabilitá el botón si `quantum<=0`.
* **PRIORITY**: la UI muestra claramente “menor número = mayor prioridad”.

**Definición de hecho (P11)**

* [ ] `/simulacion` con validaciones y botón **Simular**.
* [ ] `/resultados` muestra **Gantt** y **Métricas** coherentes con tus goldens.
* [ ] No se pintan TIP/TCP/TFP como CPU.

---

# Paso 12 — Exportes y reproducibilidad (usando tu `io/export.ts`)

## Acciones UI (agregalas en `simulacion.ts` si no están)

* `exportResultadoJSON()` → `{ cfg, procesos, trace, metricas, gantt }`.
* `exportMetricasCSV()` y `exportTraceCSV()` (ya los tenés, conectalos a botones en `/resultados`).

## Importar escenario/resultados

* **Escenario**: `{ cfg, procesos }` → setear stores y **no** ejecutar (el usuario decide).
* **Resultado completo**: si importás `{ cfg, procesos, trace, metricas, gantt }`, tratá esto **solo para visualizar**; si querés *reproducir*, re-ejecutá con `cfg+procesos` y compará con los goldens.

### Botones en `/resultados` (ejemplo)

```svelte
<button on:click={exportResultadoJSON}>Exportar Resultado (JSON)</button>
<button on:click={exportMetricasCSV}>Exportar Métricas (CSV)</button>
<button on:click={exportTraceCSV}>Exportar Trace (CSV)</button>
```

**Definición de hecho (P12)**

* [ ] Exportar `{ cfg, procesos, trace, metricas, gantt }`.
* [ ] Re-importar **escenario** (cfg+procesos) reproduce **exacto** Gantt y métricas.

---

# Paso 13 — Pruebas E2E y goldens (respetando tu layout)

## Goldens

* Carpeta `tests/goldens/`:

  * `A_sinES_FCFS.trace.json`, `A_sinES_FCFS.metricas.json`, `A_sinES_FCFS.gantt.json`
  * Idem `B_conES_25`, `RR_q2`, `SRTN_preempt`.

## Tests

* **Unit**

  * `metrics/metricas.test.ts` → `buildMetricsFromTrace` (TRp, TE, TRn, promedios)
  * `gantt/builder.test.ts` → solo segmentos CPU.
* **Integration**

  * `stores/simulacion.integration.ts` → `loadFixture → executeSimulation → comparar con goldens`.
* **E2E liviano** (opcional Playwright/Cypress)

  * Abrir `/simulacion` → cargar fixture → simular → navegar a `/resultados` → verificar valores esperados en tabla de métricas.

### Antibugs

* Ejecutar los **4 fixtures** ante cualquier cambio en engine/scheduler.
* Diff legible (pretty-assert) para comparar JSON.

**Definición de hecho (P13)**

* [ ] Goldens guardados.
* [ ] Unit + Integration + (opcional) E2E verde.

---

# Paso 14 — Documentación y diagramas finales (nombres ajustados)

Actualizá `diagramas/` con tu nomenclatura nueva (sin `/application/` ni `/ui/`):

* **08-secuencia-priority-aging.puml**
* **08-clases-metricas.puml**
* **08-componentes-gantt.puml**
* **11-componentes-ui.puml** → `stores/simulacion ↔ io/parser/export ↔ components ↔ routes`
* **11-secuencia-ui-run.puml** → click **Simular** → `stores/executeSimulation` → **runner** → `metricas/gantt` → UI

`README.md`:

* Cómo correr / testear / reproducir goldens.
* Convenciones:

  * **Prioridad**: menor número = mayor prioridad.
  * **Envejecimiento**: solo en **LISTO**; expropia con `<` (no `<=`).
  * **Métricas**: TRp = `finUltima - arribo`; TE = `TRp - servicioCPU`; TRn = `TRp/servicioCPU`.
  * **Gantt**: solo CPU.

**Definición de hecho (P14)**

* [ ] Docs y diagramas reflejan **io/** y **stores/** (no hay `/application/`).
* [ ] Convenciones explícitas.


## Mini-checklist (ya adaptado)

**P11 — UI**

* [ ] `/simulacion` con validaciones y `Simular`.
* [ ] `/resultados` con Gantt (solo CPU) + Métricas correctas.
* [ ] Sin side-effects en derived/stores.

**P12 — Exportes**

* [ ] Exporta `{ cfg, procesos, trace, metricas, gantt }`.
* [ ] Re-importar escenario reproduce 1:1.

**P13 — Pruebas**

* [ ] Goldens por fixture.
* [ ] Unit + Integration (+ E2E) verde.

**P14 — Docs/Diagramas**

* [ ] Diagramas `11-*` con `io/` y `stores/`.
* [ ] Convenciones claras.

---

Si querés, te paso en otro mensaje un **`GanttView.svelte` mínimo** (canvas/SVG) que consuma tu `GanttModel` y respete “solo CPU”.


# Mini-checklist por paso (copiá/pegá)

**P9 — Fachada Core**

* [ ] `runSimulation(cfg, procesos)` retorna `{trace, metricas, gantt}`.
* [ ] Tests con 4 fixtures → verde.

**P10 — Usecases/Stores**

* [ ] Store `simStore` centraliza estado.
* [ ] Import/Export de procesos con validaciones.

**P11 — UI**

* [ ] `/simulacion` funciona con validaciones y `Simular`.
* [ ] `/resultados` muestra Gantt y métricas correctos.
* [ ] Gantt no dibuja TIP/TCP/TFP.

**P12 — Exportes**

* [ ] Exporta e importa resultados completos.
* [ ] Reproducibilidad 1:1.

**P13 — Pruebas**

* [ ] Goldens guardados.
* [ ] Unit+Integration+E2E básico → verde.

**P14 — Docs/Diagramas**

* [ ] Diagrama de componentes UI y secuencia UI actualizados.
* [ ] Convenciones explícitas.

---

## Errores del viejo.zip que este plan previene

* **Métricas inconsistentes**: ahora solo salen de `MetricsBuilder`.
* **Gantt “creativo”**: UI solo pinta **CPU** del `GanttModel`.
* **Expropiaciones erráticas**: prioridad/aging con regla estricta `<` y desempates estables.
* **Doble despacho / eventos fuera de orden**: orden total en el engine + goldens obligatorios.
* **Regresiones invisibles**: E2E y goldens de resultados exportados.

---
