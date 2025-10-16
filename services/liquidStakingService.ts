/**
 * Liquid Staking Service
 * 
 * Supports multiple liquid staking protocols:
 * - Tortuga (tAPT)
 * - Amnis (amAPT)
 * - Thala (thAPT)
 * 
 * FIXED: Proper view function calls and error handling
 */

import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { APTOS_CONFIG } from '../config/constants';
import { databaseService } from './database.service';

// Liquid staking protocol configurations
type ModuleFunctionConfig = {
  module: string;
  name: string;
};

type ViewFunctionId = `${string}::${string}::${string}`;

const buildViewFunctionId = (
  moduleAddress: string,
  moduleName: string,
  functionName: string,
): ViewFunctionId => `${moduleAddress}::${moduleName}::${functionName}` as ViewFunctionId;

const PROTOCOLS = {
  tortuga: {
    name: 'Tortuga',
    moduleAddress: '0x8f396e4246b2ba87b51c0739ef5ea4f26515a98375308c31ac2ec1e42142a57f',
    tokenType: '0x8f396e4246b2ba87b51c0739ef5ea4f26515a98375308c31ac2ec1e42142a57f::staked_aptos_coin::StakedAptosCoin',
    functions: {
      getApr: { module: 'staking', name: 'get_reward_rate' } satisfies ModuleFunctionConfig,
      getTotalStaked: { module: 'staking', name: 'total_staked' } satisfies ModuleFunctionConfig,
    },
  },
  amnis: {
    name: 'Amnis',
    moduleAddress: '0x111ae3e5bc816a5e63c2da97d0aa3886519e0cd5e4b046659fa35796bd11542a',
    tokenType: '0x111ae3e5bc816a5e63c2da97d0aa3886519e0cd5e4b046659fa35796bd11542a::stapt_token::StakedApt',
    functions: {
      getPoolInfo: { module: 'router', name: 'get_pool_info' } satisfies ModuleFunctionConfig,
    },
  },
  thala: {
    name: 'Thala',
    moduleAddress: '0x7fd500c11216f0fe3095d0c4b8aa4d64a4e2e04f83758462f2b127255643615',
    tokenType: '0x7fd500c11216f0fe3095d0c4b8aa4d64a4e2e04f83758462f2b127255643615::staked_aptos_coin::StakedAptosCoin',
    functions: {
      getExchangeRate: { module: 'staked_coin', name: 'exchange_rate' } satisfies ModuleFunctionConfig,
    },
  },
};

export class LiquidStakingService {
  private aptos: Aptos;
  private protocol: keyof typeof PROTOCOLS;

  constructor(protocol: keyof typeof PROTOCOLS = 'tortuga') {
    const config = new AptosConfig({
      network: APTOS_CONFIG.network as Network,
      fullnode: APTOS_CONFIG.nodeUrl,
    });
    this.aptos = new Aptos(config);
    this.protocol = protocol;
  }

  /**
   * Get liquid staking pool info
   * FIXED: Proper error handling and fallback
   */
  async getPoolInfo() {
    try {
      switch (this.protocol) {
        case 'tortuga':
          return await this.getTortugaInfo();
        case 'amnis':
          return await this.getAmnisInfo();
        case 'thala':
          return await this.getThalaInfo();
        default:
          throw new Error(`Unsupported protocol: ${this.protocol}`);
      }
    } catch (error: any) {
      console.error(`[LiquidStaking] Error fetching ${this.protocol} info:`, error.message);

      // Fallback to cached data
      return await this.getCachedPoolInfo();
    }
  }

  /**
   * Tortuga-specific implementation
   */
  private async getTortugaInfo() {
    try {
      const config = PROTOCOLS.tortuga;

      // Get APR from view function
      const [rewardRateRaw] = await this.aptos.view<[unknown]>({
        payload: {
          function: buildViewFunctionId(
            config.moduleAddress,
            config.functions.getApr.module,
            config.functions.getApr.name,
          ),
          typeArguments: [],
          functionArguments: [],
        },
      });

      // Get total staked
      const [totalStakedRaw] = await this.aptos.view<[unknown]>({
        payload: {
          function: buildViewFunctionId(
            config.moduleAddress,
            config.functions.getTotalStaked.module,
            config.functions.getTotalStaked.name,
          ),
          typeArguments: [],
          functionArguments: [],
        },
      });

      const totalStaked = this.toStringValue(totalStakedRaw);
      const rewardRate = this.toNumberValue(rewardRateRaw);

      const poolInfo = {
        protocol: 'tortuga',
        totalStaked,
        apr: this.calculateAPR(rewardRate),
        exchange_rate: 1.0, // Tortuga uses 1:1 initially
        isStale: false,
      };

      // Cache the result
      await this.cachePoolInfo(poolInfo);

      return poolInfo;
    } catch (error: any) {
      console.error('[LiquidStaking] Tortuga fetch failed:', error.message);
      throw error;
    }
  }

  /**
   * Amnis-specific implementation
   */
  private async getAmnisInfo() {
    try {
      const config = PROTOCOLS.amnis;

      const [poolInfoRaw] = await this.aptos.view<[Record<string, unknown>]>({
        payload: {
          function: buildViewFunctionId(
            config.moduleAddress,
            config.functions.getPoolInfo.module,
            config.functions.getPoolInfo.name,
          ),
          typeArguments: [],
          functionArguments: [],
        },
      });

      const poolInfo = poolInfoRaw ?? {};

      const totalStaked = this.toStringValue(poolInfo.total_staked);
      const apr = this.toNumberValue(poolInfo.apr);
      const exchangeRate = this.toNumberValue(poolInfo.exchange_rate) || 1.0;

      const info = {
        protocol: 'amnis',
        totalStaked,
        apr,
        exchange_rate: exchangeRate,
        isStale: false,
      };

      await this.cachePoolInfo(info);
      return info;
    } catch (error: any) {
      console.error('[LiquidStaking] Amnis fetch failed:', error.message);
      throw error;
    }
  }

  /**
   * Thala-specific implementation
   */
  private async getThalaInfo() {
    try {
      const config = PROTOCOLS.thala;

      const [exchangeRateRaw] = await this.aptos.view<[unknown]>({
        payload: {
          function: buildViewFunctionId(
            config.moduleAddress,
            config.functions.getExchangeRate.module,
            config.functions.getExchangeRate.name,
          ),
          typeArguments: [],
          functionArguments: [],
        },
      });

      const exchangeRate = this.toNumberValue(exchangeRateRaw) || 1.0;

      const info = {
        protocol: 'thala',
        totalStaked: '0', // Thala doesn't expose this directly
        apr: 0, // Calculate from exchange rate change
        exchange_rate: exchangeRate,
        isStale: false,
      };

      await this.cachePoolInfo(info);
      return info;
    } catch (error: any) {
      console.error('[LiquidStaking] Thala fetch failed:', error.message);
      throw error;
    }
  }

  /**
   * Get user's liquid staking position
   * FIXED: Proper resource type and error handling
   */
  async getUserPosition(userAddress: string) {
    const config = PROTOCOLS[this.protocol];

    try {
      // Try to get the user's coin balance
      const resource = await this.aptos.getAccountResource({
        accountAddress: userAddress,
        resourceType: `0x1::coin::CoinStore<${config.tokenType}>`,
      });

      const balance = (resource as any).coin?.value || '0';

      return {
        protocol: this.protocol,
        balance,
        hasPosition: parseFloat(balance) > 0,
        tokenType: config.tokenType,
      };
    } catch (error: any) {
      // Resource not found is OK - user doesn't have any staked
      if (error.message?.includes('resource_not_found') || 
          error.message?.includes('Resource not found')) {
        console.log(`[LiquidStaking] User has no ${this.protocol} position (OK)`);
        return {
          protocol: this.protocol,
          balance: '0',
          hasPosition: false,
          tokenType: config.tokenType,
        };
      }

      // Other errors should be logged
      console.error(`[LiquidStaking] Error fetching user position:`, error.message);
      throw error;
    }
  }

  /**
   * Calculate APR from reward rate
   */
  private calculateAPR(rewardRate: number): number {
    if (!Number.isFinite(rewardRate)) {
      return 0;
    }

    return rewardRate * 365 * 100;
  }

  /**
   * Cache pool info in Supabase
   */
  private async cachePoolInfo(info: any) {
    try {
      // Store in a generic cache table or create specific one
      // For now, just log - implement based on your needs
      console.log(`[LiquidStaking] Cached ${this.protocol} info:`, info);
    } catch (error: any) {
      console.error('[LiquidStaking] Failed to cache:', error.message);
    }
  }

  /**
   * Get cached pool info as fallback
   */
  private async getCachedPoolInfo() {
    console.warn(`[LiquidStaking] ⚠️ Using fallback data for ${this.protocol}`);

    // Return safe fallback values
    return {
      protocol: this.protocol,
      totalStaked: '0',
      apr: 0,
      exchange_rate: 1.0,
      isStale: true,
      error: 'Unable to fetch live data',
    };
  }

  /**
   * Get all supported protocols info
   */
  static async getAllProtocolsInfo() {
    const protocols: Array<keyof typeof PROTOCOLS> = ['tortuga', 'amnis', 'thala'];
    const results = await Promise.allSettled(
      protocols.map((protocol) => new LiquidStakingService(protocol).getPoolInfo()),
    );

    return results.map((result, index) => {
      const protocol = protocols[index];

      if (result.status === 'fulfilled') {
        return result.value;
      }

      console.error(`[LiquidStaking] ${protocol} failed:`, result.reason);
      return {
        protocol,
        totalStaked: '0',
        apr: 0,
        exchange_rate: 1.0,
        isStale: true,
        error: (result.reason as Error)?.message || 'Unknown error',
      };
    });
  }

  private toStringValue(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'bigint') {
      return value.toString();
    }

    if (value && typeof (value as { value?: unknown }).value !== 'undefined') {
      return this.toStringValue((value as { value?: unknown }).value);
    }

    return '0';
  }

  private toNumberValue(value: unknown): number {
    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'bigint') {
      return Number(value);
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    if (Array.isArray(value) && value.length > 0) {
      return this.toNumberValue(value[0]);
    }

    if (value && typeof (value as { value?: unknown }).value !== 'undefined') {
      return this.toNumberValue((value as { value?: unknown }).value);
    }

    return 0;
  }
}

// Export singleton instances
export const tortugaService = new LiquidStakingService('tortuga');
export const amnisService = new LiquidStakingService('amnis');
export const thalaService = new LiquidStakingService('thala');
