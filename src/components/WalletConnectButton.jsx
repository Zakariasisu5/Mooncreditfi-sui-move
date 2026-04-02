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

  // Auto-connect if in wallet browser - try all available wallets
  useEffect(() => {
    if (mobile && inWalletBrowser && !account && wallets.length > 0 && !isConnecting) {
      console.log('Attempting auto-connect in wallet browser...');
      
      // Try to find any Sui wallet
      const suiWallet = wallets.find(w => 
        w.name.toLowerCase().includes('sui')
      ) || wallets[0]; // Fallback to first wallet
      
      if (suiWallet) {
        console.log('Auto-connecting to:', suiWallet.name);
        setIsConnecting(true);
        
        connect(
          { wallet: suiWallet },
          {
            onSuccess: () => {
              console.log('Auto-connect successful!');
              setIsConnecting(false);
              toast.success('Wallet connected successfully!');
            },
            onError: (error) => {
              console.error('Auto-connect failed:', error);
              setIsConnecting(false);
              toast.error('Auto-connect failed. Please connect manually.');
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
  // Force show even if auto-connect fails
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
