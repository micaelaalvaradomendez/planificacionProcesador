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
- Debo expropiarle la CPU a un proceso si apareció uno con mayor prioridad o con menor tiempo restante
- Guardo lo que me resta de la ráfaga del proceso que se estaba ejecutando para terminarla cuando le vuelva a tocar
- Las prioridades se definen de **1 a 100** siendo los valores más grandes de mayor prioridad

### Formato de Archivo de Entrada

La tanda de trabajos a procesar se cargará en un archivo que el simulador debe leer y será un **JSON** donde cada línea (registro) define un proceso, y cada uno de los campos se separan por comas:

{
    "nombre": "P3",
    "tiempo_arribo": 3,
    "cantidad_rafagas_cpu": 5,
    "duracion_rafaga_cpu": 2,
    "duracion_rafaga_es": 1,
    "prioridad_externa": 4
  },

### Reglas de Temporización

**h.** Un proceso no computará estado de listo hasta que no haya cumplido su TIP (inicialmente no computa tiempo de listo)

**c.** Un proceso pasa de bloqueado a listo instantáneamente (aunque se esté ejecutando otro) y consume 0 unidades de tiempo (este tiempo lo consideramos dentro del TCP posterior)

### Definiciones de Métricas

1. **Tiempo de Retorno de un proceso (TRp):** Es desde que arriba el proceso hasta que termina (después de su TFP, incluyendo éste)
2. **Tiempo de retorno normalizado (TRn):** Es el tiempo de Retorno del proceso dividido el tiempo efectivo de CPU que utilizó
3. **Tiempo de retorno de la tanda (TRt):** Desde que arriba el primer proceso hasta que se realiza el último TFP (incluyendo el tiempo de éste)
4. **Tiempo Medio de retorno de la tanda (TMRt):** La suma de los tiempos de retorno de los procesos, dividido la cantidad de procesos

---

## Desarrollo

### Instalación y Configuración

Si estás viendo esto, probablemente ya hayas creado el proyecto. ¡Felicitaciones!

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


