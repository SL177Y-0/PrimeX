import { useWindowDimensions } from 'react-native';
import { useCallback, useMemo } from 'react';

export const BREAKPOINTS = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
} as const;

export type BreakpointKey = keyof typeof BREAKPOINTS;

const BREAKPOINT_ORDER: BreakpointKey[] = ['xl', 'lg', 'md', 'sm', 'xs'];

const getBreakpoint = (width: number): BreakpointKey => {
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  if (width >= BREAKPOINTS.sm) return 'sm';
  return 'xs';
};

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const breakpoint = useMemo(() => getBreakpoint(width), [width]);

  const value = useCallback(
    <T,>(values: Partial<Record<BreakpointKey, T>>, fallback?: T) => {
      const resolvedFallback = fallback ?? values.xs;
      for (const key of BREAKPOINT_ORDER) {
        const minWidth = BREAKPOINTS[key];
        if (width >= minWidth && values[key] !== undefined) {
          return values[key] as T;
        }
      }
      return resolvedFallback as T;
    },
    [width],
  );

  const spacing = useMemo(
    () => ({
      xs: value({ xs: 4, sm: 6, md: 8, lg: 10, xl: 12 }, 6),
      sm: value({ xs: 8, sm: 10, md: 12, lg: 14, xl: 16 }, 10),
      md: value({ xs: 12, sm: 14, md: 16, lg: 18, xl: 20 }, 14),
      lg: value({ xs: 14, sm: 16, md: 20, lg: 24, xl: 28 }, 16),
      xl: value({ xs: 16, sm: 20, md: 24, lg: 28, xl: 32 }, 20),
      xxl: value({ xs: 20, sm: 24, md: 28, lg: 32, xl: 36 }, 24),
    }),
    [value],
  );

  const fontSize = useMemo(
    () => ({
      xs: value({ xs: 10, sm: 11, md: 12, lg: 13, xl: 14 }, 11),
      sm: value({ xs: 12, sm: 13, md: 14, lg: 15, xl: 16 }, 13),
      md: value({ xs: 14, sm: 15, md: 16, lg: 17, xl: 18 }, 15),
      lg: value({ xs: 16, sm: 18, md: 20, lg: 22, xl: 24 }, 18),
      xl: value({ xs: 18, sm: 20, md: 22, lg: 24, xl: 26 }, 20),
      xxl: value({ xs: 20, sm: 22, md: 24, lg: 26, xl: 28 }, 22),
    }),
    [value],
  );

  return {
    width,
    height,
    breakpoint,
    spacing,
    fontSize,
    isMobile: width < BREAKPOINTS.md,
    isTablet: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
    isDesktop: width >= BREAKPOINTS.lg,
    value,
  };
}
