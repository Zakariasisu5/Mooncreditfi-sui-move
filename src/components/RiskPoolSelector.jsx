import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Shield, TrendingUp, Lock, Loader2, AlertCircle, Info } from 'lucide-react';
import { RISK_POOL_LOW, RISK_POOL_MEDIUM, RISK_POOL_HIGH } from '@/config/sui';
import { useRiskPools } from '@/hooks/useContractData';

const RiskPoolSelector = ({ 
  userReputation = 500, 
  onDeposit, 
  onBorrow,
  isLoading = false 
}) => {
  const [selectedPool, setSelectedPool] = useState(null);
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch real risk pool data from blockchain
  const poolIds = [
    { id: RISK_POOL_LOW, name: 'Low Risk Pool', minReputation: 600 },
    { id: RISK_POOL_MEDIUM, name: 'Medium Risk Pool', minReputation: 400 },
    { id: RISK_POOL_HIGH, name: 'High Risk Pool', minReputation: 0 },
  ].filter(pool => pool.id && pool.id !== '0x0000000000000000000000000000000000000000000000000000000000000000'); // Filter out placeholder IDs

  const { data: poolsData, isLoading: isLoadingPools } = useRiskPools(poolIds);

  // Merge fetched data with static metadata
  const riskPools = poolIds.map((poolInfo, index) => {
    const fetchedData = poolsData?.[index];
    return {
      id: poolInfo.id,
      name: poolInfo.name,
      riskLevel: index + 1,
      minReputation: poolInfo.minReputation,
      liquidity: fetchedData?.totalLiquidity || 0,
      apy: index === 0 ? 3.5 : index === 1 ? 6.5 : 12.0,
      color: index === 0 ? 'green' : index === 1 ? 'yellow' : 'red',
      description: index === 0 
        ? 'Conservative lending with highest credit requirements'
        : index === 1
        ? 'Balanced risk-reward for moderate credit profiles'
        : 'Open access pool with higher interest rates'
    };
  });

  const isPoolAccessible = (pool) => {
    return userReputation >= pool.minReputation;
  };

  const getPoolColorClasses = (color, isAccessible) => {
    if (!isAccessible) {
      return {
        border: 'border-gray-300',
        bg: 'bg-gray-50',
        text: 'text-gray-400',
        badge: 'bg-gray-200 text-gray-600'
      };
    }
    
    switch(color) {
      case 'green':
        return {
          border: 'border-green-300',
          bg: 'bg-green-50',
          text: 'text-green-700',
          badge: 'bg-green-200 text-green-800'
        };
      case 'yellow':
        return {
          border: 'border-yellow-300',
          bg: 'bg-yellow-50',
          text: 'text-yellow-700',
          badge: 'bg-yellow-200 text-yellow-800'
        };
      case 'red':
        return {
          border: 'border-red-300',
          bg: 'bg-red-50',
          text: 'text-red-700',
          badge: 'bg-red-200 text-red-800'
        };
      default:
        return {
          border: 'border-gray-300',
          bg: 'bg-gray-50',
          text: 'text-gray-700',
          badge: 'bg-gray-200 text-gray-800'
        };
    }
  };

  const handleDeposit = async () => {
    // Prevent multiple clicks
    if (isProcessing || isLoading) {
      return;
    }

    if (!selectedPool) {
      toast.error('Please select a pool');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsProcessing(true);
    try {
      await onDeposit?.(selectedPool, parseFloat(amount));
      setAmount('');
      setSelectedPool(null);
    } catch (error) {
      console.error('Deposit error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBorrow = async () => {
    // Prevent multiple clicks
    if (isProcessing || isLoading) {
      return;
    }

    if (!selectedPool) {
      toast.error('Please select a pool');
      return;
    }
    if (!isPoolAccessible(selectedPool)) {
      toast.error(`Your reputation (${userReputation}) is below the required threshold (${selectedPool.minReputation})`);
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsProcessing(true);
    try {
      await onBorrow?.(selectedPool, parseFloat(amount));
      setAmount('');
      setSelectedPool(null);
    } catch (error) {
      console.error('Borrow error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading || isLoadingPools) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Risk-Based Lending Pools
          </CardTitle>
          <CardDescription>
            Select a pool based on your reputation score ({userReputation}/1000)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Your reputation score determines which pools you can borrow from. Higher reputation unlocks lower-risk pools with better rates.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {riskPools.map((pool) => {
              const isAccessible = isPoolAccessible(pool);
              const colors = getPoolColorClasses(pool.color, isAccessible);
              const isSelected = selectedPool?.id === pool.id;

              return (
                <Card
                  key={pool.id}
                  className={`cursor-pointer transition-all ${
                    isSelected ? 'ring-2 ring-primary' : ''
                  } ${colors.border} ${!isAccessible ? 'opacity-60' : ''}`}
                  onClick={() => isAccessible && setSelectedPool(pool)}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge className={colors.badge}>
                        Risk Level {pool.riskLevel}
                      </Badge>
                      {!isAccessible && (
                        <Lock className="h-4 w-4 text-gray-400" />
                      )}
                    </div>

                    <div>
                      <h3 className={`font-semibold text-lg ${colors.text}`}>
                        {pool.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {pool.description}
                      </p>
                    </div>

                    <div className="space-y-2 pt-2 border-t">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Liquidity</span>
                        <span className="font-medium">{pool.liquidity.toFixed(2)} SUI</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">APY</span>
                        <span className="font-medium text-green-600">{pool.apy}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Min Reputation</span>
                        <span className={`font-medium ${isAccessible ? 'text-green-600' : 'text-red-600'}`}>
                          {pool.minReputation}
                        </span>
                      </div>
                    </div>

                    {!isAccessible && (
                      <Alert variant="destructive" className="mt-2">
                        <AlertCircle className="h-3 w-3" />
                        <AlertDescription className="text-xs">
                          Need {pool.minReputation - userReputation} more reputation
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {selectedPool && (
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Selected Pool</p>
                    <p className="font-semibold">{selectedPool.name}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPool(null)}
                  >
                    Clear
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Amount in SUI"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                  <Button
                    onClick={handleDeposit}
                    disabled={isProcessing || isLoading}
                    variant="outline"
                  >
                    {(isProcessing || isLoading) ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Deposit'}
                  </Button>
                  <Button
                    onClick={handleBorrow}
                    disabled={isProcessing || isLoading || !isPoolAccessible(selectedPool)}
                  >
                    {(isProcessing || isLoading) ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Borrow'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RiskPoolSelector;
