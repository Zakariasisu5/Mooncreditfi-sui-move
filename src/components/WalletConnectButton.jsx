import { useState, useEffect } from 'react';
import { ConnectButton, useCurrentAccount, useConnectWallet, useWallets } from '@mysten/dapp-kit';
import { Button } from '@/components/ui/button';
import { Wallet, Loader2 } from 'lucide-react';
import { isMobileDevice, isInWalletBrowser } from '@/utils/walletHelpers';
import MobileWalletSelector from './MobileWalletSelector';
import { toast } from 'sonner';
import '@mysten/dapp-kit/dist/index.css';
import './WalletConnectButton.css';

/**
 * Wallet connection button with proper mobile support
 * Mobile: Shows wallet selector to open wallet app
 * Desktop: Standard extension popup
 */
const WalletConnectButton = () => {
  const account = useCurrentAccount();
  const wallets = useWallets();
  const { mutate: connect } = useConnectWallet();
  const [showMobileSelector, setShowMobileSelector] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const mobile = isMobileDevice();
  const inWalletBrowser = isInWalletBrowser();

  // Auto-connect if in wallet browser
  useEffect(() => {
    if (mobile && inWalletBrowser && !account && wallets.length > 0 && !isConnecting) {
      const suiWallet = wallets.find(w => 
        w.name.toLowerCase().includes('sui') || 
        w.name.toLowerCase().includes('suiet')
      );
      
      if (suiWallet) {
        setIsConnecting(true);
        connect(
          { wallet: suiWallet },
          {
            onSuccess: () => {
              setIsConnecting(false);
              toast.success('Wallet connected successfully!');
            },
            onError: (error) => {
              setIsConnecting(false);
              console.error('Auto-connect failed:', error);
            },
          }
        );
      }
    }
  }, [mobile, inWalletBrowser, account, wallets, connect, isConnecting]);

  // On mobile outside wallet browser - show wallet selector
  if (mobile && !inWalletBrowser && !account) {
    return (
      <>
        <Button
          variant="outline"
          className="wallet-connect-btn min-h-[44px]"
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
              <span className="hidden sm:inline">Connect Wallet</span>
              <span className="sm:hidden">Connect</span>
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
  return (
    <div className="wallet-connect-wrapper">
      <ConnectButton
        connectText={
          <span className="inline-flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">Connect Wallet</span>
            <span className="sm:hidden">Connect</span>
          </span>
        }
        className="wallet-connect-btn"
      />
    </div>
  );
};

export default WalletConnectButton;
