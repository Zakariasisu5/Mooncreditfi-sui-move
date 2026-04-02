import { useState, useEffect } from 'react';
import { ConnectButton, useCurrentAccount, useConnectWallet, useWallets } from '@mysten/dapp-kit';
import { Button } from '@/components/ui/button';
import { Wallet, Loader2, CheckCircle } from 'lucide-react';
import { isMobileDevice, isInWalletBrowser, openWalletWithReturn, checkWalletReturn, clearWalletReturn } from '@/utils/walletHelpers';
import { toast } from 'sonner';
import '@mysten/dapp-kit/dist/index.css';
import './WalletConnectButton.css';

/**
 * MetaMask-style wallet connection button
 * One-click connection with automatic wallet app opening on mobile
 */
const WalletConnectButton = () => {
  const account = useCurrentAccount();
  const wallets = useWallets();
  const { mutate: connect, isPending } = useConnectWallet();
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionState, setConnectionState] = useState('idle'); // idle, opening, waiting, connected
  
  const mobile = isMobileDevice();
  const inWalletBrowser = isInWalletBrowser();

  // Check if user is returning from wallet app
  useEffect(() => {
    const returnData = checkWalletReturn();
    
    if (returnData && !account && mobile && !inWalletBrowser) {
      // User returned from wallet app, attempt auto-connect
      setConnectionState('waiting');
      setIsConnecting(true);
      
      const attemptConnection = () => {
        const targetWallet = wallets.find(w => 
          w.name.toLowerCase().includes(returnData.wallet) ||
          w.name.toLowerCase().includes('sui')
        );
        
        if (targetWallet) {
          connect(
            { wallet: targetWallet },
            {
              onSuccess: () => {
                setIsConnecting(false);
                setConnectionState('connected');
                clearWalletReturn();
                toast.success('Wallet connected successfully!', {
                  icon: <CheckCircle className="h-4 w-4" />,
                });
              },
              onError: (error) => {
                setIsConnecting(false);
                setConnectionState('idle');
                clearWalletReturn();
                console.error('Auto-connect failed:', error);
                toast.error('Connection failed. Please try again.');
              },
            }
          );
        } else {
          // Wallet not detected yet, retry
          setTimeout(attemptConnection, 500);
        }
      };
      
      // Give wallet standard time to initialize
      setTimeout(attemptConnection, 300);
    }
  }, [account, mobile, inWalletBrowser, wallets, connect]);

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

  /**
   * MetaMask-style one-click connection
   * Opens wallet app on mobile, shows popup on desktop
   */
  const handleMetaMaskStyleConnect = async () => {
    if (mobile && !inWalletBrowser) {
      // Mobile outside wallet browser - open wallet app
      setIsConnecting(true);
      setConnectionState('opening');
      
      toast.loading('Opening wallet app...', { id: 'wallet-opening' });
      
      try {
        // Try Sui Wallet first (most popular)
        const result = await openWalletWithReturn('sui');
        
        if (result.opened) {
          toast.dismiss('wallet-opening');
          toast.success('Wallet app opened! Approve the connection.', {
            duration: 3000,
          });
          setConnectionState('waiting');
          // Keep isConnecting true - will be cleared when user returns
        } else {
          // Redirected to store
          toast.dismiss('wallet-opening');
          setIsConnecting(false);
          setConnectionState('idle');
        }
      } catch (error) {
        console.error('Failed to open wallet:', error);
        toast.dismiss('wallet-opening');
        toast.error('Failed to open wallet app');
        setIsConnecting(false);
        setConnectionState('idle');
      }
    } else {
      // Desktop or in wallet browser - use standard connection
      // The ConnectButton will handle this
    }
  };

  // Show loading state while waiting for return
  if (connectionState === 'waiting' || connectionState === 'opening') {
    return (
      <Button
        variant="outline"
        className="wallet-connect-btn min-h-[44px]"
        disabled
      >
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        <span className="hidden sm:inline">
          {connectionState === 'opening' ? 'Opening Wallet...' : 'Waiting for Approval...'}
        </span>
        <span className="sm:hidden">
          {connectionState === 'opening' ? 'Opening...' : 'Waiting...'}
        </span>
      </Button>
    );
  }

  // On mobile outside wallet browser - show MetaMask-style button
  if (mobile && !inWalletBrowser && !account) {
    return (
      <Button
        variant="outline"
        className="wallet-connect-btn min-h-[44px] bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 border-primary/20"
        onClick={handleMetaMaskStyleConnect}
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
