/**
 * Production-ready hooks for fetching contract data
 * Uses React Query for caching and automatic refetching
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrentAccount } from '@mysten/dapp-kit';
import {
  LendingPoolDataService,
  CreditProfileDataService,
  CollateralVaultDataService,
  DePINDataService,
  RiskPoolDataService,
  MudarabahPoolDataService,
  BalanceService,
  UserDepositService,
  UserLoanService,
} from '@/services/dataService';

/**
 * Hook to fetch lending pool data
 * @param {Object} options - Query options
 * @returns {Object} Query result with pool data
 */
export const useLendingPool = (options = {}) => {
  return useQuery({
    queryKey: ['lendingPool'],
    queryFn: () => LendingPoolDataService.fetchPoolData(),
    refetchInterval: 15000,
    staleTime: 5000, 
    ...options,
  });
};

/**
 * Hook to fetch user's credit profile
 * @param {Object} options - Query options
 * @returns {Object} Query result with credit profile data
 */
export const useCreditProfile = (options = {}) => {
  const account = useCurrentAccount();
  const userAddress = account?.address;

  return useQuery({
    queryKey: ['creditProfile', userAddress],
    queryFn: () => CreditProfileDataService.fetchCreditProfile(userAddress),
    enabled: !!userAddress, // Only fetch if user is connected
    refetchInterval: 20000,
    staleTime: 5000, 
    ...options,
  });
};

/**
 * Hook to fetch user's collateral vault
 * @param {Object} options - Query options
 * @returns {Object} Query result with collateral vault data
 */
export const useCollateralVault = (options = {}) => {
  const account = useCurrentAccount();
  const userAddress = account?.address;

  return useQuery({
    queryKey: ['collateralVault', userAddress],
    queryFn: () => CollateralVaultDataService.fetchCollateralVault(userAddress),
    enabled: !!userAddress,
    refetchInterval: 30000, // Increased from 15s to 30s
    staleTime: 20000, // Increased from 5s to 20s
    retry: 3, // Retry failed queries 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    ...options,
  });
};

/**
 * Hook to fetch user's SUI balance
 * @param {Object} options - Query options
 * @returns {Object} Query result with balance data
 */
export const useUserBalance = (options = {}) => {
  const account = useCurrentAccount();
  const userAddress = account?.address;

  return useQuery({
    queryKey: ['userBalance', userAddress],
    queryFn: () => BalanceService.fetchSuiBalance(userAddress),
    enabled: !!userAddress,
    refetchInterval: 15000,
    staleTime: 5000,
    ...options,
  });
};

/**
 * Hook to fetch user's deposit data from events
 * @param {Object} options - Query options
 * @returns {Object} Query result with deposit data
 */
export const useUserDeposits = (options = {}) => {
  const account = useCurrentAccount();
  const userAddress = account?.address;
  
  // Fetch pool data to get current APY
  const { data: pool } = useLendingPool();
  const poolAPY = pool?.interestRate || 5.0;

  return useQuery({
    queryKey: ['userDeposits', userAddress, poolAPY],
    queryFn: () => UserDepositService.fetchUserDeposits(userAddress, poolAPY),
    enabled: !!userAddress,
    refetchInterval: 20000,
    staleTime: 5000,
    ...options,
  });
};

/**
 * Hook to fetch user's loan data from events
 * @param {Object} options - Query options
 * @returns {Object} Query result with loan data
 */
export const useUserLoans = (options = {}) => {
  const account = useCurrentAccount();
  const userAddress = account?.address;

  return useQuery({
    queryKey: ['userLoans', userAddress],
    queryFn: () => UserLoanService.fetchUserLoans(userAddress),
    enabled: !!userAddress,
    refetchInterval: 15000, 
    staleTime: 5000,
    ...options,
  });
};

/**
 * Hook to fetch DePIN project data
 * @param {string} projectObjectId - Project object ID
 * @param {Object} options - Query options
 * @returns {Object} Query result with project data
 */
export const useDePINProject = (projectObjectId, options = {}) => {
  return useQuery({
    queryKey: ['depinProject', projectObjectId],
    queryFn: () => DePINDataService.fetchProjectData(projectObjectId),
    enabled: !!projectObjectId,
    refetchInterval: 15000,
    staleTime: 5000,
    ...options,
  });
};

/**
 * Hook to fetch multiple DePIN projects
 * @param {Array} projectIds - Array of project object IDs
 * @param {Object} options - Query options
 * @returns {Object} Query result with projects data
 */
export const useDePINProjects = (projectIds = [], options = {}) => {
  return useQuery({
    queryKey: ['depinProjects', projectIds],
    queryFn: () => DePINDataService.fetchMultipleProjects(projectIds),
    enabled: projectIds.length > 0,
    refetchInterval: 20000,
    staleTime: 5000,
    ...options,
  });
};

/**
 * Hook to fetch user's DePIN NFTs
 * @param {Object} options - Query options
 * @returns {Object} Query result with NFT data
 */
export const useUserDePINNFTs = (options = {}) => {
  const account = useCurrentAccount();
  const userAddress = account?.address;

  return useQuery({
    queryKey: ['userDePINNFTs', userAddress],
    queryFn: () => DePINDataService.fetchUserNFTs(userAddress),
    enabled: !!userAddress,
    refetchInterval: 20000,
    staleTime: 5000,
    ...options,
  });
};

/**
 * Hook to fetch risk pool data
 * @param {string} poolObjectId - Risk pool object ID
 * @param {Object} options - Query options
 * @returns {Object} Query result with risk pool data
 */
export const useRiskPool = (poolObjectId, options = {}) => {
  return useQuery({
    queryKey: ['riskPool', poolObjectId],
    queryFn: () => RiskPoolDataService.fetchRiskPoolData(poolObjectId),
    enabled: !!poolObjectId,
    refetchInterval: 20000,
    staleTime: 5000,
    ...options,
  });
};

/**
 * Hook to fetch multiple risk pools
 * @param {Array} poolIds - Array of pool object IDs with metadata
 * @param {Object} options - Query options
 * @returns {Object} Query result with risk pools data
 */
export const useRiskPools = (poolIds = [], options = {}) => {
  return useQuery({
    queryKey: ['riskPools', poolIds],
    queryFn: () => RiskPoolDataService.fetchMultipleRiskPools(poolIds),
    enabled: poolIds.length > 0,
    refetchInterval: 20000,
    staleTime: 5000,
    ...options,
  });
};

/**
 * Hook to fetch Mudarabah pool data
 * @param {string} poolObjectId - Mudarabah pool object ID
 * @param {Object} options - Query options
 * @returns {Object} Query result with Mudarabah pool data
 */
export const useMudarabahPool = (poolObjectId, options = {}) => {
  return useQuery({
    queryKey: ['mudarabahPool', poolObjectId],
    queryFn: () => MudarabahPoolDataService.fetchMudarabahPoolData(poolObjectId),
    enabled: !!poolObjectId,
    refetchInterval: 20000,
    staleTime: 5000,
    ...options,
  });
};

/**
 * Hook to fetch Mudarabah distribution history
 * @param {string} poolObjectId - Mudarabah pool object ID
 * @param {Object} options - Query options
 * @returns {Object} Query result with distribution history
 */
export const useMudarabahDistributionHistory = (poolObjectId, options = {}) => {
  return useQuery({
    queryKey: ['mudarabahDistributionHistory', poolObjectId],
    queryFn: () => MudarabahPoolDataService.fetchDistributionHistory(poolObjectId),
    enabled: !!poolObjectId,
    refetchInterval: 30000,
    staleTime: 10000,
    ...options,
  });
};

/**
 * Hook to calculate max borrow limit
 * @returns {Object} Max borrow limit and credit rating
 */
export const useMaxBorrowLimit = () => {
  const { data: profile, isLoading } = useCreditProfile();

  const creditScore = profile?.score || 0;
  const maxBorrowLimit = CreditProfileDataService.calculateMaxBorrowLimit(creditScore);
  const creditRating = CreditProfileDataService.getCreditRating(creditScore);

  return {
    maxBorrowLimit,
    creditScore,
    creditRating,
    isLoading,
    hasProfile: !!profile,
  };
};

/**
 * Hook to invalidate queries after transaction
 * Ensures cache is cleared and data is refetched from blockchain
 * @returns {Object} Invalidation functions with sync capabilities
 */
export const useInvalidateQueries = () => {
  const queryClient = useQueryClient();
  const account = useCurrentAccount();
  const userAddress = account?.address;

  return {
    /**
     * Invalidate ALL queries and force immediate refetch
     * CRITICAL: Use after any state-changing transaction
     */
    invalidateAll: async () => {
      // Step 1: Invalidate all queries to mark them as stale
      await Promise.all([
        // User-specific queries
        queryClient.invalidateQueries({ queryKey: ['creditProfile', userAddress] }),
        queryClient.invalidateQueries({ queryKey: ['collateralVault', userAddress] }),
        queryClient.invalidateQueries({ queryKey: ['userBalance', userAddress] }),
        queryClient.invalidateQueries({ queryKey: ['userDeposits', userAddress] }),
        queryClient.invalidateQueries({ queryKey: ['userLoans', userAddress] }),
        queryClient.invalidateQueries({ queryKey: ['userDePINNFTs', userAddress] }),
        
        // Global/pool queries
        queryClient.invalidateQueries({ queryKey: ['lendingPool'] }),
        queryClient.invalidateQueries({ queryKey: ['riskPools'] }),
        queryClient.invalidateQueries({ queryKey: ['riskPool'] }),
        queryClient.invalidateQueries({ queryKey: ['mudarabahPool'] }),
        queryClient.invalidateQueries({ queryKey: ['mudarabahDistributionHistory'] }),
        queryClient.invalidateQueries({ queryKey: ['depinProjects'] }),
      ]);
      
      // Step 2: Force immediate refetch of critical queries
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['creditProfile', userAddress], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['collateralVault', userAddress], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['userBalance', userAddress], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['userDeposits', userAddress], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['userLoans', userAddress], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['lendingPool'], type: 'active' }),
      ]);
    },
    
    /**
     * Invalidate lending-related queries (deposit, withdraw, lend actions)
     */
    invalidateLendingQueries: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['lendingPool'] }),
        queryClient.invalidateQueries({ queryKey: ['userDeposits', userAddress] }),
        queryClient.invalidateQueries({ queryKey: ['userBalance', userAddress] }),
        queryClient.invalidateQueries({ queryKey: ['collateralVault', userAddress] }),
      ]);
      
      // Refetch immediately
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['userDeposits', userAddress], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['lendingPool'], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['userBalance', userAddress], type: 'active' }),
      ]);
    },
    
    /**
     * Invalidate borrow-related queries (borrow, repay actions)
     */
    invalidateBorrowQueries: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['creditProfile', userAddress] }),
        queryClient.invalidateQueries({ queryKey: ['collateralVault', userAddress] }),
        queryClient.invalidateQueries({ queryKey: ['userLoans', userAddress] }),
        queryClient.invalidateQueries({ queryKey: ['userBalance', userAddress] }),
        queryClient.invalidateQueries({ queryKey: ['lendingPool'] }),
      ]);
      
      // Refetch immediately
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['creditProfile', userAddress], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['userLoans', userAddress], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['collateralVault', userAddress], type: 'active' }),
      ]);
    },
    
    /**
     * Invalidate individual pool/market queries
     */
    invalidateLendingPool: async () => {
      await queryClient.invalidateQueries({ queryKey: ['lendingPool'] });
      await queryClient.refetchQueries({ queryKey: ['lendingPool'], type: 'active' });
    },
    
    invalidateCreditProfile: async () => {
      await queryClient.invalidateQueries({ queryKey: ['creditProfile', userAddress] });
      await queryClient.refetchQueries({ queryKey: ['creditProfile', userAddress], type: 'active' });
    },
    
    invalidateCollateralVault: async () => {
      await queryClient.invalidateQueries({ queryKey: ['collateralVault', userAddress] });
      await queryClient.refetchQueries({ queryKey: ['collateralVault', userAddress], type: 'active' });
    },
    
    invalidateBalance: async () => {
      await queryClient.invalidateQueries({ queryKey: ['userBalance', userAddress] });
      await queryClient.refetchQueries({ queryKey: ['userBalance', userAddress], type: 'active' });
    },
    
    invalidateDeposits: async () => {
      await queryClient.invalidateQueries({ queryKey: ['userDeposits', userAddress] });
      await queryClient.refetchQueries({ queryKey: ['userDeposits', userAddress], type: 'active' });
    },
    
    invalidateLoans: async () => {
      await queryClient.invalidateQueries({ queryKey: ['userLoans', userAddress] });
      await queryClient.refetchQueries({ queryKey: ['userLoans', userAddress], type: 'active' });
    },
    
    invalidateDePIN: async () => {
      await queryClient.invalidateQueries({ queryKey: ['userDePINNFTs', userAddress] });
      await queryClient.invalidateQueries({ queryKey: ['depinProjects'] });
      await queryClient.refetchQueries({ queryKey: ['userDePINNFTs', userAddress] });
    },
    
    invalidateRiskPools: async () => {
      await queryClient.invalidateQueries({ queryKey: ['riskPools'] });
      await queryClient.invalidateQueries({ queryKey: ['riskPool'] });
      await queryClient.refetchQueries({ queryKey: ['riskPools'] });
    },
    
    invalidateMudarabah: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mudarabahPool'] });
      await queryClient.invalidateQueries({ queryKey: ['mudarabahDistributionHistory'] });
      await queryClient.refetchQueries({ queryKey: ['mudarabahPool'] });
    },
  };
};

/**
 * Hook for combined lending data
 * @returns {Object} Combined lending pool and user data
 */
export const useLendingData = () => {
  const { data: pool, isLoading: isLoadingPool } = useLendingPool();
  const { data: profile, isLoading: isLoadingProfile } = useCreditProfile();
  const { data: balance, isLoading: isLoadingBalance } = useUserBalance();

  return {
    pool: pool || {
      totalLiquidity: 0,
      totalBorrowed: 0,
      totalDeposited: 0,
      interestRate: 5.0,
      availableLiquidity: 0,
      utilizationRate: 0,
    },
    profile,
    balance: balance || 0,
    isLoading: isLoadingPool || isLoadingProfile || isLoadingBalance,
    hasProfile: !!profile,
  };
};

export default {
  useLendingPool,
  useCreditProfile,
  useCollateralVault,
  useUserBalance,
  useUserDeposits,
  useUserLoans,
  useDePINProject,
  useDePINProjects,
  useUserDePINNFTs,
  useRiskPool,
  useRiskPools,
  useMudarabahPool,
  useMudarabahDistributionHistory,
  useMaxBorrowLimit,
  useInvalidateQueries,
  useLendingData,
};
