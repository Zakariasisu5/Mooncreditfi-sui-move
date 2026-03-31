/**
 * Production-ready Borrow Page with real Sui contract integration
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { toast } from 'sonner';
import { useNotifications } from '@/contexts/NotificationContext';
import { DollarSign, CreditCard, TrendingUp, Clock, CheckCircle, XCircle, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { useTransactionExecution } from '@/hooks/useTransactionExecution';
import { useCreditProfile, useMaxBorrowLimit, useLendingPool, useInvalidateQueries, useUserLoans } from '@/hooks/useContractData';
import { BorrowingService, CreditProfileService, ValidationService, ErrorService } from '@/services/contractService';
import { EXPLORER_URL } from '@/config/sui';

const BorrowProduction = () => {
  const account = useCurrentAccount();
  const isConnected = !!account;
  const { addNotification } = useNotifications();
  const [borrowAmount, setBorrowAmount] = useState('');
  const [repayAmount, setRepayAmount] = useState('');

  // Fetch data from blockchain
  const { data: profile, isLoading: isLoadingProfile, error: profileError } = useCreditProfile();
  const { data: pool, isLoading: isLoadingPool } = useLendingPool();
  const { data: loanData, isLoading: isLoadingLoans } = useUserLoans();
  const { maxBorrowLimit, creditScore, creditRating, hasProfile } = useMaxBorrowLimit();
  const { invalidateAll } = useInvalidateQueries();

  // Transaction execution
  const { executeTransaction, lastDigest, isPending, isConfirming } = useTransactionExecution();

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

      await executeTransaction(tx, {
        onSuccess: (digest) => {
          toast.success('Credit profile created successfully!');
          addNotification('Credit profile created', 'success');
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

  const handleBorrow = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!hasProfile) {
      toast.error('Please create a credit profile first');
      return;
    }

    try {
      // Validate amount
      const validAmount = ValidationService.validateAmount(borrowAmount, 0.01);

      // Validate credit score
      ValidationService.validateCreditScore(creditScore, 500);

      // Check borrow limit
      if (validAmount > maxBorrowLimit) {
        toast.error(`Amount exceeds your borrowing limit of ${maxBorrowLimit.toFixed(4)} SUI`);
        return;
      }

      // Check pool liquidity
      if (pool && validAmount > pool.availableLiquidity) {
        toast.error(`Insufficient pool liquidity. Available: ${pool.availableLiquidity.toFixed(4)} SUI`);
        return;
      }

      // Create transaction
      const tx = BorrowingService.createBorrowTransaction(profile.objectId, validAmount);

      // Execute transaction
      await executeTransaction(tx, {
        onSuccess: (digest) => {
          toast.success('Borrow successful!');
          addNotification(`Borrowed ${validAmount} SUI`, 'success');
          setBorrowAmount('');
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
      // Validate amount
      const validAmount = ValidationService.validateAmount(repayAmount, 0.01);

      // Create transaction
      const tx = BorrowingService.createRepayTransaction(profile.objectId, validAmount);

      // Execute transaction
      await executeTransaction(tx, {
        onSuccess: (digest) => {
          toast.success('Repayment successful!');
          addNotification('Loan repaid — credit score updated', 'success');
          setRepayAmount('');
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
                  placeholder="0.01"
                  value={borrowAmount}
                  onChange={(e) => setBorrowAmount(e.target.value)}
                  min="0.01"
                  step="0.01"
                  disabled={isProcessing || !hasProfile}
                />
              </div>

              <div className="p-3 bg-muted rounded-lg space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Your Credit Score</span>
                  {isLoadingProfile ? (
                    <span className="text-muted-foreground">Loading...</span>
                  ) : (
                    <span className="font-medium">{creditScore || 'N/A'}</span>
                  )}
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

              {borrowAmount && parseFloat(borrowAmount) > 0 && (
                <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Est. Interest (30 days)</span>
                    <span className="font-medium">
                      {((parseFloat(borrowAmount) * interestRate / 100) * (30 / 365)).toFixed(6)} SUI
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total to Repay</span>
                    <span className="font-medium text-primary">
                      {(parseFloat(borrowAmount) + (parseFloat(borrowAmount) * interestRate / 100) * (30 / 365)).toFixed(6)} SUI
                    </span>
                  </div>
                </div>
              )}

              <Button
                onClick={handleBorrow}
                disabled={isProcessing || !isConnected || !!activeLoan || !hasProfile || !borrowAmount}
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
