import { createContext, useContext, useEffect, useState } from 'react';

// preference: 'system' | 'light' | 'dark'. theme: the resolved 'light' | 'dark'.
const ThemeContext = createContext({ preference: 'system', theme: 'dark', setPreference: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

const lightQuery = () => window.matchMedia('(prefers-color-scheme: light)');

function readPreference() {
  try {
    const stored = localStorage.getItem('theme');
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(readPreference);
  const [systemTheme, setSystemTheme] = useState(() => (lightQuery().matches ? 'light' : 'dark'));
  const theme = preference === 'system' ? systemTheme : preference;

  useEffect(() => {
    const mq = lightQuery();
    const onChange = (e) => setSystemTheme(e.matches ? 'light' : 'dark');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    try {
      if (preference === 'system') localStorage.removeItem('theme');
      else localStorage.setItem('theme', preference);
    } catch {
      // Storage unavailable (private mode); the choice still applies for this visit.
    }
  }, [preference]);

  return <ThemeContext.Provider value={{ preference, theme, setPreference }}>{children}</ThemeContext.Provider>;
}
