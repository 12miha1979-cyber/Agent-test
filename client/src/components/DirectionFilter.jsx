import React from "react";
import { DIRECTIONS, ALL_DIRECTIONS } from "../directions.js";

export default function DirectionFilter({ value, onChange, disabled }) {
  return (
    <label className="direction-filter">
      Направление
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
        <option value={ALL_DIRECTIONS}>Все</option>
        {DIRECTIONS.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
    </label>
  );
}
