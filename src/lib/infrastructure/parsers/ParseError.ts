/**
 * Clase de error mejorada para parsers con mensajes más claros y útiles
 */

export class ParseError extends Error {
  constructor(
    message: string,
    public file?: string,
    public line?: number,
    public field?: string,
    public suggestion?: string
  ) {
    // Construir mensaje mejorado
    let fullMessage = message;
    
    if (file) {
      fullMessage = `Archivo "${file}": ${fullMessage}`;
    }
    
    if (line !== undefined) {
      fullMessage += ` (línea ${line})`;
    }
    
    if (field) {
      fullMessage += ` en campo "${field}"`;
    }
    
    if (suggestion) {
      fullMessage += `\n💡 Sugerencia: ${suggestion}`;
    }
    
    super(fullMessage);
    this.name = 'ParseError';
  }
}

/**
 * Funciones utilitarias para crear mensajes de error consistentes
 */
export class ErrorMessages {
  
  static invalidJson(filename?: string): ParseError {
    return new ParseError(
      'El archivo no contiene JSON válido',
      filename,
      undefined,
      undefined,
      'Verifica que las llaves, corchetes y comillas estén balanceadas correctamente'
    );
  }
  
  static missingField(field: string, processIndex?: number, filename?: string): ParseError {
    const processInfo = processIndex !== undefined ? ` en proceso ${processIndex + 1}` : '';
    return new ParseError(
      `Campo "${field}" es requerido${processInfo}`,
      filename,
      undefined,
      field,
      'Asegúrate de que todos los procesos tengan los 6 campos: nombre, tiempo_arribo, cantidad_rafagas_cpu, duracion_rafaga_cpu, duracion_rafaga_es, prioridad_externa'
    );
  }
  
  static invalidNumber(field: string, value: string, line?: number, filename?: string): ParseError {
    return new ParseError(
      `"${value}" no es un número válido`,
      filename,
      line,
      field,
      'Usa números sin comillas, por ejemplo: 5, 3.14, 0'
    );
  }
  
  static outOfRange(field: string, value: number, min?: number, max?: number, line?: number, filename?: string): ParseError {
    let constraint = '';
    if (min !== undefined && max !== undefined) {
      constraint = ` (debe estar entre ${min} y ${max})`;
    } else if (min !== undefined) {
      constraint = ` (debe ser >= ${min})`;
    } else if (max !== undefined) {
      constraint = ` (debe ser <= ${max})`;
    }
    
    return new ParseError(
      `Valor ${value} fuera de rango para "${field}"${constraint}`,
      filename,
      line,
      field,
      `Ajusta el valor para que esté en el rango permitido`
    );
  }
  
  static duplicateNames(names: string[], filename?: string): ParseError {
    return new ParseError(
      `Nombres de procesos duplicados: ${names.join(', ')}`,
      filename,
      undefined,
      'nombre',
      'Cada proceso debe tener un nombre único, por ejemplo: P1, P2, P3, etc.'
    );
  }
  
  static invalidProcessName(name: string, line?: number, filename?: string): ParseError {
    return new ParseError(
      `"${name}" no es un nombre de proceso válido`,
      filename,
      line,
      'nombre',
      'Los nombres deben empezar con letra y contener solo letras, números y underscore (P1, Proceso_A, etc.)'
    );
  }
  
  static wrongFieldCount(expected: number, actual: number, line?: number, filename?: string): ParseError {
    return new ParseError(
      `Se esperan exactamente ${expected} campos, se encontraron ${actual}`,
      filename,
      line,
      undefined,
      'Formato requerido: nombre, tiempo_arribo, cantidad_rafagas_cpu, duracion_rafaga_cpu, duracion_rafaga_es, prioridad_externa'
    );
  }
  
  static noProcesses(filename?: string): ParseError {
    return new ParseError(
      'No se encontraron procesos válidos en el archivo',
      filename,
      undefined,
      undefined,
      'El archivo debe contener al menos un proceso con todos los campos requeridos'
    );
  }
  
  static emptyFile(filename?: string): ParseError {
    return new ParseError(
      'El archivo está vacío o no contiene datos válidos',
      filename,
      undefined,
      undefined,
      'Agrega al menos un proceso con el formato requerido'
    );
  }
  
  static invalidFileFormat(filename?: string): ParseError {
    const extension = filename ? filename.split('.').pop()?.toLowerCase() : 'unknown';
    let formatHint = '';
    
    switch (extension) {
      case 'json':
        formatHint = 'Para JSON: array de objetos con los campos requeridos o objeto con "processes" array';
        break;
      case 'csv':
        formatHint = 'Para CSV: primera línea con headers, siguientes líneas con datos separados por comas';
        break;
      case 'txt':
        formatHint = 'Para TXT: líneas con datos separados por comas, espacios o tabs';
        break;
      default:
        formatHint = 'Formatos soportados: JSON, CSV, TXT';
    }
    
    return new ParseError(
      'Formato de archivo no reconocido o inválido',
      filename,
      undefined,
      undefined,
      formatHint
    );
  }
  
  static invalidQuantumForRR(quantum: any, filename?: string): ParseError {
    return new ParseError(
      'Quantum inválido para política Round Robin',
      filename,
      undefined,
      'quantum',
      'Para RR el quantum debe ser un número entero positivo, por ejemplo: 2, 4, 8'
    );
  }
  
  static missingPolicy(filename?: string): ParseError {
    return new ParseError(
      'Política de planificación no especificada',
      filename,
      undefined,
      'policy',
      'Políticas válidas: FCFS, SJF, SRTF, PRIORITY, RR'
    );
  }
}
