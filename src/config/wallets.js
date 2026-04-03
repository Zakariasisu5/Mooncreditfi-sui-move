/**
 * Wallet Configuration for Sui dApp
 * Handles wallet detection, deep linking, and connection management
 */

// Supported wallets configuration
export const SUPPORTED_WALLETS = {
  sui: {
    id: 'sui',
    name: 'Sui Wallet',
    displayName: 'Sui Wallet',
    description: 'Official Sui wallet',
    icon: '💎',
    deepLink: 'sui://',
    downloadUrls: {
      ios: 'https://apps.apple.com/app/sui-wallet/id6476628026',
      android: 'https://play.google.com/store/apps/details?id=com.mystenlabs.suiwallet',
      chrome: 'https://chrome.google.com/webstore/detail/sui-wallet/opcgpfmipidbgpenhmajoajpbobppdil',
      web: 'https://sui.io/wallet',
    },
    recommended: true,
  },
  suiet: {
    id: 'suiet',
    name: 'Suiet Wallet',
    displayName: 'Suiet',
    description: 'Feature-rich wallet',
    icon: '🔮',
    deepLink: 'suiet://',
    downloadUrls: {
      chrome: 'https://chrome.google.com/webstore/detail/suiet-sui-wallet/khpkpbbcccdmmclmpigdgddabeilkdpd',
      web: 'https://suiet.app/',
    },
    recommended: false,
    desktopOnly: true,
  },
  splash: {
    id: 'splash',
    name: 'Splash Wallet',
    displayName: 'Splash',
    description: 'Multi-chain wallet',
    icon: '🌊',
    deepLink: 'splash://',
    downloadUrls: {
      ios: 'https://apps.apple.com/app/splash-wallet/id6478960549',
      android: 'https://play.google.com/store/apps/details?id=io.cosmostation.splash',
      web: 'https://splash.im/',
    },
    recommended: false,
  },
  slush: {
    id: 'slush',
    name: 'Slush Wallet',
    displayName: 'Slush',
    description: 'Fast and secure',
    icon: '💧',
    deepLink: 'slush://',
    downloadUrls: {
      ios: 'https://apps.apple.com/app/slush-wallet/id6478960549',
      android: 'https://play.google.com/store/apps/details?id=com.slush.wallet',
      web: 'https://slush.app/',
    },
    recommended: false,
  },
  ethos: {
    id: 'ethos',
    name: 'Ethos Wallet',
    displayName: 'Ethos',
    description: 'User-friendly wallet',
    icon: '🔷',
    deepLink: 'ethos://',
    downloadUrls: {
      ios: 'https://apps.apple.com/app/ethos-sui-wallet/id6444806936',
      android: 'https://play.google.com/store/apps/details?id=com.ethoswallet',
      chrome: 'https://chrome.google.com/webstore/detail/ethos-sui-wallet/mcbigmjiafegjnnogedioegffbooigli',
      web: 'https://ethoswallet.xyz/',
    },
    recommended: false,
  },
};

// Get wallet configuration by ID
export const getWalletConfig = (walletId) => {
  return SUPPORTED_WALLETS[walletId] || SUPPORTED_WALLETS.sui;
};

// Get all supported wallet IDs
export const getSupportedWalletIds = () => {
  return Object.keys(SUPPORTED_WALLETS);
};

// Get recommended wallets
export const getRecommendedWallets = () => {
  return Object.values(SUPPORTED_WALLETS).filter(w => w.recommended);
};

// Get wallet download URL based on platform
export const getWalletDownloadUrl = (walletId, platform = 'web') => {
  const wallet = getWalletConfig(walletId);
  return wallet.downloadUrls[platform] || wallet.downloadUrls.web;
};

// Wallet detection utilities
export const detectInstalledWallets = () => {
  if (typeof window === 'undefined') return [];
  
  const installed = [];
  
  // Check for Sui Wallet
  if (window.suiWallet || window['sui:wallet']) {
    installed.push('sui');
  }
  
  // Check for Suiet
  if (window.suiet || window.ethereum?.isSuiet) {
    installed.push('suiet');
  }
  
  // Check for Suiet
  if (window.suiet || window.ethereum?.isSuiet) {
    installed.push('suiet');
  }
  
  // Check for Ethos
  if (window.ethosWallet) {
    installed.push('ethos');
  }
  
  return installed;
};

// Check if specific wallet is installed
export const isWalletInstalled = (walletId) => {
  const installed = detectInstalledWallets();
  return installed.includes(walletId);
};

// Wallet connection error messages
export const WALLET_ERROR_MESSAGES = {
  USER_REJECTED: 'Connection request was rejected. Please try again.',
  WALLET_NOT_FOUND: 'Wallet not found. Please install a Sui wallet.',
  NETWORK_MISMATCH: 'Please switch to the correct network in your wallet.',
  ALREADY_CONNECTED: 'Wallet is already connected.',
  CONNECTION_FAILED: 'Failed to connect wallet. Please try again.',
  TRANSACTION_REJECTED: 'Transaction was rejected.',
  INSUFFICIENT_FUNDS: 'Insufficient funds for this transaction.',
  UNKNOWN_ERROR: 'An unknown error occurred. Please try again.',
};

// Get user-friendly error message
export const getWalletErrorMessage = (error) => {
  if (!error) return WALLET_ERROR_MESSAGES.UNKNOWN_ERROR;
  
  const errorMessage = error.message || error.toString();
  
  if (errorMessage.includes('rejected') || errorMessage.includes('denied')) {
    return WALLET_ERROR_MESSAGES.USER_REJECTED;
  }
  if (errorMessage.includes('not found') || errorMessage.includes('not installed')) {
    return WALLET_ERROR_MESSAGES.WALLET_NOT_FOUND;
  }
  if (errorMessage.includes('network')) {
    return WALLET_ERROR_MESSAGES.NETWORK_MISMATCH;
  }
  if (errorMessage.includes('already connected')) {
    return WALLET_ERROR_MESSAGES.ALREADY_CONNECTED;
  }
  if (errorMessage.includes('insufficient')) {
    return WALLET_ERROR_MESSAGES.INSUFFICIENT_FUNDS;
  }
  
  return WALLET_ERROR_MESSAGES.CONNECTION_FAILED;
};
