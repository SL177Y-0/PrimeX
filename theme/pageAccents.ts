/**
 * Page-Specific Accent Colors
 * 
 * Defines unique color schemes for each major feature page
 * while maintaining consistent theme structure
 */

export const PAGE_ACCENTS = {
  // Leverage Trading - Orange/Amber (Target icon color from trade center)
  LEVERAGE: {
    primary: '#F97316',      // orange-500
    secondary: '#FB923C',    // orange-400
    gradient: ['#F97316', '#FBBF24'],  // orange to amber
    glow: 'rgba(249, 115, 22, 0.3)',
    light: 'rgba(249, 115, 22, 0.1)',
    name: 'Leverage Trading',
  },
  
  // Liquid Staking - Blue/Sky (TrendingUp icon color)
  STAKING: {
    primary: '#0EA5E9',      // sky-500
    secondary: '#38BDF8',    // sky-400
    gradient: ['#0EA5E9', '#06B6D4'],  // sky to cyan
    glow: 'rgba(14, 165, 233, 0.3)',
    light: 'rgba(14, 165, 233, 0.1)',
    name: 'Liquid Staking',
  },
  
  // Lend & Borrow - Purple/Violet (Percent icon color)
  LEND: {
    primary: '#A855F7',      // purple-500
    secondary: '#C084FC',    // purple-400
    gradient: ['#A855F7', '#8B5CF6'],  // purple to violet
    glow: 'rgba(168, 85, 247, 0.3)',
    light: 'rgba(168, 85, 247, 0.1)',
    name: 'Lend & Borrow',
  },
  
  // Swap Tokens - Neon Green (RefreshCw icon color)
  SWAP: {
    primary: '#00FF88',      // neon green
    secondary: '#00E676',    // bright green
    gradient: ['#00FF88', '#00E676'],  // neon green to bright green
    glow: 'rgba(0, 255, 136, 0.3)',
    light: 'rgba(0, 255, 136, 0.1)',
    name: 'Swap Tokens',
  },
} as const;

export type PageAccentKey = keyof typeof PAGE_ACCENTS;
/**
 * Hook to get page-specific accent colors
 */
export function usePageAccent(page: PageAccentKey) {
  return PAGE_ACCENTS[page];
}
