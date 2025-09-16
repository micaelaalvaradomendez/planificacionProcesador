# 📋 TablaResumenComparativa - Documentación

## Descripción
Componente que presenta una tabla resumen comparativa con la configuración utilizada y los principales resultados de la simulación de planificación de procesos.

## Características

### 📊 **Información mostrada:**

#### ⚙️ Configuración Utilizada
- **Algoritmo de planificación**: Nombre del algoritmo con descripción completa
- **Tiempos del SO**: TIP, TFP, TCP configurados
- **Quantum**: Solo se muestra si el algoritmo es Round Robin
- **Número de procesos**: Cantidad total de procesos simulados

#### 📈 Resumen de Resultados
- **Tiempo total de simulación**: Duración completa de la simulación
- **Número total de eventos**: Cantidad de eventos generados
- **Eficiencia de la CPU**: Porcentaje de tiempo productivo (solo procesos)
- **Utilización de CPU**: Porcentaje de tiempo no ocioso
- **Tiempo promedio de respuesta**: Promedio de tiempos de espera
- **Tiempo medio de retorno**: Promedio de tiempos totales

#### 🔍 Análisis Rápido
- **Rendimiento temporal**: Evaluación automática de la velocidad
- **Eficiencia del algoritmo**: Análisis específico por tipo de algoritmo
- **Overhead del sistema**: Evaluación del costo de los tiempos del SO

## Uso

### Importación
```svelte
import TablaResumenComparativa from '$lib/ui/components/TablaResumenComparativa.svelte';
```

### Uso en página
```svelte
<TablaResumenComparativa {datosSimulacion} />
```

### Propiedades
- `datosSimulacion: DatosSimulacionCompleta` - Datos completos de la simulación

## Estructura de datos esperada

El componente espera recibir un objeto `DatosSimulacionCompleta` con la siguiente estructura:

```typescript
interface DatosSimulacionCompleta {
  procesos: ProcesoSimple[];
  configuracion: ConfiguracionSimulacion;
  resultados: ResultadoSimulacion;
  timestamp: string;
}

interface ConfiguracionSimulacion {
  policy: Policy; // 'FCFS' | 'PRIORITY' | 'RR' | 'SPN' | 'SRTN'
  tip: number;
  tfp: number;
  tcp: number;
  quantum?: number; // Solo para RR
}

interface ResultadoSimulacion {
  events: SimEvent[];
  metrics: Metrics;
  // ... otros campos
}

interface Metrics {
  porProceso: MetricsPerProcess[];
  tanda: BatchMetrics;
}
```

## Características visuales

### 🎨 **Diseño**
- **Header con gradiente**: Turquesa a cian con título y descripción
- **Secciones organizadas**: Configuración, resultados y análisis separados
- **Indicadores visuales**: Colores según eficiencia (verde/amarillo/rojo)
- **Efectos hover**: Animaciones sutiles en las filas de datos
- **Responsive**: Adaptado para móviles y escritorio

### 📱 **Responsivo**
- Desktop: Layout horizontal con todas las métricas visibles
- Tablet: Adaptación de espaciado y tamaños
- Mobile: Layout vertical con elementos apilados

## Algoritmos soportados

El componente proporciona análisis específico para cada algoritmo:

- **FCFS**: Advierte sobre efecto convoy
- **SPN**: Menciona optimalidad y riesgo de inanición  
- **SRTN**: Destaca mejor tiempo de respuesta y overhead
- **RR**: Indica equidad para sistemas interactivos
- **PRIORITY**: Recomienda control de inanición

## Métricas automáticas

### Evaluación de eficiencia:
- **🟢 Buena (≥70%)**: Eficiencia alta de CPU
- **🟡 Media (50-69%)**: Eficiencia aceptable  
- **🔴 Baja (<50%)**: Eficiencia mejorable

### Evaluación de overhead:
- **🟢 Bajo (<20%)**: Configuración eficiente
- **🟡 Moderado (20-39%)**: Overhead aceptable
- **🔴 Alto (≥40%)**: Considerar reducir TIP/TFP/TCP

## Testing

Para probar el componente:

1. **Ejecutar simulación**: Ve a la página principal y ejecuta cualquier simulación
2. **Ver resultados**: Los datos se guardan automáticamente y se muestran en `/resultados`
3. **Datos de prueba**: Usar `datos-prueba-localStorage.js` para datos manuales

### Script de prueba
```bash
# Ejecutar test de generación de datos
npx tsx test-tabla-resumen.ts

# O usar datos predefinidos en el navegador
# Copiar y ejecutar datos-prueba-localStorage.js en la consola
```

## Integración con la aplicación

El componente está integrado en la página de resultados (`/routes/resultados/+page.svelte`) como la cuarta sección, ubicada entre:
- UtilizacionCPU (arriba)
- GanttFixed (abajo)

Esta ubicación proporciona un resumen consolidado antes de mostrar el diagrama de Gantt detallado.
