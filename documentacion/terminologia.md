# Glosario de Términos Técnicos del Simulador

## Conceptos Fundamentales

### **Process (Proceso)**
Un programa en ejecución que tiene asignados recursos del sistema. En el simulador, cada proceso tiene un identificador único (PID), tiempo de arribo, ráfagas de CPU y puede estar en diferentes estados.

### **PID (Process Identifier)**
Número único que identifica a cada proceso en el sistema. Por ejemplo: PID=1, PID=2, etc.

### **Scheduler (Planificador)**
Componente del sistema operativo que decide cuál proceso debe ejecutarse en la CPU y cuándo. Implementa una política específica como FCFS, RR, etc.

### **Policy (Política de Planificación)**
Algoritmo o regla que determina el orden en que los procesos acceden a la CPU. Ejemplos: FCFS (primero en llegar), Round Robin, etc.

### **CPU Burst (Ráfaga de CPU)**
Período de tiempo durante el cual un proceso usa intensivamente la CPU para realizar cálculos, antes de realizar operaciones de entrada/salida.

### **I/O Burst (Ráfaga de E/S)**
Período durante el cual un proceso está bloqueado esperando que se complete una operación de entrada/salida (lectura de disco, red, etc.).

---

## Estados de Procesos

### **Estado N (New/Nuevo)**
El proceso recién ha sido creado pero aún no ha sido admitido al sistema para ejecutarse.

### **Estado L (Ready/Listo)**
El proceso está preparado para ejecutarse y espera ser seleccionado por el scheduler para usar la CPU.

### **Estado C (Running/CPU)**
El proceso está actualmente ejecutándose en la CPU.

### **Estado B (Blocked/Bloqueado)**
El proceso está esperando que se complete una operación de E/S y no puede continuar hasta que termine.

### **Estado T (Terminated/Terminado)**
El proceso ha completado su ejecución y ha liberado todos sus recursos.

### **Estado F (Finished/Finalizado)**
Sinónimo de terminado, indica que el proceso completó todas sus ráfagas de CPU.

---

## Arquitectura del Sistema

### **Engine (Motor de Simulación)**
Núcleo del simulador que ejecuta el bucle principal de eventos, maneja las transiciones de estado y coordina todos los componentes.

### **Queue (Cola)**
Estructura de datos que almacena elementos en orden. En el contexto del simulador:
- **Ready Queue:** Cola de procesos listos para ejecutarse
- **Event Queue:** Cola de eventos ordenados por tiempo

### **Trace (Traza de Ejecución)**
Registro completo de todo lo que ocurrió durante la simulación, incluyendo todos los eventos y períodos de ejecución de cada proceso.

### **Slice (Segmento de Ejecución)**
Período continuo durante el cual un proceso específico usa la CPU, definido por tiempo de inicio y fin.

### **Event (Evento)**
Algo que ocurre en un momento específico durante la simulación, como el arribo de un proceso o el cambio de estado.

---

## Componentes de Visualización

### **Gantt Chart (Diagrama de Gantt)**
Representación visual de la línea de tiempo que muestra cuándo y por cuánto tiempo cada proceso usa la CPU.

### **Track (Pista)**
En el diagrama de Gantt, cada línea horizontal que representa la actividad de un proceso específico a lo largo del tiempo.

### **Segment (Segmento)**
Bloque rectangular en el Gantt que representa un período de ejecución continua de un proceso.

### **Timeline (Línea de Tiempo)**
Eje horizontal del Gantt que muestra la progresión del tiempo durante la simulación.

---

## Algoritmos de Planificación

### **FCFS (First Come First Served)**
"Primero en llegar, primero en ser servido". Los procesos se ejecutan en el orden exacto en que arriban al sistema.

### **RR (Round Robin)**
Cada proceso recibe un tiempo fijo (quantum) para ejecutarse. Si no termina, se coloca al final de la cola y espera su siguiente turno.

### **SPN (Shortest Process Next)**
Se ejecuta primero el proceso que tiene la ráfaga de CPU más corta. No es expropiativo (no interrumpe procesos en ejecución).

### **SRTN (Shortest Remaining Time Next)**
Versión expropiativa de SPN. Si llega un proceso con menos tiempo restante que el actual, se interrumpe al actual.

### **PRIORITY (Planificación por Prioridades)**
Los procesos con mayor prioridad (número menor) se ejecutan primero. Incluye aging para evitar inanición.

### **Aging (Envejecimiento)**
Técnica que aumenta gradualmente la prioridad de los procesos que han esperado mucho tiempo, evitando que nunca se ejecuten.

---

## ⚡ Tipos de Eventos

### **N→L (New to Ready)**
Transición cuando un proceso nuevo es admitido al sistema y pasa a estar listo para ejecutarse.

### **L→C (Ready to Running)**
Transición cuando el scheduler selecciona un proceso listo y le asigna la CPU.

### **C→B (Running to Blocked)**
Transición cuando un proceso en ejecución necesita realizar E/S y se bloquea.

### **B→L (Blocked to Ready)**
Transición cuando termina la operación de E/S y el proceso vuelve a estar listo.

### **C→T (Running to Terminated)**
Transición cuando un proceso completa su ejecución y termina.

### **C→L (Running to Ready)**
Transición cuando un proceso es expropiado (interrumpido) y vuelve a la cola de listos.

---

## Costos del Sistema

### **TIP (Tiempo de Ingreso al Procesador)**
Tiempo que toma al sistema preparar un proceso recién llegado antes de que pueda ejecutarse.

### **TCP (Tiempo de Cambio de Proceso)**
Overhead (costo adicional) que toma cambiar de un proceso a otro en la CPU.

### **TFP (Tiempo de Finalización de Proceso)**
Tiempo que toma al sistema limpiar y liberar los recursos cuando un proceso termina.

### **Overhead (Sobrecarga)**
Tiempo adicional que consume el sistema operativo para realizar tareas administrativas, no es tiempo útil del proceso.

---

## Métricas de Rendimiento

### **TR (Tiempo de Retorno)**
Tiempo total desde que un proceso arriba hasta que completa su ejecución. TR = tiempo_fin - tiempo_arribo.

### **TE (Tiempo de Espera)**
Tiempo total que un proceso pasa esperando en la cola de listos, sin contar el tiempo de ejecución.

### **TRn (Tiempo de Retorno Normalizado)**
Proporción entre el tiempo de retorno y el tiempo de servicio. TRn = TR / servicio_total.

### **Throughput (Rendimiento)**
Número de procesos completados por unidad de tiempo. Mide la productividad del sistema.

### **Turnaround Time**
Término en inglés equivalente a Tiempo de Retorno.

### **Response Time (Tiempo de Respuesta)**
Tiempo desde que llega un proceso hasta que comienza su primera ejecución en CPU.

---

## Conceptos de Planificación

### **Preemption (Expropiación)**
Capacidad del scheduler de interrumpir un proceso que está ejecutándose para darle la CPU a otro proceso.

### **Non-preemptive (No Expropiativo)**
Algoritmo que no puede interrumpir un proceso una vez que comienza a ejecutarse hasta que termine o se bloquee.

### **Quantum (Cuanto de Tiempo)**
En Round Robin, cantidad fija de tiempo que cada proceso puede usar la CPU antes de ser interrumpido.

### **Context Switch (Cambio de Contexto)**
Proceso de guardar el estado del proceso actual y cargar el estado del siguiente proceso a ejecutar.

### **Starvation (Inanición)**
Situación donde un proceso nunca logra ejecutarse porque siempre hay otros procesos con mayor prioridad.

---

## Manejo de Datos

### **Parser (Analizador Sintáctico)**
Componente que lee y convierte archivos de entrada (JSON, CSV) al formato interno que entiende el simulador.

### **Export (Exportación)**
Funcionalidad que convierte los resultados de la simulación a formatos descargables (JSON, CSV).

### **Fixture (Dato de Prueba)**
Conjunto predefinido de procesos de prueba usado para validar que el simulador funciona correctamente.

### **Validation (Validación)**
Proceso de verificar que los datos de entrada son correctos y consistentes antes de ejecutar la simulación.

### **Golden File (Archivo de Oro)**
Archivo con resultados esperados correctos, usado para verificar automáticamente que las modificaciones no rompieron nada.

---

## Patrones de Diseño

### **Factory (Fábrica)**
Patrón que crea objetos (como schedulers) basándose en parámetros de configuración.

### **Builder (Constructor)**
Patrón que construye objetos complejos paso a paso, como el GanttBuilder que crea diagramas de Gantt.

### **Store (Almacén de Estado)**
En Svelte, objeto que mantiene el estado de la aplicación y notifica cambios a los componentes.

### **Interface (Interfaz)**
Contrato que define qué métodos debe implementar una clase, como IScheduler para todos los planificadores.

### **Abstract Class (Clase Abstracta)**
Clase base que define comportamiento común pero que no puede instanciarse directamente.

---

## Testing (Pruebas)

### **Unit Test (Prueba Unitaria)**
Prueba que verifica el funcionamiento correcto de un componente individual aislado.

### **Integration Test (Prueba de Integración)**
Prueba que verifica que múltiples componentes trabajan correctamente juntos.

### **E2E Test (End-to-End)**
Prueba que verifica el funcionamiento completo del sistema desde la perspectiva del usuario final.

### **Regression Test (Prueba de Regresión)**
Prueba que verifica que cambios nuevos no rompieron funcionalidad que antes funcionaba.

### **Test Suite (Suite de Pruebas)**
Conjunto organizado de múltiples pruebas relacionadas.

---

## Conceptos de Debugging

### **Invariant (Invariante)**
Condición que siempre debe ser verdadera en cierto punto del programa. Se usa para detectar errores.

### **Assertion (Aserción)**
Verificación automática de que una condición específica se cumple, lanza error si no es así.

### **Telemetry (Telemetría)**
Sistema de monitoreo que recolecta información sobre el comportamiento del programa durante su ejecución.

### **Guard (Guarda)**
Verificación preventiva que detecta condiciones incorrectas antes de que causen problemas mayores.

### **Debug Mode (Modo de Depuración)**
Configuración especial que activa logging adicional y verificaciones para facilitar encontrar errores.

---

## Interfaz de Usuario

### **Component (Componente)**
En Svelte, pieza reutilizable de interfaz de usuario que encapsula HTML, CSS y JavaScript.

### **Route (Ruta)**
En SvelteKit, URL específica que corresponde a una página o vista de la aplicación.

### **Layout (Diseño)**
Estructura común compartida por múltiples páginas, como header, sidebar, etc.

### **Store Subscription (Suscripción a Store)**
Mecanismo que permite a los componentes recibir automáticamente actualizaciones cuando cambia el estado.

### **Reactive Statement (Declaración Reactiva)**
En Svelte, código que se ejecuta automáticamente cuando cambian las variables de las que depende.

---

## Organización del Código

### **Module (Módulo)**
Archivo que agrupa funcionalidad relacionada y la exporta para ser usada en otros lugares.

### **Namespace (Espacio de Nombres)**
Forma de organizar el código para evitar conflictos de nombres entre diferentes partes del sistema.

### **Dependency (Dependencia)**
Cuando un módulo necesita importar y usar código de otro módulo.

### **API (Application Programming Interface)**
Conjunto de funciones y métodos que un módulo expone para ser usado por otros módulos.

### **Contract (Contrato)**
Definición formal de cómo debe comportarse un componente, usualmente definida por interfaces.

---

## Conceptos Avanzados

### **Deterministic (Determinístico)**
Sistema que siempre produce el mismo resultado cuando se le dan las mismas entradas.

### **Normalization (Normalización)**
Proceso de convertir datos a un formato estándar y consistente.

### **Serialization (Serialización)**
Conversión de objetos en memoria a un formato que puede guardarse en archivo o enviarse por red.

### **Immutable (Inmutable)**
Datos que no pueden modificarse después de ser creados. Garantiza mayor estabilidad y predictibilidad.

### **Pure Function (Función Pura)**
Función que siempre devuelve el mismo resultado para las mismas entradas y no tiene efectos secundarios.

---

## Herramientas de Desarrollo

### **TypeScript**
Lenguaje que extiende JavaScript agregando tipos estáticos, lo que ayuda a detectar errores durante el desarrollo.

### **Svelte/SvelteKit**
Framework para construir aplicaciones web que compila a JavaScript vanilla muy eficiente.

### **Vite**
Herramienta de construcción (build tool) rápida para desarrollo web moderno.

### **Vitest**
Framework de pruebas rápido y moderno, especialmente diseñado para proyectos que usan Vite.

### **Playwright**
Herramienta para pruebas end-to-end que puede automatizar navegadores web.

### **PlantUML**
Herramienta para crear diagramas técnicos usando texto simple en lugar de interfaces gráficas.

---

## Convenciones del Proyecto

### **menor número = mayor prioridad**
En este simulador, la prioridad 1 es mayor que la prioridad 3. Es la convención utilizada consistentemente.

### **Expropiación con "<" (no "<=")**
Para evitar thrashing (cambios excesivos), solo se interrumpe un proceso si otro tiene estrictamente mejor prioridad.

### **Event Priority Order**
Orden fijo para eventos simultáneos: 1:C→T > 2:C→B > 3:C→L > 4:B→L > 5:N→L > 6:L→C

### **CPU-only slices in Gantt**
El diagrama de Gantt solo muestra períodos de ejecución real en CPU, no overhead administrativo.

