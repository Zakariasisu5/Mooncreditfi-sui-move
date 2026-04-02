import { useState, useEffect } from 'react';
import { ConnectButton, useCurrentAccount, useWallets } from '@mysten/dapp-kit';
import { Button } from '@/components/ui/button';
import { Wallet, Loader2 } from 'lucide-react';
import { isMobileDevice, isInWalletBrowser } from '@/utils/walletHelpers';
import MobileWalletSelector from './MobileWalletSelector';
import '@mysten/dapp-kit/dist/index.css';
import './WalletConnectButton.css';

/**
 * Wallet connection button with proper mobile support
 * Mobile: Shows wallet selector to open wallet app
 * Desktop: Standard extension popup
 */
const WalletConnectButton = ({ variant = 'default', size = 'default', className = '' }) => {
  const account = useCurrentAccount();
  const wallets = useWallets();
  const [showMobileSelector, setShowMobileSelector] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const mobile = isMobileDevice();
  const inWalletBrowser = isInWalletBrowser();

  // Debug logging
  useEffect(() => {
    console.log('Wallet Connection Debug:', {
      mobile,
      inWalletBrowser,
      account: !!account,
      walletsCount: wallets.length,
      walletNames: wallets.map(w => w.name),
      userAgent: navigator.userAgent
    });
  }, [mobile, inWalletBrowser, account, wallets]);

  // Removed auto-connect - it was causing issues on mobile
  // Users should manually click Connect Wallet button even in wallet browser

  // On mobile outside wallet browser - show wallet selector
  if (mobile && !inWalletBrowser && !account) {
    const isCTA = variant === 'cta';
    return (
      <>
        <Button
          variant={isCTA ? 'default' : variant}
          size={size}
          className={`wallet-connect-btn min-h-[44px] ${isCTA ? 'btn-mooncreditfi text-base sm:text-lg px-6 sm:px-8 h-12 sm:h-14 w-full sm:w-auto' : ''} ${className}`}
          onClick={() => setShowMobileSelector(true)}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              <span className="hidden sm:inline">Connecting...</span>
              <span className="sm:hidden">Connecting...</span>
            </>
          ) : (
            <>
              <Wallet className="h-4 w-4 mr-2" />
              <span>Connect Wallet</span>
            </>
          )}
        </Button>
        
        {showMobileSelector && (
          <MobileWalletSelector
            onClose={() => setShowMobileSelector(false)}
            onSuccess={() => setShowMobileSelector(false)}
          />
        )}
      </>
    );
  }

  // Desktop or mobile in wallet browser - use standard ConnectButton
  // Always show ConnectButton for manual connection
  return (
    <div className={`wallet-connect-wrapper ${className}`}>
      <ConnectButton
        connectText={
          <span className="inline-flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">Connect Wallet</span>
            <span className="sm:hidden">Connect</span>
          </span>
        }
        className={`wallet-connect-btn min-h-[44px] ${variant === 'cta' ? 'btn-mooncreditfi text-base sm:text-lg px-6 sm:px-8 h-12 sm:h-14 w-full sm:w-auto' : ''}`}
      />
    </div>
  );
};

export default WalletConnectButton;
