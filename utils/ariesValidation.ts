/**
 * Aries Lending Validation Utilities
 * 
 * Validates supply, borrow, repay, and withdraw operations
 * Checks health factor, collateral limits, and protocol constraints
 */

import type { AriesReserve, UserPortfolio } from '../types/aries';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
}

// ============================================================================
// SUPPLY VALIDATION
// ============================================================================

export function validateSupply(
  reserve: AriesReserve,
  amount: number,
  userBalance: number
): ValidationResult {
  // Check if amount is positive
  if (amount <= 0) {
    return {
      isValid: false,
      error: 'Amount must be greater than 0',
    };
  }

  // Check if user has sufficient balance
  if (amount > userBalance) {
    return {
      isValid: false,
      error: `Insufficient balance. You have ${userBalance.toFixed(6)} ${reserve.symbol}`,
    };
  }

  // Check deposit limit (if set)
  const depositLimit = parseFloat(reserve.reserveConfig.depositLimit);
  if (depositLimit > 0) {
    const currentTotalSupply = parseFloat(reserve.totalCashAvailable) + parseFloat(reserve.totalBorrowed);
    const amountInBaseUnits = amount * Math.pow(10, reserve.decimals);
    
    if (currentTotalSupply + amountInBaseUnits > depositLimit) {
      return {
        isValid: false,
        error: 'Deposit would exceed protocol limit for this asset',
      };
    }
  }

  // Minimum supply amount (0.001 of asset)
  const minSupply = 0.001;
  if (amount < minSupply) {
    return {
      isValid: false,
      error: `Minimum supply amount is ${minSupply} ${reserve.symbol}`,
    };
  }

  return { isValid: true };
}

// ============================================================================
// BORROW VALIDATION
// ============================================================================

export function validateBorrow(
  reserve: AriesReserve,
  amount: number,
  userPortfolio: UserPortfolio | null
): ValidationResult {
  // Check if amount is positive
  if (amount <= 0) {
    return {
      isValid: false,
      error: 'Amount must be greater than 0',
    };
  }

  // Check if user has supplied collateral
  if (!userPortfolio || userPortfolio.totalSuppliedUSD === 0) {
    return {
      isValid: false,
      error: 'You must supply collateral before borrowing',
    };
  }

  // Check available liquidity
  const availableLiquidity = parseFloat(reserve.totalCashAvailable) / Math.pow(10, reserve.decimals);
  if (amount > availableLiquidity) {
    return {
      isValid: false,
      error: `Insufficient liquidity. Only ${availableLiquidity.toFixed(6)} ${reserve.symbol} available`,
    };
  }

  // Calculate borrowing power
  const loanToValue = reserve.reserveConfig.loanToValue / 10000; // Convert from bips
  const maxBorrowValue = userPortfolio.totalSuppliedUSD * loanToValue;
  const currentBorrowValue = userPortfolio.totalBorrowedUSD;
  const availableBorrowPower = maxBorrowValue - currentBorrowValue;

  const borrowAmountUSD = amount * (reserve.priceUSD || 0);

  if (borrowAmountUSD > availableBorrowPower) {
    return {
      isValid: false,
      error: `Insufficient borrowing power. Max: $${availableBorrowPower.toFixed(2)}`,
    };
  }

  // Check borrow limit (if set)
  const borrowLimit = parseFloat(reserve.reserveConfig.borrowLimit);
  if (borrowLimit > 0) {
    const currentTotalBorrowed = parseFloat(reserve.totalBorrowed);
    const amountInBaseUnits = amount * Math.pow(10, reserve.decimals);
    
    if (currentTotalBorrowed + amountInBaseUnits > borrowLimit) {
      return {
        isValid: false,
        error: 'Borrow would exceed protocol limit for this asset',
      };
    }
  }

  // Minimum borrow amount (0.001 of asset)
  const minBorrow = 0.001;
  if (amount < minBorrow) {
    return {
      isValid: false,
      error: `Minimum borrow amount is ${minBorrow} ${reserve.symbol}`,
    };
  }

  // Check health factor after borrow
  const newBorrowValue = currentBorrowValue + borrowAmountUSD;
  const liquidationThreshold = reserve.reserveConfig.liquidationThreshold / 10000;
  const totalCollateralValue = userPortfolio.totalSuppliedUSD * liquidationThreshold;
  const newHealthFactor = newBorrowValue > 0 ? totalCollateralValue / newBorrowValue : Infinity;

  if (newHealthFactor < 1.1) {
    return {
      isValid: false,
      error: `Health factor too low (${newHealthFactor.toFixed(2)}). Risk of liquidation!`,
    };
  }

  if (newHealthFactor < 1.5) {
    return {
      isValid: true,
      warning: `Health factor will be ${newHealthFactor.toFixed(2)}. Consider borrowing less.`,
    };
  }

  return { isValid: true };
}

// ============================================================================
// REPAY VALIDATION
// ============================================================================

export function validateRepay(
  reserve: AriesReserve,
  amount: number,
  userBalance: number,
  borrowedAmount: number
): ValidationResult {
  // Check if amount is positive
  if (amount <= 0) {
    return {
      isValid: false,
      error: 'Amount must be greater than 0',
    };
  }

  // Check if user has borrowed this asset
  if (borrowedAmount === 0) {
    return {
      isValid: false,
      error: `You don't have any ${reserve.symbol} borrowed`,
    };
  }

  // Check if user has sufficient balance to repay
  if (amount > userBalance) {
    return {
      isValid: false,
      error: `Insufficient balance. You have ${userBalance.toFixed(6)} ${reserve.symbol}`,
    };
  }

  // Check if repay amount exceeds borrowed amount
  if (amount > borrowedAmount) {
    return {
      isValid: true,
      warning: `Repay amount exceeds borrowed amount. Will repay ${borrowedAmount.toFixed(6)} ${reserve.symbol}`,
    };
  }

  return { isValid: true };
}

// ============================================================================
// WITHDRAW VALIDATION
// ============================================================================

export function validateWithdraw(
  reserve: AriesReserve,
  amount: number,
  suppliedAmount: number,
  userPortfolio: UserPortfolio | null
): ValidationResult {
  // Check if amount is positive
  if (amount <= 0) {
    return {
      isValid: false,
      error: 'Amount must be greater than 0',
    };
  }

  // Check if user has supplied this asset
  if (suppliedAmount === 0) {
    return {
      isValid: false,
      error: `You don't have any ${reserve.symbol} supplied`,
    };
  }

  // Check if withdraw amount exceeds supplied amount
  if (amount > suppliedAmount) {
    return {
      isValid: false,
      error: `Insufficient supply. You have ${suppliedAmount.toFixed(6)} ${reserve.symbol} supplied`,
    };
  }

  // If user has borrows, check health factor after withdrawal
  if (userPortfolio && userPortfolio.totalBorrowedUSD > 0) {
    const withdrawAmountUSD = amount * (reserve.priceUSD || 0);
    const newSupplyValue = userPortfolio.totalSuppliedUSD - withdrawAmountUSD;
    const borrowValue = userPortfolio.totalBorrowedUSD;
    
    const liquidationThreshold = reserve.reserveConfig.liquidationThreshold / 10000;
    const newCollateralValue = newSupplyValue * liquidationThreshold;
    const newHealthFactor = borrowValue > 0 ? newCollateralValue / borrowValue : Infinity;

    if (newHealthFactor < 1.0) {
      return {
        isValid: false,
        error: `Cannot withdraw. Health factor would drop to ${newHealthFactor.toFixed(2)} (below 1.0)`,
      };
    }

    if (newHealthFactor < 1.2) {
      return {
        isValid: false,
        error: `Health factor too low (${newHealthFactor.toFixed(2)}). Risk of liquidation!`,
      };
    }

    if (newHealthFactor < 1.5) {
      return {
        isValid: true,
        warning: `Health factor will be ${newHealthFactor.toFixed(2)}. Consider withdrawing less.`,
      };
    }
  }

  return { isValid: true };
}

// ============================================================================
// HEALTH FACTOR UTILITIES
// ============================================================================

export function calculateProjectedHealthFactor(
  userPortfolio: UserPortfolio,
  supplyChange: number, // in USD (positive = add, negative = remove)
  borrowChange: number  // in USD (positive = add, negative = remove)
): number {
  const newSupplyValue = userPortfolio.totalSuppliedUSD + supplyChange;
  const newBorrowValue = userPortfolio.totalBorrowedUSD + borrowChange;

  if (newBorrowValue === 0) return Infinity;

  // Assume average liquidation threshold of 80%
  const avgLiquidationThreshold = 0.8;
  const newCollateralValue = newSupplyValue * avgLiquidationThreshold;

  return newCollateralValue / newBorrowValue;
}

export function getHealthFactorStatus(healthFactor: number): {
  status: 'safe' | 'warning' | 'danger';
  color: string;
  label: string;
} {
  if (healthFactor >= 2.0) {
    return {
      status: 'safe',
      color: '#10b981', // green
      label: 'Safe',
    };
  }

  if (healthFactor >= 1.5) {
    return {
      status: 'safe',
      color: '#10b981',
      label: 'Moderate',
    };
  }

  if (healthFactor >= 1.2) {
    return {
      status: 'warning',
      color: '#f59e0b', // orange
      label: 'Caution',
    };
  }

  return {
    status: 'danger',
    color: '#ef4444', // red
    label: 'High Risk',
  };
}

// ============================================================================
// FORMAT UTILITIES
// ============================================================================

export function formatAmount(amount: number, decimals: number = 6): string {
  if (amount === 0) return '0';
  if (amount < 0.000001) return '<0.000001';
  return amount.toFixed(decimals);
}

export function parseAmount(input: string, decimals: number): string {
  const value = parseFloat(input);
  if (isNaN(value) || value <= 0) return '0';
  
  // Convert to base units (e.g., 1 APT = 100000000 octas)
  const baseUnits = Math.floor(value * Math.pow(10, decimals));
  return baseUnits.toString();
}
