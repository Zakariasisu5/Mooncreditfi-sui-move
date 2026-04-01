
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
  sui: {
    ios: 'https://apps.apple.com/app/sui-wallet/id6476628026',
    android: 'https://play.google.com/store/apps/details?id=com.mystenlabs.suiwallet',
    web: 'https://sui.io/wallet',
  },
  splash: {
    ios: 'https://apps.apple.com/app/splash-wallet/id6478960549',
    android: 'https://play.google.com/store/apps/details?id=io.cosmostation.splash',
    web: 'https://splash.im/',
  },
  slush: {
    ios: 'https://apps.apple.com/app/slush-wallet/id6478960549',
    android: 'https://play.google.com/store/apps/details?id=com.slush.wallet',
    web: 'https://slush.app/',
  },
};


export const generateWalletDeepLink = (wallet = 'sui') => {
  switch (wallet.toLowerCase()) {
    case 'sui':
      return 'sui://';
    case 'splash':
      return 'splash://';
    case 'slush':
      return 'slush://';
    case 'ethos':
      return 'ethos://';
    default:
      return 'sui://';
  }
};

/**
 * Get app store URL for wallet installation
 * @param {string} wallet - Wallet name ('sui', 'splash', 'slush')
 */
export const getWalletStoreUrl = (wallet = 'sui') => {
  const walletKey = wallet.toLowerCase();
  const storeInfo = WALLET_STORES[walletKey] || WALLET_STORES.sui;
  
  if (isIOS()) {
    return storeInfo.ios;
  } else if (isAndroid()) {
    return storeInfo.android;
  }
  return storeInfo.web;
};

/**
 * Open wallet app with deep link, fallback to store if not installed
 * @param {string} walletType - 'sui', 'splash', or 'slush'
 * @returns {Promise<boolean>} - True if wallet opened, false if redirected to store
 */
export const openWallet = async (walletType = 'sui') => {
  return new Promise((resolve) => {
    // Generate deep link (just opens the wallet app)
    const deepLink = generateWalletDeepLink(walletType);
    
    let appOpened = false;
    let redirectTimeout;
    
    // Function to handle successful app opening
    const handleAppOpened = () => {
      if (!appOpened) {
        appOpened = true;
        clearTimeout(redirectTimeout);
        resolve(true);
      }
    };
    
    // Listen for visibility change (app opened)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleAppOpened();
      }
    };
    
    // Listen for blur event (app opened)
    const handleBlur = () => {
      handleAppOpened();
    };
    
    // Listen for pagehide event (app opened)
    const handlePageHide = () => {
      handleAppOpened();
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('pagehide', handlePageHide);
    
    // Try to open wallet app via hidden iframe (prevents navigation error)
    try {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);
      
      // Set iframe src to deep link
      iframe.src = deepLink;
      
      // Clean up iframe after a short delay
      setTimeout(() => {
        if (iframe.parentNode) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    } catch (e) {
      console.log('Iframe method failed, trying direct link');
    }
    
    // Fallback: try creating a link and clicking it
    setTimeout(() => {
      if (!appOpened) {
        try {
          const link = document.createElement('a');
          link.href = deepLink;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } catch (e) {
          console.log('Link click method failed');
        }
      }
    }, 100);
    
    // Set timeout to redirect to store if app doesn't open
    redirectTimeout = setTimeout(() => {
      if (!appOpened) {
        // App didn't open, redirect to store
        const storeUrl = getWalletStoreUrl(walletType);
        window.location.href = storeUrl;
        resolve(false);
      }
    }, 2500);
    
    // Cleanup listeners after 4 seconds
    setTimeout(() => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('pagehide', handlePageHide);
    }, 4000);
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
    message: 'Tap "Connect Wallet" to open your Sui wallet app.',
  };
};
