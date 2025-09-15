# 🚀 GUÍA RÁPIDA - RECONSTRUCCIÓN DE UI

## ⭐ LO QUE YA FUNCIONA (NO TOCAR)

### **Motor de Simulación Completo:**
- `src/lib/core/adaptadorSimuladorDominio.ts` - ⭐ MOTOR PRINCIPAL
- `src/lib/application/usecases/runSimulation.ts` - ⭐ CASO DE USO PRINCIPAL
- `src/lib/domain/entities/` - Proceso.ts + Simulador.ts (ENTIDADES PURAS)
- `src/lib/domain/algorithms/` - 5 algoritmos completos (FCFS, SJF, SRTF, RR, PRIORITY)

### **Parsers de Archivos Funcionales:**
- `src/lib/infrastructure/parsers/jsonParser.ts` - ✅ JSON
- `src/lib/infrastructure/parsers/txtParser.ts` - ✅ TXT/CSV  
- `src/lib/infrastructure/io/parseWorkload.ts` - ✅ JSON alternativo

### **Lógica Simplificada para UI:**
- `src/lib/application/simuladorLogic.ts` - ⭐ INTERFAZ SIMPLE PARA UI

### **Componentes UI Existentes:**
- `src/lib/ui/components/UploadFileWithPreview.svelte` - ✅ Carga archivos
- `src/lib/ui/components/Gantt.svelte` - ✅ Diagrama Gantt
- `src/lib/ui/components/StatsPanel.svelte` - ✅ Panel estadísticas

---

## 🔨 LO QUE HAY QUE CREAR

### **1. Página Principal** (`src/routes/+page.svelte`)
```typescript
<script lang="ts">
  import { cargarArchivoProcesos, validarConfiguracion, ejecutarSimulacion, guardarDatosSimulacion } 
    from '$lib/application/simuladorLogic'
  import UploadFileWithPreview from '$lib/ui/components/UploadFileWithPreview.svelte'
  import type { ProcesoSimple, ConfiguracionSimulacion } from '$lib/application/simuladorLogic'
  
  // Estado
  let procesos: ProcesoSimple[] = []
  let configuracion: ConfiguracionSimulacion = {
    policy: 'FCFS',
    tip: 0,
    tfp: 0, 
    tcp: 0,
    quantum: undefined
  }
  
  // Funciones
  async function onArchivoSeleccionado(event) {
    const resultado = await cargarArchivoProcesos(event.detail.file)
    if (resultado.error) {
      // mostrar error
    } else {
      procesos = resultado.procesos
    }
  }
  
  async function ejecutar() {
    const validacion = validarConfiguracion(configuracion)
    if (!validacion.valida) {
      // mostrar errores
      return
    }
    
    try {
      const resultado = await ejecutarSimulacion(procesos, configuracion)
      const datosCompletos = {
        procesos,
        configuracion, 
        resultados: resultado,
        timestamp: new Date().toISOString()
      }
      guardarDatosSimulacion(datosCompletos)
      goto('/resultados')
    } catch (error) {
      // mostrar error
    }
  }
</script>

<!-- HTML con form de configuración -->
```

### **2. Formulario de Configuración** (dentro de +page.svelte)
```html
<!-- Selector de algoritmo -->
<select bind:value={configuracion.policy}>
  <option value="FCFS">First Come First Served</option>
  <option value="SJF">Shortest Job First</option>
  <option value="SRTF">Shortest Remaining Time First</option>
  <option value="RR">Round Robin</option>
  <option value="PRIORITY">Priority</option>
</select>

<!-- Parámetros de tiempo -->
<input type="number" bind:value={configuracion.tip} placeholder="TIP" />
<input type="number" bind:value={configuracion.tfp} placeholder="TFP" />
<input type="number" bind:value={configuracion.tcp} placeholder="TCP" />

<!-- Quantum (solo para RR) -->
{#if configuracion.policy === 'RR'}
<input type="number" bind:value={configuracion.quantum} placeholder="Quantum" />
{/if}
```

### **3. Actualizar Página de Resultados** (`src/routes/resultados/+page.svelte`)
```typescript
<script lang="ts">
  import { onMount } from 'svelte'
  import { cargarDatosSimulacion } from '$lib/application/simuladorLogic'
  import Gantt from '$lib/ui/components/Gantt.svelte'
  import StatsPanel from '$lib/ui/components/StatsPanel.svelte'
  
  let datos = null
  
  onMount(() => {
    datos = cargarDatosSimulacion()
    if (!datos) {
      goto('/') // Redirigir si no hay datos
    }
  })
</script>

{#if datos}
  <h1>Resultados de Simulación</h1>
  
  <!-- Información general -->
  <div>
    <h2>Configuración</h2>
    <p>Algoritmo: {datos.configuracion.policy}</p>
    <p>TIP: {datos.configuracion.tip}</p>
    <!-- etc -->
  </div>
  
  <!-- Componentes existentes -->
  <Gantt events={datos.resultados.events} />
  <StatsPanel metrics={datos.resultados.metrics} />
  
  <!-- Botón volver -->
  <button on:click={() => goto('/')}>Nueva Simulación</button>
{/if}
```

---

## 📚 TIPOS PRINCIPALES

```typescript
// Proceso simplificado para UI
interface ProcesoSimple {
  nombre: string
  llegada: number
  rafaga: number  
  prioridad: number
}

// Configuración de simulación
interface ConfiguracionSimulacion {
  policy: 'FCFS' | 'PRIORITY' | 'RR' | 'SPN' | 'SRTN'
  tip: number    // Tiempo ingreso proceso
  tfp: number    // Tiempo finalización proceso  
  tcp: number    // Tiempo cambio contexto
  quantum?: number // Solo para Round Robin
}

// Resultado de simulación
interface ResultadoSimulacion {
  events: any[]      // Eventos para Gantt
  metrics: any       // Métricas calculadas
  warnings: string[] // Advertencias
  tiempoTotal: number
}
```

---

## 🎯 FLUJO SIMPLIFICADO

```
1. Usuario carga archivo → UploadFileWithPreview
   ↓
2. cargarArchivoProcesos() → ProcesoSimple[]
   ↓  
3. Usuario configura parámetros → ConfiguracionSimulacion
   ↓
4. validarConfiguracion() → errores?
   ↓
5. ejecutarSimulacion() → ResultadoSimulacion
   ↓
6. guardarDatosSimulacion() + goto('/resultados')
   ↓
7. Mostrar Gantt + Stats + Events
```

---

## ⚡ COMANDOS PARA DESARROLLO

```bash
# Servidor de desarrollo
npm run dev

# Test motor (verificar que funciona)
npm run test-motor-simulacion

# Build para producción  
npm run build
```

---

## 🔧 IMPORTS ESENCIALES

```typescript
// Lógica principal
import { 
  cargarArchivoProcesos, 
  validarConfiguracion, 
  ejecutarSimulacion,
  guardarDatosSimulacion,
  cargarDatosSimulacion 
} from '$lib/application/simuladorLogic'

// Componentes UI
import UploadFileWithPreview from '$lib/ui/components/UploadFileWithPreview.svelte'
import Gantt from '$lib/ui/components/Gantt.svelte'
import StatsPanel from '$lib/ui/components/StatsPanel.svelte'

// Navegación
import { goto } from '$app/navigation'

// Tipos
import type { ProcesoSimple, ConfiguracionSimulacion } from '$lib/application/simuladorLogic'
```

**TODO EL BACKEND ESTÁ COMPLETO. SOLO NECESITAS UI.**
