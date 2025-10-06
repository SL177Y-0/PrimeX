# PrismX - Advanced Cryptocurrency Trading App

A modern, feature-rich cryptocurrency trading application built with React Native and Expo. PrismX offers a comprehensive trading experience with advanced features including spot trading, copy trading, group trading, and real-time market data visualization.

##  Features

### Core Trading Features
- **Spot Trading**: Buy and sell cryptocurrencies with real-time market data
- **Copy Trading**: Follow successful traders and automatically copy their strategies
- **Group Trading**: Trade together with squads and vote on collective decisions
- **Advanced Charts**: Professional trading charts with multiple timeframes
- **Price Alerts**: Set custom price notifications for your favorite assets
- **Portfolio Management**: Track your holdings and performance

### User Experience
- **Dark/Light Theme**: Automatic theme switching with system preference
- **Responsive Design**: Optimized for mobile, tablet, and desktop
- **Real-time Updates**: Live market data with WebSocket simulation
- **Smooth Animations**: React Native Reanimated for fluid interactions
- **Haptic Feedback**: Enhanced user experience with tactile responses

### Security & Privacy
- **Balance Hiding**: Option to hide sensitive financial information
- **Secure State Management**: Zustand for predictable state updates
- **Type Safety**: Full TypeScript implementation

## 🛠 Technology Stack

### Core Framework
- **React Native 0.79.5** - Cross-platform mobile development
- **Expo SDK 53** - Development platform and tools
- **TypeScript 5.8.3** - Type-safe JavaScript
- **Expo Router 5.1.7** - File-based navigation

### State Management
- **Zustand 5.0.8** - Lightweight state management
- **React Context** - Theme and app-wide state

### UI & Styling
- **React Native Reanimated 3.17.4** - High-performance animations
- **Expo Linear Gradient 14.1.5** - Gradient backgrounds
- **React Native SVG 15.11.2** - Vector graphics
- **Lucide React Native 0.475.0** - Icon library

### Development Tools
- **ESLint 9.0.0** - Code linting
- **Babel 7.25.2** - JavaScript transpilation
- **Expo CLI** - Development and build tools

##  App Structure

```
app/
├── _layout.tsx                 # Root layout with theme provider
├── (tabs)/                    # Tab navigation
│   ├── _layout.tsx           # Tab bar configuration
│   ├── index.tsx            # Home/Dashboard screen
│   ├── market.tsx           # Market overview
│   ├── trade.tsx            # Trading center
│   ├── wallet.tsx           # Wallet management
│   └── settings.tsx         # App settings
├── trading/                   # Trading-specific screens
│   ├── spotTrading.tsx       # Spot trading interface
│   ├── copyTrading.tsx       # Copy trading features
│   ├── groupTrading.tsx     # Group trading (squads)
│   ├── advancedCharts.tsx   # Professional charts
│   ├── positionsOrders.tsx  # Positions & orders
│   ├── priceAlerts.tsx      # Price alert management
│   ├── deposit.tsx          # Deposit funds
│   └── withdraw.tsx         # Withdraw funds
├── deposit.tsx               # Main deposit screen
└── withdraw.tsx              # Main withdraw screen
```

##  Design System

### Theme Architecture
The app features a comprehensive design system with:

- **Color Tokens**: Semantic color system for light/dark themes
- **Typography**: Inter font family with multiple weights
- **Spacing**: Consistent spacing scale (xs: 4px → xxl: 24px)
- **Border Radius**: Rounded corners system (xs: 8px → xxl: 28px)
- **Shadows**: Soft and glow shadow variants

### Component Library
- **Card**: Elevated containers with consistent styling
- **GradientPillButton**: Animated gradient buttons with haptic feedback
- **Sparkline**: Mini charts for price trends
- **TradingChart**: Professional trading charts
- **StatChip**: Percentage change indicators
- **SoftButton**: Secondary action buttons

##  Data Management

### State Structure
The app uses Zustand for state management with the following key areas:

- **Portfolio**: User balance, P&L, and performance metrics
- **Market Data**: Real-time ticker prices and market information
- **Trading**: Positions, orders, and trading history
- **Social**: Copy trading and group trading features
- **Settings**: Theme, currency, and user preferences

### Mock Data
Comprehensive mock data includes:
- 13 cryptocurrency tickers with real-time price simulation
- Transaction history and portfolio positions
- Copy trading leaderboard with trader profiles
- Group trading squads with voting mechanisms
- Price alerts and notification system

##  Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio (for Android development)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd TRADE_APP_UI
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Run on device/simulator**
   - Scan QR code with Expo Go app (mobile)
   - Press `i` for iOS simulator
   - Press `a` for Android emulator

### Available Scripts

- `npm run dev` - Start development server
- `npm run build:web` - Build for web deployment
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

##  Platform Support

### Mobile (Primary)
- iOS 13+ with Expo Go or standalone app
- Android 8+ with Expo Go or standalone app

### Web (Secondary)
- Modern browsers with WebGL support
- Responsive design for desktop/tablet

##  Key Features Deep Dive

### Trading Center
The main trading hub provides access to:
- **Quick Actions**: Deposit/withdraw funds
- **Trading Options**: Spot, copy, group trading
- **Market Overview**: Real-time market statistics
- **Responsive Design**: Adapts to different screen sizes

### Market Data
- **Real-time Updates**: Simulated WebSocket updates every 2 seconds
- **Multiple Assets**: Support for 13+ major cryptocurrencies
- **Price Charts**: Sparkline and candlestick charts
- **Market Statistics**: Volume, market cap, and price changes

### Copy Trading
- **Trader Profiles**: ROI, drawdown, win rate, and strategy
- **Risk Management**: Allocation limits and loss protection
- **Performance Tracking**: Real-time P&L and statistics
- **Social Features**: Follow/unfollow traders

### Group Trading (Squads)
- **Collective Decisions**: Vote on trading proposals
- **Pooled Resources**: Shared balance and risk management
- **Member Management**: Join/leave squads
- **Strategy Alignment**: Common trading approaches

##  Configuration

### Environment Setup
The app uses Expo's configuration system:

```json
{
  "expo": {
    "name": "PrismX",
    "slug": "prismx-trading",
    "version": "1.0.0",
    "orientation": "portrait",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true
  }
}
```

### Theme Customization
Themes are defined in `theme/tokens.ts` with support for:
- Light and dark mode variants
- Brand-specific color palettes
- Semantic color tokens
- Typography scales

##  Performance Optimizations

### Animation Performance
- **React Native Reanimated**: 60fps animations on UI thread
- **Shared Values**: Efficient state updates
- **Spring Animations**: Natural motion curves

### State Management
- **Zustand**: Minimal re-renders with selective subscriptions
- **Immutable Updates**: Predictable state changes
- **Type Safety**: Compile-time error prevention

### Bundle Optimization
- **Expo SDK**: Optimized native modules
- **Tree Shaking**: Unused code elimination
- **Code Splitting**: Lazy loading for trading screens

##  Testing Strategy

### Component Testing
- Unit tests for utility functions
- Integration tests for state management
- Visual regression tests for UI components

### Performance Testing
- Animation performance monitoring
- Memory usage optimization
- Bundle size analysis

##  Deployment

### Development Builds
```bash
# iOS
expo build:ios

# Android
expo build:android

# Web
npm run build:web
```

### Production Considerations
- **App Store**: iOS App Store deployment
- **Google Play**: Android Play Store deployment
- **Web Hosting**: Static web deployment
- **CDN**: Asset optimization and caching

##  Future Enhancements

### Planned Features
- **Real API Integration**: Replace mock data with live APIs
- **Advanced Order Types**: Stop-loss, take-profit, trailing stops
- **Portfolio Analytics**: Detailed performance metrics
- **Social Features**: Trader profiles and social trading
- **Push Notifications**: Real-time price alerts
- **Offline Support**: Cached data and offline functionality

### Technical Improvements
- **Performance**: Further animation optimizations
- **Accessibility**: Enhanced screen reader support
- **Internationalization**: Multi-language support
- **Security**: Enhanced authentication and encryption

