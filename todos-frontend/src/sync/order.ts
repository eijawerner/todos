// Fractional ordering. A move sets ONE todo's order to a value between its
// neighbours, so reordering is a single write instead of renumbering the list.
// Either neighbour may be null (the ends of the list).

export type OrderResult = number | "renormalize";

// Returns an order strictly between prev and next, or "renormalize" when the
// two neighbours are so close that no float fits between them (precision
// exhaustion). The caller then reassigns evenly-spaced orders across the list.
export function computeOrderBetween(
  prev: number | null,
  next: number | null,
): OrderResult {
  if (prev == null && next == null) return 1;
  if (prev == null) return (next as number) - 1;
  if (next == null) return prev + 1;

  const mid = (prev + next) / 2;
  // If the midpoint rounds to a neighbour, the gap is below float precision.
  if (mid <= prev || mid >= next) return "renormalize";
  return mid;
}
