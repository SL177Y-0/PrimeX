/**
 * Aries Lend Dashboard - Complete Production Component
 * 
 * Main dashboard for Aries Markets Lend & Borrow feature
 * Matches official Aries Markets platform design
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Image,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Zap, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useWallet } from '../../app/providers/WalletProvider';
import { useAriesLending } from '../../hooks/useAriesLendingProduction';
import { useEMode } from '../../hooks/useEMode';
import { formatHealthFactor, getHealthFactorColor } from '../../utils/ariesRiskCalculationsComplete';
import { formatAssetAmount } from '../../config/ariesAssetsComplete';
import { LoadingScreen } from '../LoadingScreen';
import { EModePanel } from '../EModePanel';
import { EModeToggle } from './EModeToggle';
import { formatUSD, formatPercentage } from '../../utils/ariesFormatters';
import { calculateNetAPR } from '../../utils/ariesAPRCalculations';
import { getRiskParameterSummary } from '../../utils/ariesRiskParameters';
import AriesSupplyModal from './modals/AriesSupplyModal';
// @ts-ignore - TS cache issue, restart TS server to resolve
import AriesBorrowModal from './modals/AriesBorrowModal';
import AriesWithdrawModal from './modals/AriesWithdrawModal';
import AriesRepayModal from './modals/AriesRepayModal';

// Import console filter to hide non-Aries logs
import '../../utils/consoleFilter';

// ============================================================================
// TYPES
// ============================================================================

interface ModalState {
  type: 'supply' | 'borrow' | 'withdraw' | 'repay' | null;
  coinType: string | null;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AriesLendDashboard() {
  const { theme } = useTheme();
  const { account, connected, signAndSubmitTransaction } = useWallet();
  const {
    hasProfile,
    profileName,
    initializeProfile,
    isInitializing,
    reserves,
    reservesLoading,
    portfolio,
    portfolioLoading,
    refresh,
  } = useAriesLending(account?.address);

  const [activeTab, setActiveTab] = useState<'paired' | 'isolated'>('paired');
  const [modalState, setModalState] = useState<ModalState>({ type: null, coinType: null });
  const [refreshing, setRefreshing] = useState(false);
  const [showEModePanel, setShowEModePanel] = useState(false);

  // E-Mode hook
  const {
    categories: emodeCategories,
    activeCategory: activeEmodeCategory,
    loading: emodeLoading,
    enableEMode,
    disableEMode,
    refetch: refetchEMode,
  } = useEMode();

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refresh(), refetchEMode()]);
    setRefreshing(false);
  };

  const handleInitializeProfile = async () => {
    try {
      // Use "Main Account" as default profile name (Aries SDK standard)
      await initializeProfile('Main Account', undefined, signAndSubmitTransaction);
    } catch (error) {
      console.error('Failed to initialize profile:', error);
    }
  };

  const handleSupplyClick = (coinType: string) => {
    setModalState({ type: 'supply', coinType });
  };

  const handleBorrowClick = (coinType: string) => {
    setModalState({ type: 'borrow', coinType });
  };

  const handleWithdrawClick = (coinType: string) => {
    setModalState({ type: 'withdraw', coinType });
  };

  const handleRepayClick = (coinType: string) => {
    setModalState({ type: 'repay', coinType });
  };

  const handleCloseModal = () => {
    setModalState({ type: null, coinType: null });
  };

  // ==========================================================================
  // COMPUTED DATA
  // ==========================================================================

  const filteredReserves = useMemo(() => {
    const filtered = activeTab === 'paired'
      ? reserves.filter((r: any) => r.isPaired)
      : reserves.filter((r: any) => !r.isPaired);
    
    // Debug: Log first reserve to check logoUrl
    if (filtered.length > 0) {
      console.log('[AriesLend] Sample reserve:', {
        symbol: filtered[0].symbol,
        logoUrl: filtered[0].logoUrl,
        hasLogo: !!filtered[0].logoUrl
      });
    }
    
    return filtered;
  }, [reserves, activeTab]);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  // Show wallet connection prompt if not connected
  if (!connected) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
        <View style={styles.emptyStateContainer}>
          <Text style={[styles.emptyStateTitle, { color: theme.colors.textPrimary }]}>Connect Your Wallet</Text>
          <Text style={[styles.emptyStateDescription, { color: theme.colors.textSecondary }]}>
            Please connect your Aptos wallet to access Aries Markets lending and borrowing
          </Text>
        </View>
      </View>
    );
  }

  // Show loading screen on initial load
  if (reservesLoading && reserves.length === 0) {
    return (
      <LoadingScreen 
        message="Loading Lend & Borrow - Fetching Aries Markets data..."
      />
    );
  }

  // Show loading screen while initializing profile
  if (isInitializing) {
    return (
      <LoadingScreen 
        message="Initializing Profile - Setting up your Aries Markets account..."
      />
    );
  }

  // Show loading screen while loading portfolio
  if (portfolioLoading && !portfolio) {
    return (
      <LoadingScreen 
        message="Loading Portfolio - Fetching your positions and balances..."
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.purple} />
        }
      >
        {/* Profile Onboarding Banner */}
        {!hasProfile && <ProfileOnboardingBanner onInitialize={handleInitializeProfile} isLoading={isInitializing} theme={theme} />}

        {/* Portfolio Overview */}
        {hasProfile && portfolio && <PortfolioOverviewCard portfolio={portfolio} theme={theme} />}

        {/* E-Mode Banner (when not active) */}
        {hasProfile && activeEmodeCategory === 0 && (
          <Pressable
            style={[styles.emodeBanner, { backgroundColor: theme.colors.purple + '15', borderColor: theme.colors.purple }]}
            onPress={() => setShowEModePanel(!showEModePanel)}
          >
            <Zap size={20} color={theme.colors.purple} />
            <View style={styles.emodeBannerContent}>
              <Text style={[styles.emodeBannerTitle, { color: theme.colors.textPrimary }]}>
                Enter E-Mode to increase your LTV for selected category of assets!
              </Text>
              <Text style={[styles.emodeBannerSubtitle, { color: theme.colors.textSecondary }]}>
                Maximize capital efficiency with correlated assets
              </Text>
            </View>
            {showEModePanel ? (
              <ChevronUp size={20} color={theme.colors.purple} />
            ) : (
              <ChevronDown size={20} color={theme.colors.purple} />
            )}
          </Pressable>
        )}

        {/* E-Mode Active Status (when active) */}
        {hasProfile && activeEmodeCategory > 0 && (
          <View style={[styles.emodeActiveCard, { backgroundColor: theme.colors.positive + '20', borderColor: theme.colors.positive }]}>
            <Zap size={20} color={theme.colors.positive} />
            <View style={styles.emodeActiveContent}>
              <Text style={[styles.emodeActiveTitle, { color: theme.colors.positive }]}>
                ⚡ E-Mode Active: {emodeCategories.find(c => c.categoryId === activeEmodeCategory)?.label || 'Unknown'}
              </Text>
              <Text style={[styles.emodeActiveSubtitle, { color: theme.colors.textSecondary }]}>
                Higher LTV enabled for correlated assets
              </Text>
            </View>
            <Pressable
              style={[styles.emodeExitButton, { backgroundColor: theme.colors.negative }]}
              onPress={async () => {
                try {
                  await disableEMode();
                  await refresh();
                } catch (error) {
                  console.error('[Aries] Failed to exit E-Mode:', error);
                }
              }}
              disabled={emodeLoading}
            >
              {emodeLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.emodeExitButtonText}>Exit E-Mode</Text>
              )}
            </Pressable>
          </View>
        )}

        {/* E-Mode Toggle (NEW - Enhanced UI) */}
        {hasProfile && showEModePanel && portfolio && (
          <View style={styles.emodePanelContainer}>
            <EModeToggle
              userDeposits={portfolio.deposits?.map((d: any) => d.coinType) || []}
              currentEMode={activeEmodeCategory}
              onToggleEMode={async (categoryId) => {
                if (categoryId === null) {
                  await disableEMode();
                } else {
                  await enableEMode(categoryId);
                }
                await refresh();
                setShowEModePanel(false);
              }}
              loading={emodeLoading}
            />
          </View>
        )}

        {/* E-Mode Warning (when active and in isolated pool) */}
        {hasProfile && activeEmodeCategory > 0 && activeTab === 'isolated' && (
          <View style={[styles.emodeWarning, { backgroundColor: theme.colors.orange + '15', borderColor: theme.colors.orange }]}>
            <AlertCircle size={18} color={theme.colors.orange} />
            <Text style={[styles.emodeWarningText, { color: theme.colors.orange }]}>
              In E-Mode some assets are not borrowable. Exit E-Mode to access all assets.
            </Text>
          </View>
        )}

        {/* Market Tabs - Matching official Aries platform */}
        <View style={[styles.tabsContainer, { backgroundColor: theme.colors.elevated }]}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'paired' && [styles.tabActive, { backgroundColor: theme.colors.purple }]]}
            onPress={() => setActiveTab('paired')}
          >
            <Text style={[styles.tabText, { color: theme.colors.textSecondary }, activeTab === 'paired' && [styles.tabTextActive, { color: '#FFFFFF' }]]}>
              Main Pool
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'isolated' && [styles.tabActive, { backgroundColor: theme.colors.purple }]]}
            onPress={() => setActiveTab('isolated')}
          >
            <Text style={[styles.tabText, { color: theme.colors.textSecondary }, activeTab === 'isolated' && [styles.tabTextActive, { color: '#FFFFFF' }]]}>
              Merkle LP Pool
            </Text>
            {/* New badge */}
            {activeTab === 'isolated' && (
              <View style={[styles.newBadge, { backgroundColor: theme.colors.green }]}>
                <Text style={styles.newBadgeText}>New</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Reserve List */}
        <View style={styles.reserveList}>
          {filteredReserves.map((reserve: any) => (
            <ReserveCard
              key={reserve.coinType}
              reserve={reserve}
              onSupply={handleSupplyClick}
              onBorrow={handleBorrowClick}
              onWithdraw={handleWithdrawClick}
              onRepay={handleRepayClick}
              theme={theme}
            />
          ))}
        </View>

        {filteredReserves.length === 0 && (
          <EmptyState 
            title={`No ${activeTab === 'paired' ? 'Main Pool' : 'Isolated Pool'} Assets`}
            description={activeTab === 'isolated' 
              ? "Isolated pool assets will appear here once you start using the platform."
              : "Main pool assets are loading... Please refresh."}
            theme={theme}
          />
        )}
      </ScrollView>

      {/* Transaction Modals */}
      <AriesSupplyModal
        visible={modalState.type === 'supply'}
        coinType={modalState.coinType}
        onClose={handleCloseModal}
      />

      {/* @ts-ignore - TS cache issue */}
      <AriesBorrowModal
        visible={modalState.type === 'borrow'}
        coinType={modalState.coinType}
        onClose={handleCloseModal}
      />

      <AriesWithdrawModal
        visible={modalState.type === 'withdraw'}
        coinType={modalState.coinType}
        onClose={handleCloseModal}
      />

      <AriesRepayModal
        visible={modalState.type === 'repay'}
        coinType={modalState.coinType}
        onClose={handleCloseModal}
      />
    </View>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Skeleton Loader for initial load
 */
function SkeletonLoader({ theme }: { theme: any }) {
  return (
    <View style={styles.skeletonContainer}>
      {/* Header Skeleton */}
      <View style={styles.skeletonHeader}>
        <View style={[styles.skeletonBox, { width: '40%', height: 24, backgroundColor: theme.colors.chip }]} />
        <View style={[styles.skeletonBox, { width: '30%', height: 20, backgroundColor: theme.colors.chip }]} />
      </View>

      {/* Stats Skeleton */}
      <View style={[styles.skeletonStats, { backgroundColor: theme.colors.elevated }]}>
        {[1, 2, 3].map(i => (
          <View key={i} style={styles.skeletonStat}>
            <View style={[styles.skeletonBox, { width: '60%', height: 14, marginBottom: 8, backgroundColor: theme.colors.chip }]} />
            <View style={[styles.skeletonBox, { width: '80%', height: 20, backgroundColor: theme.colors.chip }]} />
          </View>
        ))}
      </View>

      {/* Cards Skeleton */}
      {[1, 2, 3].map(i => (
        <View key={i} style={[styles.skeletonCard, { backgroundColor: theme.colors.elevated, borderColor: theme.colors.border }]}>
          <View style={styles.skeletonCardHeader}>
            <View style={[styles.skeletonCircle, { width: 40, height: 40, backgroundColor: theme.colors.chip }]} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={[styles.skeletonBox, { width: '40%', height: 16, marginBottom: 6, backgroundColor: theme.colors.chip }]} />
              <View style={[styles.skeletonBox, { width: '60%', height: 12, backgroundColor: theme.colors.chip }]} />
            </View>
          </View>
          <View style={styles.skeletonCardStats}>
            {[1, 2, 3].map(j => (
              <View key={j} style={{ flex: 1 }}>
                <View style={[styles.skeletonBox, { width: '70%', height: 12, marginBottom: 4, backgroundColor: theme.colors.chip }]} />
                <View style={[styles.skeletonBox, { width: '50%', height: 14, backgroundColor: theme.colors.chip }]} />
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * Empty State Component
 */
function EmptyState({ title, description, theme }: { title: string; description: string; theme: any }) {
  return (
    <View style={styles.emptyStateContainer}>
      <View style={[styles.emptyStateIcon, { backgroundColor: theme.colors.elevated }]}>
        <Text style={styles.emptyStateIconText}>📊</Text>
      </View>
      <Text style={[styles.emptyStateTitle, { color: theme.colors.textPrimary }]}>{title}</Text>
      <Text style={[styles.emptyStateDescription, { color: theme.colors.textSecondary }]}>{description}</Text>
    </View>
  );
}

/**
 * Profile Onboarding Banner
 */
function ProfileOnboardingBanner({ 
  onInitialize, 
  isLoading,
  theme
}: { 
  onInitialize: () => void; 
  isLoading: boolean;
  theme: any;
}) {
  return (
    <LinearGradient
      colors={[theme.colors.purple, theme.colors.accentFrom]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.onboardingBanner}
    >
      <View style={styles.onboardingContent}>
        <Text style={[styles.onboardingTitle, { color: '#FFFFFF' }]}>Enable Aries Markets</Text>
        <Text style={[styles.onboardingSubtitle, { color: 'rgba(255,255,255,0.9)' }]}>
          Create your profile to start lending and borrowing
        </Text>
      </View>
      
      <TouchableOpacity
        style={[styles.onboardingButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
        onPress={onInitialize}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={[styles.onboardingButtonText, { color: '#FFFFFF' }]}>Get Started</Text>
        )}
      </TouchableOpacity>
    </LinearGradient>
  );
}

/**
 * Portfolio Overview Card
 */
function PortfolioOverviewCard({ portfolio, theme }: { portfolio: any; theme: any }) {
  const { riskMetrics } = portfolio;
  const hfColor = getHealthFactorColor(riskMetrics.healthFactor);

  return (
    <View style={[styles.portfolioCard, { backgroundColor: theme.colors.elevated, borderColor: theme.colors.border }]}>
      <Text style={[styles.portfolioTitle, { color: theme.colors.textPrimary }]}>Your Portfolio</Text>
      
      <View style={styles.portfolioStats}>
        <View style={styles.portfolioStat}>
          <Text style={[styles.portfolioStatLabel, { color: theme.colors.textSecondary }]}>Total Supplied</Text>
          <Text style={[styles.portfolioStatValue, { color: theme.colors.textPrimary }]}>
            ${portfolio.totalSuppliedUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>

        <View style={styles.portfolioStat}>
          <Text style={[styles.portfolioStatLabel, { color: theme.colors.textSecondary }]}>Total Borrowed</Text>
          <Text style={[styles.portfolioStatValue, { color: theme.colors.textPrimary }]}>
            ${portfolio.totalBorrowedUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>

        <View style={styles.portfolioStat}>
          <Text style={[styles.portfolioStatLabel, { color: theme.colors.textSecondary }]}>Net APY</Text>
          <Text style={[styles.portfolioStatValue, { color: portfolio.netAPR >= 0 ? theme.colors.positive : theme.colors.negative }]}>
            {(portfolio.netAPR * 100).toFixed(2)}%
          </Text>
        </View>
      </View>

      {/* Health Factor */}
      <View style={styles.healthFactorContainer}>
        <View style={styles.healthFactorHeader}>
          <Text style={[styles.healthFactorLabel, { color: theme.colors.textSecondary }]}>Health Factor</Text>
          <View style={[styles.healthFactorBadge, { backgroundColor: hfColor + '20' }]}>
            <View style={[styles.healthFactorDot, { backgroundColor: hfColor }]} />
            <Text style={[styles.healthFactorStatus, { color: hfColor }]}>
              {riskMetrics.status.toUpperCase()}
            </Text>
          </View>
        </View>
        
        <Text style={[styles.healthFactorValue, { color: hfColor }]}>
          {formatHealthFactor(riskMetrics.healthFactor)}
        </Text>

        {/* Borrow Capacity Bar */}
        <View style={styles.borrowCapacityContainer}>
          <View style={styles.borrowCapacityHeader}>
            <Text style={styles.borrowCapacityLabel}>Borrow Capacity</Text>
            <Text style={styles.borrowCapacityValue}>
              {(riskMetrics.borrowCapacityUsed * 100).toFixed(0)}% Used
            </Text>
          </View>
          <View style={styles.borrowCapacityBar}>
            <View 
              style={[
                styles.borrowCapacityFill, 
                { 
                  width: `${Math.min(riskMetrics.borrowCapacityUsed * 100, 100)}%`,
                  backgroundColor: riskMetrics.borrowCapacityUsed > 0.8 ? '#ef4444' : '#00D4FF',
                }
              ]} 
            />
          </View>
        </View>
      </View>
    </View>
  );
}

/**
 * Reserve Card
 */
function ReserveCard({ reserve, onSupply, onBorrow, onWithdraw, onRepay, theme }: {
  reserve: any;
  onSupply: (coinType: string) => void;
  onBorrow: (coinType: string) => void;
  onWithdraw: (coinType: string) => void;
  onRepay: (coinType: string) => void;
  theme: any;
}) {
  return (
    <View style={[styles.reserveCard, { backgroundColor: theme.colors.elevated, borderColor: theme.colors.border }]}>
      <View style={styles.reserveHeader}>
        <View style={styles.reserveAssetInfo}>
          {reserve.logoUrl ? (
            <Image 
              source={{ uri: reserve.logoUrl }} 
              style={styles.reserveIcon}
              onError={(e) => {
                console.log(`[Logo] Failed to load ${reserve.symbol}: ${reserve.logoUrl}`);
                console.log('[Logo] Error:', e.nativeEvent.error);
              }}
              onLoad={() => console.log(`[Logo] Loaded ${reserve.symbol}: ${reserve.logoUrl}`)}
            />
          ) : (
            <View style={[styles.reserveIconFallback, { backgroundColor: theme.colors.purple }]}>
              <Text style={[styles.reserveIconText, { color: '#FFFFFF' }]}>{reserve.symbol[0]}</Text>
            </View>
          )}
          <View>
            <Text style={[styles.reserveSymbol, { color: theme.colors.textPrimary }]}>{reserve.symbol}</Text>
            <Text style={[styles.reserveName, { color: theme.colors.textSecondary }]}>{reserve.name}</Text>
          </View>
        </View>

        {reserve.priceUSD != null && reserve.priceUSD > 0 ? (
          <Text style={[styles.reservePrice, { color: theme.colors.textPrimary }]}>
            ${reserve.priceUSD.toFixed(reserve.priceUSD < 1 ? 4 : 2)}
          </Text>
        ) : (
          <Text style={[styles.reservePrice, { color: theme.colors.textSecondary }]}>—</Text>
        )}
      </View>

      <View style={styles.reserveStats}>
        <View style={styles.reserveStat}>
          <Text style={[styles.reserveStatLabel, { color: theme.colors.textSecondary }]}>Supply APR</Text>
          <Text style={[styles.reserveStatValue, { color: reserve.supplyAPR > 0 ? theme.colors.positive : theme.colors.textSecondary }]}>
            {reserve.supplyAPR != null ? `${(reserve.supplyAPR * 100).toFixed(2)}%` : '—'}
          </Text>
        </View>

        <View style={styles.reserveStat}>
          <Text style={[styles.reserveStatLabel, { color: theme.colors.textSecondary }]}>Borrow APR</Text>
          <Text style={[styles.reserveStatValue, { color: reserve.borrowAPR > 0 ? theme.colors.orange : theme.colors.textSecondary }]}>
            {reserve.borrowAPR != null ? `${(reserve.borrowAPR * 100).toFixed(2)}%` : '—'}
          </Text>
        </View>

        <View style={styles.reserveStat}>
          <Text style={[styles.reserveStatLabel, { color: theme.colors.textSecondary }]}>Utilization</Text>
          <Text style={[styles.reserveStatValue, { color: reserve.utilization > 0 ? theme.colors.textPrimary : theme.colors.textSecondary }]}>
            {reserve.utilization != null ? `${(reserve.utilization * 100).toFixed(1)}%` : '—'}
          </Text>
        </View>
      </View>

      {reserve.totalSuppliedUSD != null && reserve.totalSuppliedUSD > 0 && (
        <View style={styles.reserveMarketSize}>
          <Text style={[styles.reserveMarketLabel, { color: theme.colors.textSecondary }]}>Market Size</Text>
          <Text style={[styles.reserveMarketValue, { color: theme.colors.textPrimary }]}>
            ${(reserve.totalSuppliedUSD / 1000000).toFixed(2)}M
          </Text>
        </View>
      )}

      <View style={styles.reserveActions}>
        <TouchableOpacity
          style={[styles.reserveActionButton, { backgroundColor: theme.colors.positive + '20' }]}
          onPress={() => onSupply(reserve.coinType)}
        >
          <Text style={[styles.reserveActionButtonText, { color: theme.colors.positive }]}>Supply</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.reserveActionButton, { backgroundColor: '#f59e0b20' }]}
          onPress={() => onWithdraw(reserve.coinType)}
        >
          <Text style={[styles.reserveActionButtonText, { color: '#f59e0b' }]}>Withdraw</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.reserveActionButton, { backgroundColor: theme.colors.orange + '20' }]}
          onPress={() => onBorrow(reserve.coinType)}
        >
          <Text style={[styles.reserveActionButtonText, { color: theme.colors.orange }]}>Borrow</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.reserveActionButton, { backgroundColor: '#8b5cf620' }]}
          onPress={() => onRepay(reserve.coinType)}
        >
          <Text style={[styles.reserveActionButtonText, { color: '#8b5cf6' }]}>Repay</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E27',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0E27',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#9CA3AF',
  },
  scrollView: {
    flex: 1,
  },
  
  // Onboarding Banner
  onboardingBanner: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  onboardingContent: {
    flex: 1,
  },
  onboardingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  onboardingSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  onboardingButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  onboardingButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00D4FF',
  },

  // Portfolio Card
  portfolioCard: {
    margin: 16,
    marginTop: 8,
    padding: 20,
    backgroundColor: '#141937',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  portfolioTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#E5E7EB',
    marginBottom: 16,
  },
  portfolioStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  portfolioStat: {
    flex: 1,
  },
  portfolioStatLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  portfolioStatValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E5E7EB',
  },

  // Health Factor
  healthFactorContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
  },
  healthFactorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  healthFactorLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  healthFactorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  healthFactorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  healthFactorStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  healthFactorValue: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 16,
  },

  // Borrow Capacity
  borrowCapacityContainer: {
    marginTop: 12,
  },
  borrowCapacityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  borrowCapacityLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  borrowCapacityValue: {
    fontSize: 12,
    color: '#E5E7EB',
    fontWeight: '600',
  },
  borrowCapacityBar: {
    height: 6,
    backgroundColor: '#1F2937',
    borderRadius: 3,
    overflow: 'hidden',
  },
  borrowCapacityFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: '#141937',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  tabActive: {
    backgroundColor: '#00D4FF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  tabTextActive: {
    color: '#0A0E27',
  },
  newBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // E-Mode Styles
  emodeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  emodeBannerContent: {
    flex: 1,
  },
  emodeBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  emodeBannerSubtitle: {
    fontSize: 12,
  },
  emodeActiveCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  emodeActiveContent: {
    flex: 1,
  },
  emodeActiveTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  emodeActiveSubtitle: {
    fontSize: 12,
  },
  emodeExitButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emodeExitButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emodePanelContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  emodeWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  emodeWarningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },

  // Reserve List
  reserveList: {
    paddingHorizontal: 16,
  },

  // Reserve Card
  reserveCard: {
    backgroundColor: '#141937',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  reserveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  reserveAssetInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reserveIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  reserveIconFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00D4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reserveIconText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0A0E27',
  },
  reserveSymbol: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E5E7EB',
  },
  reserveName: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  reservePrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E5E7EB',
  },

  // Reserve Stats
  reserveStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  reserveStat: {
    flex: 1,
  },
  reserveStatLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  reserveStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E5E7EB',
  },

  // Market Size
  reserveMarketSize: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
    marginBottom: 12,
  },
  reserveMarketLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  reserveMarketValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E5E7EB',
  },

  // Actions
  reserveActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  reserveActionButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  supplyButton: {
    backgroundColor: '#10b981',
  },
  borrowButton: {
    backgroundColor: '#00D4FF',
  },
  reserveActionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Skeleton Loader
  skeletonContainer: {
    padding: 16,
  },
  skeletonHeader: {
    marginBottom: 20,
  },
  skeletonStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    backgroundColor: '#141937',
    borderRadius: 16,
    padding: 20,
  },
  skeletonStat: {
    flex: 1,
  },
  skeletonCard: {
    backgroundColor: '#141937',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  skeletonCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  skeletonCardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  skeletonBox: {
    backgroundColor: '#1F2937',
    borderRadius: 4,
  },
  skeletonCircle: {
    backgroundColor: '#1F2937',
    borderRadius: 100,
  },

  // Empty State
  emptyStateContainer: {
    padding: 60,
    alignItems: 'center',
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#141937',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyStateIconText: {
    fontSize: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#E5E7EB',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});
