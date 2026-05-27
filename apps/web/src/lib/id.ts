/**
 * Centralised ID generation.
 * Format: prefix_timestamp_random (e.g. user_1710672000000_a3f2)
 */
export function generateId(prefix: string, randomLength = 6): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 2 + randomLength);
  return `${prefix}_${ts}_${rand}`;
}
