/**
 * Devuelve la ráfaga actual (duración) o null si idx está fuera de rango.
 */
export function rafagaActual(rafagas: number[], idx: number): number | null {
  if (!Array.isArray(rafagas)) return null;
  if (idx < 0 || idx >= rafagas.length) return null;
  return rafagas[idx] ?? null;
}

/**
 * ¿Quedan ráfagas a partir de idx? (idx es 0‑based)
 * Ej.: quedanRafagas([5,7,3], 2) === true; quedanRafagas([5,7,3], 3) === false
 */
export function quedanRafagas(rafagas: number[], idx: number): boolean {
  if (!Array.isArray(rafagas)) return false;
  return idx < rafagas.length;
}
