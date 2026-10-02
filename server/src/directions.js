const DEFAULT_DIRECTIONS = ["Системная семейная терапия", "КПТ"];

// DIRECTIONS in server/.env, separated by ";" — lets one codebase run several
// tutors on different subjects.
export const DIRECTIONS = (() => {
  const fromEnv = (process.env.DIRECTIONS || "")
    .split(";")
    .map((d) => d.trim())
    .filter(Boolean);
  return fromEnv.length ? [...new Set(fromEnv)] : DEFAULT_DIRECTIONS;
})();

export const TUTOR_TITLE = (process.env.TUTOR_TITLE || "").trim() || "ИИ-репетитор";

export function isValidDirection(value) {
  return DIRECTIONS.includes(value);
}
