/**
 * Sui Blockchain Helper Utilities
 * Common functions for working with Sui blockchain
 */

/**
 * Convert SUI to MIST (smallest unit)
 * 1 SUI = 1,000,000,000 MIST (1e9)
 * @param {number|string} sui - Amount in SUI
 * @returns {string} Amount in MIST
 */
export const suiToMist = (sui) => {
  const amount = typeof sui === 'string' ? parseFloat(sui) : sui;
  return Math.floor(amount * 1e9).toString();
};

/**
 * Convert MIST to SUI
 * @param {number|string} mist - Amount in MIST
 * @returns {number} Amount in SUI
 */
export const mistToSui = (mist) => {
  const amount = typeof mist === 'string' ? parseInt(mist, 10) : mist;
  return amount / 1e9;
};

/**
 * Format SUI amount for display
 * @param {number|string} amount - Amount in SUI or MIST
 * @param {object} options - Formatting options
 * @returns {string} Formatted amount
 */
export const formatSui = (amount, options = {}) => {
  const {
    decimals = 4,
    isMist = false,
    showSymbol = true,
    compact = false,
  } = options;

  let sui = isMist ? mistToSui(amount) : parseFloat(amount);

  if (compact && sui >= 1000000) {
    return `${(sui / 1000000).toFixed(2)}M${showSymbol ? ' SUI' : ''}`;
  }
  if (compact && sui >= 1000) {
    return `${(sui / 1000).toFixed(2)}K${showSymbol ? ' SUI' : ''}`;
  }

  const formatted = sui.toFixed(decimals);
  return showSymbol ? `${formatted} SUI` : formatted;
};

/**
 * Shorten Sui address for display
 * @param {string} address - Full Sui address
 * @param {number} startChars - Number of characters to show at start
 * @param {number} endChars - Number of characters to show at end
 * @returns {string} Shortened address
 */
export const shortenAddress = (address, startChars = 6, endChars = 4) => {
  if (!address) return '';
  if (address.length <= startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
};

/**
 * Validate Sui address format
 * @param {string} address - Address to validate
 * @returns {boolean} True if valid
 */
export const isValidSuiAddress = (address) => {
  if (!address) return false;
  // Sui addresses are 32 bytes (64 hex chars) with 0x prefix
  return /^0x[a-fA-F0-9]{64}$/.test(address);
};

/**
 * Validate Sui object ID format
 * @param {string} objectId - Object ID to validate
 * @returns {boolean} True if valid
 */
export const isValidObjectId = (objectId) => {
  if (!objectId) return false;
  // Object IDs follow same format as addresses
  return /^0x[a-fA-F0-9]{64}$/.test(objectId);
};

/**
 * Get explorer URL for address
 * @param {string} address - Sui address
 * @param {string} network - Network name (mainnet, testnet, devnet)
 * @returns {string} Explorer URL
 */
export const getAddressExplorerUrl = (address, network = 'testnet') => {
  return `https://suiscan.xyz/${network}/account/${address}`;
};

/**
 * Get explorer URL for transaction
 * @param {string} digest - Transaction digest
 * @param {string} network - Network name
 * @returns {string} Explorer URL
 */
export const getTxExplorerUrl = (digest, network = 'testnet') => {
  return `https://suiscan.xyz/${network}/tx/${digest}`;
};

/**
 * Get explorer URL for object
 * @param {string} objectId - Object ID
 * @param {string} network - Network name
 * @returns {string} Explorer URL
 */
export const getObjectExplorerUrl = (objectId, network = 'testnet') => {
  return `https://suiscan.xyz/${network}/object/${objectId}`;
};

/**
 * Parse transaction effects to extract useful information
 * @param {object} effects - Transaction effects from Sui
 * @returns {object} Parsed information
 */
export const parseTransactionEffects = (effects) => {
  if (!effects) return null;

  return {
    status: effects.status?.status,
    gasUsed: effects.gasUsed,
    created: effects.created?.map(obj => obj.reference.objectId) || [],
    mutated: effects.mutated?.map(obj => obj.reference.objectId) || [],
    deleted: effects.deleted?.map(obj => obj.objectId) || [],
    events: effects.events || [],
  };
};

/**
 * Extract error message from Sui error
 * @param {Error} error - Error object
 * @returns {string} User-friendly error message
 */
export const parseSuiError = (error) => {
  if (!error) return 'Unknown error';

  const message = error.message || error.toString();

  // Common error patterns
  if (message.includes('Rejected') || message.includes('rejected')) {
    return 'Transaction was rejected';
  }
  if (message.includes('InsufficientBalance') || message.includes('Insufficient')) {
    return 'Insufficient balance for this transaction';
  }
  if (message.includes('gas')) {
    return 'Gas estimation failed. Please try again';
  }
  if (message.includes('not found')) {
    return 'Object or resource not found';
  }
  if (message.includes('timeout')) {
    return 'Transaction timed out. Please try again';
  }

  // Return original message if no pattern matches
  return message.length > 100 ? message.slice(0, 100) + '...' : message;
};

/**
 * Calculate APY from interest rate
 * @param {number} rate - Interest rate (e.g., 0.05 for 5%)
 * @param {number} compoundingPeriods - Number of compounding periods per year
 * @returns {number} APY as percentage
 */
export const calculateAPY = (rate, compoundingPeriods = 365) => {
  return (Math.pow(1 + rate / compoundingPeriods, compoundingPeriods) - 1) * 100;
};

/**
 * Calculate interest earned
 * @param {number} principal - Principal amount
 * @param {number} rate - Annual interest rate (e.g., 0.05 for 5%)
 * @param {number} days - Number of days
 * @returns {number} Interest earned
 */
export const calculateInterest = (principal, rate, days) => {
  return principal * rate * (days / 365);
};

/**
 * Format timestamp to readable date
 * @param {number} timestamp - Unix timestamp (seconds or milliseconds)
 * @param {object} options - Formatting options
 * @returns {string} Formatted date
 */
export const formatTimestamp = (timestamp, options = {}) => {
  const {
    includeTime = false,
    relative = false,
  } = options;

  if (!timestamp) return 'N/A';

  // Convert to milliseconds if needed
  const ms = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
  const date = new Date(ms);

  if (relative) {
    const now = Date.now();
    const diff = now - ms;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  }

  if (includeTime) {
    return date.toLocaleString();
  }

  return date.toLocaleDateString();
};

/**
 * Wait for a specific duration
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} Promise that resolves after duration
 */
export const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {object} options - Retry options
 * @returns {Promise} Result of function
 */
export const retryWithBackoff = async (fn, options = {}) => {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
  } = options;

  let lastError;
  let delay = initialDelay;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await sleep(Math.min(delay, maxDelay));
        delay *= backoffFactor;
      }
    }
  }

  throw lastError;
};

/**
 * Batch multiple async operations
 * @param {Array} items - Items to process
 * @param {Function} fn - Async function to apply to each item
 * @param {number} batchSize - Number of items to process at once
 * @returns {Promise<Array>} Results
 */
export const batchAsync = async (items, fn, batchSize = 10) => {
  const results = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  
  return results;
};

/**
 * Deep clone an object
 * @param {object} obj - Object to clone
 * @returns {object} Cloned object
 */
export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Debounce a function
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (fn, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

/**
 * Throttle a function
 * @param {Function} fn - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export const throttle = (fn, limit) => {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Check if value is empty (null, undefined, empty string, empty array, empty object)
 * @param {*} value - Value to check
 * @returns {boolean} True if empty
 */
export const isEmpty = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

/**
 * Safe JSON parse with fallback
 * @param {string} json - JSON string
 * @param {*} fallback - Fallback value if parse fails
 * @returns {*} Parsed value or fallback
 */
export const safeJsonParse = (json, fallback = null) => {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
};

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} True if successful
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  }
};

export default {
  suiToMist,
  mistToSui,
  formatSui,
  shortenAddress,
  isValidSuiAddress,
  isValidObjectId,
  getAddressExplorerUrl,
  getTxExplorerUrl,
  getObjectExplorerUrl,
  parseTransactionEffects,
  parseSuiError,
  calculateAPY,
  calculateInterest,
  formatTimestamp,
  sleep,
  retryWithBackoff,
  batchAsync,
  deepClone,
  debounce,
  throttle,
  isEmpty,
  safeJsonParse,
  copyToClipboard,
};
