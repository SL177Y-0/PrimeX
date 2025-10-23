/**
 * Aries Markets E-Mode (Efficiency Mode) Utilities
 * Handles E-Mode detection, category management, and enhanced LTV calculations
 */

export interface EModeCategory {
  categoryId: number;
  name: string;
  description: string;
  maxLTV: number; // Enhanced LTV for E-Mode (%)
  liquidationThreshold: number; // Enhanced threshold (%)
  liquidationPenalty: number; // E-Mode specific penalty (%)
  eligibleAssets: string[]; // Coin types eligible for this E-Mode
}

// E-Mode categories based on official Aries Markets platform
export const EMODE_CATEGORIES: Record<string, EModeCategory> = {
  APTOS_ECOSYSTEM: {
    categoryId: 1,
    name: 'Aptos Ecosystem',
    description: 'Correlated Aptos assets (APT, stAPT, amAPT)',
    maxLTV: 90, // 90% LTV in E-Mode
    liquidationThreshold: 95, // 95% liquidation threshold
    liquidationPenalty: 2, // 2% penalty
    eligibleAssets: [
      '0x1::aptos_coin::AptosCoin', // APT
      '0xd11107bdf0d6d7040c6c0bfbdecb6545191fdf13e8d8d259952f53e1713f61b5::staked_coin::StakedAptos', // stAPT
      '0x111ae3e5bc816a5e63c2da97d0aa3886519e0cd5e4b046659fa35796bd11542a::stapt_token::StakedApt', // amAPT
    ],
  },
  STABLECOINS: {
    categoryId: 2,
    name: 'Stablecoins',
    description: 'USD-pegged stablecoins (USDT, USDC, USDY)',
    maxLTV: 80, // 80% LTV in E-Mode
    liquidationThreshold: 85, // 85% liquidation threshold
    liquidationPenalty: 4, // 4% penalty
    eligibleAssets: [
      '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC', // USDC
      '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDT', // USDT
      '0x960ab9e2c6e8f8d2e0d5c1e5c5e5c5e5c5e5c5e5c5e5c5e5c5e5c5e5c5e5c5e5::usdy::USDY', // USDY (example)
    ],
  },
};

/**
 * Check if an asset is eligible for any E-Mode category
 */
export function isEModeEligible(coinType: string): boolean {
  return Object.values(EMODE_CATEGORIES).some(category =>
    category.eligibleAssets.includes(coinType)
  );
}

/**
 * Get E-Mode category for a specific asset
 */
export function getEModeCategory(coinType: string): EModeCategory | null {
  for (const category of Object.values(EMODE_CATEGORIES)) {
    if (category.eligibleAssets.includes(coinType)) {
      return category;
    }
  }
  return null;
}

/**
 * Get E-Mode category by ID
 */
export function getEModeCategoryById(categoryId: number): EModeCategory | null {
  return Object.values(EMODE_CATEGORIES).find(cat => cat.categoryId === categoryId) || null;
}

/**
 * Check if user can enter E-Mode for a category
 * User can enter E-Mode if all their deposits are in the same category
 */
export function canEnterEMode(
  userDeposits: string[], // Array of coin types
  categoryId: number
): { canEnter: boolean; reason?: string } {
  const category = getEModeCategoryById(categoryId);
  
  if (!category) {
    return { canEnter: false, reason: 'Invalid E-Mode category' };
  }
  
  // Check if all deposits are eligible for this E-Mode
  const ineligibleAssets = userDeposits.filter(
    coinType => !category.eligibleAssets.includes(coinType)
  );
  
  if (ineligibleAssets.length > 0) {
    return {
      canEnter: false,
      reason: `Some assets are not eligible for ${category.name} E-Mode`,
    };
  }
  
  return { canEnter: true };
}

/**
 * Calculate enhanced borrowing power in E-Mode
 */
export function calculateEModeBorrowingPower(
  deposits: Array<{ coinType: string; amountUSD: number }>,
  emodeCategory: EModeCategory
): number {
  return deposits.reduce((total, deposit) => {
    // Check if asset is eligible for this E-Mode
    if (emodeCategory.eligibleAssets.includes(deposit.coinType)) {
      return total + (deposit.amountUSD * emodeCategory.maxLTV / 100);
    }
    return total;
  }, 0);
}

/**
 * Calculate enhanced liquidation value in E-Mode
 */
export function calculateEModeLiquidationValue(
  deposits: Array<{ coinType: string; amountUSD: number }>,
  emodeCategory: EModeCategory
): number {
  return deposits.reduce((total, deposit) => {
    if (emodeCategory.eligibleAssets.includes(deposit.coinType)) {
      return total + (deposit.amountUSD * emodeCategory.liquidationThreshold / 100);
    }
    return total;
  }, 0);
}

/**
 * Compare borrowing power: Normal vs E-Mode
 */
export function compareNormalVsEMode(
  deposits: Array<{ coinType: string; amountUSD: number; normalLTV: number }>,
  emodeCategory: EModeCategory
): {
  normalBorrowingPower: number;
  emodeBorrowingPower: number;
  improvement: number;
  improvementPercentage: number;
} {
  const normalBorrowingPower = deposits.reduce((total, deposit) => {
    return total + (deposit.amountUSD * deposit.normalLTV / 100);
  }, 0);
  
  const emodeBorrowingPower = calculateEModeBorrowingPower(deposits, emodeCategory);
  
  const improvement = emodeBorrowingPower - normalBorrowingPower;
  const improvementPercentage = normalBorrowingPower > 0
    ? (improvement / normalBorrowingPower) * 100
    : 0;
  
  return {
    normalBorrowingPower,
    emodeBorrowingPower,
    improvement,
    improvementPercentage,
  };
}

/**
 * Get available E-Mode categories for user's deposits
 */
export function getAvailableEModeCategories(
  userDeposits: string[]
): EModeCategory[] {
  return Object.values(EMODE_CATEGORIES).filter(category => {
    const eligibilityCheck = canEnterEMode(userDeposits, category.categoryId);
    return eligibilityCheck.canEnter;
  });
}

/**
 * Check if assets are in E-Mode restricted list
 * In E-Mode, only assets from the same category can be borrowed
 */
export function canBorrowInEMode(
  borrowCoinType: string,
  emodeCategory: EModeCategory
): boolean {
  return emodeCategory.eligibleAssets.includes(borrowCoinType);
}

/**
 * Get borrowable assets in E-Mode
 */
export function getBorrowableAssetsInEMode(
  emodeCategory: EModeCategory,
  allAssets: string[]
): string[] {
  return allAssets.filter(asset => emodeCategory.eligibleAssets.includes(asset));
}

/**
 * Calculate E-Mode benefit summary
 */
export interface EModeBenefit {
  categoryName: string;
  ltvIncrease: number; // Percentage point increase
  thresholdIncrease: number;
  additionalBorrowingPower: number; // USD value
  riskLevel: 'lower' | 'same' | 'higher';
  recommendation: string;
}

export function calculateEModeBenefit(
  deposits: Array<{ coinType: string; amountUSD: number; normalLTV: number; normalThreshold: number }>,
  emodeCategory: EModeCategory
): EModeBenefit {
  const comparison = compareNormalVsEMode(deposits, emodeCategory);
  
  // Calculate average LTV increase
  const avgNormalLTV = deposits.reduce((sum, d) => sum + d.normalLTV, 0) / deposits.length;
  const ltvIncrease = emodeCategory.maxLTV - avgNormalLTV;
  
  const avgNormalThreshold = deposits.reduce((sum, d) => sum + d.normalThreshold, 0) / deposits.length;
  const thresholdIncrease = emodeCategory.liquidationThreshold - avgNormalThreshold;
  
  // Determine risk level
  let riskLevel: 'lower' | 'same' | 'higher' = 'same';
  if (emodeCategory.liquidationPenalty < 5) {
    riskLevel = 'lower'; // Lower penalty = lower risk
  } else if (emodeCategory.liquidationPenalty > 5) {
    riskLevel = 'higher';
  }
  
  // Generate recommendation
  let recommendation = '';
  if (comparison.improvementPercentage > 20) {
    recommendation = 'Highly recommended - significant borrowing power increase';
  } else if (comparison.improvementPercentage > 10) {
    recommendation = 'Recommended - moderate borrowing power increase';
  } else {
    recommendation = 'Optional - minor benefit';
  }
  
  return {
    categoryName: emodeCategory.name,
    ltvIncrease,
    thresholdIncrease,
    additionalBorrowingPower: comparison.improvement,
    riskLevel,
    recommendation,
  };
}

/**
 * Format E-Mode category for display
 */
export function formatEModeCategory(category: EModeCategory): string {
  return `${category.name} (${category.maxLTV}% LTV)`;
}

/**
 * Get E-Mode status color
 */
export function getEModeStatusColor(isActive: boolean): 'success' | 'neutral' {
  return isActive ? 'success' : 'neutral';
}

/**
 * Validate E-Mode transition
 * Check if user can safely switch to/from E-Mode
 */
export function validateEModeTransition(
  currentHealthFactor: number,
  targetHealthFactor: number,
  minSafeHealthFactor: number = 1.5
): { isValid: boolean; warning?: string } {
  if (targetHealthFactor < minSafeHealthFactor) {
    return {
      isValid: false,
      warning: `Health factor would drop to ${targetHealthFactor.toFixed(2)}. Minimum safe level is ${minSafeHealthFactor}`,
    };
  }
  
  if (targetHealthFactor < currentHealthFactor * 0.8) {
    return {
      isValid: true,
      warning: 'Health factor will decrease significantly. Proceed with caution.',
    };
  }
  
  return { isValid: true };
}

export default {
  EMODE_CATEGORIES,
  isEModeEligible,
  getEModeCategory,
  getEModeCategoryById,
  canEnterEMode,
  calculateEModeBorrowingPower,
  calculateEModeLiquidationValue,
  compareNormalVsEMode,
  getAvailableEModeCategories,
  canBorrowInEMode,
  getBorrowableAssetsInEMode,
  calculateEModeBenefit,
  formatEModeCategory,
  getEModeStatusColor,
  validateEModeTransition,
};
