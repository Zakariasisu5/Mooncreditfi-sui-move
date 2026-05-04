/**
 * Collateral Vault Card Component
 * Displays collateral vault status and management UI
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Shield, AlertTriangle, CheckCircle, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import { useCollateralVault, useInvalidateQueries } from '@/hooks/useContractData';
import { useSecureTransaction } from '@/hooks/useSecureTransaction';
import { CollateralService, ErrorService } from '@/services/contractService';
import { useCurrentAccount } from '@mysten/dapp-kit';

const CollateralVaultCard = () => {
  const account = useCurrentAccount();
  const isConnected = !!account;
  
  const { data: vault, isLoading: isLoadingVault } = useCollateralVault();
  const { invalidateAll } = useInvalidateQueries();
  const { executeSecureTransaction, isPending, isConfirming } = useSecureTransaction();

  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');

  const hasVault = !!vault;
  const isProcessing = isPending || isConfirming;

  const handleCreateVault = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      const tx = CollateralService.createVaultTransaction();

      await executeSecureTransaction(tx, {
        type: 'createVault',
        validationParams: {},
        onSuccess: (digest) => {
          toast.success('Collateral vault created! Now deposit SUI to proceed with borrowing.');
          // Wait longer for events to be indexed (increased from 3s to 5s)
          setTimeout(async () => {
            await invalidateAll();
          }, 5000);
        },
        onError: (error) => {
          const friendlyError = ErrorService.getUserFriendlyError(error);
          toast.error(friendlyError.message);
        },
      });
    } catch (error) {
      console.error('Create vault error:', error);
    }
  };

  const handleDepositCollateral = async () => {
    if (!isConnected || !hasVault) {
      toast.error('Please create a vault first');
      return;
    }

    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      const tx = CollateralService.depositCollateralTransaction(vault.objectId, parseFloat(depositAmount));

      await executeSecureTransaction(tx, {
        type: 'depositCollateral',
        validationParams: { amount: depositAmount },
        onSuccess: (digest) => {
          toast.success(`Deposited ${depositAmount} SUI as collateral`);
          setDepositAmount('');
          // Wait longer for events to be indexed (increased from 3s to 6s)
          setTimeout(async () => {
            await invalidateAll();
          }, 6000);
        },
        onError: (error) => {
          const friendlyError = ErrorService.getUserFriendlyError(error);
          toast.error(friendlyError.message);
        },
      });
    } catch (error) {
      console.error('Deposit collateral error:', error);
    }
  };

  const handleWithdrawCollateral = async () => {
    if (!isConnected || !hasVault) {
      toast.error('Vault not found');
      return;
    }

    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (vault.borrowedAmount > 0) {
      toast.error('Cannot withdraw collateral while you have active loans');
      return;
    }

    try {
      const tx = CollateralService.withdrawCollateralTransaction(vault.objectId, parseFloat(withdrawAmount));

      await executeSecureTransaction(tx, {
        type: 'withdrawCollateral',
        validationParams: { amount: withdrawAmount },
        onSuccess: (digest) => {
          toast.success(`Withdrawn ${withdrawAmount} SUI from collateral`);
          setWithdrawAmount('');
          // Wait longer for events to be indexed (increased from 2s to 5s)
          setTimeout(async () => {
            await invalidateAll();
          }, 5000);
        },
        onError: (error) => {
          const friendlyError = ErrorService.getUserFriendlyError(error);
          toast.error(friendlyError.message);
        },
      });
    } catch (error) {
      console.error('Withdraw collateral error:', error);
    }
  };

  // Calculate health status
  const getHealthStatus = () => {
    if (!vault || vault.borrowedAmount === 0) {
      return { label: 'No Debt', color: 'text-green-500', icon: CheckCircle, variant: 'default' };
    }
    if (vault.isLiquidatable) {
      return { label: 'Liquidatable', color: 'text-red-500', icon: AlertTriangle, variant: 'destructive' };
    }
    if (vault.isAtRisk) {
      return { label: 'At Risk', color: 'text-yellow-500', icon: AlertTriangle, variant: 'secondary' };
    }
    return { label: 'Healthy', color: 'text-green-500', icon: CheckCircle, variant: 'default' };
  };

  const healthStatus = hasVault ? getHealthStatus() : null;

  if (isLoadingVault) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
            <p className="text-muted-foreground">Loading vault data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasVault) {
    return (
      <Card className="card-glow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Collateral Vault
          </CardTitle>
          <CardDescription>Secure your loans with collateral</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Create a collateral vault to secure your loans. Collateral requirements depend on your credit score: 750+ = No collateral needed, 650-749 = 25%, 550-649 = 50%, 450-549 = 100%.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <h4 className="font-medium">Why Collateral?</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Protects lenders from default risk</li>
              <li>Enables lower interest rates</li>
              <li>Builds trust in the protocol</li>
              <li>Withdraw anytime when loans are repaid</li>
            </ul>
          </div>

          <Button onClick={handleCreateVault} disabled={isProcessing || !isConnected} className="w-full btn-mooncreditfi">
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Create Vault
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-glow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Collateral Vault
            </CardTitle>
            <CardDescription>Manage your collateral</CardDescription>
          </div>
          {healthStatus && (
            <Badge variant={healthStatus.variant} className="flex items-center gap-1">
              <healthStatus.icon className="h-3 w-3" />
              {healthStatus.label}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Vault Status */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-sm text-muted-foreground mb-1">Collateral</p>
              <p className="text-2xl font-bold text-primary">{vault.collateralAmount.toFixed(4)} SUI</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Borrowed</p>
              <p className="text-2xl font-bold">{vault.borrowedAmount.toFixed(4)} SUI</p>
            </div>
          </div>

          {vault.borrowedAmount > 0 && (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Collateral Ratio</span>
                  <span className={`font-medium ${healthStatus.color}`}>
                    {vault.collateralRatio.toFixed(1)}%
                  </span>
                </div>
                <Progress 
                  value={Math.min((vault.collateralRatio / 200) * 100, 100)} 
                  className="h-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Liquidation: {vault.liquidationThreshold}%</span>
                  <span>Safe: 180%+</span>
                </div>
              </div>

              {vault.isAtRisk && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Your collateral ratio is low. Deposit more collateral or repay your loan to avoid liquidation.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </div>

        {/* Deposit Collateral */}
        <div className="space-y-2">
          <Label htmlFor="deposit-collateral">Deposit Collateral</Label>
          <div className="flex gap-2">
            <Input
              id="deposit-collateral"
              type="number"
              placeholder="0.0"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              min="0.01"
              step="0.01"
              disabled={isProcessing}
            />
            <Button onClick={handleDepositCollateral} disabled={isProcessing || !depositAmount} className="btn-mooncreditfi">
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Deposit
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Withdraw Collateral */}
        {vault.borrowedAmount === 0 && vault.collateralAmount > 0 && (
          <div className="space-y-2">
            <Label htmlFor="withdraw-collateral">Withdraw Collateral</Label>
            <div className="flex gap-2">
              <Input
                id="withdraw-collateral"
                type="number"
                placeholder="0.0"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                min="0.01"
                step="0.01"
                max={vault.availableToWithdraw}
                disabled={isProcessing}
              />
              <Button onClick={handleWithdrawCollateral} disabled={isProcessing || !withdrawAmount} variant="outline">
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <TrendingDown className="h-4 w-4 mr-2" />
                    Withdraw
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Available: {vault.availableToWithdraw.toFixed(4)} SUI
            </p>
          </div>
        )}

        {vault.borrowedAmount > 0 && (
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Collateral is locked while you have active loans. Repay your loans to withdraw collateral.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default CollateralVaultCard;
