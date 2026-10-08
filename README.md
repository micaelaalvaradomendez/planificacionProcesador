# Planificación del Procesador - Simulador

**TRABAJO PRÁCTICO DE IMPLEMENTACIÓN Nº 1**  
**PP - PLANIFICACIÓN DEL PROCESADOR**

## Objetivo

Se trata de programar un sistema que simule distintas estrategias de planificación del procesador (dispatcher), y calcule un conjunto de indicadores que serán utilizados para discutir las ventajas y desventajas de cada estrategia.

## Características del Sistema

**Sistema:** Multiprogramado y monoprocesador

El simulador debe leer un archivo en el que cada registro tiene los siguientes datos:
- **Nombre del proceso**
- **Tiempo de arribo**
- **Cantidad de ráfagas de CPU a emplear para terminar**
- **Duración de la ráfaga de CPU**
- **Duración de la ráfaga de entrada-salida entre ráfagas de CPU**
- **Prioridad externa**

## Políticas de Planificación

Completada la lectura del archivo se aceptará una entrada por teclado que indicará la política de planificación a aplicar a la tanda. Como mínimo se deben permitir las siguientes opciones:

- **a) FCFS** (First Come First Served)
- **b) Prioridad Externa**
- **c) Round-Robin**
- **d) SPN** (Shortest Process Next)
- **e) SRTN** (Shortest Remaining Time Next)

## Parámetros de Configuración

Finalmente permitirá introducir los siguientes datos:
- **a) TIP:** Tiempo que utiliza el sistema operativo para aceptar los nuevos procesos
- **b) TFP:** Tiempo que utiliza el sistema operativo para terminar los procesos
- **c) TCP:** Tiempo de conmutación entre procesos
- **d) Quantum:** (si fuera necesario)

## Salidas del Simulador

El simulador ejecutará la tanda hasta que se hayan completado la totalidad de los trabajos produciendo las siguientes salidas:

### Archivo de Eventos
Un archivo en el que se indiquen todos los eventos que se producen en el sistema a lo largo de la simulación y el tiempo en el que ocurren los mismos.

**Ejemplos de eventos:**
- Arriba un trabajo
- Se incorpora un trabajo al sistema
- Se completa la ráfaga del proceso que se está ejecutando
- Se agota el quantum
- Termina una operación de entrada-salida
- Se atiende una interrupción de entrada-salida
- Termina un proceso

### Indicadores por Pantalla
Al finalizar la simulación imprimirá y mostrará por pantalla –como mínimo– los siguientes indicadores:

**a) Para cada proceso:**
- Tiempo de Retorno
- Tiempo de Retorno Normalizado
- Tiempo en Estado de Listo

**b) Para la tanda de procesos:**
- Tiempo de Retorno
- Tiempo Medio de Retorno

**c) Para el uso de la CPU:**
- Tiempos de CPU desocupada
- CPU utilizada por el SO
- CPU utilizada por los procesos (en tiempos absolutos y porcentuales)

### Reglas Específicas por Algoritmo

**Round Robin:**
- Si tenemos un único proceso y su quantum termina, lo pasamos a listo y luego le volvemos a asignar la CPU (usamos un TCP)
- Para despachar el primer proceso también usamos un TCP
- Al producirse el cambio de bloqueado a listo de un proceso mientras otro se estaba ejecutando no nos afecta y debemos terminar el tiempo de quantum

**Prioridades y SRT:**
- Debo expropiarle la CPU a un proceso si apareció uno con mayor prioridad efectiva o con menor tiempo restante
- Guardo lo que me resta de la ráfaga del proceso que se estaba ejecutando para terminarla cuando le vuelva a tocar
- Las prioridades se definen de **1 a 10**, siendo **1 la mayor prioridad** y **10 la menor prioridad** (con sistema de *aging* para prevenir inanición)
- En SRTN, en caso de empate de tiempo restante, no se expropia para evitar sobrecostos innecesarios

### Formato de Archivo de Entrada

La tanda de procesos se carga mediante un archivo **JSON** que contiene un array de objetos con la siguiente estructura:

```json
[
  {
    "nombre": "P1",
    "tiempo_arribo": 0,
    "cantidad_rafagas_cpu": 3,
    "duracion_rafaga_cpu": 2,
    "duracion_rafaga_es": 1,
    "prioridad_externa": 2
  },
  {
    "nombre": "P2",
    "tiempo_arribo": 2,
    "cantidad_rafagas_cpu": 2,
    "duracion_rafaga_cpu": 4,
    "duracion_rafaga_es": 2,
    "prioridad_externa": 1
  }
]
```

También es compatible con la importación de escenarios completos exportados previamente por el simulador (`kind: "sim-result"`). Para más detalles de la especificación técnica y desempates, consultar [docs/semantica.md](docs/semantica.md).

### Reglas de Temporización

- **a.** Un proceso no computará estado de listo hasta que no haya cumplido su TIP (su admisión ocurre en `arribo + TIP`).
- **b.** Un proceso pasa de bloqueado a listo al cumplirse su ráfaga de E/S.
- **c.** Los costos TCP y TFP ocupan la CPU monoprocesador. Dos procesos o sobrecargas no pueden solaparse en CPU.

### Definiciones de Métricas

1. **Tiempo de Retorno de un proceso (TRp):** Desde que arriba el proceso hasta que termina definitivamente (incluyendo su TFP): $TR_p = t_{fin} - t_{arribo}$.
2. **Tiempo de Retorno Normalizado (TRn):** Tiempo de retorno dividido el tiempo efectivo de servicio de CPU: $TR_n = TR_p / S_p$.
3. **Tiempo de Espera (TE):** Tiempo acumulado en estado Listo.
4. **Tiempo de Respuesta (TResp):** Tiempo desde el arribo hasta su primer despacho a CPU: $TResp = t_{\text{primer } L\to C} - t_{arribo}$.
5. **Tiempo Total de la Tanda (TRt):** Desde el arribo del primer proceso hasta el último TFP completado: $\max(t_{fin}) - \min(t_{arribo})$.
6. **Tiempo Medio de Retorno (TMRt):** Promedio de los tiempos de retorno de todos los procesos.
7. **Throughput:** Cantidad de procesos completados por unidad de tiempo total de la tanda.

---

## Desarrollo

### Clonar y Configurar el Proyecto

Para descargar y ejecutar este proyecto localmente desde el repositorio:

```sh
# 1. Clonar el repositorio
git clone https://github.com/micaelaalvaradomendez/planificacionProcesador.git

# 2. Navegar al directorio del proyecto
cd planificacionProcesador

# 3. Instalar las dependencias
npm install

# 4. Iniciar el servidor de desarrollo
npm run dev
```

El simulador estará disponible en `http://localhost:5173` (o el puerto que se indique en la consola).

### Requisitos Previos

- **Node.js** (versión 18 o superior)
- **npm** (viene incluido con Node.js)
- **Git** para clonar el repositorio

### Instalación desde Cero

Si prefieres crear un nuevo proyecto desde cero:

```sh
# crear un nuevo proyecto en el directorio actual
npx sv create

# crear un nuevo proyecto en my-app
npx sv create my-app
```

### Desarrollo Local

Una vez que hayas creado el proyecto e instalado las dependencias con `npm install` (o `pnpm install` o `yarn`), inicia el servidor de desarrollo:

```sh
npm run dev

# o inicia el servidor y abre la app en una nueva pestaña del navegador
npm run dev -- --open
```

## Build y Deploy

Para crear una versión de producción de tu app:

```sh
npm run build
```

Puedes previsualizar la build de producción con `npm run preview`.

> Para desplegar tu app, puede que necesites instalar un [adapter](https://svelte.dev/docs/kit/adapters) para tu entorno de destino.

### Scripts de Deploy

```sh
# Deploy automático a GitHub Pages
npm run deploy:gh
```


