import { it, expect } from "vitest";
import { computeOrderBetween } from "./order";

it("returns the midpoint between two neighbours", () => {
  expect(computeOrderBetween(1, 2)).toBe(1.5);
  expect(computeOrderBetween(2, 3)).toBe(2.5);
});

it("places before the first item", () => {
  expect(computeOrderBetween(null, 5)).toBe(4);
});

it("places after the last item", () => {
  expect(computeOrderBetween(5, null)).toBe(6);
});

it("returns 1 for an empty list", () => {
  expect(computeOrderBetween(null, null)).toBe(1);
});

it("signals renormalize when neighbours are too close for a float between them", () => {
  // 1 + EPSILON is the next representable double after 1; nothing fits between.
  expect(computeOrderBetween(1, 1 + Number.EPSILON)).toBe("renormalize");
});

it("still fits a value in a small but representable gap", () => {
  const result = computeOrderBetween(1, 1.0001);
  expect(result).not.toBe("renormalize");
  expect(result).toBeGreaterThan(1);
  expect(result).toBeLessThan(1.0001);
});
