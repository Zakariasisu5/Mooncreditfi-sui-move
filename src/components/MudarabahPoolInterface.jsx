import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Coins, TrendingUp, Users, Gift, Loader2, Info, ExternalLink } from 'lucide-react';
import { EXPLORER_URL, MUDARABAH_POOL } from '@/config/sui';
import { useMudarabahPool, useMudarabahDistributionHistory } from '@/hooks/useContractData';

const MudarabahPoolInterface = ({ 
  isLoading = false,
  onDistributeProfit,
  userAddress 
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch real Mudarabah pool data from blockchain
  const { data: poolData, isLoading: isLoadingPool } = useMudarabahPool(MUDARABAH_POOL);
  const { data: distributionHistory, isLoading: isLoadingHistory } = useMudarabahDistributionHistory(MUDARABAH_POOL);

  const calculateShares = (pool) => {
    if (!pool) return { profit: 0, investorShare: 0, managerShare: 0 };
    
    const profit = pool.profit || 0;
    const investorShare = (profit * pool.profitRatio) / 10000;
    const managerShare = profit - investorShare;
    return { profit, investorShare, managerShare };
  };

  const handleDistributeProfit = async () => {
    // Prevent multiple clicks
    if (isProcessing || isLoading) {
      return;
    }

    if (!poolData) {
      toast.error('Pool data not loaded');
      return;
    }

    const { profit } = calculateShares(poolData);
    if (profit <= 0) {
      toast.error('No profit available to distribute');
      return;
    }

    setIsProcessing(true);
    try {
      await onDistributeProfit?.({ id: MUDARABAH_POOL, ...poolData });
      toast.success('Profit distributed successfully!');
    } catch (error) {
      console.error('Distribution error:', error);
      toast.error('Failed to distribute profit');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading || isLoadingPool) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!poolData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Mudarabah Profit-Sharing Pool
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Unable to load Mudarabah pool data. Please try again later.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const { profit, investorShare, managerShare } = calculateShares(poolData);
  const profitPercentage = poolData.poolCapital > 0 
    ? ((profit / poolData.poolCapital) * 100).toFixed(2)
    : 0;
  const investorRatio = (poolData.profitRatio / 100).toFixed(2);
  const managerRatio = ((10000 - poolData.profitRatio) / 100).toFixed(2);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Mudarabah Profit-Sharing Pool
          </CardTitle>
          <CardDescription>
            Islamic finance-compliant profit-sharing investment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Mudarabah is a Sharia-compliant partnership where profits are shared according to a predetermined ratio. No interest is charged.
            </AlertDescription>
          </Alert>

          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="p-4 sm:p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg">Active Pool</h3>
                    <Badge variant={profit > 0 ? 'default' : 'secondary'}>
                      {profit > 0 ? `+${profitPercentage}%` : 'No Profit'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Profit Ratio: {investorRatio}% Investor / {managerRatio}% Manager
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Pool Capital</p>
                  <p className="font-bold text-sm">{poolData.poolCapital.toFixed(2)} SUI</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Current Balance</p>
                  <p className="font-bold text-sm">{poolData.currentBalance.toFixed(2)} SUI</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Total Profit</p>
                  <p className="font-bold text-sm text-green-600">{profit.toFixed(2)} SUI</p>
                </div>
              </div>

              {profit > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Profit Distribution</span>
                    <span className="font-medium">{profit.toFixed(2)} SUI</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Investor ({investorRatio}%)</span>
                      <span className="font-medium">{investorShare.toFixed(2)} SUI</span>
                    </div>
                    <Progress value={(investorShare / profit) * 100} className="h-2" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Manager ({managerRatio}%)</span>
                      <span className="font-medium">{managerShare.toFixed(2)} SUI</span>
                    </div>
                    <Progress value={(managerShare / profit) * 100} className="h-2" />
                  </div>
                </div>
              )}

              <Button
                onClick={handleDistributeProfit}
                disabled={isProcessing || isLoading || profit <= 0}
                className="w-full"
              >
                {(isProcessing || isLoading) ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Gift className="h-4 w-4 mr-2" />
                    Distribute Profit
                  </>
                )}
              </Button>

              {distributionHistory && distributionHistory.length > 0 && (
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Distribution History
                  </h4>
                  <div className="space-y-2">
                    {distributionHistory.slice(0, 5).map((dist, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 bg-muted/30 rounded text-xs"
                      >
                        <div>
                          <p className="font-medium">{dist.totalProfit.toFixed(2)} SUI</p>
                          <p className="text-muted-foreground">
                            {new Date(dist.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                        {dist.txDigest && (
                          <a
                            href={`${EXPLORER_URL}/tx/${dist.txDigest}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            View
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};

export default MudarabahPoolInterface;
