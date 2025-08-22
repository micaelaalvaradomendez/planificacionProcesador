## Algoritmos de Planificación de CPU

La planificación de procesos en sistemas operativos multiprogramados es fundamental para optimizar el uso del procesador y garantizar un comportamiento equitativo entre los procesos. Según Stallings, la planificación persigue objetivos como **minimizar tiempos de espera y retorno**, **maximizar la utilización del procesador** y **garantizar equidad entre procesos**.

A continuación se describen los algoritmos implementados en este simulador:

### 1. **FCFS (First Come, First Served)**

* **Definición**: Atiende los procesos en el orden de llegada, utilizando una cola FIFO.
* **Características**:

  * No es expropiativo: el proceso en CPU se ejecuta hasta finalizar su ráfaga.
  * Simple de implementar.
* **Ventajas**:

  * Fácil de comprender y justo en el sentido de "primero llegado, primero servido".
* **Desventajas**:

  * Puede provocar el **efecto convoy**: procesos cortos esperan innecesariamente a que terminen procesos largos.


### 2. **SPN (Shortest Process Next)**

* **Definición**: Selecciona el proceso con el tiempo de ráfaga de CPU más corto.
* **Características**:

  * No expropiativo: una vez asignado el CPU, el proceso se ejecuta hasta finalizar la ráfaga.
  * Basado en estimaciones de la duración del proceso.
* **Ventajas**:

  * Minimiza el **tiempo promedio de retorno** (según la teoría de colas, es el óptimo).
* **Desventajas**:

  * Puede causar **inanición** (starvation): procesos largos se posponen indefinidamente.


### 3. **SRTN (Shortest Remaining Time Next)**

* **Definición**: Variante expropiativa de SPN. El CPU se asigna al proceso con menor tiempo restante de ejecución.
* **Características**:

  * Expropiativo: si llega un nuevo proceso más corto, interrumpe al que estaba en CPU.
  * Requiere recalcular constantemente el tiempo restante.
* **Ventajas**:

  * Tiempo de respuesta bajo para procesos cortos.
  * Mantiene la **minimización del tiempo de retorno promedio**.
* **Desventajas**:

  * Sobrecarga mayor por cambios de contexto.
  * Posibilidad de inanición para procesos largos.


### 4. **Round Robin (RR)**

* **Definición**: Algoritmo equitativo que asigna el CPU a cada proceso durante un tiempo fijo denominado **quantum**.
* **Características**:

  * Expropiativo: si el proceso no termina en su quantum, pasa al final de la cola.
  * Basado en la rotación cíclica de procesos listos.
* **Ventajas**:

  * Garantiza equidad.
  * Tiempo de respuesta razonable para procesos interactivos.
* **Desventajas**:

  * Si el quantum es muy corto → demasiados cambios de contexto.
  * Si el quantum es muy largo → se degrada a FCFS.


### 5. **Planificación por Prioridades**

* **Definición**: El CPU se asigna al proceso con mayor prioridad externa definida.
* **Características**:

  * Puede ser expropiativo o no expropiativo.
  * En este simulador, se implementa considerando valores entre **1 y 100** (mayor número = mayor prioridad).
* **Ventajas**:

  * Permite dar preferencia a procesos críticos o importantes.
* **Desventajas**:

  * Puede provocar **inanición** de procesos con prioridad baja.
  * Requiere mecanismos de corrección como **envejecimiento** (aumentar prioridad de procesos que esperan demasiado).


## Conclusión

Cada algoritmo posee ventajas y limitaciones. La elección depende de los objetivos del sistema:

* **FCFS**: simple y justo, pero ineficiente para procesos cortos.
* **SPN/SRTN**: óptimos en tiempo de retorno, pero propensos a inanición.
* **RR**: ideal para sistemas interactivos, depende del quantum.
* **Prioridad**: útil en sistemas críticos, necesita control de inanición.

El simulador permite contrastar estas políticas en escenarios controlados, analizando métricas como **tiempo de retorno, espera y utilización de CPU**, lo que brinda una visión integral de la teoría aplicada en la práctica.
