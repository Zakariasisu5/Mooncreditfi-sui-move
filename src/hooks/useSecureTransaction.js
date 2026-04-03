/**
 * Secure Transaction Execution Hook
 * Wraps useTransactionExecution with comprehensive security checks
 * 
 * SECURITY FEATURES:
 * - Pre-transaction validation
 * - Duplicate transaction prevention
 * - Wallet switching detection
 * - Rate limiting
 * - Post-transaction verification
 * - No optimistic updates (wait for on-chain confirmation)
 */

import { useCallback, useEffect, useRef } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { toast } from 'sonner';
import { useTransactionExecution } from './useTransactionExecution';
import { 
  TransactionSecurity, 
  WalletSecurity, 
  RateLimiter,
  SecurityValidator 
} from '@/utils/securityValidation';

/**
 * Secure transaction execution hook
 * @returns {Object} Secure transaction execution methods
 */
export const useSecureTransaction = () => {
  const account = useCurrentAccount();
  const userAddress = account?.address;
  const { executeTransaction, ...rest } = useTransactionExecution();
  const lastAddressRef = useRef(null);

  // Initialize wallet security on mount
  useEffect(() => {
    if (userAddress) {
      WalletSecurity.initialize(userAddress);
      lastAddressRef.current = userAddress;
    }
  }, [userAddress]);

  // Detect wallet switching
  useEffect(() => {
    if (userAddress && lastAddressRef.current && userAddress !== lastAddressRef.current) {
      console.warn('🔒 SECURITY: Wallet address changed');
      toast.warning('Wallet Changed', {
        description: 'Your wallet address has changed. Please refresh if you experience issues.',
      });
      WalletSecurity.updateAddress(userAddress);
      lastAddressRef.current = userAddress;
    }
  }, [userAddress]);

  /**
   * Execute transaction with comprehensive security checks
   * @param {Transaction} transaction - The Sui transaction
   * @param {Object} options - Configuration options
   * @param {string} options.type - Transaction type (borrow, deposit, withdraw, repay)
   * @param {Object} options.validationParams - Parameters for validation
   * @param {function} options.onSuccess - Success callback
   * @param {function} options.onError - Error callback
   * @returns {Promise<Object>} Transaction result
   */
  const executeSecureTransaction = useCallback(async (transaction, options = {}) => {
    const { type, validationParams = {}, onSuccess, onError, ...txOptions } = options;

    // SECURITY CHECK 1: Wallet connection
    if (!userAddress) {
      const error = new Error('Wallet not connected');
      toast.error('Security Check Failed', {
        description: 'Please connect your wallet',
      });
      onError?.(error);
      throw error;
    }

    // SECURITY CHECK 2: Wallet switching detection
    const walletValidation = WalletSecurity.validateWalletState(userAddress);
    if (!walletValidation.isValid) {
      const error = new Error(walletValidation.error);
      toast.error('Security Check Failed', {
        description: walletValidation.error,
      });
      onError?.(error);
      throw error;
    }

    // SECURITY CHECK 3: Rate limiting
    const rateLimitCheck = RateLimiter.checkRateLimit(userAddress);
    if (!rateLimitCheck.isAllowed) {
      const error = new Error(rateLimitCheck.error);
      toast.error('Rate Limit Exceeded', {
        description: rateLimitCheck.error,
        duration: 5000,
      });
      onError?.(error);
      throw error;
    }

    // SECURITY CHECK 4: Transaction-specific validation
    if (type && validationParams) {
      let validation;
      const params = { ...validationParams, address: userAddress };

      switch (type) {
        case 'borrow':
          validation = SecurityValidator.validateBorrowTransaction(params);
          break;
        case 'deposit':
          validation = SecurityValidator.validateDepositTransaction(params);
          break;
        case 'withdraw':
          validation = SecurityValidator.validateWithdrawTransaction(params);
          break;
        case 'repay':
          validation = SecurityValidator.validateRepayTransaction(params);
          break;
        default:
          validation = { isValid: true, errors: [] };
      }

      if (!validation.isValid) {
        const error = new Error(validation.errors.join('; '));
        toast.error('Validation Failed', {
          description: validation.errors[0], // Show first error
          duration: 5000,
        });
        onError?.(error);
        throw error;
      }
    }

    // SECURITY CHECK 5: Duplicate transaction prevention
    const txKey = TransactionSecurity.generateTxKey(type || 'unknown', userAddress, validationParams);
    if (TransactionSecurity.isPending(txKey)) {
      const error = new Error('Transaction already in progress');
      toast.error('Duplicate Transaction', {
        description: 'Please wait for the current transaction to complete',
      });
      onError?.(error);
      throw error;
    }

    // Mark transaction as pending
    TransactionSecurity.markPending(txKey);
    RateLimiter.recordTransaction(userAddress);

    try {
      // Execute transaction with security monitoring
      const result = await executeTransaction(transaction, {
        ...txOptions,
        onSuccess: (digest, txResult) => {
          // SECURITY: Verify transaction success on-chain
          if (txResult.effects?.status?.status !== 'success') {
            throw new Error('Transaction failed on-chain verification');
          }

          // Clear pending state
          TransactionSecurity.markComplete(txKey);

          // Call user callback
          onSuccess?.(digest, txResult);
        },
        onError: (error) => {
          // Clear pending state on error
          TransactionSecurity.markComplete(txKey);

          // Call user callback
          onError?.(error);
        },
      });

      return result;
    } catch (error) {
      // Ensure pending state is cleared on any error
      TransactionSecurity.markComplete(txKey);
      throw error;
    }
  }, [userAddress, executeTransaction]);

  /**
   * Reset security state (call on wallet disconnect)
   */
  const resetSecurityState = useCallback(() => {
    if (userAddress) {
      RateLimiter.clearHistory(userAddress);
    }
    WalletSecurity.lastKnownAddress = null;
    lastAddressRef.current = null;
  }, [userAddress]);

  return {
    executeSecureTransaction,
    resetSecurityState,
    ...rest,
  };
};

export default useSecureTransaction;
