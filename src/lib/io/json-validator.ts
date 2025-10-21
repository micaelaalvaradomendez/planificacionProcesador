// Validaciones para prevenir errores en el simulador

export interface ValidationError {
  field: string;
  value: unknown;
  reason: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

/**
 * Valida estructura básica de tanda de procesos
 */
export function validateTandaJSON(data: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  // Validar que sea un array
  if (!Array.isArray(data)) {
    errors.push({
      field: 'root',
      value: typeof data,
      reason: 'Debe ser un array de procesos'
    });
    return { isValid: false, errors, warnings };
  }

  // Validar que no esté vacío
  if (data.length === 0) {
    errors.push({
      field: 'length',
      value: 0,
      reason: 'Debe contener al menos un proceso'
    });
    return { isValid: false, errors, warnings };
  }

  // Validar límite máximo razonable
  if (data.length > 1000) {
    errors.push({
      field: 'length',
      value: data.length,
      reason: 'Demasiados procesos (máximo 1000)'
    });
    return { isValid: false, errors, warnings };
  }

  // Validar cada proceso
  data.forEach((item, index) => {
    const processErrors = validateProcesoTanda(item, index);
    errors.push(...processErrors.errors);
    warnings.push(...processErrors.warnings);
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Valida un proceso individual de tanda
 */
function validateProcesoTanda(item: unknown, index: number): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  if (typeof item !== 'object' || item === null) {
    errors.push({
      field: `procesos[${index}]`,
      value: typeof item,
      reason: 'Debe ser un objeto'
    });
    return { isValid: false, errors, warnings };
  }

  const proceso = item as Record<string, unknown>;

  // Validar campos requeridos
  const requiredFields = ['nombre', 'tiempo_arribo', 'cantidad_rafagas_cpu', 'duracion_rafaga_cpu'];
  
  for (const field of requiredFields) {
    if (!(field in proceso)) {
      errors.push({
        field: `procesos[${index}].${field}`,
        value: undefined,
        reason: `Campo requerido faltante`
      });
    }
  }

  // Validar nombre
  if (typeof proceso.nombre !== 'string' || proceso.nombre.trim() === '') {
    errors.push({
      field: `procesos[${index}].nombre`,
      value: proceso.nombre,
      reason: 'Debe ser un string no vacío'
    });
  } else if (!/^P\d+$/.test(proceso.nombre.trim())) {
    errors.push({
      field: `procesos[${index}].nombre`,
      value: proceso.nombre,
      reason: 'Debe tener formato P1, P2, etc.'
    });
  }

  // Validar tiempo_arribo
  if (typeof proceso.tiempo_arribo !== 'number' || !Number.isFinite(proceso.tiempo_arribo)) {
    errors.push({
      field: `procesos[${index}].tiempo_arribo`,
      value: proceso.tiempo_arribo,
      reason: 'Debe ser un número válido'
    });
  } else if (proceso.tiempo_arribo < 0) {
    errors.push({
      field: `procesos[${index}].tiempo_arribo`,
      value: proceso.tiempo_arribo,
      reason: 'No puede ser negativo'
    });
  } else if (proceso.tiempo_arribo > 10000) {
    warnings.push(`Proceso ${proceso.nombre}: tiempo de arribo muy alto (${proceso.tiempo_arribo})`);
  }

  // Validar cantidad_rafagas_cpu
  if (typeof proceso.cantidad_rafagas_cpu !== 'number' || !Number.isInteger(proceso.cantidad_rafagas_cpu)) {
    errors.push({
      field: `procesos[${index}].cantidad_rafagas_cpu`,
      value: proceso.cantidad_rafagas_cpu,
      reason: 'Debe ser un número entero'
    });
  } else if (proceso.cantidad_rafagas_cpu <= 0) {
    errors.push({
      field: `procesos[${index}].cantidad_rafagas_cpu`,
      value: proceso.cantidad_rafagas_cpu,
      reason: 'Debe ser mayor a 0'
    });
  } else if (proceso.cantidad_rafagas_cpu > 100) {
    warnings.push(`Proceso ${proceso.nombre}: muchas ráfagas CPU (${proceso.cantidad_rafagas_cpu})`);
  }

  // Validar duracion_rafaga_cpu
  if (typeof proceso.duracion_rafaga_cpu !== 'number' || !Number.isFinite(proceso.duracion_rafaga_cpu)) {
    errors.push({
      field: `procesos[${index}].duracion_rafaga_cpu`,
      value: proceso.duracion_rafaga_cpu,
      reason: 'Debe ser un número válido'
    });
  } else if (proceso.duracion_rafaga_cpu <= 0) {
    errors.push({
      field: `procesos[${index}].duracion_rafaga_cpu`,
      value: proceso.duracion_rafaga_cpu,
      reason: 'Debe ser mayor a 0'
    });
  } else if (proceso.duracion_rafaga_cpu > 10000) {
    warnings.push(`Proceso ${proceso.nombre}: ráfaga CPU muy larga (${proceso.duracion_rafaga_cpu})`);
  }

  // Validar duracion_rafaga_es (opcional)
  if ('duracion_rafaga_es' in proceso) {
    if (typeof proceso.duracion_rafaga_es !== 'number' || !Number.isFinite(proceso.duracion_rafaga_es)) {
      errors.push({
        field: `procesos[${index}].duracion_rafaga_es`,
        value: proceso.duracion_rafaga_es,
        reason: 'Debe ser un número válido'
      });
    } else if (proceso.duracion_rafaga_es < 0) {
      errors.push({
        field: `procesos[${index}].duracion_rafaga_es`,
        value: proceso.duracion_rafaga_es,
        reason: 'No puede ser negativo'
      });
    } else if (proceso.duracion_rafaga_es > 10000) {
      warnings.push(`Proceso ${proceso.nombre}: E/S muy larga (${proceso.duracion_rafaga_es})`);
    }
  }

  // Validar prioridad_externa (opcional)
  if ('prioridad_externa' in proceso) {
    if (typeof proceso.prioridad_externa !== 'number' || !Number.isInteger(proceso.prioridad_externa)) {
      errors.push({
        field: `procesos[${index}].prioridad_externa`,
        value: proceso.prioridad_externa,
        reason: 'Debe ser un número entero'
      });
    } else if (proceso.prioridad_externa < 1 || proceso.prioridad_externa > 10) {
      errors.push({
        field: `procesos[${index}].prioridad_externa`,
        value: proceso.prioridad_externa,
        reason: 'Debe estar entre 1 y 10'
      });
    }
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Valida configuración completa de escenario
 */
export function validateEscenarioCompleto(data: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  if (typeof data !== 'object' || data === null) {
    errors.push({
      field: 'root',
      value: typeof data,
      reason: 'Debe ser un objeto'
    });
    return { isValid: false, errors, warnings };
  }

  const escenario = data as Record<string, unknown>;

  // Validar campos requeridos
  if (!('cfg' in escenario)) {
    errors.push({
      field: 'cfg',
      value: undefined,
      reason: 'Campo de configuración requerido'
    });
  }

  if (!('procesos' in escenario)) {
    errors.push({
      field: 'procesos',
      value: undefined,
      reason: 'Campo de procesos requerido'
    });
  }

  // Validar configuración
  if ('cfg' in escenario) {
    const cfgValidation = validateConfiguracion(escenario.cfg);
    errors.push(...cfgValidation.errors);
    warnings.push(...cfgValidation.warnings);
  }

  // Validar procesos
  if ('procesos' in escenario) {
    const procesosValidation = validateProcesosModernos(escenario.procesos);
    errors.push(...procesosValidation.errors);
    warnings.push(...procesosValidation.warnings);
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Valida configuración del simulador
 */
function validateConfiguracion(cfg: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  if (typeof cfg !== 'object' || cfg === null) {
    errors.push({
      field: 'cfg',
      value: typeof cfg,
      reason: 'Debe ser un objeto'
    });
    return { isValid: false, errors, warnings };
  }

  const config = cfg as Record<string, unknown>;

  // Validar política
  if ('politica' in config) {
    const validPoliticas = ['FCFS', 'RR', 'SPN', 'SRTN', 'PRIORITY'];
    if (!validPoliticas.includes(config.politica as string)) {
      errors.push({
        field: 'cfg.politica',
        value: config.politica,
        reason: `Debe ser una de: ${validPoliticas.join(', ')}`
      });
    }

    // Validar quantum para RR
    if (config.politica === 'RR') {
      if (!('quantum' in config) || typeof config.quantum !== 'number' || config.quantum <= 0) {
        errors.push({
          field: 'cfg.quantum',
          value: config.quantum,
          reason: 'RR requiere quantum > 0'
        });
      }
    }
  }

  // Validar costos
  if ('costos' in config) {
    const costosValidation = validateCostos(config.costos);
    errors.push(...costosValidation.errors);
    warnings.push(...costosValidation.warnings);
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Valida costos del sistema
 */
function validateCostos(costos: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  if (typeof costos !== 'object' || costos === null) {
    errors.push({
      field: 'cfg.costos',
      value: typeof costos,
      reason: 'Debe ser un objeto'
    });
    return { isValid: false, errors, warnings };
  }

  const costs = costos as Record<string, unknown>;
  const validCosts = ['TIP', 'TCP', 'TFP', 'bloqueoES'];

  for (const [key, value] of Object.entries(costs)) {
    if (!validCosts.includes(key)) {
      warnings.push(`Costo desconocido: ${key}`);
      continue;
    }

    if (typeof value !== 'number' || !Number.isFinite(value)) {
      errors.push({
        field: `cfg.costos.${key}`,
        value: value,
        reason: 'Debe ser un número válido'
      });
    } else if (value < 0) {
      errors.push({
        field: `cfg.costos.${key}`,
        value: value,
        reason: 'No puede ser negativo'
      });
    } else if (value > 1000) {
      warnings.push(`Costo ${key} muy alto: ${value}`);
    }
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Valida array de procesos en formato moderno
 */
function validateProcesosModernos(procesos: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  if (!Array.isArray(procesos)) {
    errors.push({
      field: 'procesos',
      value: typeof procesos,
      reason: 'Debe ser un array'
    });
    return { isValid: false, errors, warnings };
  }

  if (procesos.length === 0) {
    errors.push({
      field: 'procesos.length',
      value: 0,
      reason: 'Debe contener al menos un proceso'
    });
  }

  if (procesos.length > 1000) {
    errors.push({
      field: 'procesos.length',
      value: procesos.length,
      reason: 'Demasiados procesos (máximo 1000)'
    });
  }

  procesos.forEach((proceso, index) => {
    const procesoValidation = validateProcesoModerno(proceso, index);
    errors.push(...procesoValidation.errors);
    warnings.push(...procesoValidation.warnings);
  });

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Valida proceso en formato moderno
 */
function validateProcesoModerno(proceso: unknown, index: number): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  if (typeof proceso !== 'object' || proceso === null) {
    errors.push({
      field: `procesos[${index}]`,
      value: typeof proceso,
      reason: 'Debe ser un objeto'
    });
    return { isValid: false, errors, warnings };
  }

  const proc = proceso as Record<string, unknown>;

  // Validar PID
  if ('pid' in proc) {
    if (typeof proc.pid !== 'number' || !Number.isInteger(proc.pid)) {
      errors.push({
        field: `procesos[${index}].pid`,
        value: proc.pid,
        reason: 'Debe ser un número entero'
      });
    } else if (proc.pid <= 0) {
      errors.push({
        field: `procesos[${index}].pid`,
        value: proc.pid,
        reason: 'Debe ser mayor a 0'
      });
    }
  }

  // Validar arribo
  if ('arribo' in proc) {
    if (typeof proc.arribo !== 'number' || !Number.isFinite(proc.arribo)) {
      errors.push({
        field: `procesos[${index}].arribo`,
        value: proc.arribo,
        reason: 'Debe ser un número válido'
      });
    } else if (proc.arribo < 0) {
      errors.push({
        field: `procesos[${index}].arribo`,
        value: proc.arribo,
        reason: 'No puede ser negativo'
      });
    }
  }

  // Validar ráfagas
  if ('rafagas' in proc) {
    if (!Array.isArray(proc.rafagas)) {
      errors.push({
        field: `procesos[${index}].rafagas`,
        value: typeof proc.rafagas,
        reason: 'Debe ser un array'
      });
    } else {
      proc.rafagas.forEach((rafaga, rafagaIndex) => {
        if (typeof rafaga !== 'number' || !Number.isFinite(rafaga)) {
          errors.push({
            field: `procesos[${index}].rafagas[${rafagaIndex}]`,
            value: rafaga,
            reason: 'Debe ser un número válido'
          });
        } else if (rafaga <= 0) {
          errors.push({
            field: `procesos[${index}].rafagas[${rafagaIndex}]`,
            value: rafaga,
            reason: 'Debe ser mayor a 0'
          });
        }
      });
    }
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Detecta automáticamente el tipo de JSON y lo valida
 */
export function validateJSONData(data: unknown): ValidationResult {
  if (Array.isArray(data)) {
    return validateTandaJSON(data);
  } else if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    
    if ('cfg' in obj && 'procesos' in obj) {
      return validateEscenarioCompleto(data);
    } else if ('procesos' in obj && Array.isArray(obj.procesos)) {
      return validateTandaJSON(obj.procesos);
    }
  }

  return {
    isValid: false,
    errors: [{
      field: 'root',
      value: typeof data,
      reason: 'Formato JSON no reconocido'
    }],
    warnings: []
  };
}