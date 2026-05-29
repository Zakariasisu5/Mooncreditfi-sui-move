/**
 * Production-ready Lend Page with real Sui contract integration
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { toast } from 'sonner';
import { useNotifications } from '@/contexts/NotificationContext';
import { DollarSign, TrendingUp, Wallet, Gift, Loader2, ExternalLink, RefreshCw, PiggyBank, Activity, Info, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTransactionExecution } from '@/hooks/useTransactionExecution';
import { useSecureTransaction } from '@/hooks/useSecureTransaction';
import { useLendingPool, useUserBalance, useUserDeposits, useInvalidateQueries, useCollateralVault } from '@/hooks/useContractData';
import { LendingPoolService, ValidationService, ErrorService, CollateralService, MudarabahService } from '@/services/contractService';
import { CollateralVaultDataService } from '@/services/dataService';
import { EXPLORER_URL } from '@/config/sui';
import MudarabahPoolInterface from '@/components/MudarabahPoolInterface';
import { useQueryClient } from '@tanstack/react-query';

const LendProduction = () => {
  const account = useCurrentAccount();
  const isConnected = !!account;
  const { addNotification } = useNotifications();
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [activeTab, setActiveTab] = useState('standard');

  // Fetch data from blockchain
  const { data: pool, isLoading: isLoadingPool, error: poolError } = useLendingPool();
  const { data: balance, isLoading: isLoadingBalance } = useUserBalance();
  const { data: userDeposits, isLoading: isLoadingDeposits } = useUserDeposits();
  const { data: vault, isLoading: isLoadingVault } = useCollateralVault();
  const { invalidateAll, invalidateLendingQueries } = useInvalidateQueries();
  const queryClient = useQueryClient();

  // SECURITY: Use secure transaction execution
  const { executeSecureTransaction, lastDigest, isPending, isConfirming } = useSecureTransaction();

  const hasVault = !!vault;

  // Real user position data from blockchain events
  const depositedBalance = userDeposits?.netDeposited || 0;
  const yieldEarned = userDeposits?.yieldEarned || 0;

  const handleDeposit = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    const depositAmountNum = parseFloat(depositAmount);
    if (!depositAmountNum || depositAmountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      // Step 1: Create vault if needed (for collateral)
      let vaultData = null;
      
      if (!hasVault) {
        console.log('🏗️ Creating new vault...');
        toast.info('Creating collateral vault...');
        
        let createdVaultId = null;
        const createVaultTx = CollateralService.createVaultTransaction();
        
        await executeSecureTransaction(createVaultTx, {
          type: 'createVault',
          validationParams: {},
          onSuccess: (digest, txResult) => {
            console.log('✅ Vault creation transaction successful!', digest);
            console.log('📊 Transaction result:', txResult);
            
            // Extract vault ID from transaction effects
            const createdObjects = txResult.effects?.created || [];
            console.log('📦 Created objects:', createdObjects);
            
            const vaultObject = createdObjects.find(obj => 
              obj.owner && typeof obj.owner === 'object' && obj.owner.Shared
            );
            
            if (vaultObject) {
              createdVaultId = vaultObject.reference.objectId;
              console.log('✅ Vault created with ID:', createdVaultId);
              toast.success('Vault created!');
            } else {
              console.warn('⚠️ Could not extract vault ID from transaction');
            }
          },
          onError: (error) => {
            console.error('❌ Vault creation failed:', error);
            const friendlyError = ErrorService.getUserFriendlyError(error);
            toast.error(`Failed to create vault: ${friendlyError.message}`);
            throw error;
          },
        });
        
        // If we got the vault ID from transaction, use it directly
        if (createdVaultId) {
          console.log('✅ Using vault ID from transaction:', createdVaultId);
          vaultData = {
            objectId: createdVaultId,
            collateralAmount: 0,
            borrowedAmount: 0,
          };
        } else {
          // Otherwise try to fetch it via events
          console.log('🔄 Fetching vault via events...');
          toast.info('Confirming vault creation...');
          await invalidateAll();
          
          // Try to fetch vault with retries
          let fetchAttempts = 0;
          const maxFetchAttempts = 5;
          
          while (!vaultData && fetchAttempts < maxFetchAttempts) {
            fetchAttempts++;
            console.log(`🔄 Attempt ${fetchAttempts}/${maxFetchAttempts} to fetch vault...`);
            vaultData = await CollateralVaultDataService.fetchCollateralVault(account.address);
            
            if (!vaultData && fetchAttempts < maxFetchAttempts) {
              const delay = 2000 * fetchAttempts;
              toast.info(`Waiting for vault confirmation... (${fetchAttempts}/${maxFetchAttempts})`);
              await new Promise(resolve => setTimeout(resolve, delay));
              await queryClient.refetchQueries({ queryKey: ['collateralVault', account.address] });
            }
          }
          
          if (!vaultData) {
            toast.error('Unable to confirm vault creation. The vault may have been created but is not yet indexed. Please wait 30 seconds and try depositing again.');
            return;
          }
        }
      } else {
        // Use existing vault
        vaultData = vault;
        console.log('✅ Using existing vault:', vaultData.objectId);
      }

      if (!vaultData || !vaultData.objectId) {
        console.error('❌ No vault data available');
        toast.error('Vault not available. Please try again.');
        return;
      }

      console.log('✅ Vault confirmed:', vaultData.objectId);

      // Step 2: Deposit to lending pool
      console.log('💰 Step 2: Depositing to lending pool...');
      toast.info('Depositing to lending pool...');
      const depositTx = LendingPoolService.createDepositTransaction(depositAmountNum);
      
      let depositSuccess = false;
      await executeSecureTransaction(depositTx, {
        type: 'deposit',
        validationParams: {
          amount: depositAmountNum,
          balance,
        },
        onSuccess: (digest, txResult) => {
          console.log('✅ Deposit to lending pool successful!', digest);
          console.log('📊 Transaction result:', txResult);
          toast.success(`Deposited ${depositAmountNum} SUI to lending pool`);
          depositSuccess = true;
        },
        onError: (error) => {
          console.error('❌ Deposit to lending pool failed:', error);
          const friendlyError = ErrorService.getUserFriendlyError(error);
          toast.error(friendlyError.message);
          throw error;
        },
      });

      if (!depositSuccess) {
        console.error('❌ Deposit did not succeed, stopping flow');
        return;
      }

      // Aggressively refetch lending data
      console.log('🔄 Refreshing lending data...');
      await invalidateLendingQueries();

      // Step 3: Also deposit to collateral vault (same amount)
      console.log('💰 Step 3: Depositing to collateral vault...');
      toast.info('Adding to collateral...');
      const collateralTx = CollateralService.depositCollateralTransaction(vaultData.objectId, depositAmountNum);
      await executeSecureTransaction(collateralTx, {
        type: 'depositCollateral',
        validationParams: { amount: depositAmountNum },
        onSuccess: (digest) => {
          console.log('✅ Collateral deposit successful!', digest);
          toast.success(`Successfully deposited ${depositAmountNum} SUI! (Available for lending & borrowing)`);
          addNotification(`Deposited ${depositAmountNum} SUI`, 'success');
          setDepositAmount('');
        },
        onError: (error) => {
          console.error('❌ Collateral deposit failed:', error);
          const friendlyError = ErrorService.getUserFriendlyError(error);
          toast.error(`Lending pool deposit succeeded, but collateral deposit failed: ${friendlyError.message}`);
          setDepositAmount('');
        },
      });

      // Final comprehensive refresh after all transactions complete
      console.log('🔄 Final data refresh...');
      toast.info('Updating data from blockchain...');
      await invalidateAll();
      toast.success('Data updated successfully!');
      console.log('✅ Deposit flow complete!');
    } catch (error) {
      console.error('❌ Deposit flow error:', error);
    }
  };

  const handleWithdraw = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      // Create transaction
      const tx = LendingPoolService.createWithdrawTransaction(withdrawAmount);

      // SECURITY: Execute with comprehensive validation
      await executeSecureTransaction(tx, {
        type: 'withdraw',
        validationParams: {
          amount: withdrawAmount,
          userDeposits,
        },
        onSuccess: (digest) => {
          toast.success('Withdrawal successful!');
          addNotification(`Withdrew ${withdrawAmount} SUI from lending pool`, 'success');
          setWithdrawAmount('');
        },
        onError: (error) => {
          const friendlyError = ErrorService.getUserFriendlyError(error);
          toast.error(friendlyError.message);
        },
      });

      // Wait for on-chain confirmation and aggressively refetch lending data
      toast.info('Updating data from blockchain...');
      await invalidateLendingQueries();
      toast.success('Data updated successfully!');
    } catch (error) {
      // Error already handled by secure transaction hook
      console.error('Withdraw error:', error);
    }
  };

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
      // Claim yield by withdrawing the yield amount
      const yieldAmount = parseFloat(yieldEarned);

      // Create withdrawal transaction for yield amount
      const tx = LendingPoolService.createWithdrawTransaction(yieldAmount);

      // SECURITY: Execute with validation
      await executeSecureTransaction(tx, {
        type: 'withdraw',
        validationParams: {
          amount: yieldAmount,
          userDeposits,
        },
        onSuccess: (digest) => {
          toast.success(`Successfully claimed ${yieldAmount.toFixed(6)} SUI yield!`);
          addNotification(`Claimed ${yieldAmount.toFixed(6)} SUI yield`, 'success');
        },
        onError: (error) => {
          const friendlyError = ErrorService.getUserFriendlyError(error);
          toast.error(friendlyError.message);
        },
      });

      // Wait for on-chain confirmation and aggressively refetch lending data
      toast.info('Updating data from blockchain...');
      await invalidateLendingQueries();
      toast.success('Data updated successfully!');
    } catch (error) {
      // Error already handled by secure transaction hook
      console.error('Claim yield error:', error);
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
          setTimeout(async () => {
            await invalidateAll();
            await queryClient.invalidateQueries({ queryKey: ['mudarabahPool'] });
          }, 5000); // Increased from 2s to 5s for event indexing
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
          setTimeout(async () => {
            await invalidateAll();
            await queryClient.invalidateQueries({ queryKey: ['mudarabahPool'] });
            await queryClient.invalidateQueries({ queryKey: ['mudarabahDistributionHistory'] });
          }, 5000); // Increased from 2s to 5s for event indexing
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

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

  const isProcessing = isPending || isConfirming;
  const currentAPY = pool?.interestRate || 8.5;

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
          {currentAPY.toFixed(1)}% APY
        </Badge>
      </div>

      {/* Error Alert */}
      {poolError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load pool data. Please check your connection and try again.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs for Standard and Islamic Finance */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="standard">Standard Lending</TabsTrigger>
          <TabsTrigger value="mudarabah">Islamic Finance</TabsTrigger>
        </TabsList>

        <TabsContent value="standard" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
          {/* Pool Stats Cards */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4">
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
                {pool?.totalDeposited?.toFixed(2) || '0.00'}{' '}
                <span className="text-xs sm:text-sm text-muted-foreground">SUI</span>
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="card-glow">
          <CardContent className="p-3 sm:pt-6 sm:pb-6 sm:px-6">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
              <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
              <span className="text-xs sm:text-sm text-muted-foreground">Available</span>
            </div>
            {isLoadingPool ? (
              <Skeleton className="h-6 sm:h-8 w-20" />
            ) : (
              <p className="text-lg sm:text-2xl font-bold">
                {pool?.availableLiquidity?.toFixed(2) || '0.00'}{' '}
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
                <p className="text-lg sm:text-2xl font-bold">{pool?.utilizationRate?.toFixed(1) || '0.0'}%</p>
                <Progress value={pool?.utilizationRate || 0} className="mt-1 sm:mt-2 h-1" />
              </>
            )}
          </CardContent>
        </Card>

        <Card className="card-glow">
          <CardContent className="p-3 sm:pt-6 sm:pb-6 sm:px-6">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
              <Gift className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-500" />
              <span className="text-xs sm:text-sm text-muted-foreground">Yield Earned</span>
            </div>
            {isLoadingDeposits ? (
              <Skeleton className="h-6 sm:h-8 w-20" />
            ) : (
              <p className="text-lg sm:text-2xl font-bold text-green-500">
                {yieldEarned.toFixed(4)}{' '}
                <span className="text-xs sm:text-sm text-muted-foreground">SUI</span>
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="card-glow">
          <CardContent className="p-3 sm:pt-6 sm:pb-6 sm:px-6">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
              <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-500" />
              <span className="text-xs sm:text-sm text-muted-foreground">Total Value</span>
            </div>
            {isLoadingDeposits ? (
              <Skeleton className="h-6 sm:h-8 w-20" />
            ) : (
              <p className="text-lg sm:text-2xl font-bold text-primary">
                {(depositedBalance + yieldEarned).toFixed(4)}{' '}
                <span className="text-xs sm:text-sm text-muted-foreground">SUI</span>
              </p>
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
                {balance && (
                  <p className="text-xs text-muted-foreground">
                    Available: {balance.toFixed(4)} SUI
                  </p>
                )}
              </div>

              {depositAmount && parseFloat(depositAmount) > 0 && (
                <div className="p-2.5 sm:p-3 bg-muted/50 rounded-lg text-xs sm:text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expected APY</span>
                    <span className="font-medium text-green-500">{currentAPY.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Est. Monthly Yield</span>
                    <span className="font-medium">
                      {((parseFloat(depositAmount) * currentAPY / 100) / 12).toFixed(4)} SUI
                    </span>
                  </div>
                </div>
              )}

              <Button
                onClick={handleDeposit}
                disabled={isProcessing || !isConnected || !depositAmount}
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
              {isLoadingDeposits ? (
                <div className="space-y-2 sm:space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : (
                <>
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex justify-between items-center p-3 sm:p-4 bg-muted/50 rounded-lg">
                      <div>
                        <span className="text-xs sm:text-sm text-muted-foreground">Deposited</span>
                        {userDeposits && userDeposits.depositCount > 0 && (
                          <p className="text-[10px] sm:text-xs text-muted-foreground">
                            {userDeposits.depositCount} deposit{userDeposits.depositCount > 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                      <span className="font-bold text-lg sm:text-xl">{depositedBalance.toFixed(4)} SUI</span>
                    </div>

                    <div className="flex justify-between items-center p-3 sm:p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                      <div>
                        <span className="text-xs sm:text-sm text-muted-foreground">Yield Earned</span>
                        <p className="text-[10px] sm:text-xs text-green-500">
                          {yieldEarned > 0 ? 'Claimable now' : 'Coming soon'}
                        </p>
                      </div>
                      <span className="font-bold text-lg sm:text-xl text-green-500">
                        +{yieldEarned.toFixed(6)} SUI
                      </span>
                    </div>

                    <div className="flex justify-between items-center p-3 sm:p-4 bg-primary/10 rounded-lg border border-primary/20">
                      <span className="text-xs sm:text-sm font-medium">Total Value</span>
                      <span className="font-bold text-xl sm:text-2xl">
                        {(depositedBalance + yieldEarned).toFixed(4)} SUI
                      </span>
                    </div>
                  </div>

                  {/* Withdraw Section */}
                  <div className="space-y-2 pt-2 border-t">
                    <Label htmlFor="withdraw-amount" className="text-xs sm:text-sm">Withdraw Amount (SUI)</Label>
                    <Input
                      id="withdraw-amount"
                      type="number"
                      placeholder="0.01"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      min="0.01"
                      step="0.01"
                      disabled={isProcessing}
                      className="text-base sm:text-lg h-10 sm:h-12"
                    />
                    {depositedBalance > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Available to withdraw: {depositedBalance.toFixed(4)} SUI
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <Button
                      onClick={handleClaimYield}
                      disabled={isProcessing || !isConnected || yieldEarned <= 0}
                      variant="outline"
                      className="h-10 sm:h-12 text-xs sm:text-sm"
                    >
                      <Gift className="h-4 w-4 mr-1 sm:mr-2" />
                      Claim Yield
                    </Button>
                    <Button
                      onClick={handleWithdraw}
                      disabled={isProcessing || !isConnected || !withdrawAmount || depositedBalance <= 0}
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
                { step: '1', title: 'Deposit SUI', desc: 'Add your SUI to the lending pool to start earning yield immediately' },
                { step: '2', title: 'Earn Yield', desc: 'Your funds earn interest from borrowers, accruing yield in real-time' },
                { step: '3', title: 'Withdraw Anytime', desc: 'Claim your yield or withdraw your funds whenever you want' }
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
        </TabsContent>

        <TabsContent value="mudarabah" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
          <MudarabahPoolInterface
            userAddress={account?.address}
            onContribute={handleMudarabahContribute}
            onDistributeProfit={handleMudarabahDistribute}
            isLoading={isProcessing}
          />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default LendProduction;
