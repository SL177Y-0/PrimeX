import React, { createContext, useContext, ReactNode } from 'react';
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
  const { themeMode } = useAppStore();
  
  const isDark = themeMode === 'dark';
  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark }}>
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