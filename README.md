# PrismX: Professional Aptos DeFi Trading Platform

**A sophisticated decentralized finance trading application engineered for the Aptos blockchain ecosystem**

PrismX represents the convergence of institutional-grade trading capabilities with cutting-edge blockchain technology. Built on React Native and Expo, this platform delivers seamless access to Merkle Trade's leveraged perpetual contracts and Panora's automated market maker protocols, all wrapped in an intuitive, responsive interface designed for both retail and professional traders.

The application architecture emphasizes security, performance, and user experience through native mobile optimization, real-time market data integration, and comprehensive wallet connectivity solutions. Every component has been meticulously crafted to ensure reliability in high-frequency trading environments while maintaining the accessibility that modern DeFi demands.

## Core Capabilities

### Advanced Leverage Trading Engine
**Merkle Trade Integration with Institutional-Grade Validation**

The platform provides access to five major cryptocurrency perpetual markets: APT/USDC, BTC/USDC, ETH/USDC, SOL/USDC, and DOGE/USDC. Our trading engine implements the exact validation logic found in Merkle Trade's official interface, ensuring seamless compatibility and preventing transaction failures.

Key specifications include minimum collateral requirements of 2 USDC, leverage ranges from 3x to 150x, and dynamic position sizing calculated as PAY × leverage. The system enforces maximum position limits of 1.5M USDC and implements comprehensive pre-flight checks to validate wallet connectivity, market liquidity, and transaction parameters.

*Implementation: `components/TradingInterface.tsx`, `hooks/useMerkleTrading.ts`, `hooks/useMerklePositions.ts`, `hooks/useMerkleEvents.ts`*

### Automated Market Making via Panora Protocol
**Seamless Token Swapping with Advanced Risk Management**

The integrated Panora swap functionality provides instant liquidity access across the Aptos ecosystem. Our implementation includes sophisticated quote aggregation, customizable slippage protection, comprehensive transaction data validation, and pre-execution simulation to prevent failed transactions.

The swap engine performs real-time validation of transaction payloads, simulates execution on Aptos full nodes before submission, and provides detailed transaction previews to ensure users maintain full control over their trades.

*Implementation: `components/SwapInterface.tsx`, `services/panoraSwapService.ts`, `services/panoraSwapSDK.ts`*

### Enterprise-Grade Wallet Infrastructure
**Multi-Modal Connectivity with Persistent Session Management**

PrismX supports both browser extension and mobile deep-link wallet connections through Petra wallet integration. The system implements automatic reconnection logic, persistent session management via encrypted local storage, and comprehensive error handling for network interruptions.

Advanced features include extension availability detection, automatic session recovery on application restart, secure message signing capabilities, and graceful fallback mechanisms when primary connection methods are unavailable.

*Implementation: `app/providers/WalletProvider.tsx`*

### Real-Time Market Intelligence
**Native Charting with Professional-Grade Data Feeds**

The platform features a custom-built candlestick charting engine using React Native SVG, eliminating WebView dependencies while maintaining professional trading chart functionality. Market data is sourced from CoinGecko's enterprise APIs, providing real-time price feeds, historical data, and comprehensive market statistics.

Chart capabilities include multiple timeframe support, volume overlay visualization, responsive design optimization, and seamless integration with the application's theming system.

*Implementation: `services/realMarketDataService.ts`, `components/CandleChart.tsx`*

### Centralized Configuration Management
**Type-Safe Contract and Market Configuration**

All blockchain interactions are managed through a centralized configuration system that maintains type safety while providing flexibility for different network environments. The system includes comprehensive Aptos network settings, Merkle Trade contract addresses, trading function definitions, and market-specific parameters.

Configuration management ensures consistent behavior across development and production environments while maintaining the flexibility to adapt to protocol upgrades and new market additions.

*Implementation: `config/constants.ts`, `config/appConfig.ts`*

### High-Performance API Gateway
**Dedicated Proxy Infrastructure with Rate Limiting**

The included Node.js proxy server provides optimized access to Merkle Trade APIs with built-in CORS handling, request rate limiting, and connection pooling. This infrastructure layer ensures reliable API access while protecting against rate limiting and providing consistent performance across different network conditions.

*Implementation: `server/proxy.js`, `scripts/start-proxy.bat`*

## Technology Architecture

### Frontend Framework
**React Native 0.79.5** with **Expo SDK 53** provides the foundation for cross-platform mobile and web deployment. The architecture leverages **Expo Router** for type-safe, file-based navigation that scales efficiently across different screen sizes and platform constraints.

### Development Ecosystem
**TypeScript 5.8** ensures compile-time type safety and enhanced developer experience, while **ESLint 9** and **Babel 7** maintain code quality and modern JavaScript compatibility. The development workflow is optimized for rapid iteration without compromising production stability.

### Blockchain Integration Layer
- **@aptos-labs/ts-sdk**: Core Aptos blockchain interactions and transaction management
- **@merkletrade/ts-sdk**: Planned integration for official Merkle Trade protocol access
- **@panoraexchange/swap-sdk**: Automated market maker integration for token swapping

### User Interface and State Management
**Zustand 5** provides lightweight, performant state management without the complexity of traditional Redux patterns. **React Native Reanimated 3** delivers 60fps animations running on the UI thread, while **react-native-svg** enables professional-grade charting without WebView dependencies. **Lucide React Native** supplies a comprehensive icon system optimized for mobile performance.

### Network Infrastructure
Custom networking layer built on **fetch API** for client-side requests and **Axios** for proxy server operations, ensuring consistent error handling and request/response transformation across all API interactions.

## Application Architecture

### Modular Component Organization

The codebase follows a domain-driven design pattern with clear separation of concerns:

```
app/                          # Expo Router navigation structure
├── _layout.tsx              # Root application layout and providers
├── (tabs)/                  # Tab-based navigation screens
│   ├── _layout.tsx         # Tab navigation configuration
│   ├── index.tsx           # Dashboard and portfolio overview
│   └── deposit.tsx         # Asset deposit workflows
└── providers/              # Application-wide context providers
    └── WalletProvider.tsx  # Wallet connectivity and session management

components/                   # Reusable UI components
├── TradingInterface.tsx     # Advanced leverage trading interface
├── SwapInterface.tsx        # Token swap and AMM interactions
├── CandleChart.tsx         # Native SVG candlestick charting
├── WalletConnection.tsx    # Multi-modal wallet connectivity
├── PositionsList.tsx       # Portfolio position management
└── ClosePositionModal.tsx  # Position closure workflows

config/                      # Centralized configuration management
├── constants.ts            # Blockchain contracts and market definitions
└── appConfig.ts           # Application-wide settings and feature flags

hooks/                       # Custom React hooks for blockchain interactions
├── useMerkleTrading.ts     # Leverage trading operations and validation
├── useMerklePositions.ts   # Portfolio and position state management
└── useMerkleEvents.ts      # Real-time blockchain event subscriptions

services/                    # Business logic and external API integrations
├── merkleService.ts        # Core Merkle Trade protocol interactions
├── realMerkleService.ts    # Production-ready Merkle API implementations
├── officialMerkleService.ts # Official SDK integration layer
├── panoraSwapService.ts    # Panora protocol swap operations
├── panoraSwapSDK.ts       # Panora SDK wrapper and utilities
└── realMarketDataService.ts # Market data aggregation and caching

utils/                       # Shared utilities and helper functions
├── aptosClient.ts          # Aptos blockchain client configuration
├── priceService.ts         # Price feed aggregation and normalization
└── logger.ts              # Structured logging and debugging utilities

server/                      # Backend proxy infrastructure
├── proxy.js               # Express.js API gateway with rate limiting
└── .env.example          # Server environment configuration template
```

### Design Principles

**Separation of Concerns**: Each module has a single, well-defined responsibility with minimal coupling to other system components.

**Type Safety**: Comprehensive TypeScript coverage ensures compile-time error detection and enhanced developer experience.

**Performance Optimization**: Strategic use of React Native's performance primitives, including Reanimated for UI thread animations and efficient state management patterns.

**Scalability**: Modular architecture supports easy addition of new trading pairs, protocols, and user interface components without affecting existing functionality.

## Environment Configuration

### Application Environment Variables

The platform requires comprehensive environment configuration to ensure secure and reliable operation across different deployment contexts.

**Primary Configuration** (`.env` in project root):

```bash
# Aptos Blockchain Configuration
EXPO_PUBLIC_APTOS_NETWORK=mainnet                    # Network selection: mainnet/testnet/devnet
EXPO_PUBLIC_APTOS_NODE_URL=https://fullnode.mainnet.aptoslabs.com/v1
EXPO_PUBLIC_APTOS_MAINNET_API_KEY=your_mainnet_key   # Production API access
EXPO_PUBLIC_APTOS_TESTNET_API_KEY=your_testnet_key   # Development API access

# Smart Contract Addresses
EXPO_PUBLIC_MERKLE_CONTRACT_ADDRESS=0x5ae6789dd2fec1a9ec9cccfb3acaf12e93d432f0a3a42c92fe1a9d490b7bbc06

# Wallet Integration
EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id # Optional: WalletConnect v2 support

# Application Identity
EXPO_PUBLIC_APP_NAME=PrismX                          # Application display name
EXPO_PUBLIC_APP_SCHEME=prismx                        # Deep linking scheme
EXPO_PUBLIC_DEEP_LINK_BASE=prismx://                 # Deep link URL base
```

**Proxy Server Configuration** (`server/.env`):

```bash
PROXY_PORT=3001                                      # API gateway port
NODE_ENV=development                                 # Environment mode

# API Endpoints (environment-specific)
# development = https://api.testnet.merkle.trade
# production  = https://api.merkle.trade
```

### Configuration Architecture

The application employs a multi-layered configuration system designed for flexibility and maintainability:

**Core Configuration** (`config/constants.ts`):
- **APTOS_CONFIG**: Blockchain network settings, node URLs, and API key management
- **MERKLE_CONFIG**: Smart contract addresses and module identifiers
- **TRADING_FUNCTIONS**: Complete ABI function definitions for all supported operations
- **MERKLE_ASSET_TYPES**: Type-safe definitions for pair types (`pair_types::APT_USD`) and collateral types (`fa_box::W_USDC`)
- **MARKETS**: Comprehensive market definitions including `APT_USD`, `BTC_USD`, `ETH_USD`, `SOL_USD`, `DOGE_USD` with display names and type argument specifications `[PairType, CollateralType]`

**Feature Configuration** (`config/appConfig.ts`):
- Development and production feature flags
- Performance optimization settings
- Real-time update intervals and caching policies
- UI behavior customization options

## Development Workflow

### System Requirements

**Development Environment**:
- Node.js 18.0 or higher with npm package manager
- Expo CLI (global installation optional - `npx expo` provides equivalent functionality)
- iOS Simulator (macOS) or Android Studio with AVD Manager for device emulation
- Modern code editor with TypeScript support (VS Code recommended)

**Optional Tools**:
- Petra Wallet browser extension for testing wallet connectivity
- Aptos CLI for blockchain interaction debugging
- React Native Debugger for advanced debugging capabilities

### Installation and Setup

**1. Dependency Installation**
```bash
npm install
```
This command installs all required dependencies including React Native, Expo SDK, blockchain SDKs, and development tools.

**2. Environment Configuration**
Copy `.env.example` to `.env` and configure with your specific API keys and network preferences. Ensure all required environment variables are properly set before proceeding.

**3. Development Server Launch**
```bash
npm run dev
```
Starts the Expo development server with hot reloading and debugging capabilities enabled.

**4. Platform-Specific Deployment**
- **Mobile Device**: Scan the generated QR code with Expo Go application
- **iOS Simulator**: Press `i` in the terminal to launch iOS simulator
- **Android Emulator**: Press `a` in the terminal to launch Android emulator
- **Web Browser**: Press `w` to open web version (development only)

### Proxy Server Infrastructure

**Automated Setup (Windows)**:
Execute `scripts/start-proxy.bat` for automated dependency installation and server startup.

**Manual Setup (All Platforms)**:
```bash
cd server
npm install
npm start
```

The proxy server provides essential infrastructure for production-grade API access:
- **CORS Handling**: Resolves cross-origin request limitations
- **Rate Limiting**: Prevents API quota exhaustion
- **Request Caching**: Improves response times for frequently accessed data
- **Error Handling**: Provides consistent error responses across all API endpoints

**Default Configuration**: `http://localhost:3001`

## Feature Specifications

### Advanced Wallet Management System
**Multi-Protocol Connectivity with Enterprise-Grade Session Management**

The wallet infrastructure provides seamless connectivity across multiple interaction patterns:

- **Browser Extension Integration**: Automatic detection and connection to Petra wallet extensions with real-time availability monitoring
- **Mobile Deep Link Protocol**: Sophisticated deep linking system for mobile wallet applications with fallback mechanisms
- **Persistent Session Architecture**: Encrypted session storage using AsyncStorage with automatic reconnection logic and session validation
- **Cross-Platform Compatibility**: Unified wallet interface that adapts to different platform capabilities and constraints

*Technical Implementation: `app/providers/WalletProvider.tsx`*

### Professional Leverage Trading Platform
**Merkle Trade Integration with Institutional-Grade Risk Management**

The trading engine implements comprehensive validation and risk management systems:

- **Regulatory Compliance**: Validation logic mirrors official Merkle Trade requirements including minimum PAY thresholds of 2 USDC and maximum position limits
- **Dynamic Leverage Management**: Support for leverage ranges from 3x to 150x with real-time position size calculations and risk assessment
- **Market Data Integration**: Internal market keying using underscore format (`APT_USD`) with user-friendly display formatting (`APT/USDC`)
- **Real-Time Event Processing**: Comprehensive event subscription system for position updates, order fills, and market movements
- **Multi-Service Architecture**: Layered service implementation supporting both development and production API endpoints

*Technical Implementation: `hooks/useMerkleEvents.ts`, `services/realMerkleService.ts`, `services/officialMerkleService.ts`*

### Automated Market Making Integration
**Panora Protocol with Advanced Transaction Safety**

The swap functionality provides institutional-grade transaction processing:

- **Intelligent Quote Aggregation**: Real-time quote fetching with slippage protection and price impact analysis
- **Pre-Execution Validation**: Comprehensive transaction data validation and simulation before blockchain submission
- **Risk Management**: Multi-layered transaction verification including payload validation and execution simulation
- **Seamless Wallet Integration**: Direct integration with wallet signing infrastructure for secure transaction execution

*Technical Implementation: Components and services provide complete swap workflow management*

### Professional Market Data Infrastructure
**Real-Time Data with Native Charting Solutions**

The market data system delivers professional-grade market intelligence:

- **Enterprise Data Feeds**: Integration with CoinGecko's professional APIs for real-time price data and market statistics
- **Native Chart Rendering**: Custom-built candlestick charting using React Native SVG, eliminating WebView dependencies and improving performance
- **Multi-Timeframe Support**: Comprehensive timeframe options with volume overlay and technical indicator support
- **Responsive Design**: Chart rendering optimized for different screen sizes and orientations

*Technical Implementation: `services/realMarketDataService.ts`, `components/CandleChart.tsx`*

## Build System and Development Scripts

### Primary Development Commands

**Development Workflow**:
- `npm run dev` — Launches Expo development server with hot reloading and debugging capabilities
- `npm run build:web` — Generates optimized web bundle for production deployment
- `npm run lint` — Executes ESLint with project-specific rules and TypeScript integration
- `npm run typecheck` — Performs comprehensive TypeScript type checking without compilation

### Server Infrastructure Commands

**Proxy Server Management** (executed in `server/` directory):
- `npm start` — Production server launch with optimized performance settings
- `npm run dev` — Development server with automatic restart on file changes via nodemon
- `npm run prod` — Production deployment with environment-specific optimizations

### Build Optimization

The build system implements several performance optimizations:
- **Tree Shaking**: Eliminates unused code from final bundles
- **Code Splitting**: Lazy loading for non-critical components
- **Asset Optimization**: Automatic image compression and SVG optimization
- **Bundle Analysis**: Integrated tools for monitoring bundle size and dependencies

## Application Workflows

### Leverage Trading Architecture
**Comprehensive Trading System with Multi-Layer Validation**

The trading workflow implements a sophisticated multi-component architecture:

**User Interface Layer** (`components/TradingInterface.tsx`):
- Professional trading interface with real-time validation feedback
- Dynamic position sizing with leverage calculations
- Market selection with comprehensive pair support
- Order preview and confirmation workflows

**Business Logic Layer**:
- `hooks/useMerkleTrading.ts`: Core trading operations and transaction management
- `hooks/useMerklePositions.ts`: Portfolio state management and position tracking
- `hooks/useMerkleEvents.ts`: Real-time blockchain event processing and subscription management

**Service Integration Layer**:
- `services/merkleService.ts`: Core protocol interaction abstractions
- `services/realMerkleService.ts`: Production-ready API implementations with error handling
- Configuration management via `config/constants.ts` for market definitions and trading limits

### Token Swap Infrastructure
**Automated Market Making with Advanced Safety Mechanisms**

The swap system provides institutional-grade token exchange capabilities:

**User Experience Layer** (`components/SwapInterface.tsx`):
- Intuitive token selection with popular pair recommendations
- Real-time quote updates with slippage protection
- Transaction preview with detailed fee breakdown
- Execution confirmation with comprehensive safety checks

**Protocol Integration Layer**:
- `services/panoraSwapService.ts`: Core swap logic with quote aggregation and validation
- `services/panoraSwapSDK.ts`: SDK wrapper providing consistent API abstractions
- Seamless integration with wallet provider for secure transaction signing and submission

## Platform Integration and Deep Linking

### Application Configuration Management

The platform implements comprehensive deep linking support through `app.json` configuration:

**Deep Link Schema**: `prismx://` provides universal linking across mobile and web platforms
**Android Integration**: Custom intent filters enable seamless wallet connectivity and transaction handling
**iOS Compatibility**: Universal links support for App Store distribution and wallet integration

**Configuration Customization**: Update scheme identifiers and package IDs in `app.json` to match your deployment requirements and branding specifications.

## Security Architecture and Best Practices

### Cryptographic Security Standards

The application implements enterprise-grade security measures across all blockchain interactions:

**API Key Management**: 
- Environment-based key isolation prevents accidental exposure in version control
- Separate key management for development, staging, and production environments
- Automatic key rotation support for enhanced security posture

**Transaction Security**:
- **Petra Wallet Integration**: Transaction payloads must maintain strict structural integrity with guaranteed array initialization for `type_arguments` and `arguments` parameters
- **Direct Payload Transmission**: Petra extension integration requires direct payload transmission to `window.aptos.signAndSubmitTransaction` without intermediate wrapper objects
- **Pre-Execution Validation**: Comprehensive transaction simulation and validation before blockchain submission

**Data Protection**:
- Encrypted local storage for sensitive user data and session information
- Secure communication protocols for all external API interactions
- Comprehensive input validation and sanitization across all user interfaces

## Diagnostic and Troubleshooting Guide

### Common Integration Issues

**Wallet Connectivity Problems**:
- **Browser Extension Detection**: Verify Petra wallet extension installation and enable developer mode if necessary. The `WalletConnection` component provides real-time availability status and diagnostic information.
- **Connection State Management**: Clear browser cache and local storage if experiencing persistent connection issues. The application implements automatic reconnection logic that may require manual reset in edge cases.

**Transaction Execution Failures**:
- **Petra Payload Structure**: Transaction payloads must include complete structure with `type`, `function`, `type_arguments: []`, and `arguments: []` properties. Arrays must be initialized as empty arrays rather than undefined values to prevent runtime errors.
- **Direct API Integration**: Petra extension requires direct payload transmission to `window.aptos.signAndSubmitTransaction` without intermediate object wrapping or transformation.

**Market Data and Symbol Resolution**:
- **Symbol Format Consistency**: Internal market keys utilize underscore format (`APT_USD`) while display formats use slash notation (`APT/USDC`). Verify mapping consistency in `services/realMarketDataService.ts` and `config/constants.ts`.
- **API Rate Limiting**: Implement appropriate request throttling and caching strategies to prevent API quota exhaustion during high-frequency data updates.

**Trading Position Management**:
- **Minimum Position Requirements**: Merkle Trade enforces minimum PAY requirements of 2 USDC with reasonable leverage ratios (e.g., 50x leverage resulting in 100 USDC position size) as configured in `TradingInterface` default parameters.
- **Position Size Validation**: Ensure position calculations follow the formula: Position Size = PAY × Leverage, with comprehensive validation before transaction submission.

**Network Configuration**:
- **Mainnet Dependency**: Merkle Trade contracts and pair types are exclusively available on Aptos mainnet. Ensure `EXPO_PUBLIC_APTOS_NETWORK=mainnet` configuration when targeting live trading functionality.
- **Environment Synchronization**: Verify all environment variables are properly synchronized between development and production configurations.

## Development Roadmap and Future Enhancements

### Immediate Development Priorities

**Real-Time Data Infrastructure**:
- Implementation of WebSocket-based real-time updates when official SDK provides stable streaming capabilities
- Enhanced market data feeds with sub-second price updates and order book depth information
- Advanced charting features including technical indicators and drawing tools

**Protocol Integration Expansion**:
- Complete migration to official `@merkletrade/ts-sdk` methods in `realMerkleService` for enhanced reliability and feature parity
- Integration of additional DeFi protocols for expanded trading opportunities
- Cross-chain bridge integration for multi-blockchain asset management

**User Experience Enhancements**:
- Advanced order types including take-profit and stop-loss editing with UX parity to professional trading platforms
- Portfolio analytics dashboard with comprehensive performance metrics and risk assessment tools
- Social trading features with copy trading and strategy sharing capabilities

### Long-Term Strategic Objectives

**Institutional Features**:
- Advanced risk management tools with position sizing algorithms and portfolio optimization
- API access for algorithmic trading and institutional integration
- Compliance and reporting tools for regulatory requirements

**Platform Expansion**:
- Additional market pairs and asset classes beyond current cryptocurrency offerings
- Integration with traditional finance bridges and fiat on/off ramps
- Mobile-first design optimizations with native iOS and Android applications

## License

Proprietary. All rights reserved.

