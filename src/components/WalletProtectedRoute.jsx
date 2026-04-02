import { Navigate, useLocation } from 'react-router-dom';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { Loader2 } from 'lucide-react';

/**
 * Wallet-based route protection
 * Redirects to landing page if wallet is not connected
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

  // Redirect to landing if not connected
  if (!account) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  // Wallet connected - render protected content
  return children;
};

export default WalletProtectedRoute;
