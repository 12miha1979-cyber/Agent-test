import React, { createContext, useContext, useEffect, useState } from "react";
import { getConfig } from "./api.js";
import { DEFAULT_CONFIG } from "./directions.js";

const ConfigContext = createContext(DEFAULT_CONFIG);

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState(DEFAULT_CONFIG);

  useEffect(() => {
    getConfig()
      .then((c) => {
        if (Array.isArray(c.directions) && c.directions.length) {
          setConfig({ title: c.title || DEFAULT_CONFIG.title, directions: c.directions });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    document.title = config.title;
  }, [config.title]);

  return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>;
}

export function useConfig() {
  return useContext(ConfigContext);
}
