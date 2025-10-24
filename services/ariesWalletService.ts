/**
 * Aries Wallet Service - Fetch wallet balances for all supported assets
 * Integrates with Aptos SDK to get real-time balance data
 */

import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';

const NODE_URL = 'http://localhost:3001/api/aptos-rpc';

interface WalletBalance {
  coinType: string;
  balance: string; // Raw balance in base units
  balanceFormatted: number; // Formatted balance (divided by decimals)
  decimals: number;
}

class AriesWalletService {
  private aptosClient: Aptos;

  constructor() {
    const config = new AptosConfig({
      network: Network.MAINNET,
      fullnode: NODE_URL,
    });
    this.aptosClient = new Aptos(config);
  }

  /**
   * Fetch balance for a specific coin type
   */
  async getBalance(address: string, coinType: string, decimals: number = 8): Promise<WalletBalance> {
    try {
      console.log(`[AriesWallet] Fetching balance for ${coinType.split('::').pop()}...`);

      // Fetch CoinStore resource
      const resourceType = `0x1::coin::CoinStore<${coinType}>` as `${string}::${string}::${string}`;
      const resource = await this.aptosClient.getAccountResource({
        accountAddress: address,
        resourceType,
      });

      const balance = (resource as any).coin?.value || '0';
      const balanceFormatted = parseFloat(balance) / Math.pow(10, decimals);

      console.log(`[AriesWallet] ${coinType.split('::').pop()} balance: ${balanceFormatted}`);

      return {
        coinType,
        balance,
        balanceFormatted,
        decimals,
      };
    } catch (error: any) {
      // Resource not found means balance is 0
      if (error?.status === 404 || error?.message?.includes('Resource not found')) {
        console.log(`[AriesWallet] ${coinType.split('::').pop()} balance: 0 (no resource)`);
        return {
          coinType,
          balance: '0',
          balanceFormatted: 0,
          decimals,
        };
      }

      console.error(`[AriesWallet] Error fetching balance for ${coinType}:`, error);
      return {
        coinType,
        balance: '0',
        balanceFormatted: 0,
        decimals,
      };
    }
  }

  /**
   * Fetch balances for multiple coin types in parallel
   */
  async getBalances(
    address: string,
    assets: Array<{ coinType: string; decimals: number }>
  ): Promise<Map<string, WalletBalance>> {
    console.log(`[AriesWallet] Fetching ${assets.length} balances for ${address.slice(0, 10)}...`);

    const balances = await Promise.all(
      assets.map(asset => this.getBalance(address, asset.coinType, asset.decimals))
    );

    const balanceMap = new Map<string, WalletBalance>();
    balances.forEach(balance => {
      balanceMap.set(balance.coinType, balance);
    });

    console.log(`[AriesWallet] ✅ Fetched ${balanceMap.size} balances`);
    return balanceMap;
  }

  /**
   * Get APT balance (native coin)
   */
  async getAPTBalance(address: string): Promise<WalletBalance> {
    return this.getBalance(address, '0x1::aptos_coin::AptosCoin', 8);
  }
}

export const ariesWalletService = new AriesWalletService();
export default ariesWalletService;
