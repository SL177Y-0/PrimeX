/**
 * Console Filter Utility
 * Hides all console logs except Aries Lend & Borrow related ones
 */

// Store original console methods
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
  debug: console.debug,
};

// Keywords that should be allowed through the filter
const ALLOWED_KEYWORDS = [
  '[AriesSDK]',
  '[Aries]',
  'Aries',
  'lend',
  'borrow',
  'supply',
  'repay',
  'withdraw',
  'health factor',
  'HF:',
  'Profile check',
  'Portfolio loaded',
  'reserves from',
  'Building',
  'Fetching portfolio',
  'Found profile',
  'Loading Lend & Borrow',
  'Initializing Profile',
  'Loading Portfolio',
  'Console filter',
  'coinInfo.currentInfo',
  'Fetched market data',
];

// Check if a message should be allowed through
function shouldAllowMessage(message: string): boolean {
  const messageStr = String(message).toLowerCase();
  return ALLOWED_KEYWORDS.some(keyword => 
    messageStr.includes(keyword.toLowerCase())
  );
}

// Filter function for console methods
function createFilteredConsole(originalMethod: Function) {
  return function(...args: any[]) {
    // Convert all arguments to string for checking
    const fullMessage = args.map(arg => String(arg)).join(' ');
    
    // Allow if message contains Aries/lending keywords
    if (shouldAllowMessage(fullMessage)) {
      originalMethod.apply(console, args);
    }
    // Silently ignore other messages
  };
}

// Apply console filters
export function enableConsoleFilter() {
  console.log = createFilteredConsole(originalConsole.log);
  console.warn = createFilteredConsole(originalConsole.warn);
  console.error = createFilteredConsole(originalConsole.error);
  console.info = createFilteredConsole(originalConsole.info);
  console.debug = createFilteredConsole(originalConsole.debug);
  
  // Show that filter is active
  originalConsole.log('🔇 Console filter enabled - showing only Aries Lend & Borrow logs');
}

// Restore original console methods
export function disableConsoleFilter() {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  console.info = originalConsole.info;
  console.debug = originalConsole.debug;
  
  console.log('🔊 Console filter disabled - showing all logs');
}

// Auto-enable filter on import (can be disabled if needed)
if (process.env.NODE_ENV === 'development') {
  enableConsoleFilter();
}
