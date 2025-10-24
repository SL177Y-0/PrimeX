/**
 * Aries Transaction Service
 * Handles profile management, portfolio fetching, and transaction building
 * For reserve data, use ariesSDKService instead
 */

import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { getClient } from '@aries-markets/api';
import { UserPortfolio } from '../types/ariesComplete';
import { getAssetByCoinType } from '../config/ariesAssetsComplete';

const APTOS_NODE_URL = process.env.EXPO_PUBLIC_APTOS_NODE_URL || 'https://aptos-mainnet.nodereal.io/v1/dbe3294d24374cad9d0886ca12d0aeb7/v1';
const ARIES_API_URL = process.env.EXPO_PUBLIC_PROXY_BASE_URL 
  ? `${process.env.EXPO_PUBLIC_PROXY_BASE_URL}/api/aries-trpc`
  : 'http://localhost:3001/api/aries-trpc';
const CONTRACT_ADDRESS = '0x9770fa9c725cbd97eb50b2be5f7416efdfd1f1554beb0750d4dae4c64e860da3';

class AriesTransactionService {
  private apiClient: ReturnType<typeof getClient>;
  private aptosClient: Aptos;
  private fetchPromises: Map<string, Promise<any>> = new Map();

  constructor() {
    this.apiClient = getClient(ARIES_API_URL);
    
    const aptosConfig = new AptosConfig({
      network: Network.MAINNET,
      fullnode: APTOS_NODE_URL,
    });
    this.aptosClient = new Aptos(aptosConfig);
    
    console.log('[AriesTransactionService] Initialized');
  }

  /**
   * Check if user has Aries profile
   */
  async hasProfile(address: string, profileName: string = 'Main Account'): Promise<boolean> {
    try {
      const promiseKey = `hasProfile:${address}`;
      if (this.fetchPromises.has(promiseKey)) {
        return this.fetchPromises.get(promiseKey)!;
      }
      
      const checkPromise = (async () => {
        const userProfile = await this.apiClient.profile.find.query({
          owner: address,
        });
        
        if (!userProfile || !userProfile.profiles) {
          return false;
        }

        return Object.keys(userProfile.profiles).length > 0;
      })();
      
      this.fetchPromises.set(promiseKey, checkPromise);
      checkPromise.finally(() => {
        this.fetchPromises.delete(promiseKey);
      });
      
      return checkPromise;
    } catch (error: any) {
      console.log('[AriesTransactionService] Profile check error:', error.message);
      return false;
    }
  }

  /**
   * Fetch user portfolio from API
   */
  async fetchUserPortfolio(address: string, profileName: string = 'Main Account'): Promise<UserPortfolio | null> {
    try {
      console.log(`[AriesTransactionService] Fetching portfolio for ${address}...`);

      const userProfile: any = await this.apiClient.profile.find.query({
        owner: address,
      });

      if (!userProfile || !userProfile.profiles || Object.keys(userProfile.profiles).length === 0) {
        console.log('[AriesTransactionService] No portfolio data');
        return null;
      }

      const profileKey = Object.keys(userProfile.profiles)[0];
      const profile: any = userProfile.profiles[profileKey];

      // Parse deposits
      const deposits = Object.entries(profile.deposits || {}).map(([coinType, deposit]: [string, any]) => {
        const asset = getAssetByCoinType(coinType);
        const decimals = asset?.decimals || 8;
        const collateralAmount = deposit.collateral_coins || 0;
        const collateralAmountDisplay = collateralAmount / (10 ** decimals);
        const priceUSD = deposit.collateral_value > 0 && collateralAmount > 0 
          ? deposit.collateral_value / collateralAmountDisplay 
          : 0;
        
        return {
          coinType,
          symbol: asset?.symbol || 'UNKNOWN',
          decimals,
          lpAmount: String(deposit.collateral_amount || collateralAmount),
          underlyingAmount: String(collateralAmount),
          lpAmountDisplay: collateralAmountDisplay,
          underlyingAmountDisplay: collateralAmountDisplay,
          priceUSD,
          valueUSD: deposit.collateral_value || 0,
          loanToValue: asset?.loanToValue || 0,
          liquidationThreshold: asset?.liquidationThreshold || 0,
          isCollateral: true,
          currentAPR: 0.05,
          earnedInterestDisplay: 0,
        };
      });

      // Parse borrows
      const borrows = Object.entries(profile.borrows || {}).map(([coinType, borrow]: [string, any]) => {
        const asset = getAssetByCoinType(coinType);
        const decimals = asset?.decimals || 8;
        const borrowedAmount = borrow.borrowed_coins || 0;
        const borrowedAmountDisplay = borrowedAmount / (10 ** decimals);
        const priceUSD = borrow.borrowed_value > 0 && borrowedAmount > 0
          ? borrow.borrowed_value / borrowedAmountDisplay
          : 0;

        return {
          coinType,
          symbol: asset?.symbol || 'UNKNOWN',
          decimals,
          borrowedAmount: String(borrowedAmount),
          borrowShare: String(borrow.borrowed_share || borrowedAmount),
          borrowedAmountDisplay,
          priceUSD,
          valueUSD: borrow.borrowed_value || 0,
          borrowFactor: asset?.borrowFactor || 1.0,
          currentAPR: 0.08,
          accruedInterestDisplay: 0,
        };
      });

      const totalSuppliedUSD = deposits.reduce((sum, d) => sum + d.valueUSD, 0);
      const totalBorrowedUSD = borrows.reduce((sum, b) => sum + b.valueUSD, 0);
      const netBalanceUSD = totalSuppliedUSD - totalBorrowedUSD;

      const collateralValue = profile.collateralValue || 0;
      const loanValue = profile.loanValue || 0;
      const healthFactor = loanValue > 0 ? collateralValue / loanValue : Infinity;

      const portfolio: UserPortfolio = {
        userAddress: address,
        profileName: profile.profileName || 'Main Account',
        poolType: 'paired',
        deposits,
        borrows,
        totalSuppliedUSD,
        totalBorrowedUSD,
        netBalanceUSD,
        netAPR: 0,
        riskMetrics: {
          healthFactor,
          totalCollateralValueUSD: collateralValue,
          totalBorrowValueUSD: loanValue,
          borrowCapacityUSD: collateralValue,
          borrowCapacityUsed: loanValue > 0 ? (loanValue / collateralValue) : 0,
          currentLTV: loanValue > 0 ? (loanValue / totalSuppliedUSD) : 0,
          liquidationLTV: 0.85,
          statusColor: healthFactor > 1.5 ? '#00FF00' : healthFactor > 1.2 ? '#FFA500' : '#FF0000',
          weightedCollateralUSD: collateralValue,
          adjustedBorrowUSD: loanValue,
          status: healthFactor > 1.5 ? 'safe' : healthFactor > 1.0 ? 'warning' : 'danger',
        },
        rewards: [],
        totalRewardsUSD: 0,
        emodeEnabled: false,
      };

      console.log(`[AriesTransactionService] ✅ Portfolio loaded`);
      return portfolio;
    } catch (error) {
      console.error('[AriesTransactionService] Error fetching portfolio:', error);
      return null;
    }
  }

  /**
   * Build transaction payloads
   */
  buildInitializeProfileTransaction(profileName: string = 'Main Account', referrer?: string) {
    return {
      function: `${CONTRACT_ADDRESS}::controller::register_user` as `${string}::${string}::${string}`,
      typeArguments: [],
      functionArguments: referrer ? [profileName, referrer] : [profileName],
    };
  }

  buildSupplyTransaction(coinType: string, amount: string, profileName: string = 'Main Account') {
    return {
      function: `${CONTRACT_ADDRESS}::controller::deposit` as `${string}::${string}::${string}`,
      typeArguments: [coinType],
      functionArguments: [profileName, amount, false],
    };
  }

  buildBorrowTransaction(coinType: string, amount: string, profileName: string = 'Main Account') {
    return {
      function: `${CONTRACT_ADDRESS}::controller::borrow` as `${string}::${string}::${string}`,
      typeArguments: [coinType],
      functionArguments: [profileName, amount],
    };
  }

  buildWithdrawTransaction(coinType: string, amount: string, profileName: string = 'Main Account') {
    return {
      function: `${CONTRACT_ADDRESS}::controller::withdraw` as `${string}::${string}::${string}`,
      typeArguments: [coinType],
      functionArguments: [profileName, amount, false],
    };
  }

  buildRepayTransaction(coinType: string, amount: string, profileName: string = 'Main Account') {
    return {
      function: `${CONTRACT_ADDRESS}::controller::repay` as `${string}::${string}::${string}`,
      typeArguments: [coinType],
      functionArguments: [profileName, amount],
    };
  }
}

// Export singleton instance
export const ariesTransactionService = new AriesTransactionService();
// Legacy export for backward compatibility
export const ariesSDKService = ariesTransactionService;
export default ariesTransactionService;
