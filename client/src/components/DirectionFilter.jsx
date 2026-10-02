import React from "react";
import { ALL_DIRECTIONS } from "../directions.js";
import { useConfig } from "../ConfigContext.jsx";

export default function DirectionFilter({ value, onChange, disabled }) {
  const { directions } = useConfig();
  return (
    <label className="direction-filter">
      Направление
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
        <option value={ALL_DIRECTIONS}>Все</option>
        {directions.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
    </label>
  );
}
