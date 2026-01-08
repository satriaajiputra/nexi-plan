import { test, expect, describe } from "bun:test";
import { snapToZero, isConverged, CONVERGENCE_EPSILON } from "../../src/utils/convergence.ts";

describe("utils/convergence", () => {
  describe("snapToZero", () => {
    test("should return 0 for negative values", () => {
      expect(snapToZero(-1)).toBe(0);
      expect(snapToZero(-0.5)).toBe(0);
      expect(snapToZero(-0.01)).toBe(0);
    });

    test("should return 0 for values within epsilon threshold", () => {
      expect(snapToZero(0)).toBe(0);
      expect(snapToZero(0.005)).toBe(0);
      expect(snapToZero(0.009)).toBe(0);
      expect(snapToZero(0.01)).toBe(0);
    });

    test("should return original value for values above epsilon", () => {
      expect(snapToZero(0.011)).toBe(0.011);
      expect(snapToZero(0.5)).toBe(0.5);
      expect(snapToZero(0.99)).toBe(0.99);
      expect(snapToZero(1.0)).toBe(1.0);
    });

    test("should handle edge cases correctly", () => {
      expect(snapToZero(0.009999)).toBe(0);
      expect(snapToZero(0.010001)).toBe(0.010001);
    });
  });

  describe("isConverged", () => {
    test("should return true for converged values", () => {
      expect(isConverged(0)).toBe(true);
      expect(isConverged(0.005)).toBe(true);
      expect(isConverged(0.009)).toBe(true);
      expect(isConverged(0.01)).toBe(true);
    });

    test("should return false for non-converged values", () => {
      expect(isConverged(0.011)).toBe(false);
      expect(isConverged(0.5)).toBe(false);
      expect(isConverged(1.0)).toBe(false);
    });
  });

  describe("CONVERGENCE_EPSILON", () => {
    test("should be defined as 0.01", () => {
      expect(CONVERGENCE_EPSILON).toBe(0.01);
    });
  });
});
