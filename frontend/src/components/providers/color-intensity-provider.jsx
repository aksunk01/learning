"use client";

import * as React from "react";

const STORAGE_KEY = "color_intensity";
const DEFAULT_INTENSITY = 100;

const ColorIntensityContext = React.createContext({
  intensity: DEFAULT_INTENSITY,
  setIntensity: () => {},
});

export function ColorIntensityProvider({ children }) {
  const [intensity, setIntensityState] = React.useState(DEFAULT_INTENSITY);

  React.useEffect(() => {
    const stored = Number(localStorage.getItem(STORAGE_KEY));
    if (!Number.isNaN(stored) && stored >= 0 && stored <= 100 && localStorage.getItem(STORAGE_KEY) !== null) {
      setIntensityState(stored);
    }
  }, []);

  const setIntensity = React.useCallback((value) => {
    const clamped = Math.min(100, Math.max(0, value));
    setIntensityState(clamped);
    localStorage.setItem(STORAGE_KEY, String(clamped));
  }, []);

  const contextValue = React.useMemo(
    () => ({ intensity, setIntensity }),
    [intensity, setIntensity]
  );

  return (
    <ColorIntensityContext.Provider value={contextValue}>
      {children}
    </ColorIntensityContext.Provider>
  );
}

export function useColorIntensity() {
  const { intensity, setIntensity } = React.useContext(ColorIntensityContext);
  return { intensity, intensityFactor: intensity / 100, setIntensity };
}
