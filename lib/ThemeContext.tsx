'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'dark' | 'light' | 'system';
type ResolvedTheme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  resolvedTheme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
});

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('dark');
  const [mounted, setMounted] = useState(false);

  // Initialize theme on mount
  useEffect(() => {
    // Add preload class to prevent transition flash
    document.documentElement.classList.add('preload');

    const savedTheme = localStorage.getItem('gme-theme') as Theme | null;

    if (savedTheme) {
      setThemeState(savedTheme);
      if (savedTheme === 'system') {
        setResolvedTheme(getSystemTheme());
      } else {
        setResolvedTheme(savedTheme as ResolvedTheme);
      }
    } else {
      // Default to dark mode (GameStop brand style)
      setThemeState('dark');
      setResolvedTheme('dark');
    }

    setMounted(true);

    // Remove preload class after a brief delay to enable transitions
    setTimeout(() => {
      document.documentElement.classList.remove('preload');
    }, 100);
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      setResolvedTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;

    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', resolvedTheme === 'dark' ? '#0a0a0a' : '#ffffff');
    }

    localStorage.setItem('gme-theme', theme);
  }, [theme, resolvedTheme, mounted]);

  const toggleTheme = () => {
    // Cycle through: dark -> light -> dark (skip system for simplicity)
    setThemeState(prev => {
      const newTheme = prev === 'dark' ? 'light' : 'dark';
      setResolvedTheme(newTheme);
      return newTheme;
    });
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    if (newTheme === 'system') {
      setResolvedTheme(getSystemTheme());
    } else {
      setResolvedTheme(newTheme as ResolvedTheme);
    }
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <ThemeContext.Provider value={{ theme: 'dark', resolvedTheme: 'dark', toggleTheme: () => {}, setTheme: () => {} }}>
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
