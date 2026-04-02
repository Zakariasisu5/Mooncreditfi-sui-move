import { useState, useEffect } from 'react';
import { ConnectButton, useCurrentAccount, useConnectWallet, useWallets } from '@mysten/dapp-kit';
import { Button } from '@/components/ui/button';
import { Wallet, Loader2 } from 'lucide-react';
import { isMobileDevice, isInWalletBrowser } from '@/utils/walletHelpers';
import { toast } from 'sonner';
import '@mysten/dapp-kit/dist/index.css';
import './WalletConnectButton.css';

/**
 * Simple, reliable wallet connection button
 * Works on both mobile and desktop
 */
const WalletConnectButton = () => {
  const account = useCurrentAccount();
  const wallets = useWallets();
  const { mutate: connect } = useConnectWallet();
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

  // Use standard ConnectButton for all cases
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
