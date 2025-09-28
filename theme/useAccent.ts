import { useTheme } from './ThemeProvider';
import { brandPalettes } from './tokens';

export function useAccent(symbol?: string) {
  const { theme } = useTheme();
  
  if (symbol && brandPalettes[symbol as keyof typeof brandPalettes]) {
    const palette = brandPalettes[symbol as keyof typeof brandPalettes];
    return {
      from: palette.from,
      to: palette.to,
      glow: `${palette.from}80`,
    };
  }
  
  return {
    from: theme.colors.accentFrom,
    to: theme.colors.accentTo,
    glow: theme.colors.accentGlow,
  };
}