# Semántica y Especificación Formal del Simulador de Planificación

Este documento especifica de forma unívoca y formal las reglas de simulación, la gestión de eventos discretos, los costos del sistema operativo, las políticas de planificación y el cálculo de métricas en el simulador.

---

## 1. Modelo de Sistema y Estados

El simulador modela un sistema **multiprogramado y monoprocesador**.
En cualquier instante de tiempo $t$, la CPU ejecuta a lo sumo un único proceso o se encuentra ociosa / ejecutando overhead de sistema operativo.

### Estados de un Proceso
- **N (Nuevo / No arribado):** El proceso aún no ha ingresado al sistema o está transcurriendo su tiempo de admisión (TIP).
- **L (Listo):** El proceso está en la cola de listos aguardando asignación de CPU.
- **C (Corriendo / En ejecución):** El proceso ocupa la CPU realizando una ráfaga de cómputo.
- **B (Bloqueado):** El proceso está esperando la finalización de una operación de Entrada/Salida (E/S).
- **T (Terminado):** El proceso ha completado todas sus ráfagas de CPU y su tiempo de finalización (TFP).

### Transiciones y Eventos
- `N→L` (**ADMIT**): Proceso admitido en la cola de listos (tras cumplir `arribo + TIP`).
- `L→C` (**DISPATCH**): Despacho de un proceso de la cola de listos a la CPU.
- `C→B` (**BLOCK**): Proceso abandona la CPU para iniciar una ráfaga de E/S.
- `B→L` (**IO_OUT**): Proceso completa su ráfaga de E/S y reingresa a la cola de listos.
- `C→L` (**PREEMPT**): Proceso desalojado de CPU (por fin de quantum en RR o menor tiempo/mayor prioridad en SRTN/PRIORITY).
- `C→T` (**FINISH**): Proceso completa su última ráfaga de CPU e inicia el período TFP.
- `ADMIN_FINISH`: Finaliza el overhead de TFP; el proceso pasa formalmente a estado Terminado definitivo.

---

## 2. Costos del Sistema Operativo y Ocupación de CPU

El sistema modela tres costos configurables:

### 2.1 TIP (Tiempo de Ingreso de Proceso)
- **Definición:** Sobrecarga administrativa para validar y cargar un proceso al sistema.
- **Temporización:** Si un proceso arriba en $t_{\text{arribo}}$, su evento de admisión `N→L` ocurre en:
  $$t_{\text{admisión}} = t_{\text{arribo}} + \text{TIP}$$
- **Ocupación de CPU:** **No ocupa la CPU de cómputo.** Simula procesamiento asíncrono o del cargador del kernel sin detener la CPU principal.

### 2.2 TCP (Tiempo de Cambio de Contexto)
- **Definición:** Tiempo que tarda el despachador (dispatcher) en salvar el contexto del proceso saliente y restaurar el del entrante.
- **Temporización:** Si se despacha un proceso a CPU en el instante $t$:
  - Si $\text{TCP} > 0$, el intervalo de cambio de contexto es $[t, t + \text{TCP})$.
  - La ráfaga de cómputo efectiva inicia en $t + \text{TCP}$.
- **Ocupación de CPU:** **Ocupa la CPU.** Ningún otro proceso puede usar la CPU durante este intervalo.

### 2.3 TFP (Tiempo de Finalización de Proceso)
- **Definición:** Tiempo que emplea el sistema operativo para liberar recursos, tablas de páginas y estructuras del proceso terminado.
- **Temporización:** Tras culminar la última ráfaga de CPU en $t_{\text{finCPU}}$:
  - Si $\text{TFP} > 0$, el overhead administrativo ocupa el intervalo $[t_{\text{finCPU}}, t_{\text{finCPU}} + \text{TFP})$.
  - En $t_{\text{finCPU}} + \text{TFP}$ se emite `ADMIN_FINISH`.
- **Ocupación de CPU:** **Ocupa la CPU.**

### 2.4 Regla de No Solapamiento de Overhead y Despacho
En un sistema monoprocesador:
- Un despacho `L→C` **no puede comenzar** mientras la CPU esté ocupada por un $\text{TFP}$ en curso.
- Si $\text{TCP} = 0$, el siguiente proceso sólo puede iniciar su despacho en $t \ge t_{\text{finCPU}} + \text{TFP}$.

---

## 3. Cola de Eventos y Desempates Deterministas

Para garantizar simulación **determinista reproducible**:
1. Los eventos se ordenan primariamente por **tiempo $t$ creciente**.
2. Ante igual tiempo $t$, se ordenan por **prioridad de tipo de evento**:
   - Prioridad 1: `CPU_DONE`, `ADMIN_FINISH`, `FINISH` (liberación de CPU).
   - Prioridad 2: `IO_OUT` (`B→L`) y `ADMIT` (`N→L`) (incorporación a Listos).
   - Prioridad 3: `PREEMPT` (`C→L`) (desalojo).
   - Prioridad 4: `DISPATCH` (`L→C`) (asignación de CPU).
3. Ante igualdad de tiempo y prioridad de evento, desempata el **orden de secuencia de inserción (FIFO)**.

---

## 4. Políticas de Planificación

### 4.1 FCFS (First Come, First Served)
- **Tipo:** No expropiativo (cooperativo).
- **Criterio:** El primer proceso en llegar a la cola de listos es el primero en ser despachado.
- **Ráfagas:** Ejecuta la ráfaga de CPU completa hasta bloquearse por E/S o terminar.

### 4.2 RR (Round Robin)
- **Tipo:** Expropiativo por quantum $q > 0$.
- **Criterio:** Cola FIFO circular de listos.
- **Quantum:**
  - Si la ráfaga restante es menor o igual a $q$, el proceso ejecuta hasta completar su ráfaga.
  - Si la ráfaga restante es mayor a $q$, al cabo de $q$ unidades de CPU efectiva el proceso es desalojado (`C→L`) y se inserta al final de la cola de listos.
  - Al reingresar a CPU, el proceso recibe un nuevo quantum completo $q$.
- **Desempate en fin de quantum:** Si en el mismo tick $t$ en que vence el quantum arriba o desbloquea otro proceso, los nuevos arribos/desbloqueos se encolan antes que el proceso desalojado.

### 4.3 SPN (Shortest Process Next)
- **Tipo:** No expropiativo.
- **Criterio:** Al quedar libre la CPU, se selecciona el proceso en Listo cuya **próxima ráfaga de CPU** sea la más corta.
- **Desempate:** Si hay empate en duración de ráfaga, desempata por orden de arribo a Listo (FCFS).

### 4.4 SRTN (Shortest Remaining Time Next)
- **Tipo:** Expropiativo.
- **Criterio:** Se selecciona el proceso con menor tiempo de ráfaga CPU restante.
- **Expropiación:**
  - Ocurre al arribar o desbloquearse un proceso si su tiempo de ráfaga es **estrictamente menor** que el tiempo restante efectivo del proceso actualmente en CPU.
  - **Regla de empate:** En caso de empate ($t_{\text{nuevo}} = t_{\text{restante}}$), **no se expropia**, minimizando cambios de contexto innecesarios (*thrashing*).

### 4.5 Prioridad con Aging
- **Tipo:** Expropiativo.
- **Escala de prioridades:** Rango de enteros de **1 a 10**, donde:
  - **1 = Mayor prioridad**.
  - **10 = Menor prioridad**.
- **Aging (Envejecimiento):**
  - Para evitar inanición (*starvation*), un proceso que espera en la cola de listos mejora su prioridad en 1 nivel (su valor numérico decrece hacia 1, con límite inferior en 1) cada vez que transcurre el período configurado de aging.
- **Criterio de Expropiación:**
  - Se evalúa comparando la **prioridad efectiva (envejecida)** del candidato contra la prioridad efectiva del proceso en ejecución.
  - Si la prioridad efectiva del candidato es estrictamente superior (número estrictamente menor), expropia la CPU.

---

## 5. Especificación de Métricas

### 5.1 Métricas por Proceso
Para cada proceso $p$:
- **Tiempo de Retorno ($TR_p$ / Turnaround):**
  $$TR_p = t_{\text{fin}}(p) - t_{\text{arribo}}(p)$$
  donde $t_{\text{fin}}(p)$ incluye la finalización de su última ráfaga y su TFP asociado.
- **Tiempo de Espera ($TE_p$):** Tiempo total acumulado que el proceso permaneció en estado Listo.
- **Tiempo de Servicio CPU ($S_p$):** Suma neta de las duraciones de ráfagas CPU ejecutadas.
- **Tiempo de Respuesta Normalizado ($TR_n$):**
  $$TR_n = \begin{cases} \frac{TR_p}{S_p} & \text{si } S_p > 0 \\ 0 & \text{si } S_p = 0 \end{cases}$$
- **Tiempo de Respuesta ($TResp_p$):** Tiempo transcurrido desde el arribo hasta la primera vez que el proceso obtiene la CPU:
  $$TResp_p = t_{\text{primer } L \to C}(p) - t_{\text{arribo}}(p)$$

### 5.2 Métricas Globales de la Tanda
- **Origen y Fin Temporal:**
  $$t_{\text{inicio}} = \min_{p} (t_{\text{arribo}}(p))$$
  $$t_{\text{fin}} = \max_{p} (t_{\text{fin}}(p))$$
  $$\text{Tiempo Total de Simulación} = t_{\text{fin}} - t_{\text{inicio}}$$
- **Throughput:**
  $$\text{Throughput} = \frac{N}{\text{Tiempo Total de Simulación}} \quad (N = \text{cantidad de procesos})$$
- **Tiempo Medio de Retorno ($TMR$):**
  $$TMR = \frac{1}{N} \sum_{p} TR_p$$
- **Tiempo Medio de Espera ($TME$):**
  $$TME = \frac{1}{N} \sum_{p} TE_p$$
- **Utilización y Ociosidad de CPU:**
  Calculada mediante la **unión de intervalos continuos** $[t_0, t_1)$ de ocupación efectiva de CPU (slices de procesos + overheads de TCP y TFP) respecto al horizonte $[t_{\text{inicio}}, t_{\text{fin}}]$.

