import { SUPPORTED_WALLETS } from '@/config/wallets';

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
  const walletUserAgents = /SuietWallet|SuiWallet|EthosWallet|Suiet|Splash|Slush/i.test(navigator.userAgent);
  
  // Check for wallet APIs (with proper type checking)
  const hasWalletAPI = !!(
    (typeof window !== 'undefined' && 'suiet' in window) ||
    (typeof window !== 'undefined' && 'suiWallet' in window) ||
    (typeof window !== 'undefined' && window.ethereum && 'isSuiet' in window.ethereum) ||
    (typeof window !== 'undefined' && window.ethereum && 'isSplash' in window.ethereum)
  );
  
  return walletUserAgents || hasWalletAPI;
};

/**
 * Get list of available Sui wallets
 */
export const getAvailableWallets = () => {
  if (typeof window === 'undefined') return [];
  
  const wallets = [];
  
  if ('suiet' in window) wallets.push('Suiet');
  if ('suiWallet' in window) wallets.push('Sui Wallet');
  if (window.ethereum && 'isSuiet' in window.ethereum) wallets.push('Suiet (Ethereum)');
  if (window.ethereum && 'isSplash' in window.ethereum) wallets.push('Splash');
  
  return wallets;
};

/**
 * Generate deep link for wallet
 */
export const generateWalletDeepLink = (wallet = 'sui') => {
  const walletConfig = SUPPORTED_WALLETS[wallet.toLowerCase()];
  return walletConfig?.deepLink || 'sui://';
};

/**
 * Get app store URL for wallet installation
 * @param {string} wallet - Wallet name ('sui', 'splash', 'slush', 'suiet')
 */
export const getWalletStoreUrl = (wallet = 'sui') => {
  const walletConfig = SUPPORTED_WALLETS[wallet.toLowerCase()] || SUPPORTED_WALLETS.sui;
  
  if (isIOS()) {
    return walletConfig.downloadUrls.ios;
  } else if (isAndroid()) {
    return walletConfig.downloadUrls.android;
  }
  return walletConfig.downloadUrls.web;
};

/**
 * Open wallet app with deep link and return URL for seamless connection
 * MetaMask-style: Opens wallet, user approves, returns to dApp connected
 * @param {string} walletType - 'sui', 'splash', 'slush', or 'suiet'
 * @param {string} returnUrl - URL to return to after approval (optional)
 * @returns {Promise<{opened: boolean, method: string}>}
 */
export const openWalletWithReturn = async (walletType = 'sui', returnUrl = null) => {
  const currentUrl = returnUrl || window.location.href;
  const deepLink = generateWalletDeepLink(walletType);
  
  // Store connection attempt in sessionStorage for return detection
  sessionStorage.setItem('wallet-connection-attempt', JSON.stringify({
    wallet: walletType,
    timestamp: Date.now(),
    returnUrl: currentUrl,
  }));
  
  return new Promise((resolve) => {
    let appOpened = false;
    let method = 'unknown';
    
    const handleAppOpened = (detectionMethod) => {
      if (!appOpened) {
        appOpened = true;
        method = detectionMethod;
        resolve({ opened: true, method });
      }
    };
    
    // Method 1: Try window.location (most reliable for iOS)
    const attemptDirectNavigation = () => {
      try {
        window.location.href = deepLink;
        handleAppOpened('direct-navigation');
      } catch (e) {
        console.log('Direct navigation failed:', e);
      }
    };
    
    // Method 2: Hidden iframe (works on some Android devices)
    const attemptIframe = () => {
      try {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);
        
        iframe.src = deepLink;
        
        setTimeout(() => {
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
        }, 1000);
        
        handleAppOpened('iframe');
      } catch (e) {
        console.log('Iframe method failed:', e);
      }
    };
    
    // Method 3: Anchor tag click (fallback)
    const attemptAnchorClick = () => {
      try {
        const link = document.createElement('a');
        link.href = deepLink;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
          if (link.parentNode) {
            document.body.removeChild(link);
          }
        }, 100);
        
        handleAppOpened('anchor-click');
      } catch (e) {
        console.log('Anchor click failed:', e);
      }
    };
    
    // iOS prefers direct navigation
    if (isIOS()) {
      attemptDirectNavigation();
    } else {
      // Android: try iframe first, then direct navigation
      attemptIframe();
      setTimeout(() => {
        if (!appOpened) {
          attemptDirectNavigation();
        }
      }, 100);
    }
    
    // Fallback to anchor click
    setTimeout(() => {
      if (!appOpened) {
        attemptAnchorClick();
      }
    }, 200);
    
    // If wallet doesn't open, redirect to store
    setTimeout(() => {
      if (!appOpened) {
        const storeUrl = getWalletStoreUrl(walletType);
        window.location.href = storeUrl;
        resolve({ opened: false, method: 'store-redirect' });
      }
    }, 2500);
  });
};

/**
 * Check if user is returning from wallet app after approval
 * @returns {Object|null} Connection attempt data or null
 */
export const checkWalletReturn = () => {
  try {
    const attemptData = sessionStorage.getItem('wallet-connection-attempt');
    if (attemptData) {
      const data = JSON.parse(attemptData);
      const timeSinceAttempt = Date.now() - data.timestamp;
      
      // If less than 5 minutes, consider it a valid return
      if (timeSinceAttempt < 5 * 60 * 1000) {
        return data;
      }
    }
  } catch (e) {
    console.error('Error checking wallet return:', e);
  }
  return null;
};

/**
 * Clear wallet connection attempt data
 */
export const clearWalletReturn = () => {
  try {
    sessionStorage.removeItem('wallet-connection-attempt');
  } catch (e) {
    console.error('Error clearing wallet return:', e);
  }
};

/**
 * Legacy function for backward compatibility
 */
export const openWallet = async (walletType = 'sui') => {
  const result = await openWalletWithReturn(walletType);
  return result.opened;
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
    message: 'Tap "Connect Wallet" to open your Sui wallet app.',
  };
};
