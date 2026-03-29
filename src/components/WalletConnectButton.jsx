import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';
import { Button } from '@/components/ui/button';
import { Wallet, ChevronDown } from 'lucide-react';
import '@mysten/dapp-kit/dist/index.css';

const WalletConnectButton = () => {
  return (
    <ConnectButton
      connectText={
        <span className="inline-flex items-center">
          <Wallet className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Connect Wallet</span>
        </span>
      }
    />
  );
};

export default WalletConnectButton;
