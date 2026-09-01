export const DIRECTIONS = ["Системная семейная терапия", "КПТ"];

// Sentinel value for "no filter" (Все) — matches the server's "no direction" behavior.
export const ALL_DIRECTIONS = "";

export function directionSlug(direction) {
  return direction === "КПТ" ? "cbt" : "sft";
}
