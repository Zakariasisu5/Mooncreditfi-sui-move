/**
 * Production-ready Credit Profile Page with real Sui contract integration
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import StatsCard from '@/components/StatsCard';
import AICreditAnalysis from '@/components/AICreditAnalysis';
import { User, CreditCard, TrendingUp, DollarSign, AlertCircle, Loader2 } from 'lucide-react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { toast } from 'sonner';
import { useCreditProfile, useMaxBorrowLimit, useInvalidateQueries } from '@/hooks/useContractData';
import { CreditProfileService, ErrorService } from '@/services/contractService';
import { useTransactionExecution } from '@/hooks/useTransactionExecution';

const CreditProfileProduction = () => {
  const account = useCurrentAccount();
  const isConnected = !!account;

  // Fetch data from blockchain
  const { data: profile, isLoading: isLoadingProfile, error: profileError } = useCreditProfile();
  const { maxBorrowLimit, creditScore, creditRating, hasProfile } = useMaxBorrowLimit();
  const { invalidateAll } = useInvalidateQueries();
  const { executeTransaction, isPending, isConfirming } = useTransactionExecution();

  const [aiAnalysis, setAiAnalysis] = useState(null);

  const handleCreateProfile = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      const tx = CreditProfileService.createProfileTransaction();

      await executeTransaction(tx, {
        onSuccess: (digest) => {
          toast.success('Credit profile created successfully!');
          setTimeout(() => invalidateAll(), 2000);
        },
        onError: (error) => {
          const friendlyError = ErrorService.getUserFriendlyError(error);
          toast.error(friendlyError.message);
        },
      });
    } catch (error) {
      const friendlyError = ErrorService.getUserFriendlyError(error);
      toast.error(friendlyError.message);
    }
  };

  const utilizationRate = maxBorrowLimit > 0
    ? ((profile?.totalBorrowed || 0) / maxBorrowLimit) * 100
    : 0;

  // Prepare wallet data for AI analysis
  const walletDataForAI = useMemo(() => {
    if (!account || !profile) return null;

    const loanCount = profile.loanCount || 0;
    const repaidLoans = loanCount - (profile.defaultCount || 0);
    const onTimeRate = loanCount > 0 ? Math.round((repaidLoans / loanCount) * 100) : 0;

    let transactionFrequency = 'low';
    if (loanCount >= 10) transactionFrequency = 'high';
    else if (loanCount >= 3) transactionFrequency = 'medium';

    let activityConsistency = 'consistent';
    if (loanCount === 0) activityConsistency = 'new user';
    else if (utilizationRate > 80) activityConsistency = 'high utilization';

    const riskFlags = [];
    if (utilizationRate > 80) riskFlags.push('High credit utilization');
    if (creditScore < 500) riskFlags.push('Low credit score');
    if (loanCount > 0 && repaidLoans === 0) riskFlags.push('No repayment history');
    if (profile.defaultCount > 0) riskFlags.push(`${profile.defaultCount} defaults`);

    return {
      walletAddress: account.address,
      transactionFrequency,
      transactionCount: loanCount,
      walletAge: Math.max(1, loanCount * 2),
      totalVolume: ((profile.totalBorrowed || 0) + (profile.totalRepaid || 0)) * 1000,
      defiInteractions: loanCount > 0,
      repaidLoans,
      totalLoans: loanCount,
      onTimeRate,
      activityConsistency,
      riskFlags,
      currentCreditScore: creditScore,
      totalBorrowed: (profile.totalBorrowed || 0) * 1000,
      totalRepaid: (profile.totalRepaid || 0) * 1000,
    };
  }, [account, profile, creditScore, utilizationRate]);

  const isProcessing = isPending || isConfirming;

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold mooncreditfi-glow">Credit Profile</h1>

      {/* Error Alert */}
      {profileError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load credit profile. Please check your connection and try again.
          </AlertDescription>
        </Alert>
      )}

      {/* No Profile Alert */}
      {isConnected && !hasProfile && !isLoadingProfile && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <span className="text-sm">You don't have a credit profile yet. Create one to start building your credit.</span>
            <Button onClick={handleCreateProfile} disabled={isProcessing} size="sm" className="w-full sm:w-auto">
              {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Create Profile
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {isLoadingProfile ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="card-glow">
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-24" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : hasProfile ? (
          <>
            <StatsCard
              title="Credit Score"
              value={creditScore}
              description={creditRating.label}
              icon={TrendingUp}
              trend={2.8}
              className="border-primary/20"
            />
            <StatsCard
              title="Max Borrowable"
              value={`${maxBorrowLimit.toFixed(4)} SUI`}
              description="Based on credit score"
              icon={DollarSign}
            />
            <StatsCard
              title="Total Borrowed"
              value={`${(profile?.totalBorrowed || 0).toFixed(4)} SUI`}
              description="Lifetime borrowing"
              icon={CreditCard}
            />
            <StatsCard
              title="Total Repaid"
              value={`${(profile?.totalRepaid || 0).toFixed(4)} SUI`}
              description="Lifetime repayments"
              icon={User}
            />
          </>
        ) : (
          <div className="col-span-full">
            <Card className="card-glow">
              <CardContent className="p-6 sm:p-12 text-center">
                <CreditCard className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 opacity-50 text-muted-foreground" />
                <h3 className="text-lg sm:text-xl font-semibold mb-2">No Credit Profile</h3>
                <p className="text-sm sm:text-base text-muted-foreground mb-4">Create a profile to start building your on-chain credit</p>
                <Button onClick={handleCreateProfile} disabled={isProcessing}>
                  {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Create Profile
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* AI Credit Analysis Section */}
      {hasProfile && <AICreditAnalysis walletData={walletDataForAI} onAnalysisComplete={setAiAnalysis} />}

      {hasProfile && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Credit Utilization */}
            <Card className="card-glow">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Credit Utilization</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0 sm:pt-0">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span>Used: {(profile?.totalBorrowed || 0).toFixed(4)} SUI</span>
                    <span>Available: {maxBorrowLimit.toFixed(4)} SUI</span>
                  </div>
                  <Progress value={utilizationRate} className="h-2 sm:h-3" />
                  <div className="text-center text-xs sm:text-sm text-muted-foreground">
                    {utilizationRate.toFixed(1)}% utilized
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm sm:text-base">Credit Health Tips</h4>
                  <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
                    <li>• Keep utilization below 30% for optimal score</li>
                    <li>• Pay loans on time to improve rating</li>
                    <li>• Borrow and repay consistently to build history</li>
                    <li>• Avoid defaults to maintain good standing</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Score Breakdown */}
            <Card className="card-glow">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Score Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
                <div className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">Your Score</p>
                    <p className="text-3xl sm:text-4xl font-bold text-primary">{creditScore}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={creditRating.variant} className="text-xs sm:text-sm">{creditRating.label}</Badge>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
                      Based on {profile?.loanCount || 0} loans
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="p-2 sm:p-3 bg-muted/50 rounded-lg">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Loan Count</p>
                    <p className="font-bold text-base sm:text-lg">{profile?.loanCount || 0}</p>
                  </div>
                  <div className="p-2 sm:p-3 bg-muted/50 rounded-lg">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Defaults</p>
                    <p className="font-bold text-base sm:text-lg text-red-500">{profile?.defaultCount || 0}</p>
                  </div>
                  <div className="p-2 sm:p-3 bg-muted/50 rounded-lg">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Total Borrowed</p>
                    <p className="font-bold text-xs sm:text-sm">{(profile?.totalBorrowed || 0).toFixed(4)} SUI</p>
                  </div>
                  <div className="p-2 sm:p-3 bg-muted/50 rounded-lg">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Total Repaid</p>
                    <p className="font-bold text-xs sm:text-sm text-green-500">{(profile?.totalRepaid || 0).toFixed(4)} SUI</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Credit Score Scale */}
          <Card className="card-glow">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Credit Score Scale</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {[
                    { range: '750-850', label: 'Excellent', color: 'bg-green-500', maxBorrow: '100 SUI', rate: '3-5%' },
                    { range: '650-749', label: 'Good', color: 'bg-blue-500', maxBorrow: '50 SUI', rate: '5-8%' },
                    { range: '550-649', label: 'Fair', color: 'bg-yellow-500', maxBorrow: '25 SUI', rate: '8-12%' },
                    { range: '300-549', label: 'Building', color: 'bg-orange-500', maxBorrow: '10 SUI', rate: '12-15%' },
                  ].map((tier, i) => (
                    <div
                      key={i}
                      className={`p-3 sm:p-4 rounded-lg border-2 ${
                        creditScore >= parseInt(tier.range.split('-')[0]) &&
                        creditScore <= parseInt(tier.range.split('-')[1])
                          ? 'border-primary bg-primary/10'
                          : 'border-border'
                      }`}
                    >
                      <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${tier.color} mb-2`}></div>
                      <h4 className="font-semibold text-sm sm:text-base">{tier.label}</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground">{tier.range}</p>
                      <div className="mt-2 pt-2 border-t border-border">
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Max Borrow</p>
                        <p className="text-xs sm:text-sm font-medium">{tier.maxBorrow}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Interest</p>
                        <p className="text-xs sm:text-sm font-medium">{tier.rate}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default CreditProfileProduction;
