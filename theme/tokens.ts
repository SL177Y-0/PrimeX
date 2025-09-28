type FontWeight =
  | 'normal'
  | 'bold'
  | '100'
  | '200'
  | '300'
  | '400'
  | '500'
  | '600'
  | '700'
  | '800'
  | '900';

export interface ThemeTokens {
  colors: {
    bg: string;
    surface: string;
    elevated: string;
    card: string;
    portfolioCard: string;
    portfolioTextPrimary: string;
    portfolioTextSecondary: string;
    portfolioPositive: string;
    textPrimary: string;
    textSecondary: string;
    positive: string;
    negative: string;
    accentFrom: string;
    accentTo: string;
    accentGlow: string;
    chip: string;
    border: string;
    // New comprehensive colors
    buy: string;
    sell: string;
    purple: string;
    blue: string;
    orange: string;
    green: string;
    red: string;
    chartGlow: string;
    neonGreen: string;
    neonRed: string;
    neonPurple: string;
    neonBlue: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  borderRadius: {
    xs: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  typography: {
    displayXL: {
      fontSize: number;
      fontWeight: FontWeight;
      letterSpacing: number;
    };
    title: {
      fontSize: number;
      fontWeight: FontWeight;
      letterSpacing: number;
    };
    body: {
      fontSize: number;
      fontWeight: FontWeight;
      letterSpacing: number;
    };
    caption: {
      fontSize: number;
      fontWeight: FontWeight;
      letterSpacing: number;
    };
  };
  shadows: {
    soft: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
    glow: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
  };
}

export const darkTheme: ThemeTokens = {
  colors: {
    bg: '#0D0D0D',
    surface: '#12121C',
    elevated: '#1A1B25',
    card: 'rgba(255,255,255,0.04)',
    portfolioCard: '#FFFFFF',
    portfolioTextPrimary: '#000000',
    portfolioTextSecondary: '#666666',
    portfolioPositive: '#00FF9D',
    textPrimary: '#FFFFFF',
    textSecondary: '#A0A0A0',
    positive: '#00FF9D',
    negative: '#FF4D4D',
    accentFrom: '#9D4DFF',
    accentTo: '#6A00FF',
    accentGlow: 'rgba(157,77,255,0.45)',
    chip: 'rgba(255,255,255,0.06)',
    border: 'rgba(255,255,255,0.08)',
    // New comprehensive colors
    buy: '#00FF9D',
    sell: '#FF4D4D',
    purple: '#9D4DFF',
    blue: '#00CFFF',
    orange: '#FF8C00',
    green: '#00FF9D',
    red: '#FF4D4D',
    chartGlow: 'rgba(0,255,157,0.3)',
    neonGreen: '#00FF9D',
    neonRed: '#FF4D4D',
    neonPurple: '#9D4DFF',
    neonBlue: '#00CFFF',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
  borderRadius: {
    xs: 8,
    md: 14,
    lg: 20,
    xl: 24,
    xxl: 28,
  },
  typography: {
    displayXL: {
      fontSize: 36,
      fontWeight: '700',
      letterSpacing: -0.8,
    },
    title: {
      fontSize: 22,
      fontWeight: '600',
      letterSpacing: -0.4,
    },
    body: {
      fontSize: 16,
      fontWeight: '400',
      letterSpacing: -0.2,
    },
    caption: {
      fontSize: 14,
      fontWeight: '500',
      letterSpacing: -0.1,
    },
  },
  shadows: {
    soft: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.32,
      shadowRadius: 32,
      elevation: 12,
    },
    glow: {
      shadowColor: '#9C4DFF',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.6,
      shadowRadius: 20,
      elevation: 16,
    },
  },
};

export const lightTheme: ThemeTokens = {
  colors: {
    bg: '#FFFFFF',
    surface: '#F6F7FB',
    elevated: '#FFFFFF',
    card: '#FFFFFF',
    portfolioCard: '#000000',
    portfolioTextPrimary: '#FFFFFF',
    portfolioTextSecondary: '#CCCCCC',
    portfolioPositive: '#24D07D',
    textPrimary: '#0F1020',
    textSecondary: '#5B5C6B',
    positive: '#14B87A',
    negative: '#E04848',
    accentFrom: '#8E57FF',
    accentTo: '#5E17FF',
    accentGlow: 'rgba(110,53,255,0.35)',
    chip: '#F1EEFF',
    border: '#ECECF4',
    // New comprehensive colors
    buy: '#14B87A',
    sell: '#E04848',
    purple: '#8E57FF',
    blue: '#00CFFF',
    orange: '#FF8C00',
    green: '#14B87A',
    red: '#E04848',
    chartGlow: 'rgba(20,184,122,0.3)',
    neonGreen: '#14B87A',
    neonRed: '#E04848',
    neonPurple: '#8E57FF',
    neonBlue: '#00CFFF',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
  borderRadius: {
    xs: 8,
    md: 14,
    lg: 20,
    xl: 24,
    xxl: 28,
  },
  typography: {
    displayXL: {
      fontSize: 36,
      fontWeight: '700',
      letterSpacing: -0.8,
    },
    title: {
      fontSize: 22,
      fontWeight: '600',
      letterSpacing: -0.4,
    },
    body: {
      fontSize: 16,
      fontWeight: '400',
      letterSpacing: -0.2,
    },
    caption: {
      fontSize: 14,
      fontWeight: '500',
      letterSpacing: -0.1,
    },
  },
  shadows: {
    soft: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.08,
      shadowRadius: 32,
      elevation: 12,
    },
    glow: {
      shadowColor: '#8E57FF',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 16,
    },
  },
};

export const brandPalettes = {
  BTC: { from: '#F7931A', to: '#D97A00' },
  ETH: { from: '#627EEA', to: '#3B5BD6' },
  SOL: { from: '#14F195', to: '#9945FF' },
  ADA: { from: '#0033AD', to: '#1450FF' },
  XRP: { from: '#25A768', to: '#0F8F56' },
  DOT: { from: '#E6007A', to: '#B3005F' },
  MATIC: { from: '#8247E5', to: '#5B2DBB' },
  AVAX: { from: '#E84142', to: '#C12F30' },
  DOGE: { from: '#C2A633', to: '#9E8725' },
  TRX: { from: '#EF0027', to: '#B6001D' },
  LTC: { from: '#B5B5B5', to: '#8E8E8E' },
  LINK: { from: '#2A5ADA', to: '#1741AA' },
  APT: { from: '#00D1A0', to: '#00A077' },
};
