import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';

const ROOT = resolve(process.cwd());

export async function readJSON<T = any>(relPath: string): Promise<T> {
  const abs = resolve(ROOT, relPath);
  return JSON.parse(await readFile(abs, 'utf-8'));
}

export async function writeJSON(relPath: string, data: unknown) {
  const abs = resolve(ROOT, relPath);
  await mkdir(dirname(abs), { recursive: true });
  await writeFile(abs, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

export const GOLDENS_DIR = 'tests/goldens';
export const FIXTURES_DIR = 'tests/fixtures';
export const shouldUpdateGoldens = Boolean(process.env.UPDATE_GOLDENS);