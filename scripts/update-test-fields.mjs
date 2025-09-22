#!/usr/bin/env node

/**
 * Script para actualizar masivamente todos los tests que usen campos antiguos
 * de ProcessSpec a los nuevos nombres consolidados
 */

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import path from 'path';

console.log('🔧 Actualizando campos en todos los archivos de test...');

// Buscar todos los archivos TypeScript en la carpeta tests
const files = glob.sync('tests/**/*.ts', { cwd: process.cwd() });

console.log(`📁 Encontrados ${files.length} archivos de test`);

let totalUpdates = 0;

files.forEach(file => {
  const fullPath = path.resolve(file);
  let content = readFileSync(fullPath, 'utf-8');
  let updated = false;
  
  // Reemplazos masivos
  const replacements = [
    // Campos de ProcessSpec
    { from: /name:/g, to: 'id:' },
    { from: /tiempoArribo:/g, to: 'arribo:' },
    { from: /duracionRafagaCPU:/g, to: 'duracionCPU:' },
    { from: /duracionRafagaES:/g, to: 'duracionIO:' },
    
    // También actualizar referencias en strings de template
    { from: /tiempoArribo\s*=/g, to: 'arribo =' },
    { from: /duracionRafagaCPU\s*=/g, to: 'duracionCPU =' },
    { from: /duracionRafagaES\s*=/g, to: 'duracionIO =' }
  ];
  
  replacements.forEach(({ from, to }) => {
    const newContent = content.replace(from, to);
    if (newContent !== content) {
      content = newContent;
      updated = true;
    }
  });
  
  if (updated) {
    writeFileSync(fullPath, content, 'utf-8');
    totalUpdates++;
    console.log(`✅ Actualizado: ${file}`);
  } else {
    console.log(`⚪ Sin cambios: ${file}`);
  }
});

console.log(`\n🎯 Actualización completada: ${totalUpdates}/${files.length} archivos modificados`);