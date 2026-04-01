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
 * Detect if user is on iOS
 */
export const isIOS = () => {
  if (typeof window === 'undefined') return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
};

/**
 * Detect if user is on Android
 */
export const isAndroid = () => {
  if (typeof window === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
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
 * Wallet app store URLs
 */
const WALLET_STORES = {
  suiet: {
    ios: 'https://apps.apple.com/app/suiet-sui-wallet/id1635778853',
    android: 'https://play.google.com/store/apps/details?id=com.suiet.suiet',
    web: 'https://suiet.app/',
  },
  slush: {
    ios: 'https://apps.apple.com/app/slush-wallet/id6478960549',
    android: 'https://play.google.com/store/apps/details?id=com.slush.wallet',
    web: 'https://slush.app/',
  },
};

/**
 * Generate deep link for opening app in wallet browser
 * @param {string} url - The app URL to open
 * @param {string} wallet - Wallet name ('suiet', 'slush')
 */
export const generateWalletDeepLink = (url, wallet = 'suiet') => {
  const encodedUrl = encodeURIComponent(url);
  
  switch (wallet.toLowerCase()) {
    case 'suiet':
      return `suiet://browser?url=${encodedUrl}`;
    case 'slush':
      return `slush://browser?url=${encodedUrl}`;
    case 'ethos':
      return `ethos://browser?url=${encodedUrl}`;
    default:
      return `suiet://browser?url=${encodedUrl}`;
  }
};

/**
 * Get app store URL for wallet installation
 * @param {string} wallet - Wallet name ('suiet', 'slush')
 */
export const getWalletStoreUrl = (wallet = 'suiet') => {
  const walletKey = wallet.toLowerCase();
  const storeInfo = WALLET_STORES[walletKey] || WALLET_STORES.suiet;
  
  if (isIOS()) {
    return storeInfo.ios;
  } else if (isAndroid()) {
    return storeInfo.android;
  }
  return storeInfo.web;
};

/**
 * Open wallet app with deep link, fallback to store if not installed
 * @param {string} walletType - 'suiet' or 'slush'
 * @param {string} appUrl - Current app URL to open in wallet browser
 * @returns {Promise<boolean>} - True if wallet opened, false if redirected to store
 */
export const openWallet = async (walletType = 'suiet', appUrl = window.location.href) => {
  return new Promise((resolve) => {
    // Generate deep link
    const deepLink = generateWalletDeepLink(appUrl, walletType);
    
    // Try to open wallet app
    const startTime = Date.now();
    window.location.href = deepLink;
    
    // Set timeout to redirect to store if app doesn't open
    const timeout = setTimeout(() => {
      const elapsed = Date.now() - startTime;
      
      // If less than 2 seconds passed, app likely not installed
      if (elapsed < 2000) {
        const storeUrl = getWalletStoreUrl(walletType);
        window.location.href = storeUrl;
        resolve(false);
      } else {
        // App likely opened
        resolve(true);
      }
    }, 1500);
    
    // Clear timeout if page becomes hidden (app opened)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearTimeout(timeout);
        resolve(true);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Cleanup
    setTimeout(() => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, 3000);
  });
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
    message: 'Tap "Connect Wallet" to open your Suiet wallet app.',
  };
};
