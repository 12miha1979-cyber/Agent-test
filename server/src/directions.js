export const DIRECTIONS = ["Системная семейная терапия", "КПТ"];

export function isValidDirection(value) {
  return DIRECTIONS.includes(value);
}
