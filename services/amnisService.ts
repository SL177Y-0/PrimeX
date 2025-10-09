/**
 * Amnis Liquid Staking Service
 * 
 * Handles all interactions with Amnis Finance protocol on Aptos mainnet
 * Implements dual-token system: amAPT (liquid) and stAPT (auto-compounding)
 * 
 * @see https://amnis.finance
 * @see https://docs.amnis.finance
 */

import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { AMNIS_CONFIG, APTOS_CONFIG } from '../config/constants';
import { log } from '../utils/logger';

// Initialize Aptos client
const config = new AptosConfig({
  network: Network.MAINNET,
});
const aptos = new Aptos(config);

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
    const [aptBalance, amAptBalance, stAptBalance] = await Promise.all([
      getTokenBalance(userAddress, AMNIS_CONFIG.tokenTypes.APT),
      getTokenBalance(userAddress, AMNIS_CONFIG.tokenTypes.amAPT),
      getTokenBalance(userAddress, AMNIS_CONFIG.tokenTypes.stAPT),
    ]);

    return {
      apt: aptBalance,
      amAPT: amAptBalance,
      stAPT: stAptBalance,
    };
  } catch (error) {
    console.error('Error fetching user balances:', error);
    return {
      apt: '0',
      amAPT: '0',
      stAPT: '0',
    };
  }
}

/**
 * Get token balance for a specific coin type
 */
async function getTokenBalance(
  accountAddress: string,
  coinType: string
): Promise<string> {
  try {
    const resource = await aptos.getAccountResource({
      accountAddress,
      resourceType: `0x1::coin::CoinStore<${coinType}>`,
    });

    return (resource as any).coin.value || '0';
  } catch (error) {
    // Resource doesn't exist = balance is 0
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
    console.error('Error fetching staking stats:', error);
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

    const result = await aptos.view({ payload });
    // Returns [total, active, pending_inactive]
    return result[0]?.toString() || '0';
  } catch (error) {
    console.warn('Could not fetch total APT staked:', error);
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

    const result = await aptos.view({ payload });
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

    const result = await aptos.view({ payload });
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
 * @param amountInOctas - Amount in APT base units (1 APT = 1e8 octas)
 */
export function buildStakeTransaction(
  amountInOctas: string
): StakingTransaction {
  return {
    function: `${AMNIS_CONFIG.contractAddress}::${AMNIS_CONFIG.modules.core}::${AMNIS_CONFIG.functions.stake}`,
    type_arguments: [AMNIS_CONFIG.tokenTypes.APT],
    arguments: [amountInOctas],
  };
}

/**
 * Stake amAPT to receive stAPT (auto-compounding vault)
 * @param amountInOctas - Amount in amAPT base units
 */
export function buildMintStAptTransaction(
  amountInOctas: string
): StakingTransaction {
  return {
    function: `${AMNIS_CONFIG.contractAddress}::${AMNIS_CONFIG.modules.core}::${AMNIS_CONFIG.functions.mintStApt}`,
    type_arguments: [],
    arguments: [amountInOctas],
  };
}

/**
 * Redeem stAPT to receive amAPT
 * @param amountInOctas - Amount in stAPT base units
 */
export function buildRedeemStAptTransaction(
  amountInOctas: string
): StakingTransaction {
  return {
    function: `${AMNIS_CONFIG.contractAddress}::${AMNIS_CONFIG.modules.core}::${AMNIS_CONFIG.functions.redeemStApt}`,
    type_arguments: [],
    arguments: [amountInOctas],
  };
}

/**
 * Instant unstake amAPT to APT (via DEX swap, incurs small fee)
 * @param amountInOctas - Amount in amAPT base units
 */
export function buildInstantUnstakeTransaction(
  amountInOctas: string
): StakingTransaction {
  return {
    function: `${AMNIS_CONFIG.contractAddress}::${AMNIS_CONFIG.modules.core}::${AMNIS_CONFIG.functions.instantUnstake}`,
    type_arguments: [],
    arguments: [amountInOctas],
  };
}

/**
 * Request delayed unstake (14-day unbonding, no fee)
 * @param amountInOctas - Amount in amAPT base units
 */
export function buildRequestUnstakeTransaction(
  amountInOctas: string
): StakingTransaction {
  return {
    function: `${AMNIS_CONFIG.contractAddress}::${AMNIS_CONFIG.modules.core}::${AMNIS_CONFIG.functions.requestUnstake}`,
    type_arguments: [],
    arguments: [amountInOctas],
  };
}

/**
 * Claim unstaked APT after unbonding period
 * @param requestId - Unstake request identifier
 */
export function buildClaimUnstakeTransaction(
  requestId: string
): StakingTransaction {
  return {
    function: `${AMNIS_CONFIG.contractAddress}::${AMNIS_CONFIG.modules.core}::${AMNIS_CONFIG.functions.claimUnstake}`,
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
    const client: any = aptos as any;
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
