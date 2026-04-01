import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Smartphone, ExternalLink, Copy, Check, Zap } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { isMobileDevice, isInWalletBrowser, openWallet } from '@/utils/walletHelpers';

const MobileWalletGuide = () => {
  const [showGuide, setShowGuide] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const currentUrl = window.location.href;

  useEffect(() => {
    // Only show guide on mobile devices outside wallet browsers
    if (isMobileDevice() && !isInWalletBrowser()) {
      // Check if user has dismissed the guide before
      const dismissed = localStorage.getItem('mobile-wallet-guide-dismissed');
      if (!dismissed) {
        // Show guide after a short delay
        setTimeout(() => setShowGuide(true), 1000);
      }
    }
  }, []);

  const handleDismiss = () => {
    setShowGuide(false);
    localStorage.setItem('mobile-wallet-guide-dismissed', 'true');
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

  const handleQuickOpen = async () => {
    setIsOpening(true);
    try {
      await openWallet('suiet', currentUrl);
      // User will be redirected or app will open
      setTimeout(() => {
        setIsOpening(false);
        handleDismiss();
      }, 2000);
    } catch (error) {
      console.error('Failed to open wallet:', error);
      setIsOpening(false);
    }
  };

  if (!showGuide) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <Card className="w-full max-w-md animate-in slide-in-from-bottom duration-300">
        <CardHeader className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2"
            onClick={handleDismiss}
            disabled={isOpening}
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-primary/10">
              <Smartphone className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Connect Your Mobile Wallet</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              To use MoonCreditFi with your Suiet wallet on mobile, open this app inside your wallet's browser for secure connection.
            </AlertDescription>
          </Alert>

          {/* Quick Open Button */}
          <Button
            onClick={handleQuickOpen}
            disabled={isOpening}
            className="w-full h-14 text-base font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          >
            {isOpening ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                Opening Suiet...
              </>
            ) : (
              <>
                <Zap className="h-5 w-5 mr-2" />
                Open in Suiet Wallet
              </>
            )}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or follow these steps</span>
            </div>
          </div>

          <div className="space-y-3">
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                  1
                </span>
                <span>Open your <strong className="text-foreground">Suiet wallet app</strong> on your phone</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                  2
                </span>
                <span>Tap the <strong className="text-foreground">Browser</strong> or <strong className="text-foreground">Discover</strong> tab at the bottom</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                  3
                </span>
                <span>Copy the URL below and paste it in the wallet browser's address bar</span>
              </li>
            </ol>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleCopyUrl}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy URL
                </>
              )}
            </Button>
          </div>

          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground text-center">
              Don't have Suiet wallet?{' '}
              <a
                href="https://suiet.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Download here
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>

          <Button
            variant="ghost"
            className="w-full"
            onClick={handleDismiss}
            disabled={isOpening}
          >
            I understand, continue anyway
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default MobileWalletGuide;
