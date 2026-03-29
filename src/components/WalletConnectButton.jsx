import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';
import { Button } from '@/components/ui/button';
import { Wallet, ChevronDown } from 'lucide-react';
import '@mysten/dapp-kit/dist/index.css';

const WalletConnectButton = () => {
  const account = useCurrentAccount();

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
