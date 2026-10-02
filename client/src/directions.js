// Used until the server's /api/config answers (and if it can't be reached).
export const DEFAULT_CONFIG = {
  title: "ИИ-репетитор",
  directions: ["Системная семейная терапия", "КПТ"],
};

// Sentinel value for "no filter" (Все) — matches the server's "no direction" behavior.
export const ALL_DIRECTIONS = "";

const BADGE_VARIANTS = 4;

export function directionBadgeClass(direction, directions) {
  const index = directions.indexOf(direction);
  return `dir-${(index < 0 ? 0 : index) % BADGE_VARIANTS}`;
}
