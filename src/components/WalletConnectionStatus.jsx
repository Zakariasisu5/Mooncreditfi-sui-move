import { useEffect, useState } from 'react';
import { useWallets, useCurrentAccount } from '@mysten/dapp-kit';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Smartphone, AlertCircle, CheckCircle, Wallet } from 'lucide-react';
import { 
  isMobileDevice, 
  isInWalletBrowser, 
  getAvailableWallets,
  getWalletConnectionMessage 
} from '@/utils/walletHelpers';

/**
 * Component to detect and display wallet connection status
 * Helps debug mobile wallet connection issues
 */
const WalletConnectionStatus = () => {
  const wallets = useWallets();
  const account = useCurrentAccount();
  const [walletStatus, setWalletStatus] = useState(null);

  useEffect(() => {
    const status = getWalletConnectionMessage();
    const info = {
      isMobile: isMobileDevice(),
      isInWalletBrowser: isInWalletBrowser(),
      availableWallets: getAvailableWallets(),
      detectedWallets: wallets.length,
      userAgent: navigator.userAgent,
      ...status,
    };
    setWalletStatus(info);
  }, [wallets]);

  // Only show on mobile when not connected
  if (!walletStatus?.isMobile || account) return null;

  const Icon = walletStatus.type === 'success' ? CheckCircle : AlertCircle;
  const iconColor = walletStatus.type === 'success' ? 'text-green-500' : 'text-orange-500';

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto">
      <Alert className="bg-card border-border">
        <div className="flex items-start gap-3">
          <Icon className={`h-5 w-5 ${iconColor} flex-shrink-0 mt-0.5`} />
          <div className="flex-1 space-y-2">
            <AlertDescription className="text-sm">
              {walletStatus.message}
            </AlertDescription>
            
            {/* Debug info - only in development */}
            {process.env.NODE_ENV === 'development' && (
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer hover:text-foreground">Debug Info</summary>
                <pre className="mt-2 p-2 bg-muted rounded text-[10px] overflow-x-auto">
                  {JSON.stringify(walletStatus, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      </Alert>
    </div>
  );
};

export default WalletConnectionStatus;
