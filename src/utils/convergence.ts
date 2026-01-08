/**
 * Convergence utilities for threshold-based task completion
 */

export const CONVERGENCE_EPSILON = 0.01;

/**
 * Snap convergence value to 0 if within epsilon threshold
 * Also clamps negative values to 0
 */
export function snapToZero(value: number): number {
  // Clamp negative to 0
  if (value < 0) return 0;
  // Snap to zero if within epsilon
  if (value <= CONVERGENCE_EPSILON) return 0;
  return value;
}

/**
 * Check if a convergence value is considered "done"
 */
export function isConverged(value: number): boolean {
  return value <= CONVERGENCE_EPSILON;
}
