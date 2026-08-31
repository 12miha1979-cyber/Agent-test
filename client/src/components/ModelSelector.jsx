import React from "react";
import { MODEL_OPTIONS } from "../models.js";

export default function ModelSelector({ value, onChange, disabled }) {
  return (
    <label className="model-selector">
      Модель
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
        {MODEL_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label} ({opt.description})
          </option>
        ))}
      </select>
    </label>
  );
}
