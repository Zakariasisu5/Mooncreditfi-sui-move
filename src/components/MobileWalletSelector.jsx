import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Wallet, Loader2, ExternalLink, Zap } from 'lucide-react';
import { openWalletWithReturn, isIOS, isAndroid, getWalletStoreUrl } from '@/utils/walletHelpers';
import { SUPPORTED_WALLETS } from '@/config/wallets';
import { toast } from 'sonner';

/**
 * Mobile wallet selector - Fallback for MetaMask-style connection
 * Shows when user explicitly wants to choose a different wallet
 */
const MobileWalletSelector = ({ onClose, onSuccess }) => {
  const [isOpening, setIsOpening] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState(null);

  const handleOpenWallet = async (walletType) => {
    setIsOpening(true);
    setSelectedWallet(walletType);

    toast.loading('Opening wallet app...', { id: 'wallet-opening' });

    try {
      const result = await openWalletWithReturn(walletType);
      
      toast.dismiss('wallet-opening');
      
      if (result.opened) {
        toast.success('Wallet app opened! Approve the connection.', {
          duration: 3000,
        });
        
        // Close modal and let user approve in wallet
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1000);
      } else {
        // Redirected to store
        setIsOpening(false);
        setSelectedWallet(null);
      }
    } catch (error) {
      console.error('Failed to open wallet:', error);
      toast.dismiss('wallet-opening');
      toast.error('Failed to open wallet app');
      setIsOpening(false);
      setSelectedWallet(null);
    }
  };

  const handleInstallWallet = (walletType) => {
    const storeUrl = getWalletStoreUrl(walletType);
    window.open(storeUrl, '_blank');
  };

  // Get wallets from configuration
  const wallets = Object.values(SUPPORTED_WALLETS).filter(w => 
    ['sui', 'suiet', 'splash', 'slush'].includes(w.id)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <Card className="w-full max-w-md animate-in slide-in-from-bottom duration-300">
        <CardHeader className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2"
            onClick={onClose}
            disabled={isOpening}
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-primary/10">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Choose Your Wallet</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                MetaMask-style one-click connection
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isOpening ? (
            <div className="py-8 text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <div>
                <p className="font-semibold text-lg">
                  Opening {SUPPORTED_WALLETS[selectedWallet]?.displayName || selectedWallet}...
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Approve the connection in your wallet app
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-primary">One-Click Connection</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      Tap a wallet → App opens → Approve → Return connected
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {wallets.map((wallet) => (
                  <div key={wallet.id} className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full h-auto p-4 justify-start hover:bg-primary/10 hover:border-primary/50 transition-all"
                      onClick={() => handleOpenWallet(wallet.id)}
                    >
                      <div className="flex items-center gap-4 w-full">
                        <span className="text-3xl">{wallet.icon}</span>
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{wallet.displayName}</span>
                            {wallet.recommended && (
                              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                                Recommended
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {wallet.description}
                          </p>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => handleInstallWallet(wallet.id)}
                    >
                      Don't have {wallet.displayName}? Install it
                    </Button>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t">
                <Button
                  variant="ghost"
                  className="w-full text-xs"
                  onClick={onClose}
                >
                  Cancel
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MobileWalletSelector;
