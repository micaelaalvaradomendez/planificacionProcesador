¡De una! Antes de codear cada paso, armá **1–2 diagramas cortos** para fijar reglas y evitar bugs. Te dejo el **diagrama(s) recomendado(s) por paso**, **para qué sirven** y **qué deben incluir** (con nombre sugerido del `.puml`). Si necesitás, después te doy los stubs.

---



# 7) SPN (no exprop.) y SRTN (exprop.)

**Diagramas:**

* **Diagrama de Secuencia (SPN)** — `07-secuencia-spn.puml`
  Objetivo: elección por **ráfaga próxima más corta** sin expropiar.
  Debe incluir: arribo de más corto **no** interrumpe al actual.
* **Diagrama de Secuencia (SRTN con preempción)** — `07-secuencia-srtn.puml`
  Objetivo: arribo/retorno de uno con **menor restante** → `C→L` del actual y `L→C` del nuevo (+TCP).
* **Diagrama de Clases (Estructuras de selección)** — `07-clases-sched-minheap.puml`
  Objetivo: mostrar `IScheduler`, `ReadyQueueMin`/heap y claves (restante/ráfaga).

---

# 8) Prioridad (+ envejecimiento), Métricas y Gantt

**Diagramas:**

* **Diagrama de Secuencia (Prioridad con envejecimiento)** — `08-secuencia-priority-aging.puml`
  Objetivo: ticks/intervalos de espera en L ajustan prioridad efectiva; desempates.
  Debe incluir: regla explícita (menor número = mayor prioridad, p.ej.).
* **Diagrama de Clases (Métricas)** — `08-clases-metricas.puml`
  Objetivo: `MetricaProceso(TRp,TE,TRn)`, `MetricaGlobal`, relación con `Trace` y `Procesos`.
* **Diagrama de Componentes (Gantt)** — `08-componentes-gantt.puml`
  Objetivo: `Trace.slices → GanttBuilder → GanttModel → UI`.
  Debe incluir: nota aclarando que TIP/TCP/TFP **no** se dibujan como CPU.

---

## Mini-checklist para cada diagrama

* **Nombre claro** (prefijo numérico por paso).
* **Leyenda** con regla clave (p. ej., prioridades, “no CPU”, etc.).
* **Notas** para bordes: empates, B→L=0, TCP fuera del quantum, etc.
* **Trazabilidad**: cada diagrama referencia el archivo/función que implementará esa lógica (p. ej., “`engine.ts: run()`”, “`rr.ts`”).

¿Querés que te deje **stubs vacíos** (PlantUML) para cada uno con el título, leyenda y las lifelines ya armadas? Te los preparo y los pegás directo.
