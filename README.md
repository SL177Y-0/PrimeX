
# PrismX: Advanced Aptos DeFi Trading Platform

## Overview

PrismX is a production-grade decentralized finance trading platform engineered specifically for the Aptos blockchain ecosystem. Built with React Native 0.79.5 and Expo SDK 53, it delivers institutional-quality trading infrastructure with native mobile optimization, real-time market intelligence, and comprehensive DeFi protocol integration.

The platform synthesizes four critical DeFi primitives into a unified trading interface: leveraged perpetual futures via Merkle Trade, automated market making through Panora Exchange, liquid staking via Amnis Finance, and professional-grade wallet connectivity with persistent session management. Every architectural decision prioritizes security, performance, type safety, and developer experience.

## Feature Matrix

- **Perpetual Futures Trading** Advanced interface in `components/TradingInterface.tsx` with position life-cycle modals (`components/ClosePositionModal.tsx`, `components/SLTPEditorModal.tsx`), orchestrated via `hooks/useMerkleTrading.ts` and `services/merkleSdkService.ts`.
- **Lend & Borrow via Aries Markets** Institutional dashboard in `components/aries/AriesLendDashboard.tsx` backed by `hooks/useAriesLendingProduction.ts`, `services/ariesSDKService.ts`, and the full reserve catalog in `config/ariesAssetsComplete.ts`.
- **Liquid Staking with Amnis Finance** Dual token staking/unstaking flows through `components/StakingInterface.tsx`, `components/StakingDashboard.tsx`, and `services/amnisEnhancedService.ts`.
- **Token Swaps with Panora Exchange** Smart routing, simulation, and validation in `components/SwapInterface.tsx` using `services/panoraSwapSDK.ts` and `services/panoraSwapService.ts`.
- **Portfolio & Analytics Hub** Home experience in `app/(tabs)/index.tsx` driven by `store/useAppStore.ts`, Supabase edge functions, and websocket streaming for P&L, balances, and alerts.
- **Universal Wallet Connectivity** Persistent wallet sessions and multi-provider support provided by `app/providers/WalletProvider.tsx` with AsyncStorage security and WalletConnect v2 integration.
- **Real-Time Market Intelligence** Price aggregation, caching, and charting executed by `services/realMarketDataService.ts`, `utils/priceService.ts`, and native SVG visualizations in `components/CandleChart.tsx`.

## Technology Stack

- **Framework** React Native 0.79.5, Expo ~53.0.23, React 19, Expo Router 5.1 with typed routes.
- **Language & Tooling** TypeScript 5.8 in strict mode, ESLint 9, Jest 29, NativeWind/Tailwind for rapid styling.
- **State & Animation** Zustand 5 for global state, React Context providers, React Native Reanimated 3.17, react-native-svg 15.11.
- **Blockchain SDKs** `@aptos-labs/ts-sdk`, `@merkletrade/ts-sdk`, `@aries-markets/api`, `@aries-markets/aries-tssdk`, `@panoraexchange/swap-sdk`, `@pythnetwork/pyth-sdk-solidity`.
- **Data & Backend** Supabase (SQL + Edge Functions), optional Node.js websocket server (`server/websocket/index.ts`), universal proxy gateway (`cors-proxy.js`), NodeReal RPC connectivity.

## System Architecture

- **UI Layer (`app/`, `components/`)** Feature-specific screens share a consistent design system defined in `theme/` with gradient controls, glassmorphism, and adaptive typography.
- **Hook Layer (`hooks/`)** Protocol hooks encapsulate data fetching, transaction orchestration, polling, and optimistic updates (e.g., `useAriesLendingProduction.ts`, `useMerklePositions.ts`).
- **Service Layer (`services/`)** Typed service modules isolate SDK clients, RPC calls, Supabase operations, and validation (e.g., `ariesSDKService.ts`, `panoraSwapService.ts`, `walletAuthService.ts`).
- **Utility Layer (`utils/`)** Deterministic math, risk analysis, formatting, and logging (e.g., `utils/ariesRiskCalculationsComplete.ts`, `utils/healthFactorSimulation.ts`, `utils/logger.ts`).
- **Backend Surfaces** Optional websocket broadcast (`PrimeXWebSocketServer` in `server/websocket/index.ts`) and Supabase edge function `supabase/functions/portfolio-sync/index.ts` keep client state synchronized with on-chain and off-chain data sources.

## Aries Lend & Borrow

- **Profile Onboarding** `useAriesLendingProduction.ts` checks for `profile::Profile` via `ariesSDKService.hasProfile`, prompting the user to initialize through `ariesSDKService.buildInitializeProfileTransaction()` targeting controller `0x9770fa9c725cbd97eb50b2be5f7416efdfd1f1554beb0750d4dae4c64e860da3`.
- **Complete Reserve Catalog** `config/ariesAssetsComplete.ts` mirrors the October 2025 Aries market list, including paired and isolated pools, risk parameters, fee schedules, and asset metadata.
- **Transaction Workflows** Supply, withdraw, borrow, repay, and reward actions are surfaced by dedicated modals under `components/aries/modals/` with wallet-safe payloads and validation.
- **Risk Simulation** Health factor, max borrow, and safe withdrawal simulations leverage `utils/ariesRiskCalculationsComplete.ts` and `utils/healthFactorSimulation.ts` to provide before/after insights in every modal.
- **Data Refresh & Analytics** Reserve metrics, APRs, and price feeds are aggregated through `services/ariesSDKService.ts`, `services/ariesMarketDataService.ts`, and `services/ariesPriceService.ts` with intelligent caching and NodeReal RPC fallbacks.

## Additional Protocol Modules

- **Merkle Perpetual Futures** Trading engine backed by on-chain validation, TP/SL management (`components/SLTPEditorModal.tsx`), and event streaming via `hooks/useMerkleEvents.ts`.
- **Panora Token Swaps** Precise slippage, path discovery, and transaction simulation through `services/panoraSwapSDK.ts`, exposing reusable swap UI controls.
- **Amnis Liquid Staking** Dual-token strategy management with analytics in `components/StakingDashboard.tsx`, service abstractions in `services/amnisService.ts` and `services/amnisEnhancedService.ts`.
- **Market Data & Charts** Multi-source price feeds with caching, fallback logic, and performant chart rendering via `components/CandleChart.tsx` and sparkline components.

## Data, Persistence & Observability

- **Supabase Edge Functions** `supabase/functions/portfolio-sync/index.ts` synchronizes supply/borrow positions, calculates PnL, and stores historical snapshots with RLS-secured tables defined in `supabase/migrations/`.
- **PrimeX WebSocket Server** `server/websocket/index.ts` broadcasts balance updates, liquidation alerts, and health factor drift to subscribed clients using structured payloads.
- **Universal Proxy Gateway** `cors-proxy.js` unifies outbound requests for CoinGecko, Aries, Pyth, NodeReal, and Sentry with API key injection and rate limiting.
- **Structured Logging** `utils/logger.ts` normalizes log formatting across services and hooks for consistent debugging in development and production builds.

## Directory Reference

```text
PrimeX/
 app/                    # Expo Router navigation & providers
 components/             # Reusable protocol UIs (trading, staking, lending)
 config/                 # Network, asset, and feature configuration
 hooks/                  # Protocol hooks (Merkle, Aries, Supabase, websocket)
 services/               # SDK wrappers, data services, auth
 supabase/               # SQL migrations, edge functions, config
 server/                 # Optional websocket broadcaster
 theme/                  # Design tokens, colors, typography
 utils/                  # Math, formatting, validation, logging helpers
 __tests__/              # Jest suites for hooks, services, and utilities
```

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Copy environment template**
   ```bash
   cp .env.example .env
   ```

3. **Run Expo development server**
   ```bash
   npm run dev
   ```
   Use the Expo CLI prompt to launch iOS (`i`), Android (`a`), or web (`w`) targets, or scan the QR code with Expo Go.

4. **Run type checks and linting (optional but recommended)**
   ```bash
   npm run typecheck
   npm run lint
   ```

## Environment Configuration

Populate `.env` with Aptos RPC endpoints, contract addresses, and optional integrations:

```bash
EXPO_PUBLIC_APTOS_NETWORK=mainnet
EXPO_PUBLIC_APTOS_NODE_URL=https://fullnode.mainnet.aptoslabs.com/v1
EXPO_PUBLIC_MERKLE_CONTRACT_ADDRESS=0x5ae6789dd2fec1a9ec9cccfb3acaf12e93d432f0a3a42c92fe1a9d490b7bbc06
EXPO_PUBLIC_APP_NAME=PrimeX
EXPO_PUBLIC_APP_SCHEME=primex
EXPO_PUBLIC_DEEP_LINK_BASE=primex://
EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID=<optional_walletconnect_project_id>
```

Set API keys for CoinGecko, Aries, NodeReal, Pyth, and Sentry inside `cors-proxy.js` or secure environment stores when deploying server components.

## Optional Local Services

- **Universal Proxy Gateway**
  ```bash
  npm run proxy
  ```
  Proxies CoinGecko, Pyth, Aries, NodeReal, and other third-party APIs with centralized rate limiting.

- **WebSocket Telemetry Server**
  ```bash
  node server/websocket/index.ts
  ```
  Streams live balance, PnL, and alert data to the clients websocket hook (`hooks/useWebSocket.ts`).

- **Supabase Local Stack**
  ```bash
  supabase start
  ```
  Executes migrations in `supabase/migrations/` and deploys edge functions for end-to-end portfolio synchronization.

## Testing & Quality

- **Unit & Integration Tests**
  ```bash
  npm run test
  npm run test:watch
  npm run test:coverage
  ```
  Coverage spans hooks (`__tests__/hooks/`), services (`__tests__/services/`), and protocol math utilities.

- **Static Analysis**
  ```bash
  npm run lint
  npm run typecheck
  ```
  Enforces strict ESLint + TypeScript gates for every PR.

## Deployment

- **Static Web Build**
  ```bash
  npm run build:web
  ```
  Outputs `dist/` for deployment to Vercel, Netlify, or S3.

- **Expo Application Services (EAS)**
  ```bash
  eas build --platform ios --profile production
  eas build --platform android --profile production
  ```
  Requires configured `eas.json` with credentials and provisioning.

- **Docker & Infra**
  - `docker/docker-compose.yml` for local multi-service orchestration.
  - `docker/docker-compose.production.yml` + `docker/nginx/nginx.conf` for production-ready reverse proxying.


## Core Capabilities

### Leveraged Perpetual Futures Trading

**Merkle Trade Protocol Integration**

Production implementation of Merkle Trade's mainnet perpetual futures contracts with complete feature parity to the official platform. The trading engine supports five cryptocurrency pairs with USDC collateral:

- **Supported Markets**: APT/USDC, BTC/USDC, ETH/USDC, SOL/USDC, DOGE/USDC
- **Leverage Range**: 3x to 150x with dynamic risk-adjusted position sizing
- **Minimum Collateral**: 2 USDC per position (PAY)
- **Maximum Position**: 1,500,000 USDC
- **Position Formula**: Position Size = PAY (Collateral) × Leverage

**Smart Contract Architecture**

All trading operations execute against mainnet contract `0x5ae6789dd2fec1a9ec9cccfb3acaf12e93d432f0a3a42c92fe1a9d490b7bbc06` using the `managed_trading` module. Type arguments follow strict ordering: `[PairType, CollateralType]` where pair types reference `pair_types::APT_USD` structure and collateral uses `fa_box::W_USDC` wrapped fungible asset standard.

**Validation System**

Pre-transaction validation engine implements identical business logic to Merkle's official interface:
- Wallet connection verification and balance checks
- Minimum and maximum collateral bounds enforcement
- Position size calculation validation (PAY × leverage formula)
- Market price availability confirmation via multiple oracles
- Leverage limit enforcement within 3x-150x range
- Transaction payload structural integrity verification

**Position Management Features**
- Opening positions with market execution
- Closing positions with partial or full exit options
- Take-profit and stop-loss management via `update_position_tp_sl_v3` function
- Real-time profit and loss calculations with mark-to-market pricing
- Position history tracking and event streaming via blockchain subscriptions
- Advanced risk management with position monitoring

**Technical Implementation**
- [components/TradingInterface.tsx](cci:7://file:///c:/Users/Administrator/Downloads/TRADE_APP_UI/components/TradingInterface.tsx:0:0-0:0) (106KB): Professional trading UI with 15+ validation states
- [hooks/useMerkleTrading.ts](cci:7://file:///c:/Users/Administrator/Downloads/TRADE_APP_UI/hooks/useMerkleTrading.ts:0:0-0:0) (8.7KB): Transaction construction and execution logic
- [hooks/useMerklePositions.ts](cci:7://file:///c:/Users/Administrator/Downloads/TRADE_APP_UI/hooks/useMerklePositions.ts:0:0-0:0) (7.3KB): Portfolio state management with automatic refresh
- [hooks/useMerkleEvents.ts](cci:7://file:///c:/Users/Administrator/Downloads/TRADE_APP_UI/hooks/useMerkleEvents.ts:0:0-0:0) (9.9KB): Real-time blockchain event streaming
- [services/merkleSdkService.ts](cci:7://file:///c:/Users/Administrator/Downloads/TRADE_APP_UI/services/merkleSdkService.ts:0:0-0:0) (16.6KB): Official Merkle Trade SDK integration
- [components/SLTPEditorModal.tsx](cci:7://file:///c:/Users/Administrator/Downloads/TRADE_APP_UI/components/SLTPEditorModal.tsx:0:0-0:0) (17.4KB): Advanced risk management interface
- [components/ClosePositionModal.tsx](cci:7://file:///c:/Users/Administrator/Downloads/TRADE_APP_UI/components/ClosePositionModal.tsx:0:0-0:0) (15.8KB): Position exit workflow

### Automated Market Making

**Panora Exchange Integration**

Full-stack integration with Panora's automated market maker protocol providing instant token swaps across the Aptos ecosystem:

- Real-time quote aggregation with intelligent routing
- Customizable slippage tolerance (0.1% to 5%)
- Pre-execution transaction simulation on Aptos fullnode
- Multi-hop routing optimization for best execution
- Popular trading pair recommendations with liquidity depth
- Comprehensive fee breakdown and price impact analysis

**Security Architecture**

Multi-layered transaction validation before blockchain submission:
1. Transaction data payload validation against expected router addresses
2. Function signature verification for approved contract methods
3. Argument type checking and bounds validation
4. Aptos fullnode simulation execution to prevent failures
5. Gas estimation and transaction fee preview
6. Final wallet signature request with user confirmation

**Implementation Stack**
- [components/SwapInterface.tsx](cci:7://file:///c:/Users/Administrator/Downloads/TRADE_APP_UI/components/SwapInterface.tsx:0:0-0:0) (33.4KB): Feature-complete swap interface with modern UI
- [services/panoraSwapSDK.ts](cci:7://file:///c:/Users/Administrator/Downloads/TRADE_APP_UI/services/panoraSwapSDK.ts:0:0-0:0) (22.6KB): SDK wrapper with comprehensive error handling
- [services/panoraSwapService.ts](cci:7://file:///c:/Users/Administrator/Downloads/TRADE_APP_UI/services/panoraSwapService.ts:0:0-0:0) (12.6KB): Quote aggregation and validation logic
- Integration with WalletProvider for secure transaction signing

### Liquid Staking Infrastructure

**Amnis Finance Protocol Integration**

Native integration with Amnis Finance liquid staking protocol on Aptos mainnet, enabling users to earn staking rewards while maintaining liquidity:

**Dual-Token Model**
- **amAPT Token**: Liquid staking derivative providing instant liquidity and tradability
- **stAPT Token**: Auto-compounding stake position maximizing long-term yield
- Flexible conversion between token types based on strategy

**Staking Features**
- Stake APT to receive liquid staking derivatives
- Unstake operations with protocol-defined waiting periods
- Real-time portfolio value tracking across both token types
- APY monitoring with historical performance analytics
- Integration with trading features for leveraged staking strategies
- Balance tracking and transaction history

**Technical Implementation**
- [services/amnisService.ts](cci:7://file:///c:/Users/Administrator/Downloads/TRADE_APP_UI/services/amnisService.ts:0:0-0:0) (17.8KB): Core staking operations and protocol interaction
- [services/amnisEnhancedService.ts](cci:7://file:///c:/Users/Administrator/Downloads/TRADE_APP_UI/services/amnisEnhancedService.ts:0:0-0:0) (26.2KB): Advanced staking features and analytics
- [components/StakingInterface.tsx](cci:7://file:///c:/Users/Administrator/Downloads/TRADE_APP_UI/components/StakingInterface.tsx:0:0-0:0) (19.1KB): Professional staking UI
- [components/StakingDashboard.tsx](cci:7://file:///c:/Users/Administrator/Downloads/TRADE_APP_UI/components/StakingDashboard.tsx:0:0-0:0) (20.2KB): Portfolio overview and analytics
- [components/StakingHub.tsx](cci:7://file:///c:/Users/Administrator/Downloads/TRADE_APP_UI/components/StakingHub.tsx:0:0-0:0) (3.1KB): Navigation and feature discovery
- Mainnet-only deployment (Amnis Finance operates exclusively on mainnet)

### Lending & Borrowing Infrastructure

**Aries Markets Protocol Integration**

Full-featured lending and borrowing platform integrated with Aries Markets, the leading DeFi lending protocol on Aptos with $75M+ TVL:

**Protocol Architecture**
- **Paired Pools**: Cross-margin lending with shared liquidity across multiple assets
- **Isolated Pools**: Risk-isolated markets for single-asset lending/borrowing
- **Dynamic Interest Rates**: Piecewise linear model with optimal utilization kink point
- **Health Factor System**: Real-time liquidation risk monitoring and simulation

**Supported Assets**
- APT, USDC, USDT, WBTC, SOL for paired pools
- Wrapped assets (AWUSDC, AWUSDT, AWWBTC) for isolated markets
- 20+ total reserve markets with independent risk parameters

**Core Features**
- Supply assets to earn interest with dynamic APR (2-30% range)
- Borrow against collateral with health factor protection
- Real-time utilization tracking and APR calculations
- Protocol overview dashboard with TVL, borrowing, and utilization metrics
- User portfolio management with position breakdown
- Safety validation before every transaction

**Risk Management**
- Health Factor thresholds: Safe (≥1.5), Warning (1.2-1.5), Danger (1.1-1.2), Liquidation (<1.0)
- Max LTV enforcement per asset (typically 75%)
- Liquidation threshold monitoring (typically 80%)
- Action validation with projected health factor simulation

**Technical Implementation**
- [services/ariesLendingService.ts](cci:7://file:///c:/Users/Administrator/Downloads/TRADE_APP_UI/services/ariesLendingService.ts:0:0-0:0) (516 lines): Complete Aries protocol integration
- [components/LendDashboard.tsx](cci:7://file:///c:/Users/Administrator/Downloads/TRADE_APP_UI/components/LendDashboard.tsx:0:0-0:0) (510 lines): Professional lending UI
- [hooks/useAriesLending.ts](cci:7://file:///c:/Users/Administrator/Downloads/TRADE_APP_UI/hooks/useAriesLending.ts:0:0-0:0) (230 lines): Data fetching with auto-refresh
- [utils/ariesMath.ts](cci:7://file:///c:/Users/Administrator/Downloads/TRADE_APP_UI/utils/ariesMath.ts:0:0-0:0) (420 lines): Interest rate and health factor calculations
- [types/aries.ts](cci:7://file:///c:/Users/Administrator/Downloads/TRADE_APP_UI/types/aries.ts:0:0-0:0) (220 lines): Complete TypeScript definitions

### Multi-Wallet Connectivity System

**Universal Wallet Infrastructure**

Production-ready wallet connectivity supporting multiple connection methods and wallet providers with persistent session management:

**Supported Wallets**
- **Petra Wallet**: Primary integration with browser extension and mobile deeplink
- **Martian Wallet**: Multi-chain support with advanced features
- **Pontem Wallet**: Aptos-native solution optimized for ecosystem
- **Fewcha Wallet**: Mobile-optimized wallet with streamlined UX

**Connection Methods**

Browser Extension Mode:
- Automatic detection of installed wallet extensions
- Direct window object injection via `window.aptos` interface
- Real-time connection state monitoring and updates
- Account change event listeners for multi-account support
- Network change detection with automatic reconnection

Mobile Deeplink Mode:
- Universal link generation with custom scheme `prismx://`
- Wallet-specific deeplink routing and callback handling
- Session persistence across application restarts
- Graceful fallback when extension unavailable

**Session Management Architecture**

Persistent wallet sessions implemented with AsyncStorage:
- Automatic reconnection on application launch
- Encrypted session data storage for security
- Graceful session invalidation on network errors
- Manual disconnect with complete state cleanup
- Cross-platform session synchronization (iOS, Android, Web)

**Transaction Signing Compatibility**

Petra-compatible transaction payload structure ensuring reliability:
```typescript
{
  type: 'entry_function_payload',
  function: '0x5ae6...::managed_trading::place_order_v3',
  type_arguments: string[],  // Always array, never undefined
  arguments: any[]            // Always array, never undefined
}
```

Direct transmission to [window.aptos.signAndSubmitTransaction](cci:1://file:///c:/Users/Administrator/Downloads/TRADE_APP_UI/app/providers/WalletProvider.tsx:31:6-31:75) without intermediate wrappers or transformations to maintain compatibility with Petra's expected API structure.

**Implementation**
- [app/providers/WalletProvider.tsx](cci:7://file:///c:/Users/Administrator/Downloads/TRADE_APP_UI/app/providers/WalletProvider.tsx:0:0-0:0) (442 lines): Core wallet context and logic
- [components/WalletConnection.tsx](cci:7://file:///c:/Users/Administrator/Downloads/TRADE_APP_UI/components/WalletConnection.tsx:0:0-0:0) (10.2KB): Connection interface and UI
- AsyncStorage integration for encrypted session persistence
- WalletConnect v2 protocol support for broader compatibility

### Market Data and Analytics

**Real-Time Price Infrastructure**

Multi-source market data aggregation with intelligent fallback mechanisms:

**Data Sources**
- **CoinGecko API**: Primary price feed with 5-minute granularity and historical data
- **Fallback Caching**: Local price caching for offline resilience and reduced latency
- **Symbol Mapping**: Internal `APT_USD` format to external `APT/USDC` display conversion

**Native Charting Engine**

Custom-built React Native SVG charting eliminating WebView dependencies:
- Professional candlestick rendering with OHLCV data
- Volume overlay with normalized scaling and color coding
- Multiple timeframe support (1H, 4H, 1D, 1W, 1M)
- Touch-responsive crosshair with real-time price tooltips
- Optimized rendering for mobile devices with 60fps animations
- Memory-efficient data structure management for large datasets

**Market Statistics**
- 24-hour price change tracking with percentage calculations
- Volume analysis and trend indicators
- High and low price bounds for risk assessment
- Real-time ticker updates with 5-second refresh intervals
- Market sentiment indicators

**Technical Implementation**
- [services/realMarketDataService.ts](cci:7://file:///c:/Users/Administrator/Downloads/TRADE_APP_UI/services/realMarketDataService.ts:0:0-0:0) (10.4KB): CoinGecko integration and caching
- [utils/priceService.ts](cci:7://file:///c:/Users/Administrator/Downloads/TRADE_APP_UI/utils/priceService.ts:0:0-0:0) (11.8KB): Price aggregation and normalization logic
- [components/CandleChart.tsx](cci:7://file:///c:/Users/Administrator/Downloads/TRADE_APP_UI/components/CandleChart.tsx:0:0-0:0) (13.1KB): Native SVG charting component
- [utils/chartDataConverter.ts](cci:7://file:///c:/Users/Administrator/Downloads/TRADE_APP_UI/utils/chartDataConverter.ts:0:0-0:0) (3.5KB): Data transformation utilities

## Technical Architecture

### Framework Foundation

**Core Technology Stack**
- **React Native 0.79.5**: Latest stable release with New Architecture support enabled
- **Expo SDK 53**: Managed workflow with custom native module support
- **TypeScript 5.8**: Strict mode with comprehensive type coverage across codebase
- **Expo Router 5.1**: File-based routing with type-safe navigation and deep linking

**New Architecture Benefits**
- JSI (JavaScript Interface) for synchronous native calls without bridge
- Turbo Modules for lazy-loaded native code and reduced bundle size
- Fabric renderer for improved UI performance and concurrent rendering
- Memory efficiency improvements and faster app startup

### Blockchain Integration Layer

**Aptos SDK Integration**
```
@aptos-labs/ts-sdk ^1.39.0
├── Account management and cryptographic operations
├── Transaction construction, signing, and simulation
├── Event subscription and WebSocket streaming
├── Type-safe contract interaction via generated types
└── Network client configuration with retry logic

@merkletrade/ts-sdk ^1.0.3
├── Official Merkle Trade contract bindings
├── Position and order management utilities
├── Type definitions for all contract structures
└── Helper functions for common trading operations

@panoraexchange/swap-sdk ^1.3.0
├── Swap routing and quote aggregation
├── Transaction data generation with validation
├── Slippage calculation utilities
└── Multi-hop path optimization
```

**Network Configuration**

Multi-network support with environment-based selection:
- Mainnet: `https://fullnode.mainnet.aptoslabs.com/v1`
- Testnet: `https://fullnode.testnet.aptoslabs.com/v1`
- Custom RPC endpoints via environment variables
- API key management for enhanced rate limits
- Automatic failover to backup nodes

### State Management and UI

**State Architecture**
- **Zustand 5.0.8**: Lightweight state management without boilerplate
- **React Context**: Wallet and theme providers
- **AsyncStorage**: Persistent local storage for settings and sessions
- **In-Memory Caching**: Price and market data optimization

**Animation and Graphics**
- **React Native Reanimated 3.17**: 60fps animations on UI thread
- **react-native-svg 15.11**: Vector graphics for charts and icons
- **Expo Linear Gradient 14.1**: Smooth gradient backgrounds
- **Lucide React Native 0.475**: Comprehensive icon system

**UI Components**
- [components/GradientPillButton.tsx](cci:7://file:///c:/Users/Administrator/Downloads/TRADE_APP_UI/components/GradientPillButton.tsx:0:0-0:0): Animated button with gradient effects
- [components/ModalSheet.tsx](cci:7://file:///c:/Users/Administrator/Downloads/TRADE_APP_UI/components/ModalSheet.tsx:0:0-0:0): Bottom sheet modal for mobile UX
- [components/SegmentedTabs.tsx](cci:7://file:///c:/Users/Administrator/Downloads/TRADE_APP_UI/components/SegmentedTabs.tsx:0:0-0:0): Tab navigation component
- [components/Card.tsx](cci:7://file:///c:/Users/Administrator/Downloads/TRADE_APP_UI/components/Card.tsx:0:0-0:0): Reusable card container with theming

### Project Structure

```
TRADE_APP_UI/
│
├── app/                                 # Expo Router navigation
│   ├── _layout.tsx                     # Root layout with providers
│   ├── (tabs)/                         # Tab-based navigation
│   │   ├── _layout.tsx                 # Tab bar configuration
│   │   ├── index.tsx                   # Dashboard/home screen
│   │   ├── trade.tsx                   # Trading interface (23.9KB)
│   │   ├── market.tsx                  # Market overview (15.2KB)
│   │   ├── wallet.tsx                  # Wallet management (12.7KB)
│   │   ├── deposit.tsx                 # Asset deposits (18.3KB)
│   │   ├── withdraw.tsx                # Withdrawals (15.6KB)
│   │   └── settings.tsx                # App settings (11.8KB)
│   ├── trading/                        # Trading sub-routes
│   └── providers/
│       └── WalletProvider.tsx          # Global wallet context
│
├── components/                          # Reusable UI components
│   ├── TradingInterface.tsx            # Main trading UI (106.2KB)
│   ├── SwapInterface.tsx               # Token swap UI (33.4KB)
│   ├── StakingInterface.tsx            # Staking UI (19.1KB)
│   ├── StakingDashboard.tsx            # Staking overview (20.2KB)
│   ├── WalletConnection.tsx            # Wallet connect modal (10.2KB)
│   ├── CandleChart.tsx                 # SVG charting (13.1KB)
│   ├── PositionsList.tsx               # Portfolio positions (10.5KB)
│   ├── PositionCard.tsx                # Individual position (10.6KB)
│   ├── ClosePositionModal.tsx          # Position exit (15.8KB)
│   ├── SLTPEditorModal.tsx             # TP/SL editor (17.4KB)
│   ├── GradientPillButton.tsx          # Custom button (4.0KB)
│   └── ... (14 more components)
│
├── config/                              # Configuration management
│   ├── constants.ts                    # Blockchain and app constants
│   └── appConfig.ts                    # Feature flags and settings
│
├── hooks/                               # Custom React hooks
│   ├── useMerkleTrading.ts             # Trading operations (8.7KB)
│   ├── useMerklePositions.ts           # Position management (7.3KB)
│   ├── useMerkleEvents.ts              # Event streaming (9.9KB)
│   ├── useResponsive.ts                # Responsive design (2.3KB)
│   └── useFrameworkReady.ts            # App initialization
│
├── services/                            # Business logic layer
│   ├── merkleSdkService.ts             # Merkle SDK wrapper (16.6KB)
│   ├── merkleService.ts                # Core Merkle logic (1.4KB)
│   ├── panoraSwapSDK.ts                # Panora SDK wrapper (22.6KB)
│   ├── panoraSwapService.ts            # Swap logic (12.6KB)
│   ├── amnisService.ts                 # Amnis staking (17.8KB)
│   ├── amnisEnhancedService.ts         # Advanced staking (26.2KB)
│   ├── realMarketDataService.ts        # Market data (10.4KB)
│   └── balanceService.ts               # Balance queries (3.1KB)
│
├── utils/                               # Utility functions
│   ├── aptosClient.ts                  # Aptos client config (10.6KB)
│   ├── priceService.ts                 # Price aggregation (11.8KB)
│   ├── logger.ts                       # Structured logging (2.7KB)
│   ├── number.ts                       # Number formatting (2.0KB)
│   └── chartDataConverter.ts           # Chart data utils (3.5KB)
│
├── theme/                               # Design system
│   ├── colors.ts                       # Color palette
│   ├── typography.ts                   # Font system
│   ├── spacing.ts                      # Layout spacing
│   ├── pageAccents.ts                  # Page-specific color schemes
│   ├── useAccent.ts                    # Accent color hook
│   ├── ThemeProvider.tsx               # Theme context provider
│   └── index.ts                        # Theme exports
│
├── types/                               # TypeScript definitions
│   └── aptos.ts                        # Aptos type extensions
│
├── store/                               # Zustand stores
│   └── useStore.ts                     # Global state
│
├── scripts/                             # Automation scripts
│   └── start-proxy.bat                 # Windows proxy launcher
│
├── server/                              # Backend proxy (optional)
│   ├── proxy.js                        # Express API gateway
│   └── package.json                    # Server dependencies
│
├── .env                                 # Environment configuration
├── .env.example                         # Environment template
├── app.json                             # Expo configuration
├── package.json                         # Project dependencies
├── tsconfig.json                        # TypeScript config
└── README.md                            # This file
```

## UI/UX Design System

### Page-Specific Color Schemes

Each major feature has a unique color identity while maintaining consistent layout and component structure:

**Leverage Trading - Orange/Amber Theme**
- Primary: `#F97316` (orange-500)
- Used for: Merkle Trade perpetual futures interface
- Accent gradients: Orange to Amber
- Conveys: Energy, action, high-stakes trading

**Liquid Staking - Blue/Sky Theme**
- Primary: `#0EA5E9` (sky-500)
- Used for: Amnis Finance liquid staking
- Accent gradients: Sky to Cyan
- Conveys: Trust, stability, long-term growth

**Lend & Borrow - Purple/Violet Theme**
- Primary: `#A855F7` (purple-500)
- Used for: Aries Markets lending protocol
- Accent gradients: Purple to Violet
- Conveys: Wealth, sophistication, premium DeFi

**Swap Tokens - Cyan/Teal Theme**
- Primary: `#22D3EE` (cyan-400)
- Used for: Panora Exchange token swaps
- Accent gradients: Cyan to Teal
- Conveys: Fresh, modern, fast transactions

### Consistent UI Elements

All pages share identical layout patterns:
- Hero card grids with protocol overview metrics
- Glassmorphic component backgrounds
- Gradient accent cards and buttons
- Loading states with page-specific colors
- Interactive elements with haptic feedback
- Responsive spacing and typography
- Professional data visualization

Implementation: `theme/pageAccents.ts` provides centralized color management with `PAGE_ACCENTS` constant and `usePageAccent()` hook.

## Installation and Setup

### Prerequisites

**Required Software**
- Node.js 18.0 or higher with npm 9.0+
- Git for version control
- Code editor with TypeScript support (VS Code recommended)

**Platform-Specific Requirements**
- **iOS Development**: macOS with Xcode 14+ and iOS Simulator
- **Android Development**: Android Studio with API level 31+ and AVD Manager
- **Web Development**: Modern browser (Chrome, Firefox, Safari)

**Optional Tools**
- Petra Wallet browser extension for wallet testing
- Aptos CLI for blockchain debugging
- React Native Debugger for advanced debugging

### Installation Steps

**1. Clone Repository**
```bash
git clone <repository-url>
cd TRADE_APP_UI
```

**2. Install Dependencies**
```bash
npm install
```

This installs all required packages including:
- React Native and Expo SDK
- Aptos blockchain SDKs
- UI component libraries
- Development tools and linters

**3. Environment Configuration**

Copy the example environment file:
```bash
cp .env.example .env
```

Edit [.env](cci:7://file:///c:/Users/Administrator/Downloads/TRADE_APP_UI/.env:0:0-0:0) with your configuration:
```bash
# Aptos Network Configuration
EXPO_PUBLIC_APTOS_NETWORK=mainnet
EXPO_PUBLIC_APTOS_NODE_URL=https://fullnode.mainnet.aptoslabs.com/v1
EXPO_PUBLIC_APTOS_MAINNET_API_KEY=your_mainnet_api_key
EXPO_PUBLIC_APTOS_TESTNET_API_KEY=your_testnet_api_key

# Smart Contract Addresses
EXPO_PUBLIC_MERKLE_CONTRACT_ADDRESS=0x5ae6789dd2fec1a9ec9cccfb3acaf12e93d432f0a3a42c92fe1a9d490b7bbc06

# Application Configuration
EXPO_PUBLIC_APP_NAME=PrismX
EXPO_PUBLIC_APP_SCHEME=prismx
EXPO_PUBLIC_DEEP_LINK_BASE=prismx://

# Optional: WalletConnect Support
EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

**4. Start Development Server**
```bash
npm run dev
```

This launches the Expo development server with:
- Metro bundler for JavaScript compilation
- Hot module reloading for instant updates
- Interactive command menu for platform selection

**5. Launch on Platform**

From the development server terminal:
- Press `i` for iOS Simulator (macOS only)
- Press `a` for Android Emulator
- Press `w` for web browser
- Scan QR code with Expo Go app for physical device

### Optional: Proxy Server Setup

The proxy server provides CORS handling and API rate limiting for production deployments.

**Windows (Automated)**
```bash
scripts\start-proxy.bat
```

**All Platforms (Manual)**
```bash
cd server
npm install
npm start
```

Server runs on `http://localhost:3001` by default. Configure port in `server/.env`:
```bash
PROXY_PORT=3001
NODE_ENV=development
```

## Configuration Reference

### Application Constants

**config/constants.ts** - Core configuration management:

```typescript
// Aptos Network Settings
export const APTOS_CONFIG = {
  network: 'mainnet',  // mainnet | testnet | devnet
  nodeUrl: 'https://fullnode.mainnet.aptoslabs.com/v1',
  indexerUrl: 'https://indexer.mainnet.aptoslabs.com/v1',
  apiKeys: { mainnet: '...', testnet: '...' }
};

// Merkle Trade Configuration
export const MERKLE_CONFIG = {
  contractAddress: '0x5ae6789dd2fec1a9ec9cccfb3acaf12e93d432f0a3a42c92fe1a9d490b7bbc06',
  tradingModule: 'managed_trading',
  tradingCalcModule: 'trading_calc'
};

// Market Definitions
export const MARKETS = {
  'APT_USD': {
    name: 'APT/USDC',
    displayName: 'APT/USDC',
    baseAsset: 'APT',
    quoteAsset: 'USDC',
    decimals: 8,
    minSize: 2,
    maxLeverage: 150,
    typeArguments: [MERKLE_ASSET_TYPES.APT_USD, MERKLE_ASSET_TYPES.USDC]
  },
  // ... BTC, ETH, SOL, DOGE configurations
};

// Amnis Finance Configuration
export const AMNIS_CONFIG = {
  contractAddress: '0x111ae3e5bc816a5e63c2da97d0aa3886519e0cd5e4b046659fa35796bd11542a',
  stakingModule: 'router',
  amapt: {
    type: '0x111ae3e5bc816a5e63c2da97d0aa3886519e0cd5e4b046659fa35796bd11542a::amapt_token::AmnisApt',
    decimals: 8
  },
  stapt: {
    type: '0x111ae3e5bc816a5e63c2da97d0aa3886519e0cd5e4b046659fa35796bd11542a::stapt_token::StakedApt',
    decimals: 8
  }
};
```

### UI Configuration

```typescript
export const UI_CONFIG = {
  refreshIntervals: {
    positions: 30000,   // 30 seconds
    prices: 5000,       // 5 seconds
    events: 60000,      // 1 minute
    portfolio: 15000    // 15 seconds
  },
  animations: {
    fast: 150,
    normal: 300,
    slow: 500
  },
  colors: {
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    primary: '#6366f1'
  }
};
```

## Development Workflow

### Available Scripts

**Development**
```bash
npm run dev           # Start Expo development server
npm run typecheck     # TypeScript type checking
npm run lint          # ESLint code quality check
```

**Production**
```bash
npm run build:web     # Build web production bundle
```

**Server Operations**
```bash
cd server
npm start             # Start proxy server (production)
npm run dev           # Start with auto-reload (development)
```

### Development Best Practices

**Type Safety**
- All components use strict TypeScript
- No `any` types without explicit justification
- Comprehensive interface definitions for blockchain interactions

**Code Organization**
- Components under 500 lines (TradingInterface exception due to complexity)
- Single responsibility principle per module
- Separation of UI, business logic, and blockchain interaction

**Performance Optimization**
- React Native Reanimated for 60fps animations
- Memoization of expensive computations
- Lazy loading of non-critical components
- Efficient re-render prevention with React.memo

**Testing Strategy**
- Manual testing on iOS, Android, and Web platforms
- Wallet integration testing with Petra testnet
- Transaction simulation before mainnet deployment
- Error boundary implementation for graceful failures

## Security Considerations

### Wallet Security

**Private Key Management**
- Private keys never stored in application
- All signing operations delegated to wallet providers
- Session tokens encrypted in AsyncStorage
- Automatic session invalidation on security events

**Transaction Safety**
- Pre-execution simulation on Aptos fullnode
- Comprehensive payload validation before signing
- Gas estimation and fee preview
- User confirmation required for all transactions

### Smart Contract Interaction

**Type Argument Validation**
- Strict type checking for all contract calls
- Verification of type argument ordering: [PairType, CollateralType]
- Validation of contract addresses before execution
- Function name verification against known ABI

**Error Handling**
- Graceful degradation on network failures
- User-friendly error messages for blockchain errors
- Automatic retry logic with exponential backoff
- Comprehensive logging for debugging

### API Security

**Environment Variables**
- No secrets committed to version control
- Separate keys for development and production
- API key rotation support
- Rate limiting on proxy server

**Network Security**
- HTTPS enforcement for all external requests
- Certificate pinning for critical APIs
- Request timeout configuration
- CORS handling via proxy server

## Troubleshooting Guide

### Common Issues

**Wallet Connection Failures**

Issue: Petra wallet extension not detected
```
Solution:
1. Verify Petra extension is installed and enabled
2. Check browser console for window.aptos object
3. Reload application and retry connection
4. Clear browser cache and local storage
```

Issue: Mobile deeplink not working
```
Solution:
1. Verify prismx:// scheme in app.json
2. Check wallet app is installed on device
3. Test deeplink with: adb shell am start -W -a android.intent.action.VIEW -d "prismx://connect"
4. Verify callback URL handling in WalletProvider
```

**Transaction Execution Errors**

Issue: "Simulation failed" error
```
Solution:
1. Verify sufficient APT balance for gas fees
2. Check collateral amount meets 2 USDC minimum
3. Ensure position size calculation is correct (PAY × leverage)
4. Verify market price is available from oracle
5. Check leverage is within 3x-150x bounds
```

Issue: "Type resolution failure" error
```
Solution:
1. Verify type arguments order: [PairType, CollateralType]
2. Check pair type uses pair_types module (e.g., pair_types::APT_USD)
3. Verify collateral type uses fa_box module (e.g., fa_box::W_USDC)
4. Ensure contract address matches mainnet deployment
```

**Market Data Issues**

Issue: Charts not loading
```
Solution:
1. Check CoinGecko API rate limits
2. Verify symbol mapping in realMarketDataService.ts
3. Ensure internal format (APT_USD) matches configuration
4. Check network connectivity and fallback caching
```

Issue: Price display inconsistency
```
Solution:
1. Verify decimal conversion (APT = 8 decimals, USDC = 6 decimals)
2. Check price formatting in number.ts utilities
3. Ensure consistent use of microunits in calculations
4. Validate price service aggregation logic
```

**Build and Deployment Issues**

Issue: Metro bundler errors
```
Solution:
1. Clear Metro cache: npx expo start -c
2. Delete node_modules and reinstall: rm -rf node_modules && npm install
3. Clear watchman: watchman watch-del-all
4. Reset Expo cache: rm -rf .expo
```

Issue: TypeScript compilation errors
```
Solution:
1. Run type check: npm run typecheck
2. Verify tsconfig.json configuration
3. Check for missing type definitions
4. Update @types packages to latest versions
```

### Network Configuration

**Mainnet vs Testnet**

Critical: Merkle Trade and Amnis Finance only exist on **mainnet**. Attempting to use testnet will result in contract resolution failures.

Configuration for mainnet:
```bash
EXPO_PUBLIC_APTOS_NETWORK=mainnet
EXPO_PUBLIC_APTOS_NODE_URL=https://fullnode.mainnet.aptoslabs.com/v1
```

For Panora swaps and basic wallet testing, testnet can be used:
```bash
EXPO_PUBLIC_APTOS_NETWORK=testnet
EXPO_PUBLIC_APTOS_NODE_URL=https://fullnode.testnet.aptoslabs.com/v1
```

## Deployment

### Production Build

**Web Deployment**
```bash
npm run build:web
```

Output directory: `dist/` - Deploy to static hosting (Vercel, Netlify, AWS S3)

**Mobile Deployment**

iOS (requires macOS):
```bash
eas build --platform ios --profile production
```

Android:
```bash
eas build --platform android --profile production
```

Requires EAS (Expo Application Services) account and configuration in `eas.json`.

### Environment-Specific Configuration

**Production Environment**
- Use mainnet contract addresses
- Enable API key authentication
- Configure production RPC endpoints with load balancing
- Enable error tracking (Sentry, Bugsnag)
- Implement analytics (Google Analytics, Mixpanel)

**Staging Environment**
- Use mainnet for contract compatibility
- Enable debug logging
- Implement feature flags for testing
- Configure test wallets with small amounts

## Performance Optimization

### Bundle Size Optimization

- Tree shaking enabled for unused code elimination
- Code splitting for lazy-loaded routes
- Dynamic imports for large dependencies
- SVG optimization for icon assets

### Runtime Performance

- React Native Reanimated for UI thread animations
- Zustand for efficient state management
- Memoization of expensive calculations
- Debounced API calls for price updates
- Efficient re-render prevention with React.memo

### Network Optimization

- Request caching for market data
- Price fallback caching for offline support
- Batch API requests when possible
- Connection pooling in proxy server
- CDN usage for static assets

## Development Roadmap

### Immediate Priorities

**Q1 2025**
- WebSocket integration for real-time price streaming
- Advanced order types (limit orders, stop-market)
- Portfolio analytics dashboard with P&L tracking
- Social features (copy trading, strategy sharing)

**Q2 2025**
- Mobile app optimization and native builds
- Advanced charting with technical indicators
- Multi-language support (i18next integration)
- Fiat on/off-ramp integration

### Long-Term Vision

**Protocol Expansion**
- Additional DEX integrations (Thala, Cellana)
- Cross-chain bridge support
- Options trading capabilities
- Yield farming aggregator

**Institutional Features**
- API access for algorithmic trading
- Advanced risk management tools
- Compliance and reporting features
- White-label deployment options

**Platform Enhancements**
- Native iOS and Android applications
- Desktop application (Electron)
- Browser extension for quick trading
- Mobile widget support

## Contributing

This is a proprietary codebase. For contribution guidelines, please contact the development team.

## Support and Documentation

**Technical Support**
- GitHub Issues: Report bugs and feature requests
- Developer Documentation: Comprehensive API and architecture docs
- Community Discord: Real-time support and discussion

**Useful Resources**
- Aptos Documentation: https://aptos.dev
- Merkle Trade Docs: https://docs.merkle.trade
- Panora Exchange: https://panora.exchange
- Amnis Finance: https://amnis.finance
- Expo Documentation: https://docs.expo.dev

## License

Proprietary. All rights reserved.

---

**Built with precision engineering for the Aptos ecosystem.**

---