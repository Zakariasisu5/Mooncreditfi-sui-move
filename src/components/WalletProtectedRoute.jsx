import { useLocation } from 'react-router-dom';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { Loader2, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import WalletConnectButton from './WalletConnectButton';

/**
 * Wallet-based route protection
 * Shows connect wallet prompt if wallet is not connected
 */
const WalletProtectedRoute = ({ children }) => {
  const account = useCurrentAccount();
  const location = useLocation();

  // Show nothing while checking wallet status (prevents flash)
  if (account === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Checking wallet connection...</p>
        </div>
      </div>
    );
  }

  // Show connect wallet prompt instead of redirecting
  if (!account) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Wallet className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>Wallet Connection Required</CardTitle>
            <CardDescription>
              Please connect your wallet to access this page
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <WalletConnectButton variant="cta" size="lg" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Wallet connected - render protected content
  return children;
};

export default WalletProtectedRoute;
