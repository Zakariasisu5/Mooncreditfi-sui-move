/**
 * Sui contract interaction hooks - Production Ready
 * Provides hooks for reading and writing to Sui Move contracts
 * with proper error handling, caching, and loading states.
 */

import { useState, useCallback, useEffect } from 'react';
import { Transaction } from '@mysten/sui/transactions';
import { useSuiClient } from './useSuiClient';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { 
  SUI_PACKAGE_ID, 
  LENDING_POOL_OBJECT_ID, 
  CREDIT_PROFILE_OBJECT_ID, 
  DEPIN_FINANCE_OBJECT_ID 
} from '@/config/sui';

// Re-export addresses for backward compatibility
export const LENDING_POOL_ADDRESS = LENDING_POOL_OBJECT_ID;
export const CREDIT_PROFILE_ADDRESS = CREDIT_PROFILE_OBJECT_ID;
export const DEPIN_FINANCE_ADDRESS = DEPIN_FINANCE_OBJECT_ID;

/**
 * Hook to read Sui object data with automatic refetching
 * @param {string} objectId - The Sui object ID to fetch
 * @param {object} options - Configuration options
 * @returns {object} { data, isLoading, error, refetch }
 */
export const useSuiObject = (objectId, options = {}) => {
  const suiClient = useSuiClient();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { enabled = true, refetchInterval } = options;

  const fetchObject = useCallback(async () => {
    if (!objectId || !enabled) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const object = await suiClient.getObject({
        id: objectId,
        options: {
          showContent: true,
          showOwner: true,
          showType: true,
        },
      });
      setData(object);
    } catch (err) {
      console.error('Error fetching Sui object:', err);
      setError(err);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [objectId, suiClient, enabled]);

  useEffect(() => {
    fetchObject();

    if (refetchInterval) {
      const interval = setInterval(fetchObject, refetchInterval);
      return () => clearInterval(interval);
    }
  }, [fetchObject, refetchInterval]);

  return { data, isLoading, error, refetch: fetchObject };
};

/**
 * Hook to read dynamic field from a Sui object
 * @param {string} parentId - Parent object ID
 * @param {object} name - Dynamic field name
 * @returns {object} { data, isLoading, error, refetch }
 */
export const useDynamicField = (parentId, name) => {
  const suiClient = useSuiClient();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchField = useCallback(async () => {
    if (!parentId || !name) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const field = await suiClient.getDynamicFieldObject({
        parentId,
        name,
      });
      setData(field);
    } catch (err) {
      console.error('Error fetching dynamic field:', err);
      setError(err);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [parentId, name, suiClient]);

  useEffect(() => {
    fetchField();
  }, [fetchField]);

  return { data, isLoading, error, refetch: fetchField };
};

/**
 * Hook to fetch user's owned objects of a specific type
 * @param {string} owner - Owner address
 * @param {string} structType - Move struct type filter
 * @returns {object} { data, isLoading, error, refetch }
 */
export const useOwnedObjects = (owner, structType) => {
  const suiClient = useSuiClient();
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchObjects = useCallback(async () => {
    if (!owner) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const objects = await suiClient.getOwnedObjects({
        owner,
        filter: structType ? { StructType: structType } : undefined,
        options: {
          showContent: true,
          showType: true,
        },
      });
      setData(objects.data || []);
    } catch (err) {
      console.error('Error fetching owned objects:', err);
      setError(err);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [owner, structType, suiClient]);

  useEffect(() => {
    fetchObjects();
  }, [fetchObjects]);

  return { data, isLoading, error, refetch: fetchObjects };
};

/**
 * Hook to read lending pool data
 * @returns {object} Pool data with loading and error states
 */
export const useLendingPool = () => {
  const { data, isLoading, error, refetch } = useSuiObject(
    LENDING_POOL_OBJECT_ID,
    { refetchInterval: 10000 } // Refetch every 10 seconds
  );

  const poolData = data?.data?.content?.fields || null;

  return {
    pool: poolData,
    isLoading,
    error,
    refetch,
  };
};

/**
 * Hook to read user's credit profile
 * @param {string} userAddress - User's Sui address
 * @returns {object} Credit profile data with loading and error states
 */
export const useCreditProfile = (userAddress) => {
  const suiClient = useSuiClient();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProfile = useCallback(async () => {
    if (!userAddress) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Try to fetch user's credit profile object
      // This assumes credit profiles are owned objects
      const objects = await suiClient.getOwnedObjects({
        owner: userAddress,
        filter: {
          StructType: `${SUI_PACKAGE_ID}::credit_profile::CreditProfile`,
        },
        options: {
          showContent: true,
        },
      });

      if (objects.data && objects.data.length > 0) {
        const profileData = objects.data[0].data?.content?.fields;
        setProfile(profileData);
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.error('Error fetching credit profile:', err);
      setError(err);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [userAddress, suiClient]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { profile, isLoading, error, refetch: fetchProfile };
};

/**
 * Hook to read user's lender position
 * @param {string} userAddress - User's Sui address
 * @returns {object} Lender data with loading and error states
 */
export const useLenderPosition = (userAddress) => {
  const suiClient = useSuiClient();
  const [position, setPosition] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPosition = useCallback(async () => {
    if (!userAddress || !LENDING_POOL_OBJECT_ID) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch lender position from dynamic field
      const field = await suiClient.getDynamicFieldObject({
        parentId: LENDING_POOL_OBJECT_ID,
        name: {
          type: 'address',
          value: userAddress,
        },
      });

      if (field.data) {
        setPosition(field.data.content?.fields);
      } else {
        setPosition(null);
      }
    } catch (err) {
      // Dynamic field might not exist if user hasn't deposited
      if (err.message?.includes('not found')) {
        setPosition(null);
      } else {
        console.error('Error fetching lender position:', err);
        setError(err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [userAddress, suiClient]);

  useEffect(() => {
    fetchPosition();
  }, [fetchPosition]);

  return { position, isLoading, error, refetch: fetchPosition };
};

/**
 * Transaction builder utilities
 */
export const TransactionBuilders = {
  /**
   * Build a deposit transaction
   * @param {string} amount - Amount in MIST
   * @returns {Transaction}
   */
  deposit: (amount) => {
    const tx = new Transaction();
    const [coin] = tx.splitCoins(tx.gas, [amount]);
    tx.moveCall({
      target: `${SUI_PACKAGE_ID}::lending_pool::deposit`,
      arguments: [
        tx.object(LENDING_POOL_OBJECT_ID),
        coin,
      ],
    });
    return tx;
  },

  /**
   * Build a withdraw transaction
   * @param {string} amount - Amount in MIST
   * @returns {Transaction}
   */
  withdraw: (amount) => {
    const tx = new Transaction();
    tx.moveCall({
      target: `${SUI_PACKAGE_ID}::lending_pool::withdraw`,
      arguments: [
        tx.object(LENDING_POOL_OBJECT_ID),
        tx.pure.u64(amount),
      ],
    });
    return tx;
  },

  /**
   * Build a claim yield transaction
   * @returns {Transaction}
   */
  claimYield: () => {
    const tx = new Transaction();
    tx.moveCall({
      target: `${SUI_PACKAGE_ID}::lending_pool::claim_yield`,
      arguments: [tx.object(LENDING_POOL_OBJECT_ID)],
    });
    return tx;
  },

  /**
   * Build a borrow transaction
   * @param {string} amount - Amount in MIST
   * @returns {Transaction}
   */
  borrow: (amount) => {
    const tx = new Transaction();
    tx.moveCall({
      target: `${SUI_PACKAGE_ID}::lending_pool::borrow`,
      arguments: [
        tx.object(LENDING_POOL_OBJECT_ID),
        tx.object(CREDIT_PROFILE_OBJECT_ID),
        tx.pure.u64(amount),
      ],
    });
    return tx;
  },

  /**
   * Build a repay loan transaction
   * @param {string} loanId - Loan object ID
   * @param {string} amount - Amount in MIST
   * @returns {Transaction}
   */
  repayLoan: (loanId, amount) => {
    const tx = new Transaction();
    const [coin] = tx.splitCoins(tx.gas, [amount]);
    tx.moveCall({
      target: `${SUI_PACKAGE_ID}::lending_pool::repay`,
      arguments: [
        tx.object(LENDING_POOL_OBJECT_ID),
        tx.object(loanId),
        coin,
      ],
    });
    return tx;
  },
};
