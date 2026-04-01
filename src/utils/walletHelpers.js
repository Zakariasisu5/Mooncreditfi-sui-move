/**
 * Wallet helper utilities for mobile and desktop wallet detection
 */

/**
 * Detect if user is on a mobile device
 */
export const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
};

/**
 * Detect if user is inside a wallet's in-app browser
 */
export const isInWalletBrowser = () => {
  if (typeof window === 'undefined') return false;
  
  // Check user agent for wallet browsers
  const walletUserAgents = /SuietWallet|SuiWallet|EthosWallet|Suiet|Slash/i.test(navigator.userAgent);
  
  // Check for wallet APIs
  const hasWalletAPI = !!(
    window.suiet || 
    window.suiWallet || 
    window.ethereum?.isSuiet ||
    window.ethereum?.isSlash
  );
  
  return walletUserAgents || hasWalletAPI;
};

/**
 * Get list of available Sui wallets
 */
export const getAvailableWallets = () => {
  if (typeof window === 'undefined') return [];
  
  const wallets = [];
  
  if (window.suiet) wallets.push('Suiet');
  if (window.suiWallet) wallets.push('Sui Wallet');
  if (window.ethereum?.isSuiet) wallets.push('Suiet (Ethereum)');
  if (window.ethereum?.isSlash) wallets.push('Slash');
  
  return wallets;
};

/**
 * Generate deep link for opening app in wallet browser
 * @param {string} url - The app URL to open
 * @param {string} wallet - Wallet name ('suiet', 'ethos', etc.)
 */
export const generateWalletDeepLink = (url, wallet = 'suiet') => {
  const encodedUrl = encodeURIComponent(url);
  
  switch (wallet.toLowerCase()) {
    case 'suiet':
    case 'slash':
      // Suiet/Slash deep link format (if they support it)
      return `suiet://browser?url=${encodedUrl}`;
    case 'ethos':
      return `ethos://browser?url=${encodedUrl}`;
    default:
      return url;
  }
};

/**
 * Check if wallet connection is supported on current device
 */
export const isWalletConnectionSupported = () => {
  const mobile = isMobileDevice();
  const inWalletBrowser = isInWalletBrowser();
  
  // Desktop always supported (extension wallets)
  if (!mobile) return true;
  
  // Mobile supported only if in wallet browser
  return inWalletBrowser;
};

/**
 * Get user-friendly message for wallet connection status
 */
export const getWalletConnectionMessage = () => {
  const mobile = isMobileDevice();
  const inWalletBrowser = isInWalletBrowser();
  const availableWallets = getAvailableWallets();
  
  if (!mobile) {
    if (availableWallets.length > 0) {
      return {
        type: 'success',
        message: `${availableWallets.length} wallet(s) detected. Click "Connect Wallet" to continue.`,
      };
    }
    return {
      type: 'warning',
      message: 'No wallet extension detected. Please install Suiet or another Sui wallet.',
    };
  }
  
  // Mobile device
  if (inWalletBrowser) {
    if (availableWallets.length > 0) {
      return {
        type: 'success',
        message: 'Wallet ready! Click "Connect Wallet" to continue.',
      };
    }
    return {
      type: 'info',
      message: 'Wallet browser detected. Click "Connect Wallet" to continue.',
    };
  }
  
  return {
    type: 'warning',
    message: 'Please open this app inside your Suiet wallet browser.',
  };
};
