const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Disable package exports to suppress @noble/hashes warnings
config.resolver.unstable_enablePackageExports = false;

// Patch the global path.relative to handle undefined arguments
// This fixes the Metro serializer bug
const originalRelative = path.relative;
path.relative = function(from, to) {
  // If either argument is undefined, return a safe default
  if (from === undefined || from === null) from = '';
  if (to === undefined || to === null) to = '';
  
  // If both are empty, return empty string
  if (!from && !to) return '';
  
  // If only 'to' is provided, return it as-is
  if (!from && to) return to;
  
  // If only 'from' is provided, return empty
  if (from && !to) return '';
  
  // Otherwise, call the original function
  try {
    return originalRelative.call(this, from, to);
  } catch (e) {
    console.warn('path.relative error:', e.message, { from, to });
    return to || from || '';
  }
};

// Add crypto polyfills
config.resolver.alias = {
  ...config.resolver.alias,
  'crypto': require.resolve('expo-crypto'),
  'stream': require.resolve('readable-stream'),
  'buffer': require.resolve('buffer'),
};

module.exports = config;
