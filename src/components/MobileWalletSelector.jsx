import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Wallet, Loader2, ExternalLink } from 'lucide-react';
import { openWallet, isIOS, isAndroid } from '@/utils/walletHelpers';

/**
 * Mobile wallet selector with deep linking
 * Opens wallet app or redirects to install page
 */
const MobileWalletSelector = ({ onClose, onSuccess }) => {
  const [isOpening, setIsOpening] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState(null);

  const handleOpenWallet = async (walletType) => {
    setIsOpening(true);
    setSelectedWallet(walletType);

    try {
      const opened = await openWallet(walletType);
      
      if (opened) {
        // Wallet app opened successfully
        // Wait a bit then close modal (user will return from wallet)
        setTimeout(() => {
          setIsOpening(false);
          if (onSuccess) onSuccess();
        }, 1000);
      } else {
        // Redirected to store
        setIsOpening(false);
      }
    } catch (error) {
      console.error('Failed to open wallet:', error);
      setIsOpening(false);
      setSelectedWallet(null);
    }
  };

  const wallets = [
    {
      id: 'suiet',
      name: 'Suiet',
      description: 'Most popular Sui wallet',
      icon: '🔵',
      recommended: true,
    },
    {
      id: 'slush',
      name: 'Slush',
      description: 'Fast and secure',
      icon: '💧',
      recommended: false,
    },
  ];

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
            <CardTitle>Choose Your Wallet</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isOpening ? (
            <div className="py-8 text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <div>
                <p className="font-semibold text-lg">Opening {selectedWallet}...</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {isIOS() || isAndroid() 
                    ? 'If the app doesn\'t open, you\'ll be redirected to install it.'
                    : 'Please wait...'}
                </p>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Select a wallet to connect. The app will open automatically.
              </p>

              <div className="space-y-3">
                {wallets.map((wallet) => (
                  <Button
                    key={wallet.id}
                    variant="outline"
                    className="w-full h-auto p-4 justify-start hover:bg-primary/10 hover:border-primary/50 transition-all"
                    onClick={() => handleOpenWallet(wallet.id)}
                  >
                    <div className="flex items-center gap-4 w-full">
                      <span className="text-3xl">{wallet.icon}</span>
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{wallet.name}</span>
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
                ))}
              </div>

              <div className="pt-4 border-t space-y-2">
                <p className="text-xs text-muted-foreground text-center">
                  Don't have a wallet? Tap any option above to install.
                </p>
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
