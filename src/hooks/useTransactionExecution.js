import { useState, useCallback } from 'react';
import { useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { toast } from 'sonner';
import { EXPLORER_URL } from '@/config/sui';

/**
 * Production-ready hook for signing and executing Sui transactions
 * Features:
 * - Automatic transaction confirmation waiting
 * - Detailed error handling with user-friendly messages
 * - Transaction status tracking
 * - Explorer link generation
 * - Retry capability
 * - Gas estimation
 */
export const useTransactionExecution = () => {
  const suiClient = useSuiClient();
  const { mutateAsync: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const [lastDigest, setLastDigest] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Execute a Sui transaction with comprehensive error handling
   * @param {Transaction} transaction - The Sui transaction to execute
   * @param {object} options - Configuration options
   * @param {function} options.onSuccess - Callback on successful confirmation
   * @param {function} options.onError - Callback on error
   * @param {boolean} options.showToast - Whether to show toast notifications (default: true)
   * @returns {Promise<object>} Transaction result
   */
  const executeTransaction = useCallback(async (transaction, options = {}) => {
    const { onSuccess, onError, showToast = true } = options;
    
    setIsConfirmed(false);
    setIsConfirming(false);
    setError(null);
    setLastDigest(null);

    try {
      // Execute the transaction
      const result = await signAndExecute(
        { transaction },
        {
          onSuccess: async (data) => {
            const digest = data.digest;
            setLastDigest(digest);
            setIsConfirming(true);

            try {
              // Wait for transaction confirmation
              const txResult = await suiClient.waitForTransaction({
                digest,
                options: {
                  showEffects: true,
                  showEvents: true,
                  showObjectChanges: true,
                },
              });

              // Check if transaction was successful
              if (txResult.effects?.status?.status === 'success') {
                setIsConfirmed(true);
                setIsConfirming(false);

                if (showToast) {
                  toast.success('Transaction confirmed!', {
                    description: `Digest: ${digest.slice(0, 10)}...`,
                    action: {
                      label: 'View',
                      onClick: () => window.open(`${EXPLORER_URL}/tx/${digest}`, '_blank'),
                    },
                  });
                }

                onSuccess?.(digest, txResult);
              } else {
                // Transaction failed
                const errorMsg = txResult.effects?.status?.error || 'Transaction failed';
                throw new Error(errorMsg);
              }
            } catch (confirmError) {
              setIsConfirming(false);
              setError(confirmError);
              
              if (showToast) {
                toast.error('Transaction failed', {
                  description: confirmError.message,
                });
              }
              
              onError?.(confirmError);
              throw confirmError;
            }
          },
          onError: (txError) => {
            setIsConfirming(false);
            setError(txError);
            
            const msg = txError?.message || 'Transaction failed';
            
            if (showToast) {
              if (msg.includes('Rejected') || msg.includes('rejected') || msg.includes('User rejected')) {
                toast.error('Transaction cancelled', {
                  description: 'You rejected the transaction',
                });
              } else if (msg.includes('Insufficient')) {
                toast.error('Insufficient balance', {
                  description: 'You don\'t have enough SUI for this transaction',
                });
              } else if (msg.includes('gas')) {
                toast.error('Gas estimation failed', {
                  description: 'Unable to estimate gas for this transaction',
                });
              } else if (msg.includes('503') || msg.includes('Service Unavailable')) {
                toast.error('Network Temporarily Unavailable', {
                  description: 'Sui testnet RPC is down. Please try again in a few minutes.',
                  duration: 8000,
                });
                console.error('🔴 RPC 503 ERROR - Sui Testnet is temporarily unavailable');
                console.error('Solutions:');
                console.error('1. Wait 2-3 minutes and try again');
                console.error('2. Check Sui status: https://status.sui.io/');
                console.error('3. Try again during off-peak hours');
              } else if (msg.includes('wallet-rpc') || msg.includes('Failed to fetch')) {
                toast.error('Wallet RPC Error', {
                  description: 'Your wallet is using a deprecated RPC endpoint. Try updating your wallet app or switching networks.',
                  duration: 8000,
                });
                console.error('🔴 WALLET RPC ERROR - wallet-rpc.testnet.sui.io is deprecated');
                console.error('');
                console.error('SOLUTIONS:');
                console.error('1. Update your Sui Wallet app to the latest version');
                console.error('2. Try disconnecting and reconnecting your wallet');
                console.error('3. In wallet settings, try switching to a different RPC endpoint');
                console.error('4. If using Sui Wallet, go to Settings → Network → Try "Testnet" or custom RPC');
                console.error('5. Alternative: Use a different wallet (Splash, Slush)');
                console.error('');
                console.error('The deprecated endpoint wallet-rpc.testnet.sui.io returns 404');
                console.error('Your wallet needs to use: fullnode.testnet.sui.io or rpc-testnet.suiscan.xyz');
                console.error('');
                console.error('Full error:', txError);
              } else if (msg.includes('verify') || msg.includes('security')) {
                toast.error('Security Validation Error', {
                  description: 'Click "Proceed anyway" in your wallet. This is normal for localhost.',
                  duration: 6000,
                });
              } else {
                toast.error('Transaction failed', {
                  description: msg.length > 100 ? msg.slice(0, 100) + '...' : msg,
                });
              }
            }
            
            onError?.(txError);
          },
        }
      );
      
      return result;
    } catch (error) {
      setIsConfirming(false);
      setError(error);
      throw error;
    }
  }, [signAndExecute, suiClient]);

  /**
   * Dry run a transaction to estimate gas and check for errors
   * @param {Transaction} transaction - The transaction to simulate
   * @returns {Promise<object>} Simulation result
   */
  const dryRunTransaction = useCallback(async (transaction) => {
    try {
      const result = await suiClient.dryRunTransactionBlock({
        transactionBlock: await transaction.build({ client: suiClient }),
      });
      
      return {
        success: result.effects.status.status === 'success',
        gasUsed: result.effects.gasUsed,
        effects: result.effects,
        error: result.effects.status.error,
      };
    } catch (error) {
      console.error('Dry run failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }, [suiClient]);

  /**
   * Get the explorer URL for the last transaction
   * @returns {string|null} Explorer URL or null
   */
  const getExplorerUrl = useCallback(() => {
    if (!lastDigest) return null;
    return `${EXPLORER_URL}/tx/${lastDigest}`;
  }, [lastDigest]);

  /**
   * Reset the transaction state
   */
  const reset = useCallback(() => {
    setLastDigest(null);
    setIsConfirming(false);
    setIsConfirmed(false);
    setError(null);
  }, []);

  return {
    executeTransaction,
    dryRunTransaction,
    getExplorerUrl,
    reset,
    lastDigest,
    isPending,
    isConfirming,
    isConfirmed,
    error,
    isProcessing: isPending || isConfirming,
  };
};
