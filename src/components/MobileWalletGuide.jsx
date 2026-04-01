import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Smartphone, ExternalLink, Copy, Check } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const MobileWalletGuide = () => {
  const [showGuide, setShowGuide] = useState(false);
  const [copied, setCopied] = useState(false);
  const currentUrl = window.location.href;

  useEffect(() => {
    // Detect if user is on mobile and not in a wallet browser
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isInWalletBrowser = /SuietWallet|SuiWallet|EthosWallet/i.test(navigator.userAgent);
    
    if (isMobile && !isInWalletBrowser) {
      // Check if user has dismissed the guide before
      const dismissed = localStorage.getItem('mobile-wallet-guide-dismissed');
      if (!dismissed) {
        setShowGuide(true);
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
              To use MoonCreditFi with your Suiet wallet on mobile, you'll need to open this app inside your wallet's browser. This allows secure connection to your wallet.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Quick Setup (3 steps):</h4>
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
          >
            I understand, continue anyway
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default MobileWalletGuide;
