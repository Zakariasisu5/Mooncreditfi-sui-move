import { useState, useEffect } from 'react';
import { ConnectButton, useCurrentAccount, useConnectWallet, useWallets } from '@mysten/dapp-kit';
import { Button } from '@/components/ui/button';
import { Wallet, Loader2 } from 'lucide-react';
import { isMobileDevice, isInWalletBrowser } from '@/utils/walletHelpers';
import MobileWalletSelector from './MobileWalletSelector';
import { toast } from 'sonner';
import '@mysten/dapp-kit/dist/index.css';

const WalletConnectButton = () => {
  const account = useCurrentAccount();
  const wallets = useWallets();
  const { mutate: connect, isPending } = useConnectWallet();
  const [showMobileSelector, setShowMobileSelector] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const mobile = isMobileDevice();
  const inWalletBrowser = isInWalletBrowser();

  // Auto-connect if in wallet browser and wallet is available
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

  // On mobile outside wallet browser, show wallet selector with deep linking
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
            onSuccess={() => {
              setShowMobileSelector(false);
              // User will return from wallet app
            }}
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
      <style jsx>{`
        .wallet-connect-wrapper {
          display: flex;
          align-items: center;
        }
        
        /* Mobile-specific styles */
        @media (max-width: 640px) {
          .wallet-connect-wrapper :global(button) {
            padding: 0.5rem 0.75rem !important;
            font-size: 0.875rem !important;
            min-height: 44px !important; /* iOS touch target size */
          }
          
          .wallet-connect-wrapper :global(.dapp-kit-button) {
            white-space: nowrap !important;
          }
        }
        
        /* Ensure dropdown menu is mobile-friendly */
        :global(.dapp-kit-dropdown) {
          max-width: 90vw !important;
          left: auto !important;
          right: 0 !important;
        }
        
        @media (max-width: 640px) {
          :global(.dapp-kit-dropdown) {
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            top: auto !important;
            max-width: 100vw !important;
            border-radius: 1rem 1rem 0 0 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default WalletConnectButton;
