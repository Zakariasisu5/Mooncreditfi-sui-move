import { useState } from 'react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { EXPLORER_URL } from '@/config/sui';

/**
 * TransactionWrapper - Handles transaction states and feedback
 * Provides loading, success, and error states with explorer links
 */
const TransactionWrapper = ({ 
  children, 
  onRefresh,
  autoRefreshDelay = 2000 
}) => {
  const [txState, setTxState] = useState({
    isLoading: false,
    isSuccess: false,
    isError: false,
    txHash: null,
    errorMessage: null
  });

  const executeTransaction = async (txFunction, options = {}) => {
    const {
      onSuccess,
      onError,
      successMessage = 'Transaction completed successfully!',
      errorMessage = 'Transaction failed',
      autoRefresh = true
    } = options;

    setTxState({
      isLoading: true,
      isSuccess: false,
      isError: false,
      txHash: null,
      errorMessage: null
    });

    try {
      const result = await txFunction();
      const txHash = result?.digest || result?.txHash || result;

      setTxState({
        isLoading: false,
        isSuccess: true,
        isError: false,
        txHash,
        errorMessage: null
      });

      toast.success(successMessage, {
        action: txHash ? {
          label: 'View',
          onClick: () => window.open(`${EXPLORER_URL}/tx/${txHash}`, '_blank')
        } : undefined
      });

      if (onSuccess) {
        await onSuccess(result);
      }

      if (autoRefresh && onRefresh) {
        setTimeout(() => {
          onRefresh();
          // Reset success state after refresh
          setTxState(prev => ({ ...prev, isSuccess: false }));
        }, autoRefreshDelay);
      }

      return result;
    } catch (error) {
      console.error('Transaction error:', error);
      
      const errorMsg = error?.message || errorMessage;
      
      setTxState({
        isLoading: false,
        isSuccess: false,
        isError: true,
        txHash: null,
        errorMessage: errorMsg
      });

      toast.error(errorMsg);

      if (onError) {
        await onError(error);
      }

      // Auto-clear error state after 5 seconds
      setTimeout(() => {
        setTxState(prev => ({ ...prev, isError: false, errorMessage: null }));
      }, 5000);

      throw error;
    }
  };

  const clearState = () => {
    setTxState({
      isLoading: false,
      isSuccess: false,
      isError: false,
      txHash: null,
      errorMessage: null
    });
  };

  return (
    <div className="space-y-4">
      {txState.isLoading && (
        <Alert className="border-blue-200 bg-blue-50">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          <AlertDescription className="text-blue-900">
            Processing transaction... Please wait and do not close this window.
          </AlertDescription>
        </Alert>
      )}

      {txState.isSuccess && txState.txHash && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="flex items-center justify-between text-green-900">
            <span>Transaction successful! Data will refresh shortly.</span>
            <Button
              variant="link"
              size="sm"
              className="text-green-700 hover:text-green-900"
              onClick={() => window.open(`${EXPLORER_URL}/tx/${txState.txHash}`, '_blank')}
            >
              View on Explorer
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {txState.isError && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{txState.errorMessage}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearState}
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {typeof children === 'function' 
        ? children({ 
            executeTransaction, 
            txState, 
            clearState,
            isProcessing: txState.isLoading 
          })
        : children
      }
    </div>
  );
};

export default TransactionWrapper;
