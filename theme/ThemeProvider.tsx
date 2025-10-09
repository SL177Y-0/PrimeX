import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { ThemeTokens, darkTheme, lightTheme } from './tokens';
import { useAppStore } from '../store/useAppStore';

interface ThemeContextType {
  theme: ThemeTokens;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // Use selective Zustand selector to ONLY re-render when themeMode changes
  const themeMode = useAppStore((state) => state.themeMode);
  
  const contextValue = useMemo(() => {
    const isDark = themeMode === 'dark';
    const theme = isDark ? darkTheme : lightTheme;
    return { theme, isDark };
  }, [themeMode]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}