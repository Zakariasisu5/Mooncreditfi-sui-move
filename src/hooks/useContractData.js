/**
 * Production-ready hooks for fetching contract data
 * Uses React Query for caching and automatic refetching
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrentAccount } from '@mysten/dapp-kit';
import {
  LendingPoolDataService,
  CreditProfileDataService,
  DePINDataService,
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
    refetchInterval: 30000, // Refetch every 30 seconds (reduced from 10s)
    staleTime: 20000, // Consider data stale after 20 seconds
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
    refetchInterval: 45000, // Refetch every 45 seconds (reduced from 15s)
    staleTime: 30000,
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
    refetchInterval: 30000, // Refetch every 30 seconds (reduced from 10s)
    staleTime: 20000,
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
    refetchInterval: 45000, // Refetch every 45 seconds (reduced from 15s)
    staleTime: 30000,
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
    staleTime: 10000,
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
    refetchInterval: 20000,
    staleTime: 15000,
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
    refetchInterval: 60000, // Refetch every 60 seconds (reduced from 20s)
    staleTime: 45000,
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
    refetchInterval: 30000,
    staleTime: 20000,
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
 * @returns {Function} Invalidate function
 */
export const useInvalidateQueries = () => {
  const queryClient = useQueryClient();
  const account = useCurrentAccount();
  const userAddress = account?.address;

  return {
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: ['lendingPool'] });
      queryClient.invalidateQueries({ queryKey: ['creditProfile', userAddress] });
      queryClient.invalidateQueries({ queryKey: ['userBalance', userAddress] });
      queryClient.invalidateQueries({ queryKey: ['userDeposits', userAddress] });
      queryClient.invalidateQueries({ queryKey: ['userLoans', userAddress] });
      queryClient.invalidateQueries({ queryKey: ['userDePINNFTs', userAddress] });
    },
    invalidateLendingPool: () => {
      queryClient.invalidateQueries({ queryKey: ['lendingPool'] });
    },
    invalidateCreditProfile: () => {
      queryClient.invalidateQueries({ queryKey: ['creditProfile', userAddress] });
    },
    invalidateBalance: () => {
      queryClient.invalidateQueries({ queryKey: ['userBalance', userAddress] });
    },
    invalidateDeposits: () => {
      queryClient.invalidateQueries({ queryKey: ['userDeposits', userAddress] });
    },
    invalidateLoans: () => {
      queryClient.invalidateQueries({ queryKey: ['userLoans', userAddress] });
    },
    invalidateDePIN: () => {
      queryClient.invalidateQueries({ queryKey: ['userDePINNFTs', userAddress] });
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
  useUserBalance,
  useUserDeposits,
  useUserLoans,
  useDePINProject,
  useDePINProjects,
  useUserDePINNFTs,
  useMaxBorrowLimit,
  useInvalidateQueries,
  useLendingData,
};
