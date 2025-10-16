/**
 * Amnis Liquid Staking Service
 * 
 * Handles all interactions with Amnis Finance protocol on Aptos mainnet
 * Implements dual-token system: amAPT (liquid) and stAPT (auto-compounding)
 * 
 * @see https://amnis.finance
 * @see https://docs.amnis.finance
 */

import { AMNIS_CONFIG, APTOS_CONFIG } from '../config/constants';
import { log } from '../utils/logger';
import { aptosClient } from '../utils/aptosClient'; // Unified Aptos client

// Amnis Finance is MAINNET ONLY - no testnet deployment!
console.log('[AmnisService] Using shared aptosClient (mainnet)');

// ============================================================================
// Type Definitions
// ============================================================================

export interface StakingBalance {
  apt: string;
  amAPT: string;
  stAPT: string;
}

export interface StakingStats {
  totalAptStaked: string;
  amAptSupply: string;
  stAptSupply: string;
  amAptExchangeRate: number;
  stAptExchangeRate: number;
  estimatedAmAptAPR: number;
  estimatedStAptAPR: number;
}

export interface UnstakeRequest {
  id: string;
  amount: string;
  requestTime: number;
  unlockTime: number;
  canClaim: boolean;
}

export interface StakingTransaction {
  function: string;
  type_arguments: string[];
  arguments: (string | number | boolean)[];
}

// ============================================================================
// Balance Query Functions
// ============================================================================

/**
 * Get user's token balances for APT, amAPT, and stAPT
 */
export async function getUserBalances(
  userAddress: string
): Promise<StakingBalance> {
  try {
    // Normalize address (ensure proper format)
    const normalizedAddress = userAddress.startsWith('0x') ? userAddress : `0x${userAddress}`;
    console.log(`[AmnisService] Fetching balances for: ${normalizedAddress}`);
    
    const [aptBalance, amAptBalance, stAptBalance] = await Promise.all([
      getTokenBalance(normalizedAddress, AMNIS_CONFIG.tokenTypes.APT),
      getTokenBalance(normalizedAddress, AMNIS_CONFIG.tokenTypes.amAPT),
      getTokenBalance(normalizedAddress, AMNIS_CONFIG.tokenTypes.stAPT),
    ]);

    console.log('[AmnisService] Balances fetched:', {
      apt: fromOctas(aptBalance),
      amAPT: fromOctas(amAptBalance),
      stAPT: fromOctas(stAptBalance),
    });

    return {
      apt: aptBalance,
      amAPT: amAptBalance,
      stAPT: stAptBalance,
    };
  } catch (error) {
    console.error('[AmnisService] Error fetching user balances:', error);
    console.error('[AmnisService] User address:', userAddress);
    return {
      apt: '0',
      amAPT: '0',
      stAPT: '0',
    };
  }
}

/**
 * Get token balance for a specific coin type using official SDK methods
 */
async function getTokenBalance(
  accountAddress: string,
  coinType: string
): Promise<string> {
  try {
    console.log(`[AmnisService] Querying ${coinType.split('::').pop()} for ${accountAddress.slice(0, 10)}...`);
    
    // Use official SDK method for APT
    if (coinType === AMNIS_CONFIG.tokenTypes.APT) {
      const aptAmount = await aptosClient.getAccountAPTAmount({
        accountAddress,
      });
      console.log(`[AmnisService] APT balance via SDK: ${aptAmount / 1e8} (${aptAmount} octas)`);
      return aptAmount.toString();
    }
    
    // Use official SDK method for fungible asset balances (amAPT, stAPT)
    try {
      const balances = await aptosClient.getCurrentFungibleAssetBalances({
        options: {
          where: {
            owner_address: { _eq: accountAddress },
          },
        },
      });

      const targetAsset = balances.find((asset) => {
        const assetType = asset.asset_type ?? '';
        return assetType.toLowerCase() === coinType.toLowerCase();
      });

      if (targetAsset?.amount) {
        console.log(
          `[AmnisService] ${coinType.split('::').pop()} balance via SDK: ${Number(targetAsset.amount) / 1e8} (${targetAsset.amount} octas)`
        );
        return targetAsset.amount;
      }
    } catch (sdkError: any) {
      console.log('[AmnisService] Fungible asset balance query failed via SDK:', sdkError?.message || sdkError);
    }

    // Fallback: query CoinStore in case protocol still exposes Coin type
    try {
      const resource = await aptosClient.getAccountResource({
        accountAddress,
        resourceType: `0x1::coin::CoinStore<${coinType}>`,
      });
      const balance = (resource as any).coin?.value || '0';
      console.log(`[AmnisService] ${coinType.split('::').pop()} balance via CoinStore: ${Number(balance) / 1e8} (${balance} octas)`);
      return balance;
    } catch (fallbackError) {
      console.log(`[AmnisService] ${coinType.split('::').pop()} balance = 0 (no resource)`);
      return '0';
    }
  } catch (error: any) {
    // Resource not existing is expected for tokens user hasn't interacted with
    if (error?.status === 404 || error?.message?.includes('Resource not found')) {
      console.log(`[AmnisService] ${coinType.split('::').pop()} balance = 0 (no resource)`);
      return '0';
    }
    
    // If rate limited, return 0 (shared client handles rate limiting)
    if (error?.status === 429) {
      console.warn(`[AmnisService] Rate limit encountered for ${coinType}`);
      return '0';
    }
    
    console.warn(`[AmnisService] Error fetching balance for ${coinType}:`, error?.message || error);
    return '0';
  }
}

// ============================================================================
// Protocol Stats Functions
// ============================================================================

/**
 * Get global staking statistics from Amnis protocol
 */
export async function getStakingStats(): Promise<StakingStats> {
  try {
    // Get total APT staked via delegation manager
    const totalApt = await getTotalAptStaked();
    
    // Get token supplies
    const amAptSupply = await getTokenSupply(AMNIS_CONFIG.tokenTypes.amAPT);
    const stAptSupply = await getTokenSupply(AMNIS_CONFIG.tokenTypes.stAPT);

    // Calculate exchange rates
    const amAptExchangeRate = 1.0; // amAPT is 1:1 with APT
    const stAptExchangeRate = await getStAptExchangeRate();

    return {
      totalAptStaked: totalApt,
      amAptSupply,
      stAptSupply,
      amAptExchangeRate,
      stAptExchangeRate,
      estimatedAmAptAPR: AMNIS_CONFIG.estimatedAPR.amAPT,
      estimatedStAptAPR: AMNIS_CONFIG.estimatedAPR.stAPT,
    };
  } catch (error) {
    console.error('[AmnisService] Error fetching staking stats:', error);
    console.error('[AmnisService] Error details:', error instanceof Error ? error.message : 'Unknown error');
    return {
      totalAptStaked: '0',
      amAptSupply: '0',
      stAptSupply: '0',
      amAptExchangeRate: 1.0,
      stAptExchangeRate: 1.0,
      estimatedAmAptAPR: AMNIS_CONFIG.estimatedAPR.amAPT,
      estimatedStAptAPR: AMNIS_CONFIG.estimatedAPR.stAPT,
    };
  }
}

/**
 * Get total APT staked in protocol via view function
 */
async function getTotalAptStaked(): Promise<string> {
  try {
    const payload = {
      function: `${AMNIS_CONFIG.contractAddress}::${AMNIS_CONFIG.modules.delegationManager}::total_apt` as `${string}::${string}::${string}`,
      functionArguments: [],
      typeArguments: [],
    };

    const result = await aptosClient.view({ payload });
    // Returns [total, active, pending_inactive]
    return result[0]?.toString() || '0';
  } catch (error) {
    console.warn('[AmnisService] Could not fetch total APT staked:', error);
    return '0';
  }
}

/**
 * Get token total supply
 */
async function getTokenSupply(coinType: string): Promise<string> {
  try {
    const payload = {
      function: `${AMNIS_CONFIG.contractAddress}::${AMNIS_CONFIG.modules.amaptToken}::total_supply` as `${string}::${string}::${string}`,
      functionArguments: [],
      typeArguments: [],
    };

    const result = await aptosClient.view({ payload });
    return result[0]?.toString() || '0';
  } catch (error) {
    return '0';
  }
}

/**
 * Get stAPT to amAPT exchange rate
 */
async function getStAptExchangeRate(): Promise<number> {
  try {
    const payload = {
      function: `${AMNIS_CONFIG.contractAddress}::${AMNIS_CONFIG.modules.staptToken}::stapt_price` as `${string}::${string}::${string}`,
      functionArguments: [],
      typeArguments: [],
    };

    const result = await aptosClient.view({ payload });
    const rate = Number(result[0]) / 1e8; // Convert from fixed-point
    return rate > 0 ? rate : 1.0;
  } catch (error) {
    return 1.0;
  }
}

// ============================================================================
// Staking Transaction Builders
// ============================================================================

/**
 * Stake APT to receive amAPT (1:1 ratio)
 * Uses deposit_entry from router.move
 * @param amountInOctas - Amount in APT base units (1 APT = 1e8 octas)
 * @param recipientAddress - Address to receive amAPT
 */
export function buildStakeTransaction(
  amountInOctas: string,
  recipientAddress: string
): StakingTransaction {
  return {
    function: `${AMNIS_CONFIG.contractAddress}::${AMNIS_CONFIG.modules.router}::${AMNIS_CONFIG.functions.depositEntry}`,
    type_arguments: [],
    arguments: [amountInOctas, recipientAddress],
  };
}

/**
 * Stake amAPT to receive stAPT (auto-compounding vault)
 * Uses stake_entry from router.move
 * @param amountInOctas - Amount in amAPT base units
 * @param recipientAddress - Address to receive stAPT
 */
export function buildMintStAptTransaction(
  amountInOctas: string,
  recipientAddress: string
): StakingTransaction {
  return {
    function: `${AMNIS_CONFIG.contractAddress}::${AMNIS_CONFIG.modules.router}::${AMNIS_CONFIG.functions.stakeEntry}`,
    type_arguments: [],
    arguments: [amountInOctas, recipientAddress],
  };
}

/**
 * Redeem stAPT to receive amAPT
 * Uses unstake_entry from router.move
 * @param amountInOctas - Amount in stAPT base units
 * @param recipientAddress - Address to receive amAPT
 */
export function buildRedeemStAptTransaction(
  amountInOctas: string,
  recipientAddress: string
): StakingTransaction {
  return {
    function: `${AMNIS_CONFIG.contractAddress}::${AMNIS_CONFIG.modules.router}::${AMNIS_CONFIG.functions.unstakeEntry}`,
    type_arguments: [],
    arguments: [amountInOctas, recipientAddress],
  };
}

/**
 * Instant unstake stAPT to amAPT (then swap amAPT to APT on DEX)
 * Uses unstake_entry from router.move
 * @param amountInOctas - Amount in stAPT base units
 * @param recipientAddress - Address to receive amAPT
 */
export function buildInstantUnstakeTransaction(
  amountInOctas: string,
  recipientAddress: string
): StakingTransaction {
  // First convert stAPT → amAPT, then user swaps amAPT → APT on DEX
  return {
    function: `${AMNIS_CONFIG.contractAddress}::${AMNIS_CONFIG.modules.router}::${AMNIS_CONFIG.functions.unstakeEntry}`,
    type_arguments: [],
    arguments: [amountInOctas, recipientAddress],
  };
}

/**
 * Request delayed unstake (30-day unbonding, no fee)
 * Uses request_withdrawal_entry from router.move
 * @param amountInOctas - Amount in amAPT base units
 */
export function buildRequestUnstakeTransaction(
  amountInOctas: string
): StakingTransaction {
  return {
    function: `${AMNIS_CONFIG.contractAddress}::${AMNIS_CONFIG.modules.router}::${AMNIS_CONFIG.functions.requestWithdrawEntry}`,
    type_arguments: [],
    arguments: [amountInOctas],
  };
}

/**
 * Claim unstaked APT after unbonding period
 * Uses withdraw_entry from router.move
 * @param requestId - Unstake request identifier
 */
export function buildClaimUnstakeTransaction(
  requestId: string
): StakingTransaction {
  return {
    function: `${AMNIS_CONFIG.contractAddress}::${AMNIS_CONFIG.modules.router}::${AMNIS_CONFIG.functions.claimWithdrawEntry}`,
    type_arguments: [],
    arguments: [requestId],
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert human-readable amount to octas (base units)
 */
export function toOctas(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return Math.floor(num * 1e8).toString();
}

/**
 * Convert octas to human-readable amount
 */
export function fromOctas(octas: string | number): number {
  const num = typeof octas === 'string' ? parseInt(octas, 10) : octas;
  return num / 1e8;
}

/**
 * Calculate expected amAPT from APT stake
 */
export function calculateAmAptOutput(aptAmount: number): number {
  return aptAmount; // 1:1 ratio
}

/**
 * Calculate expected stAPT from amAPT stake
 */
export function calculateStAptOutput(
  amAptAmount: number,
  exchangeRate: number
): number {
  return amAptAmount / exchangeRate;
}

/**
 * Calculate expected amAPT from stAPT redemption
 */
export function calculateAmAptFromStApt(
  stAptAmount: number,
  exchangeRate: number
): number {
  return stAptAmount * exchangeRate;
}

/**
 * Validate staking amount
 */
export function validateStakingAmount(
  amount: number,
  balance: number,
  minAmount: number
): { valid: boolean; error?: string } {
  if (amount <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' };
  }

  if (amount < minAmount) {
    return {
      valid: false,
      error: `Minimum amount is ${minAmount}`,
    };
  }

  if (amount > balance) {
    return { valid: false, error: 'Insufficient balance' };
  }

  return { valid: true };
}

/**
 * Estimate transaction fees (approximate)
 */
export function estimateGasFee(): number {
  // Typical gas fee on Aptos mainnet: ~0.001 APT
  return 0.001;
}

/**
 * Format APR percentage
 */
export function formatAPR(apr: number): string {
  return `${apr.toFixed(2)}%`;
}

/**
 * Get pending unstake requests for user
 */
export async function getPendingUnstakeRequests(
  userAddress: string
): Promise<UnstakeRequest[]> {
  if (!userAddress) {
    return [];
  }

  try {
    const client: any = aptosClient as any;
    if (!client?.getAccountOwnedObjects) {
      log.warn('Aptos client does not expose getAccountOwnedObjects, skipping withdrawal fetch');
      return [];
    }

    const ownedObjects = await client.getAccountOwnedObjects({
      accountAddress: userAddress,
      limit: 200,
      options: {
        showType: true,
        showOwner: false,
        showDisplay: false,
        showData: true,
        showMetadata: false,
      },
    });

    const withdrawalObjects = (ownedObjects || []).filter((owned: any) =>
      owned?.type?.includes('withdrawal::WithdrawalToken')
    );

    return withdrawalObjects.map((owned: any) => {
      const objectAddress: string = owned?.object_address || owned?.guid?.id?.addr || owned?.guid?.id?.address || owned?.guid?.account_address || '';
      const data: any = owned?.data || owned?.content || {};
      const amaptValueRaw =
        data?.amapt?.value ??
        data?.amapt?.fields?.value ??
        data?.fields?.amapt?.fields?.value ??
        data?.fields?.amapt?.value ??
        '0';
      const lockedUntilSecsRaw =
        data?.locked_until_secs ??
        data?.fields?.locked_until_secs ??
        0;

      const amountBigInt = BigInt(amaptValueRaw || '0');
      const unlockTimeSecs = Number(lockedUntilSecsRaw || 0);
      const requestTimeSecs = Math.max(unlockTimeSecs - AMNIS_CONFIG.unbondingPeriod, 0);
      const nowSecs = Math.floor(Date.now() / 1000);

      return {
        id: objectAddress || `pending-${unlockTimeSecs}`,
        amount: amountBigInt.toString(),
        requestTime: requestTimeSecs,
        unlockTime: unlockTimeSecs,
        canClaim: unlockTimeSecs > 0 && unlockTimeSecs <= nowSecs,
      } as UnstakeRequest;
    });
  } catch (error) {
    log.error('Error fetching unstake requests:', error);
    return [];
  }
}

export default {
  getUserBalances,
  getStakingStats,
  buildStakeTransaction,
  buildMintStAptTransaction,
  buildRedeemStAptTransaction,
  buildInstantUnstakeTransaction,
  buildRequestUnstakeTransaction,
  buildClaimUnstakeTransaction,
  toOctas,
  fromOctas,
  calculateAmAptOutput,
  calculateStAptOutput,
  calculateAmAptFromStApt,
  validateStakingAmount,
  estimateGasFee,
  formatAPR,
  getPendingUnstakeRequests,
};
