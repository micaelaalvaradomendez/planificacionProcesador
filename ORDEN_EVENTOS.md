# Contratos de Ordenamiento - Motor de Planificación

## 🔀 **Orden Total de Eventos por Tick**

El motor garantiza el siguiente orden de procesamiento para eventos que ocurren en el mismo timestamp `t`:

### **Prioridades de Eventos (1 = mayor prioridad)**
```
1. C→T (terminación)     - Libera CPU, permite despacho inmediato
2. C→B (bloqueo E/S)     - Libera CPU, permite despacho inmediato  
3. C→L (desalojo)        - Libera CPU, permite despacho inmediato
4. B→L (retorno E/S)     - Entra a ready, puede expropiar
5. N→L (admisión)        - Entra a ready, puede expropiar
6. L→C (despacho)        - Toma CPU, cierra ventana de expropiación
```

### **Flujo de Procesamiento Garantizado**
```
Para eventos en mismo tick t:
1. Procesar TODOS los eventos C→T/C→B/C→L (liberar CPU)
2. Procesar TODOS los eventos B→L/N→L (llenar ready queue)
3. Evaluar expropiación (si scheduler lo soporta)
4. Procesar eventos L→C (despachar próximo)
```

### **Contratos Críticos**

#### **❌ No despachar prematuramente**
- `B→L` y `N→L` NO deben llamar `despacharSiLibre()` hasta que todos los eventos del tick se procesen
- Esto previene que un retorno de E/S tome CPU antes de que otros procesos más prioritarios lleguen

#### **✅ Expropiación en mismo tick**
- `tryPreemptIfNeeded()` se llama DESPUÉS de `onReady()`/`onAdmit()` 
- Si un proceso con mayor prioridad llega en el mismo tick que alguien es despachado, PUEDE expropiar
- Guard `pendingDispatchAt` previene doble despacho, no expropiación válida

#### **✅ Orden determinístico**
- Events con misma prioridad se ordenan por sequence number (stable sort)
- Schedulers usan `seq` para desempatar procesos con igual prioridad/restante
- `compareForPreemption()` usa `<` estricto (no `<=`) para evitar thrashing

## 🚨 **Regresiones Comunes a Evitar**

### **Anti-patrón: Despacho inmediato en B→L**
```typescript
// ❌ MAL: despacha antes de que otros procesos del tick se procesen
case 'B→L': {
  sched.onReady(pid);
  despacharSiLibre(e.t); // ⚠️ Puede ser prematuro
  break;
}

// ✅ BIEN: orden correcto
case 'B→L': {
  sched.onReady(pid);
  tryPreemptIfNeeded(e.t, pid); // Evaluar expropiación primero
  despacharSiLibre(e.t);        // Despachar si no hay expropiación
  break;  
}
```

### **Anti-patrón: Expropiación con empate**
```typescript
// ❌ MAL: causa thrashing
return newRemaining <= currentRemaining;

// ✅ BIEN: solo expropia si hay ventaja clara
return newRemaining < currentRemaining;
```

### **Anti-patrón: Procesos terminados en cola**
```typescript
// ❌ MAL: restante negativo o cero queda en ready
next(): number | undefined {
  return this.ready.pop().pid;
}

// ✅ BIEN: filtrar antes de retornar
next(): number | undefined {
  this.ready = this.ready.filter(item => this.getRestante(item.pid) > 0);
  return this.ready.length > 0 ? this.ready.pop().pid : undefined;
}
```