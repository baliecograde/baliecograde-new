import { useCallback, useEffect, useState } from 'react';
export type Theme = 'light' | 'dark';
const STORAGE_KEY = 'baliecograde-theme';
export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light');
  useEffect(() => {
    queueMicrotask(() => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') setTheme(stored);
      else if (window.matchMedia('(prefers-color-scheme: dark)').matches) setTheme('dark');
    });
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* local storage may be unavailable */ }
  }, [theme]);
  const toggleTheme = useCallback(() => setTheme((current) => current === 'dark' ? 'light' : 'dark'), []);
  return { theme, toggleTheme };
}
