// Utility functions for extracting colors from token images

export interface TokenColors {
  primaryColor: string;
  secondaryColor: string;
}

// Predefined color palettes for popular tokens based on their branding
export const TOKEN_COLOR_PALETTES: Record<string, TokenColors> = {
  // Solana ecosystem tokens
  SOL: {
    primaryColor: '#9945FF',
    secondaryColor: '#14F195',
  },
  BONK: {
    primaryColor: '#FF6B35',
    secondaryColor: '#F7931E',
  },
  JUP: {
    primaryColor: '#C7F284',
    secondaryColor: '#00D4AA',
  },
  RAY: {
    primaryColor: '#C200FB',
    secondaryColor: '#3772FF',
  },
  PYTH: {
    primaryColor: '#7C3AED',
    secondaryColor: '#A855F7',
  },
  DRIFT: {
    primaryColor: '#00D4AA',
    secondaryColor: '#0EA5E9',
  },
  ORCA: {
    primaryColor: '#FFD23F',
    secondaryColor: '#FF6B35',
  },
  MNDE: {
    primaryColor: '#4F46E5',
    secondaryColor: '#7C3AED',
  },
  MNGO: {
    primaryColor: '#FF6B35',
    secondaryColor: '#F59E0B',
  },
  SRM: {
    primaryColor: '#00D4AA',
    secondaryColor: '#0EA5E9',
  },
  SLND: {
    primaryColor: '#8B5CF6',
    secondaryColor: '#A855F7',
  },
  // Additional tokens
  PHANTOM: {
    primaryColor: '#AB9FF2',
    secondaryColor: '#7C3AED',
  },
  ATLAS: {
    primaryColor: '#00D4AA',
    secondaryColor: '#0EA5E9',
  },
};

// Function to get colors for a token symbol
export function getTokenColors(symbol: string): TokenColors {
  const upperSymbol = symbol.toUpperCase();
  return TOKEN_COLOR_PALETTES[upperSymbol] || {
    primaryColor: '#6366F1',
    secondaryColor: '#8B5CF6',
  };
}

// Function to generate gradient colors based on a base color
export function generateGradientColors(baseColor: string): TokenColors {
  // This is a simplified version - in a real app you might use a color manipulation library
  return {
    primaryColor: baseColor,
    secondaryColor: adjustColorBrightness(baseColor, -20),
  };
}

// Helper function to adjust color brightness
function adjustColorBrightness(hex: string, percent: number): string {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Parse RGB values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Adjust brightness
  const newR = Math.max(0, Math.min(255, r + (r * percent / 100)));
  const newG = Math.max(0, Math.min(255, g + (g * percent / 100)));
  const newB = Math.max(0, Math.min(255, b + (b * percent / 100)));
  
  // Convert back to hex
  return `#${Math.round(newR).toString(16).padStart(2, '0')}${Math.round(newG).toString(16).padStart(2, '0')}${Math.round(newB).toString(16).padStart(2, '0')}`;
}