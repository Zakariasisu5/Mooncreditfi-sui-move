import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { toast } from 'sonner';
import { useNotifications } from '@/contexts/NotificationContext';
import { DollarSign, CreditCard, TrendingUp, Clock, CheckCircle, XCircle, Loader2, AlertCircle, ExternalLink, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { useTransactionExecution } from '@/hooks/useTransactionExecution';
import { useSecureTransaction } from '@/hooks/useSecureTransaction';
import { useCreditProfile, useMaxBorrowLimit, useLendingPool, useInvalidateQueries, useUserLoans, useUserBalance, useCollateralVault, useUserRiskPoolLoans } from '@/hooks/useContractData';
import { BorrowingService, CreditProfileService, ValidationService, ErrorService, CollateralService, RiskPoolService } from '@/services/contractService';
import { CollateralVaultDataService } from '@/services/dataService';
import { EXPLORER_URL } from '@/config/sui';
import RiskPoolSelector from '@/components/RiskPoolSelector';
import { useQueryClient } from '@tanstack/react-query';

const BorrowProduction = () => {
  const account = useCurrentAccount();
  const isConnected = !!account;
  const { addNotification } = useNotifications();
  const [borrowAmount, setBorrowAmount] = useState('');
  const [collateralAmount, setCollateralAmount] = useState('');
  const [repayAmount, setRepayAmount] = useState('');
  const [loanDuration, setLoanDuration] = useState(30); // Default 30 days
  const [selectedLoanId, setSelectedLoanId] = useState(null); // For repayment
  const [activeTab, setActiveTab] = useState('standard');
  const [showCreditDetails, setShowCreditDetails] = useState(false); // Toggle for credit details
  const [showCollateralInfo, setShowCollateralInfo] = useState(false); // Toggle for collateral info

  // Fetch data from blockchain
  const { data: profile, isLoading: isLoadingProfile, error: profileError } = useCreditProfile();
  const { data: pool, isLoading: isLoadingPool } = useLendingPool();
  const { data: loanData, isLoading: isLoadingLoans } = useUserLoans();
  const { data: riskPoolLoanData, isLoading: isLoadingRiskPoolLoans } = useUserRiskPoolLoans();
  const { data: balance, isLoading: isLoadingBalance } = useUserBalance();
  const { data: vault, isLoading: isLoadingVault } = useCollateralVault();
  const { maxBorrowLimit, creditScore, creditRating, hasProfile } = useMaxBorrowLimit();
  const { invalidateAll, invalidateBorrowQueries } = useInvalidateQueries();
  const queryClient = useQueryClient();

  // SECURITY: Use secure transaction execution
  const { executeSecureTransaction, lastDigest, isPending, isConfirming } = useSecureTransaction();

  const hasVault = !!vault;
  const userReputation = profile?.reputation || 500;

  // Active loan data - prioritize profile.debt (on-chain source of truth)
  const currentDebt = profile?.debt || 0;
  const hasActiveLoan = currentDebt > 0.001; // Consider loans > 0.001 SUI as active
  
  // Calculate estimated interest (5% APR)
  const interestRate = pool?.interestRate || 5.0;
  let estimatedInterest = 0;
  if (hasActiveLoan && loanData?.lastBorrowTimestamp) {
    const daysSinceBorrow = (Date.now() - loanData.lastBorrowTimestamp) / (1000 * 60 * 60 * 24);
    estimatedInterest = (currentDebt * interestRate / 100) * (daysSinceBorrow / 365);
  }

  const activeLoan = hasActiveLoan ? {
    amount: currentDebt,
    interestRate: interestRate,
    totalOwed: currentDebt + estimatedInterest,
    estimatedInterest: estimatedInterest,
  } : null;

  const handleCreateProfile = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      const tx = CreditProfileService.createProfileTransaction();

      // SECURITY: Execute with validation
      await executeSecureTransaction(tx, {
        type: 'createProfile',
        validationParams: {},
        onSuccess: (digest) => {
          toast.success('Credit profile created successfully!');
          addNotification('Credit profile created', 'success');
        },
        onError: (error) => {
          const friendlyError = ErrorService.getUserFriendlyError(error);
          toast.error(friendlyError.message);
        },
      });

      // Wait for on-chain confirmation and aggressively refetch all borrow-related data
      toast.info('Updating data from blockchain...');
      await invalidateBorrowQueries();
      toast.success('Data updated successfully!');
    } catch (error) {
      // Error already handled by secure transaction hook
      console.error('Create profile error:', error);
    }
  };

  const handleBorrow = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!hasProfile) {
      toast.error('Please create a credit profile first');
      return;
    }

    if (!hasVault) {
      toast.error('Please create a collateral vault first');
      return;
    }

    // Calculate required collateral
    const borrowAmountNum = parseFloat(borrowAmount);
    
    // Validate minimum loan size (1 SUI minimum to prevent credit score farming)
    if (borrowAmountNum < 1) {
      toast.error('Minimum loan amount is 1 SUI');
      return;
    }
    
    // Credit-based lending: Check collateral requirements based on credit score
    const score = profile?.score || 500;
    let requiredCollateralRatio = 0;
    
    if (score >= 750) {
      requiredCollateralRatio = 0; // No collateral needed
    } else if (score >= 650) {
      requiredCollateralRatio = 0.25; // 25% collateral
    } else if (score >= 550) {
      requiredCollateralRatio = 0.50; // 50% collateral
    } else if (score >= 450) {
      requiredCollateralRatio = 1.0; // 100% collateral
    } else {
      requiredCollateralRatio = 1.5; // 150% collateral
    }
    
    const requirements = CollateralVaultDataService.calculateRequiredCollateral(
      borrowAmountNum,
      vault?.borrowedAmount || 0
    );
    
    // Calculate actual required collateral based on credit score
    const creditBasedRequirement = (borrowAmountNum + (vault?.borrowedAmount || 0)) * requiredCollateralRatio;

    // Check if user has enough collateral (if required)
    if (requiredCollateralRatio > 0 && vault.collateralAmount < creditBasedRequirement) {
      toast.error(
        `Insufficient collateral for your credit score (${score}). You need at least ${creditBasedRequirement.toFixed(4)} SUI (you have ${vault.collateralAmount.toFixed(4)} SUI). ${score >= 750 ? '' : `Improve your credit score to ${score < 550 ? '550+' : score < 650 ? '650+' : '750+'} to reduce collateral requirements.`}`
      );
      return;
    }

    // Warn if below recommended threshold (only if collateral is required)
    if (requiredCollateralRatio > 0 && vault.collateralAmount < requirements.recommendedCollateral) {
      toast.warning(
        `Your collateral is below the recommended 180% threshold. Consider depositing more to avoid liquidation risk.`
      );
    }

    try {
      // Create transaction with vault object ID
      const tx = BorrowingService.createBorrowTransaction(
        profile.objectId,
        vault.objectId,
        borrowAmount,
        loanDuration
      );

      // SECURITY: Execute with comprehensive validation
      await executeSecureTransaction(tx, {
        type: 'borrow',
        validationParams: {
          amount: borrowAmount,
          duration: loanDuration,
          profile,
          pool,
          balance,
          vault,
        },
        onSuccess: (digest) => {
          toast.success('Borrow successful!');
          addNotification(`Borrowed ${borrowAmount} SUI`, 'success');
          setBorrowAmount('');
        },
        onError: (error) => {
          const friendlyError = ErrorService.getUserFriendlyError(error);
          toast.error(friendlyError.message);
        },
      });

      // Wait for on-chain confirmation and aggressively refetch all borrow-related data
      toast.info('Updating data from blockchain...');
      await invalidateBorrowQueries();
      toast.success('Data updated successfully!');
    } catch (error) {
      // Error already handled by secure transaction hook
      console.error('Borrow error:', error);
    }
  };

  const handleRepay = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!activeLoan) {
      toast.error('No active loan to repay');
      return;
    }

    try {
      // Create transaction
      const tx = BorrowingService.createRepayTransaction(profile.objectId, repayAmount);

      // SECURITY: Execute with comprehensive validation
      await executeSecureTransaction(tx, {
        type: 'repay',
        validationParams: {
          amount: repayAmount,
          profile,
          balance,
        },
        onSuccess: (digest) => {
          toast.success('Repayment successful!');
          addNotification('Loan repaid — credit score updated', 'success');
          setRepayAmount('');
        },
        onError: (error) => {
          const friendlyError = ErrorService.getUserFriendlyError(error);
          toast.error(friendlyError.message);
        },
      });

      // Wait for on-chain confirmation and aggressively refetch all borrow-related data
      toast.info('Updating data from blockchain...');
      await invalidateBorrowQueries();
      toast.success('Data updated successfully!');
    } catch (error) {
      // Error already handled by secure transaction hook
      console.error('Repay error:', error);
    }
  };

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
          setTimeout(async () => {
            await invalidateAll();
            await queryClient.invalidateQueries({ queryKey: ['riskPools'] });
          }, 5000); // Increased from 2s to 5s for event indexing
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
          setTimeout(async () => {
            await invalidateAll();
            await queryClient.invalidateQueries({ queryKey: ['riskPools'] });
          }, 5000); // Increased from 2s to 5s for event indexing
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

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

  const isProcessing = isPending || isConfirming;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold mb-2">Borrow & Build Credit</h1>
        <p className="text-muted-foreground">Access loans and improve your on-chain credit profile</p>
      </div>

      {/* Error Alerts */}
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
          <AlertDescription className="flex items-center justify-between">
            <span>You don't have a credit profile yet. Create one to start borrowing.</span>
            <Button onClick={handleCreateProfile} disabled={isProcessing} size="sm">
              {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Create Profile
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs for Standard and Risk-Based Borrowing */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="standard">Standard Borrowing</TabsTrigger>
          <TabsTrigger value="risk-pools">Risk-Based Pools</TabsTrigger>
        </TabsList>

        <TabsContent value="standard" className="space-y-6 mt-6">
          {/* Collapsible Collateral Info */}
          {isConnected && hasProfile && !hasVault && !isLoadingVault && (
            <div className="border rounded-lg">
              <button
                onClick={() => setShowCollateralInfo(!showCollateralInfo)}
                className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Credit-Based Borrowing Info</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {showCollateralInfo ? '▼ Hide' : '▶ Show Details'}
                </span>
              </button>
              
              {showCollateralInfo && (
                <div className="p-3 bg-muted/30 border-t">
                  <p className="text-sm">
                    Collateral requirements depend on your credit score:
                  </p>
                  <ul className="text-sm mt-2 space-y-1 ml-4">
                    <li>• Score 750+ = <strong>No collateral needed!</strong></li>
                    <li>• Score 650-749 = 25% collateral</li>
                    <li>• Score 550-649 = 50% collateral</li>
                    <li>• Score 450-549 = 100% collateral</li>
                    <li>• Score below 450 = 150% collateral</li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Low Collateral Warning */}
          {isConnected && hasProfile && hasVault && borrowAmount && parseFloat(borrowAmount) > 0 && (() => {
            const borrowAmountNum = parseFloat(borrowAmount);
            const score = profile?.score || 500;
            let requiredRatio = 0;
            
            if (score >= 750) {
              requiredRatio = 0;
            } else if (score >= 650) {
              requiredRatio = 0.25;
            } else if (score >= 550) {
              requiredRatio = 0.50;
            } else if (score >= 450) {
              requiredRatio = 1.0;
            } else {
              requiredRatio = 1.5;
            }
            
            const creditBasedReq = (borrowAmountNum + (vault?.borrowedAmount || 0)) * requiredRatio;
            const hasEnough = vault.collateralAmount >= creditBasedReq;
            
            if (!hasEnough && requiredRatio > 0) {
              const needed = creditBasedReq - vault.collateralAmount;
              return (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">Insufficient Collateral</p>
                      <p className="text-sm">
                        You need {needed.toFixed(4)} more SUI as collateral. Go to the Lend page to deposit more.
                      </p>
                      <p className="text-xs">
                        Current: {vault.collateralAmount.toFixed(4)} SUI | Required: {creditBasedReq.toFixed(4)} SUI ({(requiredRatio * 100).toFixed(0)}%)
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              );
            }
            return null;
          })()}

          <div className="grid md:grid-cols-2 gap-6">
        {/* Borrow Form */}
        <motion.div variants={itemVariants}>
          <Card className="card-glow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Request Loan
              </CardTitle>
              <CardDescription>Borrow SUI based on your credit score</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="borrow-amount">Amount (SUI)</Label>
                <Input
                  id="borrow-amount"
                  type="number"
                  placeholder="1.0"
                  value={borrowAmount}
                  onChange={(e) => setBorrowAmount(e.target.value)}
                  min="1"
                  step="0.1"
                  disabled={isProcessing || !hasProfile}
                />
                <p className="text-xs text-muted-foreground">Minimum loan: 1 SUI</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="loan-duration">Loan Duration</Label>
                <Select value={loanDuration.toString()} onValueChange={(val) => setLoanDuration(parseInt(val))} disabled={isProcessing || !hasProfile}>
                  <SelectTrigger id="loan-duration">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 Days</SelectItem>
                    <SelectItem value="60">60 Days</SelectItem>
                    <SelectItem value="90">90 Days</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Longer durations may have higher total interest
                </p>
              </div>

              {/* Collapsible Credit Details */}
              <div className="border rounded-lg">
                <button
                  onClick={() => setShowCreditDetails(!showCreditDetails)}
                  className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                  <span className="text-sm font-medium">Credit Score Details</span>
                  <span className="text-xs text-muted-foreground">
                    {showCreditDetails ? '▼ Hide' : '▶ Show'}
                  </span>
                </button>
                
                {showCreditDetails && (
                  <div className="p-3 bg-muted/30 space-y-1 border-t">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Your Credit Score</span>
                      {isLoadingProfile ? (
                        <span className="text-muted-foreground">Loading...</span>
                      ) : (
                        <span className="font-medium">{creditScore || 'N/A'}</span>
                      )}
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Credit Tier</span>
                      <Badge variant={creditScore >= 750 ? 'default' : creditScore >= 650 ? 'secondary' : 'outline'}>
                        {creditScore >= 850 ? 'Excellent' : creditScore >= 750 ? 'Very Good' : creditScore >= 650 ? 'Good' : creditScore >= 550 ? 'Fair' : creditScore >= 450 ? 'Poor' : 'Very Poor'}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Collateral Required</span>
                      <span className="font-medium text-primary">
                        {creditScore >= 750 ? '0% (None!)' : creditScore >= 650 ? '25%' : creditScore >= 550 ? '50%' : creditScore >= 450 ? '100%' : '150%'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Max Borrowable</span>
                      <span className="font-medium">{maxBorrowLimit.toFixed(4)} SUI</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Interest Rate</span>
                      <span className="font-medium">{interestRate.toFixed(1)}% APR</span>
                    </div>
                    {pool && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Available Liquidity</span>
                        <span className="font-medium">{pool.availableLiquidity.toFixed(4)} SUI</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {creditScore >= 750 && (
                <Alert className="bg-green-50 border-green-200">
                  <Shield className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    🎉 Excellent credit! You can borrow without collateral.
                  </AlertDescription>
                </Alert>
              )}
              
              {creditScore >= 650 && creditScore < 750 && (
                <Alert className="bg-blue-50 border-blue-200">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    Good credit! Only {creditScore >= 650 ? '25%' : '50%'} collateral required. Reach 750+ for zero collateral.
                  </AlertDescription>
                </Alert>
              )}

              {borrowAmount && parseFloat(borrowAmount) > 0 && (
                <>
                  <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Est. Interest ({loanDuration} days)</span>
                      <span className="font-medium">
                        {((parseFloat(borrowAmount) * interestRate / 100) * (loanDuration / 365)).toFixed(6)} SUI
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total to Repay</span>
                      <span className="font-medium text-primary">
                        {(parseFloat(borrowAmount) + (parseFloat(borrowAmount) * interestRate / 100) * (loanDuration / 365)).toFixed(6)} SUI
                      </span>
                    </div>
                  </div>

                  {hasVault && (() => {
                    const borrowAmountNum = parseFloat(borrowAmount);
                    const score = profile?.score || 500;
                    let requiredRatio = 0;
                    
                    if (score >= 750) {
                      requiredRatio = 0;
                    } else if (score >= 650) {
                      requiredRatio = 0.25;
                    } else if (score >= 550) {
                      requiredRatio = 0.50;
                    } else if (score >= 450) {
                      requiredRatio = 1.0;
                    } else {
                      requiredRatio = 1.5;
                    }
                    
                    const creditBasedReq = (borrowAmountNum + (vault?.borrowedAmount || 0)) * requiredRatio;
                    const recommendedReq = (borrowAmountNum + (vault?.borrowedAmount || 0)) * 1.8; // 180% recommended for safety
                    const hasEnough = vault.collateralAmount >= creditBasedReq;
                    const isRecommended = vault.collateralAmount >= recommendedReq;

                    return (
                      <div className={`p-3 rounded-lg border text-sm space-y-1 ${
                        !hasEnough && requiredRatio > 0 ? 'bg-red-500/10 border-red-500/20' :
                        !isRecommended && requiredRatio > 0 ? 'bg-yellow-500/10 border-yellow-500/20' :
                        'bg-green-500/10 border-green-500/20'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="h-4 w-4" />
                          <span className="font-medium">Collateral Requirements</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Your Collateral</span>
                          <span className="font-medium">{vault.collateralAmount.toFixed(4)} SUI</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Required for Your Score ({(requiredRatio * 100).toFixed(0)}%)</span>
                          <span className="font-medium">{creditBasedReq.toFixed(4)} SUI</span>
                        </div>
                        {requiredRatio > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Recommended (180%)</span>
                            <span className="font-medium">{recommendedReq.toFixed(4)} SUI</span>
                          </div>
                        )}
                        {!hasEnough && requiredRatio > 0 && (
                          <p className="text-xs text-red-500 mt-2">
                            ⚠️ Insufficient collateral. Deposit more to proceed.
                          </p>
                        )}
                        {hasEnough && !isRecommended && (
                          <p className="text-xs text-yellow-600 mt-2">
                            ⚠️ Below recommended threshold. Risk of liquidation if price drops.
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </>
              )}

              <Button
                onClick={handleBorrow}
                disabled={isProcessing || !isConnected || !!activeLoan || !hasProfile || !hasVault || !borrowAmount}
                className="w-full btn-mooncreditfi"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isConfirming ? 'Confirming...' : 'Processing...'}
                  </>
                ) : activeLoan ? (
                  'Repay Current Loan First'
                ) : !hasProfile ? (
                  'Create Profile First'
                ) : !hasVault ? (
                  'Create Vault First'
                ) : (
                  'Borrow'
                )}
              </Button>

              {lastDigest && (
                <a
                  href={`${EXPLORER_URL}/tx/${lastDigest}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs sm:text-sm text-primary hover:underline"
                >
                  View transaction <ExternalLink className="h-3 w-3" />
                </a>
              )}

              {!isConnected && (
                <p className="text-sm text-muted-foreground text-center">Connect your wallet to borrow</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Active Loan Card */}
        <motion.div variants={itemVariants}>
          <Card className="card-glow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Active Loan
              </CardTitle>
              <CardDescription>Current loan status and details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingLoans ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
                  <p className="text-muted-foreground">Loading loan data...</p>
                </div>
              ) : activeLoan ? (
                <>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="text-sm text-muted-foreground">Borrowed</span>
                      <span className="font-bold text-lg">{parseFloat(activeLoan.amount).toFixed(4)} SUI</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="text-sm text-muted-foreground">Interest Rate</span>
                      <span className="font-bold text-lg text-blue-500">{activeLoan.interestRate}%</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="text-sm text-muted-foreground">Estimated Interest</span>
                      <span className="font-bold text-lg text-yellow-500">{parseFloat(activeLoan.estimatedInterest).toFixed(6)} SUI</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg border border-primary/20">
                      <span className="text-sm font-medium">Total to Repay</span>
                      <span className="font-bold text-lg text-primary">{parseFloat(activeLoan.totalOwed).toFixed(6)} SUI</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="repay-amount">Repay Amount (SUI)</Label>
                    <Input
                      id="repay-amount"
                      type="number"
                      placeholder="0.01"
                      value={repayAmount}
                      onChange={(e) => setRepayAmount(e.target.value)}
                      min="0.01"
                      step="0.01"
                      disabled={isProcessing}
                    />
                    <p className="text-xs text-muted-foreground">
                      Repaying will improve your credit score
                    </p>
                  </div>

                  <Button onClick={handleRepay} disabled={isProcessing || !isConnected || !repayAmount} className="w-full btn-mooncreditfi">
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {isConfirming ? 'Confirming...' : 'Processing...'}
                      </>
                    ) : (
                      'Repay Loan'
                    )}
                  </Button>
                </>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <p className="text-muted-foreground">No active loans</p>
                  <p className="text-sm text-muted-foreground mt-1">Borrow SUI to build your credit score</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Credit Profile Card */}
      <motion.div variants={itemVariants}>
        <Card className="card-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Credit Profile
            </CardTitle>
            <CardDescription>Your on-chain credit score and loan history</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {hasProfile ? (
              <>
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Credit Score</p>
                    <p className="text-4xl font-bold text-primary">{creditScore}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={creditRating.variant} className="mb-2">{creditRating.label}</Badge>
                    <p className="text-xs text-muted-foreground">Based on {profile?.loanCount || 0} loans</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Total Borrowed</p>
                    <p className="font-bold">{profile?.totalBorrowed?.toFixed(4) || '0.0000'} SUI</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Total Repaid</p>
                    <p className="font-bold text-green-500">{profile?.totalRepaid?.toFixed(4) || '0.0000'} SUI</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Loan Count</p>
                    <p className="font-bold">{profile?.loanCount || 0}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Defaults</p>
                    <p className="font-bold text-red-500">{profile?.defaultCount || 0}</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No credit profile yet</p>
                <p className="text-sm">Create a profile to start building your credit</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
        </TabsContent>

        <TabsContent value="risk-pools" className="space-y-6 mt-6">
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
                  No credit profile found. Create one to access risk pools.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Risk Pool Loan Activity */}
          {riskPoolLoanData && riskPoolLoanData.totalLoans > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Risk Pool Loan Activity
                </CardTitle>
                <CardDescription>Your borrowing activity across risk-based pools</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-4 w-4 text-blue-500" />
                      <p className="text-sm font-medium text-blue-500">Total Borrowed</p>
                    </div>
                    <p className="text-2xl font-bold">{riskPoolLoanData.totalBorrowed.toFixed(4)} SUI</p>
                  </div>
                  
                  <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <p className="text-sm font-medium text-green-500">Total Repaid</p>
                    </div>
                    <p className="text-2xl font-bold">{riskPoolLoanData.totalRepaid.toFixed(4)} SUI</p>
                  </div>
                  
                  <div className="p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-orange-500" />
                      <p className="text-sm font-medium text-orange-500">Outstanding</p>
                    </div>
                    <p className="text-2xl font-bold">{riskPoolLoanData.totalOutstanding.toFixed(4)} SUI</p>
                  </div>

                  <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-purple-500" />
                      <p className="text-sm font-medium text-purple-500">Total Loans</p>
                    </div>
                    <p className="text-2xl font-bold">{riskPoolLoanData.totalLoans}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {riskPoolLoanData.hasActiveLoans ? 'Active loans' : 'All repaid'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <RiskPoolSelector
            userReputation={userReputation}
            onDeposit={handleRiskPoolDeposit}
            onBorrow={handleRiskPoolBorrow}
            isLoading={isProcessing}
          />
        </TabsContent>
      </Tabs>

      {/* Loan Activity Card */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Loan Activity
            </CardTitle>
            <CardDescription>Your borrowing and repayment history</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingLoans ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading loan data...</p>
              </div>
            ) : loanData ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-4 w-4 text-blue-500" />
                      <p className="text-sm font-medium text-blue-500">Total Borrowed</p>
                    </div>
                    <p className="text-2xl font-bold">{loanData.totalBorrowed.toFixed(4)} SUI</p>
                    <p className="text-xs text-muted-foreground mt-1">{loanData.borrowCount} transactions</p>
                  </div>
                  
                  <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <p className="text-sm font-medium text-green-500">Total Repaid</p>
                    </div>
                    <p className="text-2xl font-bold">{loanData.totalRepaid.toFixed(4)} SUI</p>
                    <p className="text-xs text-muted-foreground mt-1">{loanData.repayCount} transactions</p>
                  </div>
                  
                  <div className="p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-orange-500" />
                      <p className="text-sm font-medium text-orange-500">Outstanding</p>
                    </div>
                    <p className="text-2xl font-bold">{loanData.outstandingDebt.toFixed(4)} SUI</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {loanData.hasActiveLoan ? 'Active loan' : 'Fully repaid'}
                    </p>
                  </div>
                </div>

                {loanData.hasActiveLoan && (
                  <div className="mt-4 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                      <p className="text-sm font-medium">
                        Repay your loan on time to improve your credit score and unlock better rates
                      </p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No loan activity yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default BorrowProduction;
