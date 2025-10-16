/**
 * Enhanced Aries Markets Protocol Service
 * Implements all documented entry functions from report.md
 * Supports profile management, lending, borrowing, rewards, and liquidation
 */

import { Aptos, AptosConfig, Network, Account, InputGenerateTransactionPayloadData } from '@aptos-labs/ts-sdk';
import { getPrimaryRPCUrl, fetchWithRetry } from '../config/aptosConfig';

// Aries contract address
export const ARIES_CONTRACT = '0x9770fa9c725cbd97eb50b2be5f7416efdfd1f1554beb0750d4dae4c64e860da3';

// Module paths
export const ARIES_MODULES = {
  CONTROLLER: `${ARIES_CONTRACT}::controller`,
  PROFILE: `${ARIES_CONTRACT}::profile`,
  RESERVE: `${ARIES_CONTRACT}::reserve`,
  EMODE: `${ARIES_CONTRACT}::emode_category`,
  REWARDS: `${ARIES_CONTRACT}::profile_farm`,
  WRAPPED_CONTROLLER: `${ARIES_CONTRACT}::wrapped_controller`,
} as const;

// Initialize Aptos client
let aptosClient: Aptos | null = null;

export function getAptosClient(): Aptos {
  if (!aptosClient) {
    const rpcUrl = getPrimaryRPCUrl('mainnet');
    const config = new AptosConfig({ 
      fullnode: rpcUrl,
      network: Network.MAINNET 
    });
    aptosClient = new Aptos(config);
  }
  return aptosClient;
}

/**
 * Profile Management
 */

// Check if user has Aries profile
export async function hasAriesProfile(userAddress: string): Promise<boolean> {
  try {
    const client = getAptosClient();
    const resource = await client.getAccountResource({
      accountAddress: userAddress,
      resourceType: `${ARIES_CONTRACT}::profile::Profile`,
    });
    return !!resource;
  } catch (error: any) {
    if (error?.status === 404) {
      return false;
    }
    throw error;
  }
}

// Register new Aries user
export async function registerUser(
  account: Account,
  profileName: string = 'default',
  referrer?: string
): Promise<string> {
  const client = getAptosClient();
  
  const functionName = referrer
    ? `${ARIES_MODULES.CONTROLLER}::register_user_with_referrer`
    : `${ARIES_MODULES.CONTROLLER}::register_user`;
  
  const functionArguments = referrer
    ? [Buffer.from(profileName, 'utf8').toString(), referrer]
    : [Buffer.from(profileName, 'utf8').toString()];
  
  const payload: InputGenerateTransactionPayloadData = {
    function: functionName,
    functionArguments,
  };
  
  const transaction = await client.transaction.build.simple({
    sender: account.accountAddress,
    data: payload,
  });
  
  const pendingTxn = await client.signAndSubmitTransaction({
    signer: account,
    transaction,
  });
  
  await client.waitForTransaction({ transactionHash: pendingTxn.hash });
  return pendingTxn.hash;
}

/**
 * Deposit / Supply Functions
 */

export interface DepositParams {
  account: Account;
  coinType: string; // e.g., '0x1::aptos_coin::AptosCoin'
  profileName: string;
  amount: string; // in base units
  receiver?: string; // defaults to account address
  repayOnly?: boolean; // true = only repay debt, false = supply after repay
}

export async function deposit(params: DepositParams): Promise<string> {
  const client = getAptosClient();
  const {
    account,
    coinType,
    profileName,
    amount,
    receiver,
    repayOnly = false,
  } = params;
  
  const payload: InputGenerateTransactionPayloadData = {
    function: `${ARIES_MODULES.CONTROLLER}::deposit`,
    typeArguments: [coinType],
    functionArguments: [
      Buffer.from(profileName, 'utf8').toString(),
      amount,
      repayOnly,
    ],
  };
  
  const transaction = await client.transaction.build.simple({
    sender: account.accountAddress,
    data: payload,
  });
  
  const pendingTxn = await client.signAndSubmitTransaction({
    signer: account,
    transaction,
  });
  
  await client.waitForTransaction({ transactionHash: pendingTxn.hash });
  return pendingTxn.hash;
}

/**
 * Withdraw Functions (includes borrow capability)
 */

export interface WithdrawParams {
  account: Account;
  coinType: string;
  profileName: string;
  amount: string;
  allowBorrow: boolean; // if true, borrow if insufficient collateral
  priceUpdatePayloads?: string[]; // Pyth price feed updates
}

export async function withdraw(params: WithdrawParams): Promise<string> {
  const client = getAptosClient();
  const {
    account,
    coinType,
    profileName,
    amount,
    allowBorrow,
    priceUpdatePayloads = [],
  } = params;
  
  // Use wrapped_controller for Pyth price updates
  const functionName = priceUpdatePayloads.length > 0
    ? `${ARIES_MODULES.WRAPPED_CONTROLLER}::withdraw`
    : `${ARIES_MODULES.CONTROLLER}::withdraw`;
  
  const functionArguments = priceUpdatePayloads.length > 0
    ? [Buffer.from(profileName, 'utf8').toString(), amount, allowBorrow, priceUpdatePayloads]
    : [Buffer.from(profileName, 'utf8').toString(), amount, allowBorrow];
  
  const payload: InputGenerateTransactionPayloadData = {
    function: functionName,
    typeArguments: [coinType],
    functionArguments,
  };
  
  const transaction = await client.transaction.build.simple({
    sender: account.accountAddress,
    data: payload,
  });
  
  const pendingTxn = await client.signAndSubmitTransaction({
    signer: account,
    transaction,
  });
  
  await client.waitForTransaction({ transactionHash: pendingTxn.hash });
  return pendingTxn.hash;
}

/**
 * Collateral Management
 */

export interface CollateralParams {
  account: Account;
  coinType: string;
  profileName: string;
  lpAmount: string; // LP token amount
  priceUpdatePayloads?: string[];
}

export async function addCollateral(params: Omit<CollateralParams, 'priceUpdatePayloads'>): Promise<string> {
  const client = getAptosClient();
  const { account, coinType, profileName, lpAmount } = params;
  
  const payload: InputGenerateTransactionPayloadData = {
    function: `${ARIES_MODULES.CONTROLLER}::add_collateral`,
    typeArguments: [coinType],
    functionArguments: [
      Buffer.from(profileName, 'utf8').toString(),
      lpAmount,
    ],
  };
  
  const transaction = await client.transaction.build.simple({
    sender: account.accountAddress,
    data: payload,
  });
  
  const pendingTxn = await client.signAndSubmitTransaction({
    signer: account,
    transaction,
  });
  
  await client.waitForTransaction({ transactionHash: pendingTxn.hash });
  return pendingTxn.hash;
}

export async function removeCollateral(params: CollateralParams): Promise<string> {
  const client = getAptosClient();
  const { account, coinType, profileName, lpAmount, priceUpdatePayloads = [] } = params;
  
  const functionName = priceUpdatePayloads.length > 0
    ? `${ARIES_MODULES.WRAPPED_CONTROLLER}::remove_collateral`
    : `${ARIES_MODULES.CONTROLLER}::remove_collateral`;
  
  const functionArguments = priceUpdatePayloads.length > 0
    ? [Buffer.from(profileName, 'utf8').toString(), lpAmount, priceUpdatePayloads]
    : [Buffer.from(profileName, 'utf8').toString(), lpAmount];
  
  const payload: InputGenerateTransactionPayloadData = {
    function: functionName,
    typeArguments: [coinType],
    functionArguments,
  };
  
  const transaction = await client.transaction.build.simple({
    sender: account.accountAddress,
    data: payload,
  });
  
  const pendingTxn = await client.signAndSubmitTransaction({
    signer: account,
    transaction,
  });
  
  await client.waitForTransaction({ transactionHash: pendingTxn.hash });
  return pendingTxn.hash;
}

/**
 * E-Mode Management
 */

export async function enterEMode(
  account: Account,
  profileName: string,
  eModeId: string
): Promise<string> {
  const client = getAptosClient();
  
  const payload: InputGenerateTransactionPayloadData = {
    function: `${ARIES_MODULES.CONTROLLER}::enter_emode`,
    functionArguments: [profileName, eModeId],
  };
  
  const transaction = await client.transaction.build.simple({
    sender: account.accountAddress,
    data: payload,
  });
  
  const pendingTxn = await client.signAndSubmitTransaction({
    signer: account,
    transaction,
  });
  
  await client.waitForTransaction({ transactionHash: pendingTxn.hash });
  return pendingTxn.hash;
}

export async function exitEMode(
  account: Account,
  profileName: string
): Promise<string> {
  const client = getAptosClient();
  
  const payload: InputGenerateTransactionPayloadData = {
    function: `${ARIES_MODULES.CONTROLLER}::exit_emode`,
    functionArguments: [profileName],
  };
  
  const transaction = await client.transaction.build.simple({
    sender: account.accountAddress,
    data: payload,
  });
  
  const pendingTxn = await client.signAndSubmitTransaction({
    signer: account,
    transaction,
  });
  
  await client.waitForTransaction({ transactionHash: pendingTxn.hash });
  return pendingTxn.hash;
}

/**
 * Rewards Management
 */

export interface ClaimRewardParams {
  account: Account;
  profileName: string;
  reserveCoinType: string; // Reserve asset type
  farmType: string; // 'DepositFarming' or 'BorrowFarming'
  rewardCoinType: string; // Reward token type
}

export async function claimReward(params: ClaimRewardParams): Promise<string> {
  const client = getAptosClient();
  const { account, profileName, reserveCoinType, farmType, rewardCoinType } = params;
  
  const payload: InputGenerateTransactionPayloadData = {
    function: `${ARIES_MODULES.CONTROLLER}::claim_reward`,
    typeArguments: [reserveCoinType, farmType, rewardCoinType],
    functionArguments: [Buffer.from(profileName, 'utf8').toString()],
  };
  
  const transaction = await client.transaction.build.simple({
    sender: account.accountAddress,
    data: payload,
  });
  
  const pendingTxn = await client.signAndSubmitTransaction({
    signer: account,
    transaction,
  });
  
  await client.waitForTransaction({ transactionHash: pendingTxn.hash });
  return pendingTxn.hash;
}

// Claim all rewards for a specific reward coin
export async function claimAllRewards(
  account: Account,
  profileName: string,
  rewardCoinType: string
): Promise<string> {
  const client = getAptosClient();
  
  const payload: InputGenerateTransactionPayloadData = {
    function: `${ARIES_MODULES.WRAPPED_CONTROLLER}::claim_rewards`,
    typeArguments: [rewardCoinType],
    functionArguments: [profileName],
  };
  
  const transaction = await client.transaction.build.simple({
    sender: account.accountAddress,
    data: payload,
  });
  
  const pendingTxn = await client.signAndSubmitTransaction({
    signer: account,
    transaction,
  });
  
  await client.waitForTransaction({ transactionHash: pendingTxn.hash });
  return pendingTxn.hash;
}

/**
 * View Functions (Read-only)
 */

export interface UserPosition {
  deposits: Array<{
    coinType: string;
    amount: string;
    amountUSD: number;
  }>;
  borrows: Array<{
    coinType: string;
    amount: string;
    amountUSD: number;
  }>;
  totalSuppliedUSD: number;
  totalBorrowedUSD: number;
  healthFactor: number;
  borrowLimit: number;
}

export async function getUserPosition(
  userAddress: string,
  profileName: string = 'default'
): Promise<UserPosition | null> {
  try {
    const client = getAptosClient();
    
    // Get profile resource
    const profileResource = await client.view({
      payload: {
        function: `${ARIES_MODULES.PROFILE}::get_profile`,
        typeArguments: [],
        functionArguments: [userAddress, profileName],
      },
    });
    
    // Parse deposits and borrows
    // Note: actual parsing depends on response structure
    return {
      deposits: [],
      borrows: [],
      totalSuppliedUSD: 0,
      totalBorrowedUSD: 0,
      healthFactor: 0,
      borrowLimit: 0,
    };
  } catch (error: any) {
    if (error?.status === 404) {
      return null;
    }
    throw error;
  }
}

// Get borrowing power
export async function getBorrowingPower(
  userAddress: string,
  profileName: string = 'default'
): Promise<number> {
  const client = getAptosClient();
  
  const result = await client.view({
    payload: {
      function: `${ARIES_MODULES.PROFILE}::get_total_borrowing_power`,
      typeArguments: [],
      functionArguments: [userAddress, profileName],
    },
  });
  
  // Parse decimal result
  return parseFloat(result[0] as string) || 0;
}

// Check if position is healthy
export async function hasEnoughCollateral(
  userAddress: string,
  profileName: string = 'default'
): Promise<boolean> {
  const client = getAptosClient();
  
  const result = await client.view({
    payload: {
      function: `${ARIES_MODULES.PROFILE}::has_enough_collateral`,
      typeArguments: [],
      functionArguments: [userAddress, profileName],
    },
  });
  
  return result[0] as boolean;
}

/**
 * Liquidation Functions
 */

export interface LiquidateParams {
  account: Account;
  targetUser: string;
  targetProfileName: string;
  debtCoinType: string;
  collateralCoinType: string;
  repayAmount: string;
  redeemDirectly?: boolean; // if true, redeem LP to underlying
}

export async function liquidate(params: LiquidateParams): Promise<string> {
  const client = getAptosClient();
  const {
    account,
    targetUser,
    targetProfileName,
    debtCoinType,
    collateralCoinType,
    repayAmount,
    redeemDirectly = false,
  } = params;
  
  const functionName = redeemDirectly
    ? `${ARIES_MODULES.CONTROLLER}::liquidate_and_redeem`
    : `${ARIES_MODULES.CONTROLLER}::liquidate`;
  
  const payload: InputGenerateTransactionPayloadData = {
    function: functionName,
    typeArguments: [debtCoinType, collateralCoinType],
    functionArguments: [
      targetUser,
      Buffer.from(targetProfileName, 'utf8').toString(),
      repayAmount,
    ],
  };
  
  const transaction = await client.transaction.build.simple({
    sender: account.accountAddress,
    data: payload,
  });
  
  const pendingTxn = await client.signAndSubmitTransaction({
    signer: account,
    transaction,
  });
  
  await client.waitForTransaction({ transactionHash: pendingTxn.hash });
  return pendingTxn.hash;
}

export default {
  hasAriesProfile,
  registerUser,
  deposit,
  withdraw,
  addCollateral,
  removeCollateral,
  enterEMode,
  exitEMode,
  claimReward,
  claimAllRewards,
  getUserPosition,
  getBorrowingPower,
  hasEnoughCollateral,
  liquidate,
};
