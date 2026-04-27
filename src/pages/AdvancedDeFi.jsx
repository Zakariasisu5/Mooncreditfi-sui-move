import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import RiskPoolSelector from '@/components/RiskPoolSelector';
import MudarabahPoolInterface from '@/components/MudarabahPoolInterface';
import { useCreditProfile, useInvalidateQueries } from '@/hooks/useContractData';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useSecureTransaction } from '@/hooks/useSecureTransaction';
import { RiskPoolService, MudarabahService, ErrorService } from '@/services/contractService';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const AdvancedDeFi = () => {
  const account = useCurrentAccount();
  const { data: profile, isLoading: isLoadingProfile } = useCreditProfile();
  const { invalidateAll } = useInvalidateQueries();
  const queryClient = useQueryClient();
  const { executeSecureTransaction, isPending, isConfirming } = useSecureTransaction();
  const [activeTab, setActiveTab] = useState('risk-pools');

  const userReputation = profile?.reputation || 500;
  const isConnected = !!account;

  const handleRiskPoolDeposit = async (pool, amount) => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      const tx = RiskPoolService.depositToRiskPoolTransaction(pool.id, amount);
      
      await executeSecureTransaction(tx, {
        type: 'riskPoolDeposit',
        validationParams: { amount, pool },
        onSuccess: () => {
          toast.success(`Successfully deposited ${amount} SUI to ${pool.name}`);
          setTimeout(() => {
            invalidateAll();
            queryClient.invalidateQueries({ queryKey: ['riskPools'] });
          }, 2000);
        },
        onError: (error) => {
          const friendlyError = ErrorService.getUserFriendlyError(error);
          toast.error(friendlyError.message);
        },
      });
    } catch (error) {
      console.error('Risk pool deposit error:', error);
    }
  };

  const handleRiskPoolBorrow = async (pool, amount) => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!profile?.objectId) {
      toast.error('Please create a credit profile first');
      return;
    }

    try {
      const tx = RiskPoolService.borrowFromRiskPoolTransaction(pool.id, profile.objectId, amount);
      
      await executeSecureTransaction(tx, {
        type: 'riskPoolBorrow',
        validationParams: { amount, pool, profile },
        onSuccess: () => {
          toast.success(`Successfully borrowed ${amount} SUI from ${pool.name}`);
          setTimeout(() => {
            invalidateAll();
            queryClient.invalidateQueries({ queryKey: ['riskPools'] });
          }, 2000);
        },
        onError: (error) => {
          const friendlyError = ErrorService.getUserFriendlyError(error);
          toast.error(friendlyError.message);
        },
      });
    } catch (error) {
      console.error('Risk pool borrow error:', error);
    }
  };

  const handleMudarabahContribute = async (pool, amount) => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      const tx = MudarabahService.contributeToMudarabahTransaction(pool.id, amount);
      
      await executeSecureTransaction(tx, {
        type: 'mudarabahContribute',
        validationParams: { amount, pool },
        onSuccess: () => {
          toast.success(`Successfully contributed ${amount} SUI to Mudarabah pool`);
          setTimeout(() => {
            invalidateAll();
            queryClient.invalidateQueries({ queryKey: ['mudarabahPool'] });
          }, 2000);
        },
        onError: (error) => {
          const friendlyError = ErrorService.getUserFriendlyError(error);
          toast.error(friendlyError.message);
        },
      });
    } catch (error) {
      console.error('Mudarabah contribute error:', error);
    }
  };

  const handleMudarabahDistribute = async (pool) => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      const tx = MudarabahService.distributeProfitTransaction(pool.id);
      
      await executeSecureTransaction(tx, {
        type: 'mudarabahDistribute',
        validationParams: { pool },
        onSuccess: () => {
          toast.success('Profit distributed successfully!');
          setTimeout(() => {
            invalidateAll();
            queryClient.invalidateQueries({ queryKey: ['mudarabahPool'] });
            queryClient.invalidateQueries({ queryKey: ['mudarabahDistributionHistory'] });
          }, 2000);
        },
        onError: (error) => {
          const friendlyError = ErrorService.getUserFriendlyError(error);
          toast.error(friendlyError.message);
        },
      });
    } catch (error) {
      console.error('Mudarabah distribute error:', error);
    }
  };

  const isProcessing = isPending || isConfirming;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mooncreditfi-glow">Advanced DeFi Features</h1>
        <p className="text-muted-foreground mt-2">
          Access risk-based lending pools and Islamic finance
        </p>
      </div>

      {!isConnected && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please connect your wallet to access advanced DeFi features.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Your Credit Metrics</CardTitle>
          <CardDescription>
            Your reputation score determines access to different risk pools
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingProfile ? (
            <div className="text-center py-4 text-muted-foreground">Loading profile...</div>
          ) : profile ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Credit Score</p>
                <p className="font-bold text-lg">{profile.score || 0}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Reputation</p>
                <p className="font-bold text-lg">{userReputation}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Risk Level</p>
                <p className="font-bold text-lg">
                  {profile.risk_level === 1 ? 'Low' : profile.risk_level === 2 ? 'Medium' : 'High'}
                </p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Total Loans</p>
                <p className="font-bold text-lg">{profile.loanCount || 0}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              No credit profile found. Create one to access advanced features.
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="risk-pools">Risk Pools</TabsTrigger>
          <TabsTrigger value="mudarabah">Mudarabah</TabsTrigger>
        </TabsList>

        <TabsContent value="risk-pools" className="space-y-4">
          <RiskPoolSelector
            userReputation={userReputation}
            onDeposit={handleRiskPoolDeposit}
            onBorrow={handleRiskPoolBorrow}
            isLoading={isProcessing}
          />
        </TabsContent>

        <TabsContent value="mudarabah" className="space-y-4">
          <MudarabahPoolInterface
            userAddress={account?.address}
            onContribute={handleMudarabahContribute}
            onDistributeProfit={handleMudarabahDistribute}
            isLoading={isProcessing}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedDeFi;
