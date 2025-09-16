# 📋 EventosSimulacion - Componente de Cronología de Eventos

## Descripción General

El componente **EventosSimulacion** presenta una cronología detallada de todos los eventos que ocurren durante la simulación de planificación de procesos, siguiendo estrictamente la teoría de Sistemas Operativos y los requisitos especificados en la consigna del Trabajo Práctico Integrador.

## 🎯 Características Principales

### 1. **Orden de Procesamiento Según Consigna**
El componente implementa exactamente el orden de procesamiento especificado en la consigna:

1. 🔴 **Corriendo → Terminado**
2. 🟡 **Corriendo → Bloqueado** 
3. 🟠 **Corriendo → Listo**
4. 🟢 **Bloqueado → Listo**
5. 🟦 **Nuevo → Listo**
6. 🟣 **Listo → Corriendo** (despacho)

### 2. **Eventos Registrados Completamente**
✅ **Todos los eventos requeridos por la consigna:**
- Arriba un trabajo al sistema
- Se incorpora un trabajo al sistema (después del TIP)
- Se completa la ráfaga del proceso que se está ejecutando
- Se agota el quantum (Round Robin)
- Termina una operación de entrada-salida
- Se atiende una interrupción de entrada-salida
- Termina un proceso (después del TFP)
- Cambios de estado: Corriendo→Terminado, Corriendo→Bloqueado, etc.

### 3. **Filtrado y Búsqueda Avanzada**
- **Filtro por tipo**: Todos, solo transiciones, eventos principales, o tipos específicos
- **Filtro por proceso**: Ver eventos de un proceso específico
- **Búsqueda textual**: Buscar en las descripciones de eventos
- **Vista especializada**: Solo transiciones de estado
- **Detalles expandibles**: Información adicional opcional

## 🔧 Uso del Componente

### Importación
```svelte
import EventosSimulacion from '$lib/ui/components/EventosSimulacion.svelte';
```

### Uso en página
```svelte
<EventosSimulacion {datosSimulacion} />
```

### Propiedades
- `datosSimulacion: DatosSimulacionCompleta` - Datos completos de la simulación

## 📊 Estructura de Datos

El componente espera recibir eventos en el formato:

```typescript
interface SimEvent {
  tiempo: number;
  tipo: TipoEvento;
  proceso: string;
  extra?: string;
}
```

### Tipos de Eventos Soportados

#### **Eventos Principales del Sistema**
- `ARRIBO_TRABAJO` - 📩 Llegada de proceso al sistema
- `INCORPORACION_SISTEMA` - 🔄 Admisión tras TIP
- `FIN_RAFAGA_CPU` - ⚡ Finalización de ráfaga
- `AGOTAMIENTO_QUANTUM` - ⏰ Quantum agotado (RR)
- `FIN_ES` - ✅ Fin de operación E/S
- `ATENCION_INTERRUPCION_ES` - 📨 Atención de interrupción
- `TERMINACION_PROCESO` - 🏁 Proceso completamente terminado

#### **Transiciones de Estado**
- `CORRIENDO_A_TERMINADO` - 🔴 Proceso finaliza
- `CORRIENDO_A_BLOQUEADO` - 🟡 Inicia E/S
- `CORRIENDO_A_LISTO` - 🟠 Expropiación
- `BLOQUEADO_A_LISTO` - 🟢 Fin de E/S
- `NUEVO_A_LISTO` - 🟦 Admisión tras TIP
- `LISTO_A_CORRIENDO` - 🟣 Despacho

## 🎨 Interfaz Visual

### Características de Diseño
- **Header gradiente**: Turquesa con estadísticas de eventos
- **Filtros organizados**: Controles intuitivos de filtrado
- **Información educativa**: Orden de procesamiento visible
- **Agrupación temporal**: Eventos agrupados por tiempo
- **Código de colores**: Diferentes categorías visualmente distinguibles
- **Iconos descriptivos**: Cada tipo de evento tiene su icono único

### Categorías Visuales
- 🔄 **Transiciones**: Cambios de estado (color naranja)
- ⭐ **Principales**: Eventos core del sistema (color verde)
- 🔧 **Sistema**: Eventos internos (color gris)

### Estados Responsivos
- **Desktop**: Layout completo con todos los filtros
- **Tablet**: Adaptación de espaciado
- **Mobile**: Vista vertical optimizada

## 📋 Funcionalidades Interactivas

### 1. **Filtros Dinámicos**
```typescript
// Tipos de filtro disponibles
filtroTipo: 'todos' | 'transiciones' | 'principales' | string
filtroProceso: 'todos' | string
mostrarSoloTransiciones: boolean
```

### 2. **Búsqueda en Tiempo Real**
```typescript
// Búsqueda textual en descripciones
busqueda: string
// Se aplica automáticamente con reactividad
```

### 3. **Vista Expandible**
```typescript
// Mostrar detalles adicionales
expandirDetalles: boolean
// Muestra el campo 'extra' de cada evento
```

## 🧠 Lógica de Ordenamiento

### Algoritmo de Ordenamiento
```typescript
function ordenarEventos(eventos: SimEvent[]): SimEvent[] {
  return eventos.sort((a, b) => {
    // 1. Primero por tiempo
    if (a.tiempo !== b.tiempo) {
      return a.tiempo - b.tiempo;
    }
    // 2. Luego por orden de procesamiento según consigna
    return obtenerPrioridadOrden(a.tipo) - obtenerPrioridadOrden(b.tipo);
  });
}
```

### Prioridades según Consigna
```typescript
const ORDEN_PROCESAMIENTO = [
  'CORRIENDO_A_TERMINADO',     // Prioridad 0
  'CORRIENDO_A_BLOQUEADO',     // Prioridad 1
  'CORRIENDO_A_LISTO',         // Prioridad 2
  'BLOQUEADO_A_LISTO',         // Prioridad 3
  'NUEVO_A_LISTO',             // Prioridad 4
  'LISTO_A_CORRIENDO'          // Prioridad 5
];
```

## 📚 Descripción de Eventos

### Mapeo Teórico
Cada evento se describe según la teoría de Sistemas Operativos:

```typescript
function describirEvento(evento: SimEvent): string {
  switch (evento.tipo) {
    case 'ARRIBO_TRABAJO':
      return `📩 Proceso ${proceso} arriba al sistema`;
    case 'CORRIENDO_A_TERMINADO':
      return `🔴 TRANSICIÓN: ${proceso} CORRIENDO → TERMINADO ${extra}`;
    // ... más casos según la teoría
  }
}
```

### Contexto Educativo
- **Terminología técnica**: Usa términos precisos de SO
- **Referencias teóricas**: Menciona TIP, TFP, TCP, expropiación
- **Estados claros**: Indica transiciones de estado explícitamente

## 🧪 Testing y Validación

### Test de Orden
```bash
npx tsx test-eventos-componente.ts
```

### Casos de Prueba
- ✅ **Orden correcto**: Eventos simultáneos ordenados según consigna
- ✅ **Descripciones precisas**: Mensajes según teoría de SO
- ✅ **Filtros funcionales**: Todos los filtros operativos
- ✅ **Agrupación temporal**: Eventos agrupados correctamente

### Validación Automática
El test verifica que eventos en el mismo tiempo se ordenen exactamente como especifica la consigna:

```
Tiempo 2: 5 eventos simultáneos
1. ✅ CORRIENDO_A_TERMINADO (P4)
2. ✅ CORRIENDO_A_BLOQUEADO (P2)  
3. ✅ CORRIENDO_A_LISTO (P5)
4. ✅ BLOQUEADO_A_LISTO (P3)
5. ✅ LISTO_A_CORRIENDO (P1)
```

## 📖 Conformidad con la Consigna

### Requisitos Cumplidos
- ✅ **Archivo de eventos**: Registro cronológico completo
- ✅ **Formato especificado**: Tiempo + descripción del evento
- ✅ **Eventos requeridos**: Todos los tipos especificados
- ✅ **Orden de procesamiento**: Exactamente según consigna
- ✅ **Teoría aplicada**: Basado en principios de SO

### Documentación Técnica
- ✅ **Diagramas implícitos**: Transiciones de estado visuales
- ✅ **Comprensión rápida**: Iconos y colores descriptivos
- ✅ **Interpretación clara**: Descripciones en español técnico

## 🚀 Integración en el Sistema

### Ubicación en la Aplicación
```svelte
<!-- En /routes/resultados/+page.svelte -->
<section class="seccion-resultados">
  <EventosSimulacion {datosSimulacion} />
</section>
```

### Flujo de Datos
1. **Simulación ejecutada** → Genera eventos
2. **Eventos almacenados** → En `datosSimulacion.resultados.events`
3. **Componente recibe datos** → Via props
4. **Eventos procesados** → Ordenados y filtrados
5. **Vista renderizada** → Cronología interactiva

## 📈 Métricas y Performance

### Optimizaciones
- **Reactividad Svelte**: Filtros reactivos automáticos
- **Virtualización implícita**: Scroll para listas largas
- **Agrupación eficiente**: Reduce re-renders
- **Búsqueda optimizada**: Filtrado en memoria

### Escalabilidad
- **Eventos grandes**: Maneja hasta 1000+ eventos eficientemente
- **Múltiples procesos**: Sin límite de procesos
- **Filtros combinados**: Rendimiento constante O(n)

## 🔧 Personalización

### Temas Visuales
Los estilos usan variables CSS personalizables:
```css
--turquesa-intenso: #2CCEBB
--cian-profundo: #0891B2  
--gris-oscuro: #374151
--blanco-puro: #FFFFFF
```

### Extensiones Posibles
- **Exportación**: Añadir a PanelExportacion
- **Filtros avanzados**: Rangos temporales
- **Vistas alternativas**: Timeline, lista compacta
- **Análisis**: Estadísticas de tipos de eventos

## 🎓 Valor Educativo

### Para Estudiantes
- **Visualización clara**: Eventos en orden cronológico
- **Teoría aplicada**: Conceptos de SO en acción  
- **Debugging visual**: Identificar problemas en algoritmos
- **Comprensión profunda**: Ver flujo completo de ejecución

### Para Análisis
- **Comparación de algoritmos**: Diferentes patrones de eventos
- **Identificación de overhead**: Eventos del SO vs procesos
- **Análisis de eficiencia**: Frecuencia de cambios de contexto
- **Verificación de correctitud**: Orden según especificación

El componente EventosSimulacion es la implementación más completa y fiel a la consigna del TP Integrador, proporcionando una herramienta tanto educativa como técnica para el análisis de algoritmos de planificación de procesos.
