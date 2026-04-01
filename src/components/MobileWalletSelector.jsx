import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Wallet, Loader2, ExternalLink, Copy, Check } from 'lucide-react';
import { openWallet, isIOS, isAndroid, getWalletStoreUrl } from '@/utils/walletHelpers';

/**
 * Mobile wallet selector with deep linking
 * Opens wallet app or redirects to install page
 */
const MobileWalletSelector = ({ onClose, onSuccess }) => {
  const [isOpening, setIsOpening] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [showManualSteps, setShowManualSteps] = useState(false);
  const [copied, setCopied] = useState(false);
  const currentUrl = window.location.href;

  const handleOpenWallet = async (walletType) => {
    setIsOpening(true);
    setSelectedWallet(walletType);

    try {
      const opened = await openWallet(walletType);
      
      if (opened) {
        // Wallet app opened successfully
        // Show manual steps since we can't deep link to specific URL
        setTimeout(() => {
          setIsOpening(false);
          setShowManualSteps(true);
        }, 500);
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

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleInstallWallet = (walletType) => {
    const storeUrl = getWalletStoreUrl(walletType);
    window.open(storeUrl, '_blank');
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

  if (showManualSteps) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <Card className="w-full max-w-md animate-in slide-in-from-bottom duration-300">
          <CardHeader className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-green-500/10">
                <Check className="h-6 w-6 text-green-500" />
              </div>
              <CardTitle>Wallet Opened!</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your {selectedWallet} wallet should now be open. Follow these steps to connect:
            </p>

            <div className="space-y-3">
              <ol className="space-y-3 text-sm">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                    1
                  </span>
                  <span>In your wallet app, tap the <strong>Browser</strong> or <strong>Discover</strong> tab</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                    2
                  </span>
                  <span>Copy the URL below and paste it in the wallet browser</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                    3
                  </span>
                  <span>Once the app loads, tap <strong>Connect Wallet</strong></span>
                </li>
              </ol>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleCopyUrl}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  URL Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy App URL
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              className="w-full"
              onClick={onClose}
            >
              Got it!
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
                Select a wallet to open. You'll need to navigate to the browser tab inside the wallet app.
              </p>

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
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => handleInstallWallet(wallet.id)}
                    >
                      Don't have {wallet.name}? Install it
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
