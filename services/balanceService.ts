import { aptosClient } from '../utils/aptosClient';
import { SWAP_TOKENS } from '../config/constants';

export interface TokenBalance {
  symbol: string;
  balance: number;
}

/**
 * Fetch token balances for a given wallet address
 */
export const fetchTokenBalances = async (
  walletAddress: string
): Promise<Record<string, number>> => {
  if (!walletAddress) {
    return {};
  }

  try {
    const balances: Record<string, number> = {};
    
    // Step 1: Get APT balance using native method
    try {
      const aptAmount = await aptosClient.getAccountAPTAmount({
        accountAddress: walletAddress
      });
      balances['APT'] = aptAmount / Math.pow(10, 8);
    } catch (aptError) {
      balances['APT'] = 0;
    }
    
    // Step 2: Get ALL fungible asset balances using the official SDK method
    try {
      const fungibleAssets = await aptosClient.getCurrentFungibleAssetBalances({
        options: {
          where: {
            owner_address: { _eq: walletAddress }
          }
        }
      });
      
      // Match USDC - look for any non-APT asset since we only support APT and USDC
      for (const asset of fungibleAssets) {
        const assetType = asset.asset_type || '';
        
        // Skip APT (we already have it)
        if (assetType.includes('aptos_coin') || assetType.includes('AptosCoin')) {
          continue;
        }
        
        // This must be USDC (or any other fungible asset)
        const amount = parseInt(asset.amount || '0');
        if (amount > 0) {
          balances['USDC'] = amount / Math.pow(10, 6); // USDC has 6 decimals
          break;
        }
      }
      
      // If USDC not found, set to 0
      if (!balances['USDC']) {
        balances['USDC'] = 0;
      }
      
    } catch (faError) {
      balances['USDC'] = 0;
    }

    return balances;
  } catch (error) {
    return { APT: 0, USDC: 0 };
  }
};

/**
 * Fetch balance for a single token
 */
export const fetchSingleTokenBalance = async (
  walletAddress: string,
  tokenSymbol: string
): Promise<number> => {
  if (!walletAddress || !SWAP_TOKENS[tokenSymbol as keyof typeof SWAP_TOKENS]) {
    return 0;
  }

  try {
    const tokenData = SWAP_TOKENS[tokenSymbol as keyof typeof SWAP_TOKENS];
    const resources = await aptosClient.getAccountResources({ 
      accountAddress: walletAddress 
    });

    const coinStoreType = `0x1::coin::CoinStore<${tokenData.address}>`;
    const coinResource = resources.find(
      (resource) => resource.type === coinStoreType
    );

    if (coinResource && coinResource.data) {
      const coinData = coinResource.data as { coin: { value: string } };
      const rawBalance = coinData.coin.value;
      return parseInt(rawBalance) / Math.pow(10, tokenData.decimals);
    }

    return 0;
  } catch (error) {
    // console.error(`Error fetching balance for ${tokenSymbol}:`, error);
    return 0;
  }
};

/**
 * Format balance for display
 */
export const formatBalance = (balance: number, decimals: number = 2): string => {
  if (balance === 0) return '0.00';
  if (balance < 0.01) return '< 0.01';
  return balance.toFixed(decimals);
};
