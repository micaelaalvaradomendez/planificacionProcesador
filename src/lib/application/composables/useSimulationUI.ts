import { writable, derived, get } from 'svelte/store';
import type { SimulationState } from '../usecases/simulationState';
import { getInitialSimulationState } from '../usecases/simulationState';
import { cargarArchivo } from '../usecases/parseInput';
import { runSimulationWithTimeout } from '../usecases/simulationRunner';
import { construirDiagramaGantt } from '../usecases/buildGantt';

export function useSimulationUI() {
  // Estado principal usando stores
  const simState = writable<SimulationState>(getInitialSimulationState());
  
  // Control de UI
  const configEstablecida = writable(false);
  const cargandoArchivo = writable(false);
  const ejecutando = writable(false);

  // Funciones de utilidad
  function limpiarResultadosPrevios() {
    simState.update(state => ({
      ...state,
      simulacionCompletada: false,
      simulacionEnCurso: false,
      events: [],
      metrics: {} as any,
      ganttSlices: [],
      estadisticasExtendidas: null,
      tiempoTotalSimulacion: 0,
      advertencias: [],
      errors: []
    }));
  }

  async function cargarArchivoUI() {
    const currentState = get(simState);
    if (!currentState.file) return;
    
    cargandoArchivo.set(true);
    configEstablecida.set(false);
    limpiarResultadosPrevios();
    
    try {
      const result = await cargarArchivo(
        currentState.file,
        currentState.mode,
        currentState.policy,
        currentState.tip,
        currentState.tfp,
        currentState.tcp,
        currentState.quantum ?? undefined
      );
      
      simState.update(state => ({
        ...state,
        loaded: result.loaded,
        workload: result.workload,
        errors: result.errors ?? []
      }));
    } catch (e) {
      simState.update(state => ({
        ...state,
        errors: ['No se pudo cargar el archivo. Verifica formato JSON/CSV.']
      }));
    } finally {
      cargandoArchivo.set(false);
    }
  }

  function cambiarModoArchivo(mode: 'json' | 'csv') {
    simState.update(state => ({
      ...state,
      mode,
      file: null, // Limpiar archivo cuando cambia el modo
      loaded: false,
      workload: null,
      errors: []
    }));
    configEstablecida.set(false);
    limpiarResultadosPrevios();
  }

  async function cargarArchivoConModo(file: File, mode: 'json' | 'csv') {
    cargandoArchivo.set(true);
    configEstablecida.set(false);
    limpiarResultadosPrevios();
    
    try {
      const currentState = get(simState);
      const result = await cargarArchivo(
        file,
        mode,
        currentState.policy,
        currentState.tip,
        currentState.tfp,
        currentState.tcp,
        currentState.quantum ?? undefined
      );
      
      simState.update(state => ({
        ...state,
        file,
        mode,
        loaded: result.loaded,
        workload: result.workload,
        errors: result.errors ?? []
      }));
    } catch (e) {
      simState.update(state => ({
        ...state,
        errors: ['No se pudo cargar el archivo. Verifica el formato.']
      }));
    } finally {
      cargandoArchivo.set(false);
    }
  }

  function establecerConfiguracion() {
    const currentState = get(simState);
    const validation = validateConfiguration(currentState);
    if (!validation.isValid) {
      return;
    }

    simState.update(state => {
      updateWorkloadConfig(state);
      return state;
    });
    
    configEstablecida.set(true);
    limpiarResultadosPrevios();
  }

  async function ejecutarSimulacion() {
    const currentState = get(simState);
    const isConfigEstablecida = get(configEstablecida);
    
    if (!isConfigEstablecida || !currentState.workload) return;
    
    ejecutando.set(true);
    simState.update(state => ({
      ...state,
      simulacionEnCurso: true,
      simulacionCompletada: false,
      errors: []
    }));
    
    try {
      console.log('🔄 Iniciando simulación...');
      console.log('Workload config:', currentState.workload.config);
      console.log('Workload procesos:', currentState.workload.processes.length);
      
      const result = await runSimulationWithTimeout(currentState.workload);
      
      console.log('✅ Simulación terminada');
      console.log('Resultado completo:', result);
      console.log('Métricas por proceso:', result.metrics?.porProceso?.length || 0);
      console.log('Métricas tanda:', result.metrics?.tanda);
      
      // Construir datos del Gantt
      console.log('🎨 Generando diagrama de Gantt...');
      const ganttData = construirDiagramaGantt(result.events);
      console.log('✅ Diagrama construido:', {
        tiempoTotal: ganttData.tiempoTotal,
        segmentos: ganttData.segmentos.length,
        procesos: ganttData.procesos.length
      });
      
      simState.update(state => {
        updateSimulationResults(state, result);
        return {
          ...state,
          simulacionCompletada: true,
          ganttSlices: ganttData.segmentos,
          tiempoTotalSimulacion: ganttData.tiempoTotal
        };
      });
      
    } catch (e) {
      simState.update(state => ({
        ...state,
        errors: ['La simulación falló. Revisa parámetros y dataset.']
      }));
    } finally {
      ejecutando.set(false);
      simState.update(state => ({
        ...state,
        simulacionEnCurso: false
      }));
    }
  }

  function reiniciarTodo() {
    simState.set(getInitialSimulationState());
    configEstablecida.set(false);
  }

  // Computed properties usando derived
  const tieneProcesos = derived(simState, $simState => 
    Boolean($simState.loaded && $simState.workload?.processes && $simState.workload.processes.length > 0)
  );
  
  const necesitaQuantum = derived(simState, $simState => $simState.policy === 'RR');
  
  const faltanCampos = derived([simState, necesitaQuantum], ([$simState, $necesitaQuantum]) =>
    !$simState.policy ||
    $simState.tip == null ||
    $simState.tfp == null ||
    $simState.tcp == null ||
    ($necesitaQuantum && ($simState.quantum == null || $simState.quantum <= 0))
  );

  return {
    // Stores
    simState,
    configEstablecida,
    cargandoArchivo,
    ejecutando,
    
    // Computed
    tieneProcesos,
    necesitaQuantum,
    faltanCampos,
    
    // Acciones
    cargarArchivoUI,
    cambiarModoArchivo,
    cargarArchivoConModo,
    establecerConfiguracion,
    ejecutarSimulacion,
    reiniciarTodo,
    limpiarResultadosPrevios
  };
}

// Funciones de utilidad privadas
function validateConfiguration(simState: SimulationState) {
  const faltaPolitica = !simState.policy;
  const faltaTip = simState.tip == null || Number.isNaN(simState.tip as unknown as number);
  const faltaTfp = simState.tfp == null || Number.isNaN(simState.tfp as unknown as number);
  const faltaTcp = simState.tcp == null || Number.isNaN(simState.tcp as unknown as number);
  const faltaQuantumRR = simState.policy === 'RR' && (simState.quantum == null || simState.quantum <= 0);

  return {
    isValid: !(faltaPolitica || faltaTip || faltaTfp || faltaTcp || faltaQuantumRR)
  };
}

function updateWorkloadConfig(simState: SimulationState) {
  if (simState.workload?.config) {
    simState.workload.config.policy = simState.policy;
    simState.workload.config.tip = simState.tip;
    simState.workload.config.tfp = simState.tfp;
    simState.workload.config.tcp = simState.tcp;
    simState.workload.config.quantum = simState.policy === 'RR'
      ? simState.quantum ?? undefined
      : undefined;
  }
}

function updateSimulationResults(simState: SimulationState, result: any) {
  simState.events = result.events ?? [];
  simState.metrics = result.metrics ?? {};
  simState.ganttSlices = result.ganttSlices ?? [];
  simState.estadisticasExtendidas = result.estadisticasExtendidas ?? null;
  simState.tiempoTotalSimulacion = result.tiempoTotalSimulacion ?? 0;
  simState.advertencias = result.advertencias ?? [];
}