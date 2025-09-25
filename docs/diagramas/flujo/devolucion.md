Gracias por compartir los diagramas de flujo para cada algoritmo de planificación y el sistema de estados con reglas de TCP. Hice una revisión detallada de cada uno (SRTF, SJF, RR, PRIORITY, FCFS y el diagrama global de transiciones + TCP). A continuación te detallo **qué está bien**, **qué necesita corregirse o aclararse** y **por qué** en términos conceptuales y de implementación.

---

## ✅ En general, los flujos están **muy bien estructurados y claros**:

* Representan correctamente los pasos críticos de cada política.
* Distinguen cuándo se cobra TCP y cuándo no.
* Separan adecuadamente los eventos de planificación (L→C) de los de transición de estado (C→B, C→T).
* Tienen anotaciones útiles que resumen las características de cada algoritmo (excelente para el informe final o defensa oral).

---

## 🔎 Análisis individual por diagrama

---

### 🟥 1. **SRTF - Shortest Remaining Time First**

📌 **Cosas correctas**:

* Expropiación inmediata si un nuevo proceso tiene menor `restanteTotalCPU`.
* Inserción del proceso actual en Ready y reordenamiento.
* Aplicación de TCP **en expropiación** y **en despacho**.

⚠️ **Problemas o mejoras**:

* 🔧 **Confusión en nombres**: el proceso que se está ejecutando suele llamarse `procesoActual`, y el nuevo se suele llamar `candidato`. Asegurate que no te confundís en la comparación de `restanteTotalCPU`.
* ❗**La comparación debe ser estricta** (`<`), pero si llega un proceso **igual en tiempo restante** deberías mantener el que ya está (no expropiar). Agregalo como condición explícita: `SI nuevo.restante < actual.restante → expropiar`.

💡 **Sugerencia**:

> En sistemas reales, cuando hay empate, se prioriza mantener el proceso actual por eficiencia. Aclaralo en el diagrama o documentalo.

---

### 🟨 2. **SJF - Shortest Job First**

📌 **Correcto**:

* No expropiativo.
* Ordenamiento por “servicio estimado” (`rafagasRestantes * duracionCPU`).
* TCP solo en el despacho.

⚠️ **Mejoras**:

* 🔧 **Podrías indicar cómo se actualiza `rafagasRestantes`** en cada finalización de ráfaga (aunque no sea parte directa del scheduler).
* 📘 En la práctica, `servicioRestante` es estimado con técnicas como **exponential averaging**. Si no vas a usar estimaciones, documentalo como simplificación.

---

### 🟩 3. **Round Robin (RR)**

📌 **Excelente**:

* Manejo de quantum con timer.
* Condiciones claras para eventos FIN\_RAFAGA vs QUANTUM\_EXPIRADO.
* Aplicación correcta de TCP solo en expropiación.

⚠️ **Pequeños detalles**:

* ❗ La parte de “No hay TCP” si termina naturalmente está correcta, pero **podés destacar mejor que NO se cobra TCP aunque vuelva a Ready si hay más ráfagas** (C→B).
* 💡 Sugerencia: agregar explícitamente “reiniciar quantum en nuevo despacho” para evitar errores de acumulación de ticks.

---

### 🟦 4. **PRIORITY Scheduling**

📌 **Correcto**:

* Expropiativo si `nueva prioridad > actual`.
* Carga de TCP por expropiación y despacho.
* Inserción del proceso expropiado.

⚠️ **Mejoras necesarias**:

* ⚠️ **No se representa el envejecimiento (aging)**. Si tu simulador lo tiene (como vimos en tu código), deberías agregar un paso de "incremento de prioridad si espera demasiado".
* 🟨 **Ambigüedad con prioridad**: aclarar si mayor valor numérico = mayor prioridad (lo dice la nota, pero mejor incluirlo también arriba en el diagrama).

---

### 🟫 5. **FCFS - First Come First Served**

📌 **Correcto**:

* FIFO puro.
* Sin expropiación.
* TCP solo en despacho.

⚠️ **Detalle menor**:

* Agregá una nota sobre **efecto convoy**, ya que puede derivar en **injusticia temporal** cuando un proceso largo bloquea la CPU por mucho tiempo.

---

### 🟪 6. **Sistema de Estados + Reglas de TCP**

📌 **MUY BUENO**:

* Flujo de estados bien definido: NUEVO → LISTO → CORRIENDO → BLOQUEADO / TERMINADO.
* Reglas de cuándo se **cobra TCP** y cuándo no.
* Condiciones para TCP bien explícitas.

⚠️ **Detalles a mejorar**:

* ❗ Falta mostrar visualmente que los eventos de planificación (selección de proceso) son **activados por eventos externos** (arribo, desbloqueo, finalización de TIP, etc.). Podés sumar burbujas o anotaciones tipo “evento genera necesidad de planificación”.
* 🛑 **IMPORTANTE**: el bloque “Aplicar TFP” está en una esquina algo aislada. Debería ser más claro que se cobra **solo** al finalizar el proceso y no en otras condiciones.

💡 **Extra**:
Podés agregar como nota al pie:

> “La suma de TIP, TCP, TFP y CPU Usuario debe cubrir todo el makespan del sistema (salvo ociosidad)”.

---

## 📌 Conclusión general

Tus diagramas están muy bien diseñados. Solo hay **pequeños ajustes** necesarios para:

* Aclarar empates (SRTF, Priority).
* Representar explícitamente reinicio de quantum (RR).
* Alinear visualmente TFP con la salida del sistema.
* Integrar “aging” si estás usando prioridades dinámicas.

---

¿Querés que te los devuelva corregidos en PlantUML o en algún formato editable (como .drawio o .svg)? También te puedo generar la versión “anotada” con íconos de advertencia y sugerencias para que te sirvan como parte del informe final.
