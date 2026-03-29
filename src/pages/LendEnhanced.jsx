import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useWalletContext } from '@/contexts/WalletContext';
import { toast } from 'sonner';
import { useNotifications } from '@/contexts/NotificationContext';
import { DollarSign, TrendingUp, Wallet, Coins, Gift, Loader2, ExternalLink, RefreshCw, PiggyBank, Activity, Info, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTransactionExecution } from '@/hooks/useTransactionExecution';
import { useLendingPool, useLenderPosition, TransactionBuilders } from '@/hooks/useContract';
import { EXPLORER_URL } from '@/config/sui';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * Enhanced Lend Page with Real Sui Transaction Integration
 * Production-ready implementation with:
 * - Real-time data fetching from Sui blockchain
 * - Proper transaction building and execution
 * - Comprehensive error handling
 * - Loading states and user feedback
 * - Gas estimation
 */
const LendEnhanced = () => {
  const { isConnected, account } = useWalletContext();
  const { addNotification } = useNotifications();
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');

  // Fetch lending pool data
  const { pool, isLoading: isLoadingPool, error: poolError, refetch: refetchPool } = useLendingPool();
  
  // Fetch user's lender position
  const { position, isLoading: isLoadingPosition, error: positionError, refetch: refetchPosition } = useLenderPosition(account);

  // Transaction execution hook
  const { 
    executeTransaction, 
    dryRunTransaction,
    getExplorerUrl,
    isPending, 
    isConfirming,
    isConfirmed,
    error: txError,
    reset: resetTx
  } = useTransactionExecution();

  // Parse pool data
  const poolData = pool ? {
    totalDeposited: pool.total_deposited || '0',
    totalBorrowed: pool.total_borrowed || '0',
    availableLiquidity: pool.available_liquidity || '0',
    utilizationRate: pool.utilization_rate || 0,
    currentAPY: pool.current_apy || 8.5,
  } : {
    totalDeposited: '0',
    totalBorrowed: '0',
    availableLiquidity: '0',
    utilizationRate: 0,
    currentAPY: 8.5,
  };

  // Parse lender position data
  const depositedBalance = position?.deposited_amount ? (Number(position.deposited_amount) / 1e9).toFixed(4) : '0';
  const depositTimestamp = position?.deposit_timestamp || 0;
  const yieldEarned = position?.yield_earned ? (Number(position.yield_earned) / 1e9).toFixed(6) : '0';

  // Refetch data after successful transaction
  useEffect(() => {
    if (isConfirmed) {
      setTimeout(() => {
        refetchPool();
        refetchPosition();
        resetTx();
      }, 2000);
    }
  }, [isConfirmed, refetchPool, refetchPosition, resetTx]);

  /**
   * Handle deposit transaction
   */
  const handleDeposit = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    const amount = parseFloat(depositAmount);
    if (!amount || amount < 0.01) {
      toast.error('Minimum deposit is 0.01 SUI');
      return;
    }

    try {
      // Convert SUI to MIST (1 SUI = 1e9 MIST)
      const amountInMist = Math.floor(amount * 1e9);
      
      // Build transaction
      const tx = TransactionBuilders.deposit(amountInMist.toString());

      // Optional: Dry run to estimate gas
      const dryRun = await dryRunTransaction(tx);
      if (!dryRun.success) {
        toast.error('Transaction simulation failed', {
          description: dryRun.error || 'Unknown error',
        });
        return;
      }

      // Execute transaction
      await executeTransaction(tx, {
        onSuccess: (digest) => {
          addNotification(`Deposited ${depositAmount} SUI to lending pool`, 'success');
          setDepositAmount('');
        },
      });
    } catch (error) {
      console.error('Deposit error:', error);
    }
  };

  /**
   * Handle withdraw transaction
   */
  const handleWithdraw = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    const amount = parseFloat(withdrawAmount || depositedBalance);
    if (amount <= 0) {
      toast.error('No funds to withdraw');
      return;
    }

    if (amount > parseFloat(depositedBalance)) {
      toast.error('Insufficient deposited balance');
      return;
    }

    try {
      const amountInMist = Math.floor(amount * 1e9);
      const tx = TransactionBuilders.withdraw(amountInMist.toString());

      await executeTransaction(tx, {
        onSuccess: (digest) => {
          addNotification(`Withdrew ${amount.toFixed(4)} SUI from lending pool`, 'success');
          setWithdrawAmount('');
        },
      });
    } catch (error) {
      console.error('Withdrawal error:', error);
    }
  };

  /**
   * Handle claim yield transaction
   */
  const handleClaimYield = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (parseFloat(yieldEarned) <= 0) {
      toast.error('No yield to claim');
      return;
    }

    try {
      const tx = TransactionBuilders.claimYield();

      await executeTransaction(tx, {
        onSuccess: (digest) => {
          addNotification(`Claimed ${yieldEarned} SUI yield`, 'success');
        },
      });
    } catch (error) {
      console.error('Claim error:', error);
    }
  };

  const containerVariants = { 
    hidden: { opacity: 0 }, 
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } } 
  };
  const itemVariants = { 
    hidden: { y: 20, opacity: 0 }, 
    visible: { y: 0, opacity: 1 } 
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const isProcessing = isPending || isConfirming;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4 sm:space-y-6 max-w-6xl mx-auto px-0 sm:px-0"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mooncreditfi-glow">Lend & Earn</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Deposit SUI to earn competitive yields</p>
        </div>
        <Badge variant="outline" className="text-xs sm:text-sm w-fit">
          {poolData.currentAPY.toFixed(1)}% APY
        </Badge>
      </div>

      {/* Error Alerts */}
      {(poolError || positionError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load data. Please check your connection and try again.
            <Button variant="link" onClick={() => { refetchPool(); refetchPosition(); }} className="ml-2">
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Pool Stats Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <Card className="card-glow">
          <CardContent className="p-3 sm:pt-6 sm:pb-6 sm:px-6">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
              <PiggyBank className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
              <span className="text-xs sm:text-sm text-muted-foreground">Total Deposited</span>
            </div>
            {isLoadingPool ? (
              <Skeleton className="h-6 sm:h-8 w-20" />
            ) : (
              <p className="text-lg sm:text-2xl font-bold">
                {(Number(poolData.totalDeposited) / 1e9).toFixed(2)}{' '}
                <span className="text-xs sm:text-sm text-muted-foreground">SUI</span>
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="card-glow">
          <CardContent className="p-3 sm:pt-6 sm:pb-6 sm:px-6">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
              <Coins className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-500" />
              <span className="text-xs sm:text-sm text-muted-foreground">Total Borrowed</span>
            </div>
            {isLoadingPool ? (
              <Skeleton className="h-6 sm:h-8 w-20" />
            ) : (
              <p className="text-lg sm:text-2xl font-bold">
                {(Number(poolData.totalBorrowed) / 1e9).toFixed(2)}{' '}
                <span className="text-xs sm:text-sm text-muted-foreground">SUI</span>
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="card-glow">
          <CardContent className="p-3 sm:pt-6 sm:pb-6 sm:px-6">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
              <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
              <span className="text-xs sm:text-sm text-muted-foreground">Liquidity</span>
            </div>
            {isLoadingPool ? (
              <Skeleton className="h-6 sm:h-8 w-20" />
            ) : (
              <p className="text-lg sm:text-2xl font-bold">
                {(Number(poolData.availableLiquidity) / 1e9).toFixed(2)}{' '}
                <span className="text-xs sm:text-sm text-muted-foreground">SUI</span>
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="card-glow">
          <CardContent className="p-3 sm:pt-6 sm:pb-6 sm:px-6">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
              <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
              <span className="text-xs sm:text-sm text-muted-foreground">Utilization</span>
            </div>
            {isLoadingPool ? (
              <Skeleton className="h-6 sm:h-8 w-20" />
            ) : (
              <>
                <p className="text-lg sm:text-2xl font-bold">{poolData.utilizationRate.toFixed(1)}%</p>
                <Progress value={poolData.utilizationRate} className="mt-1 sm:mt-2 h-1" />
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Deposit Form */}
        <motion.div variants={itemVariants}>
          <Card className="card-glow h-full">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Deposit Funds
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Start earning yield on your SUI</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
              <div className="space-y-2">
                <Label htmlFor="deposit-amount" className="text-xs sm:text-sm">Amount (SUI)</Label>
                <Input
                  id="deposit-amount"
                  type="number"
                  placeholder="0.01"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  min="0.01"
                  step="0.01"
                  disabled={isProcessing}
                  className="text-base sm:text-lg h-10 sm:h-12"
                />
              </div>
              
              {depositAmount && parseFloat(depositAmount) > 0 && (
                <div className="p-2.5 sm:p-3 bg-muted/50 rounded-lg text-xs sm:text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expected APY</span>
                    <span className="font-medium text-green-500">{poolData.currentAPY.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Est. Monthly Yield</span>
                    <span className="font-medium">
                      {((parseFloat(depositAmount) * poolData.currentAPY / 100) / 12).toFixed(4)} SUI
                    </span>
                  </div>
                </div>
              )}

              <Button
                onClick={handleDeposit}
                disabled={isProcessing || !isConnected}
                className="w-full btn-mooncreditfi h-10 sm:h-12 text-sm sm:text-base"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {isConfirming ? 'Confirming...' : 'Processing...'}
                  </>
                ) : (
                  <>
                    <DollarSign className="h-4 w-4 mr-2" />
                    Deposit
                  </>
                )}
              </Button>

              {getExplorerUrl() && (
                <a
                  href={getExplorerUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs sm:text-sm text-primary hover:underline"
                >
                  View transaction <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Balance & Yield Card */}
        <motion.div variants={itemVariants}>
          <Card className="card-glow h-full">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Your Position
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Current deposited amount and earnings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
              {isLoadingPosition ? (
                <div className="space-y-3">
                  <Skeleton className="h-14 sm:h-16 w-full" />
                  <Skeleton className="h-14 sm:h-16 w-full" />
                </div>
              ) : (
                <>
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex justify-between items-center p-3 sm:p-4 bg-muted/50 rounded-lg">
                      <div>
                        <span className="text-xs sm:text-sm text-muted-foreground">Deposited</span>
                        {depositTimestamp > 0 && (
                          <p className="text-[10px] sm:text-xs text-muted-foreground">
                            Since {formatDate(depositTimestamp)}
                          </p>
                        )}
                      </div>
                      <span className="font-bold text-lg sm:text-xl">{depositedBalance} SUI</span>
                    </div>

                    <div className="flex justify-between items-center p-3 sm:p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                      <div>
                        <span className="text-xs sm:text-sm text-muted-foreground">Yield Earned</span>
                        <p className="text-[10px] sm:text-xs text-green-500">Claimable now</p>
                      </div>
                      <span className="font-bold text-lg sm:text-xl text-green-500">+{yieldEarned} SUI</span>
                    </div>

                    <div className="flex justify-between items-center p-3 sm:p-4 bg-primary/10 rounded-lg border border-primary/20">
                      <span className="text-xs sm:text-sm font-medium">Total Value</span>
                      <span className="font-bold text-xl sm:text-2xl">
                        {(parseFloat(depositedBalance) + parseFloat(yieldEarned)).toFixed(4)} SUI
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <Button
                      onClick={handleClaimYield}
                      disabled={isProcessing || !isConnected || parseFloat(yieldEarned) <= 0}
                      variant="outline"
                      className="h-10 sm:h-12 text-xs sm:text-sm"
                    >
                      {isProcessing ? (
                        <Loader2 className="h-4 w-4 mr-1 sm:mr-2 animate-spin" />
                      ) : (
                        <Gift className="h-4 w-4 mr-1 sm:mr-2" />
                      )}
                      Claim Yield
                    </Button>

                    <Button
                      onClick={handleWithdraw}
                      disabled={isProcessing || !isConnected || parseFloat(depositedBalance) <= 0}
                      variant="secondary"
                      className="h-10 sm:h-12 text-xs sm:text-sm"
                    >
                      {isProcessing ? (
                        <Loader2 className="h-4 w-4 mr-1 sm:mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-1 sm:mr-2" />
                      )}
                      Withdraw
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* How It Works */}
      <motion.div variants={itemVariants}>
        <Card className="card-glow">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Info className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              How Lending Works
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              {[
                { 
                  step: '1', 
                  title: 'Deposit SUI', 
                  desc: 'Add your SUI to the lending pool to start earning yield immediately' 
                },
                { 
                  step: '2', 
                  title: 'Earn Yield', 
                  desc: 'Your funds earn interest from borrowers, accruing yield in real-time' 
                },
                { 
                  step: '3', 
                  title: 'Withdraw Anytime', 
                  desc: 'Claim your yield or withdraw your funds whenever you want' 
                }
              ].map((item, i) => (
                <div key={i} className="text-center p-3 sm:p-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-2 sm:mb-3">
                    <span className="text-lg sm:text-xl font-bold text-primary">{item.step}</span>
                  </div>
                  <h3 className="font-semibold text-sm sm:text-base mb-1 sm:mb-2">{item.title}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default LendEnhanced;
