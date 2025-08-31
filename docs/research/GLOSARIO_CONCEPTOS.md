# 📚 GLOSARIO DE CONCEPTOS - SIMULADOR DE PLANIFICACIÓN DE PROCESOS

## 🎯 **OBJETIVO**
Este glosario conecta la teoría de Sistemas Operativos con la implementación del simulador, asegurando que cada término utilizado en el código sea comprensible y coherente con la literatura académica.

---

## 🔄 **ESTADOS DE PROCESO**

### **NUEVO**
- **Definición:** Proceso creado pero no admitido aún en memoria principal
- **En el código:** `EstadoProceso.NUEVO`
- **Transición:** Nuevo → Listo (mediante planificador a largo plazo)

### **LISTO (Ready)**
- **Definición:** Proceso en memoria, esperando asignación de CPU
- **En el código:** `EstadoProceso.LISTO`
- **Característica:** Está preparado para ejecutar instantáneamente

### **CORRIENDO (Running)**
- **Definición:** Proceso actualmente ejecutando en el procesador
- **En el código:** `EstadoProceso.CORRIENDO` 
- **Nota:** Cambiado de "EJECUTANDO" para alinearse con la terminología académica

### **BLOQUEADO (Blocked)**
- **Definición:** Proceso esperando evento externo (E/S, señal, recurso)
- **En el código:** `EstadoProceso.BLOQUEADO`
- **Transición típica:** Corriendo → Bloqueado (por E/S)

### **TERMINADO (Terminated/Exit)**
- **Definición:** Proceso finalizado, liberado del sistema
- **En el código:** `EstadoProceso.TERMINADO`

---

## ⚡ **EVENTOS DEL SISTEMA**

### **DISPATCH (Activación)**
- **Definición:** Acción del dispatcher de asignar CPU a un proceso
- **En el código:** `TipoEvento.DISPATCH`
- **Función:** `proceso.activar()` (anteriormente "despachar")

### **EXPROPIACIÓN (Preemption)**
- **Definición:** Interrupción forzosa de un proceso en ejecución
- **Causas:** Quantum expirado, proceso mayor prioridad, etc.
- **En el código:** `proceso.expropiar()`

### **TRANSICIONES DE ESTADO**
- `LISTO_A_CORRIENDO`: Dispatch del scheduler
- `CORRIENDO_A_LISTO`: Expropiación por quantum/prioridad  
- `CORRIENDO_A_BLOQUEADO`: Solicitud de E/S
- `BLOQUEADO_A_LISTO`: Finalización de E/S
- `CORRIENDO_A_TERMINADO`: Proceso completa ejecución

---

## 🕒 **TIEMPOS DEL SISTEMA OPERATIVO**

### **TCP - Tiempo de Cambio de Proceso**
- **Definición académica:** Context Switching Time - overhead de cambiar entre procesos
- **Incluye:** Salvar/restaurar registros, actualizar PCB, cambiar memoria
- **Impacto:** Overhead puro - no contribuye al trabajo útil

### **TFP - Tiempo de Función de Planificación**
- **Definición académica:** Scheduling Function Time - tiempo que tarda el planificador en decidir
- **Incluye:** Recorrer colas, aplicar algoritmo, seleccionar proceso
- **Optimización:** Algoritmos simples (FCFS) vs complejos (prioridades múltiples)

### **TIP - Tiempo de Inicialización de Proceso**
- **Definición académica:** Process Loading Time - overhead de crear nuevo proceso
- **Incluye:** Crear PCB, asignar memoria, inicializar estructuras
- **Momento:** Al admitir proceso del estado NUEVO al sistema

---

## 🎲 **ALGORITMOS DE PLANIFICACIÓN**

### **FCFS (First Come, First Served)**
- **Características:** No expropiativo, simple, orden de llegada
- **Problema:** Efecto convoy (procesos cortos esperan tras largos)
- **Uso:** Sistemas batch, combinado con prioridades

### **SJF/SPN (Shortest Job First/Shortest Process Next)**
- **Características:** No expropiativo, óptimo para tiempo medio de retorno
- **Desafío:** Requiere conocer/estimar tiempo de ejecución
- **Riesgo:** Inanición de procesos largos

### **SRTF/SRTN (Shortest Remaining Time First/Next)**
- **Características:** Versión expropiativa de SJF
- **Ventaja:** Mejor tiempo de respuesta para trabajos cortos
- **Costo:** Mayor overhead por cambios de contexto

### **Round Robin**
- **Características:** Expropiativo por quantum, equitativo
- **Quantum:** Rodaja de tiempo que determina balance overhead/respuesta
  - **Quantum grande:** ≈ FCFS (menos overhead, peor respuesta)
  - **Quantum pequeño:** Mayor overhead, mejor respuesta interactiva
  - **Óptimo:** 20-50ms en sistemas reales

### **Priority Scheduling**
- **Características:** Ejecuta siempre el proceso de mayor prioridad
- **Riesgo:** **Inanición** (starvation) de procesos baja prioridad
- **Solución:** **Prevención de inanición** - incrementar prioridad por tiempo de espera

---

## 📊 **MÉTRICAS DE RENDIMIENTO**

### **Tiempo de Retorno (TR)**
- **Fórmula:** TR = Tiempo finalización - Tiempo arribo
- **Incluye:** Tiempo ejecución + tiempo espera + overhead SO
- **Objetivo:** Minimizar (especialmente en sistemas batch)

### **Tiempo de Retorno Normalizado (TRn)**
- **Fórmula:** TRn = Tiempo Retorno / Tiempo Servicio
- **Interpretación:** 
  - **TRn = 1.0:** Óptimo (proceso ejecutó sin esperar)
  - **TRn = 100:** Proceso estuvo 100 veces más tiempo del necesario
- **Uso:** Detectar inequidad entre procesos cortos/largos

### **Tiempo de Respuesta**
- **Definición:** Primer dispatch - arribo
- **Crítico en:** Sistemas interactivos y tiempo real
- **Diferencia de tiempo de espera:** Solo cuenta hasta primer servicio

### **Utilización de CPU**
- **Objetivo:** Maximizar porcentaje de tiempo productivo
- **Tiempo Usuario:** CPU ejecutando código de aplicación
- **Tiempo OS:** Overhead del sistema (TCP+TFP+TIP)
- **Tiempo Idle:** CPU sin trabajo (todos procesos bloqueados)

---

## 🚨 **PROBLEMAS CLÁSICOS**

### **Inanición (Starvation)**
- **Definición:** Proceso nunca ejecuta por procesos de mayor prioridad
- **Solución:** Prevención de inanición (aging) - incrementar prioridad gradualmente
- **En el código:** `aplicarPrevencionInanicion()`

### **Efecto Convoy**
- **Definición:** Procesos cortos esperan tras proceso largo en FCFS
- **Impacto:** Tiempo de retorno alto para trabajos pequeños
- **Solución:** Algoritmos SJF/SPN

### **Thrashing**
- **Definición:** Exceso de fallos de página por multiprogramación alta
- **Relación:** Manejado por planificador a medio plazo
- **Indicador:** Utilización CPU baja pese a alta multiprogramación

---

## 🔧 **IMPLEMENTACIÓN vs TEORÍA**

### **Cambios Realizados:**
1. **"despachar" → "activar":** Más claro conceptualmente
2. **"EJECUTANDO" → "CORRIENDO":** Terminología académica estándar
3. **"envejecimiento" → "prevención de inanición":** Más descriptivo del propósito
4. **Documentación de quantum:** Explicación de trade-offs teóricos
5. **Métricas documentadas:** Interpretación y objetivos clarificados

### **Coherencia Conseguida:**
- ✅ Nomenclatura alineada con apuntes académicos
- ✅ Conceptos explicados en contexto
- ✅ Relación teoría-implementación clara
- ✅ Terminología técnica preservada donde corresponde

---

## 📖 **REFERENCIAS TEÓRICAS**
- Estados de proceso: Stallings, Operating Systems
- Algoritmos de planificación: Tanenbaum, Modern Operating Systems  
- Métricas de rendimiento: Silberschatz, Operating System Concepts
- Overhead del SO: Documentación apunte integrador

*Este glosario asegura que cualquier estudiante de Sistemas Operativos pueda comprender la implementación sin ambigüedades conceptuales.*
