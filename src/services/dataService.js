/**
 * Data Service - Fetch and parse data from Sui blockchain
 * Handles all read operations from Move contracts
 */

import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import {
  SUI_PACKAGE_ID,
  LENDING_POOL_OBJECT_ID,
  networkConfig,
  ACTIVE_NETWORK,
  USE_DEMO_MODE,
} from '@/config/sui';
import { mistToSui } from './contractService';

// Create a standalone SuiClient for use outside React components
// For use in React components, use the useSuiClient hook from @mysten/dapp-kit
let suiClientInstance = null;

const getSuiClient = () => {
  if (!suiClientInstance) {
    suiClientInstance = new SuiJsonRpcClient({ 
      url: networkConfig[ACTIVE_NETWORK]?.url || 'https://fullnode.testnet.sui.io:443' 
    });
  }
  return suiClientInstance;
};

/**
 * Lending Pool Data Service
 */
export const LendingPoolDataService = {
  /**
   * Fetch lending pool data
   * @returns {Promise<Object>} Pool data
   */
  fetchPoolData: async () => {
    try {
      // Demo mode - return realistic mock data
      if (USE_DEMO_MODE || LENDING_POOL_OBJECT_ID.includes('00000000000000000000000000000001')) {
        return {
          totalLiquidity: 125000,
          totalBorrowed: 45000,
          totalDeposited: 125000,
          interestRate: 5.0,
          availableLiquidity: 80000,
          utilizationRate: 36.0,
        };
      }

      const suiClient = getSuiClient();
      const poolObject = await suiClient.getObject({
        id: LENDING_POOL_OBJECT_ID,
        options: {
          showContent: true,
          showType: true,
        },
      });

      if (!poolObject.data) {
        console.warn('Pool object not found on blockchain');
        return {
          totalLiquidity: 0,
          totalBorrowed: 0,
          totalDeposited: 0,
          interestRate: 5.0,
          availableLiquidity: 0,
          utilizationRate: 0,
        };
      }

      const fields = poolObject.data.content?.fields;
      if (!fields) {
        console.warn('Pool fields not found');
        return {
          totalLiquidity: 0,
          totalBorrowed: 0,
          totalDeposited: 0,
          interestRate: 5.0,
          availableLiquidity: 0,
          utilizationRate: 0,
        };
      }

      return {
        totalLiquidity: mistToSui(fields.total_liquidity || 0),
        totalBorrowed: mistToSui(fields.total_borrowed || 0),
        totalDeposited: mistToSui(fields.total_deposited || 0),
        interestRate: parseFloat(fields.interest_rate || 0) / 100,
        availableLiquidity: mistToSui(fields.total_liquidity || 0),
        utilizationRate: fields.total_liquidity > 0 
          ? (parseFloat(fields.total_borrowed) / parseFloat(fields.total_liquidity)) * 100 
          : 0,
      };
    } catch (error) {
      console.error('Error fetching pool data:', error);
      return {
        totalLiquidity: 0,
        totalBorrowed: 0,
        totalDeposited: 0,
        interestRate: 5.0,
        availableLiquidity: 0,
        utilizationRate: 0,
      };
    }
  },
};

/**
 * Credit Profile Data Service
 */
export const CreditProfileDataService = {
  /**
   * Fetch user's credit profile
   * @param {string} userAddress - User's Sui address
   * @returns {Promise<Object>} Credit profile data
   */
  fetchCreditProfile: async (userAddress) => {
    try {
      const suiClient = getSuiClient();
      // Fetch all objects owned by user
      const ownedObjects = await suiClient.getOwnedObjects({
        owner: userAddress,
        filter: {
          StructType: `${SUI_PACKAGE_ID}::credit_profile::CreditProfile`,
        },
        options: {
          showContent: true,
          showType: true,
        },
      });

      if (!ownedObjects.data || ownedObjects.data.length === 0) {
        return null; // No profile found
      }

      // Get the first profile (user should only have one)
      const profileObject = ownedObjects.data[0];
      const fields = profileObject.data?.content?.fields;

      if (!fields) {
        return null;
      }

      return {
        objectId: profileObject.data.objectId,
        owner: fields.owner,
        score: parseInt(fields.score || 0),
        totalBorrowed: mistToSui(fields.total_borrowed || 0),
        totalRepaid: mistToSui(fields.total_repaid || 0),
        loanCount: parseInt(fields.loan_count || 0),
        defaultCount: parseInt(fields.default_count || 0),
      };
    } catch (error) {
      console.error('Error fetching credit profile:', error);
      return null;
    }
  },

  /**
   * Calculate max borrow limit based on credit score
   * @param {number} creditScore - User's credit score
   * @returns {number} Max borrow limit in SUI
   */
  calculateMaxBorrowLimit: (creditScore) => {
    if (creditScore >= 750) return 100;
    if (creditScore >= 650) return 50;
    if (creditScore >= 550) return 25;
    if (creditScore >= 500) return 10;
    return 0;
  },

  /**
   * Get credit score rating
   * @param {number} score - Credit score
   * @returns {Object} Rating info
   */
  getCreditRating: (score) => {
    if (score >= 750) return { label: 'Excellent', color: 'green', variant: 'default' };
    if (score >= 650) return { label: 'Good', color: 'blue', variant: 'default' };
    if (score >= 550) return { label: 'Fair', color: 'yellow', variant: 'secondary' };
    if (score >= 500) return { label: 'Building', color: 'orange', variant: 'secondary' };
    return { label: 'No Score', color: 'gray', variant: 'outline' };
  },
};

/**
 * DePIN Data Service
 */
export const DePINDataService = {
  /**
   * Fetch DePIN project data
   * @param {string} projectObjectId - Project object ID
   * @returns {Promise<Object>} Project data
   */
  fetchProjectData: async (projectObjectId) => {
    try {
      const suiClient = getSuiClient();
      const projectObject = await suiClient.getObject({
        id: projectObjectId,
        options: {
          showContent: true,
          showType: true,
        },
      });

      if (!projectObject.data) {
        throw new Error('Project not found');
      }

      const fields = projectObject.data.content?.fields;
      if (!fields) {
        throw new Error('Project fields not found');
      }

      return {
        objectId: projectObject.data.objectId,
        name: fields.name,
        description: fields.description,
        targetAmount: mistToSui(fields.target_amount || 0),
        currentAmount: mistToSui(fields.current_amount || 0),
        apy: parseFloat(fields.apy || 0) / 100, // Convert basis points to percentage
        isActive: fields.is_active || false,
        fundingProgress: fields.target_amount > 0
          ? (parseFloat(fields.current_amount) / parseFloat(fields.target_amount)) * 100
          : 0,
      };
    } catch (error) {
      console.error('Error fetching project data:', error);
      return null;
    }
  },

  /**
   * Fetch user's DePIN NFTs
   * @param {string} userAddress - User's Sui address
   * @returns {Promise<Array>} Array of NFT data
   */
  fetchUserNFTs: async (userAddress) => {
    try {
      const suiClient = getSuiClient();
      const ownedObjects = await suiClient.getOwnedObjects({
        owner: userAddress,
        filter: {
          StructType: `${SUI_PACKAGE_ID}::depin::DepinNFT`,
        },
        options: {
          showContent: true,
          showType: true,
        },
      });

      if (!ownedObjects.data || ownedObjects.data.length === 0) {
        return [];
      }

      return ownedObjects.data.map((nftObject) => {
        const fields = nftObject.data?.content?.fields;
        return {
          objectId: nftObject.data.objectId,
          projectId: fields?.project_id,
          investor: fields?.investor,
          amount: mistToSui(fields?.amount || 0),
          timestamp: parseInt(fields?.timestamp || 0),
        };
      });
    } catch (error) {
      console.error('Error fetching user NFTs:', error);
      return [];
    }
  },
};

/**
 * Transaction Data Service
 */
export const TransactionDataService = {
  /**
   * Fetch transaction details
   * @param {string} digest - Transaction digest
   * @returns {Promise<Object>} Transaction data
   */
  fetchTransaction: async (digest) => {
    try {
      const suiClient = getSuiClient();
      const txData = await suiClient.getTransactionBlock({
        digest,
        options: {
          showEffects: true,
          showEvents: true,
          showObjectChanges: true,
          showInput: true,
        },
      });

      return txData;
    } catch (error) {
      console.error('Error fetching transaction:', error);
      return null;
    }
  },

  /**
   * Wait for transaction confirmation
   * @param {string} digest - Transaction digest
   * @returns {Promise<Object>} Transaction result
   */
  waitForTransaction: async (digest) => {
    try {
      const suiClient = getSuiClient();
      const result = await suiClient.waitForTransaction({
        digest,
        options: {
          showEffects: true,
          showEvents: true,
          showObjectChanges: true,
        },
      });

      return result;
    } catch (error) {
      console.error('Error waiting for transaction:', error);
      throw error;
    }
  },
};

/**
 * Balance Service
 */
export const BalanceService = {
  /**
   * Fetch user's SUI balance
   * @param {string} userAddress - User's Sui address
   * @returns {Promise<number>} Balance in SUI
   */
  fetchSuiBalance: async (userAddress) => {
    try {
      const suiClient = getSuiClient();
      const balance = await suiClient.getBalance({
        owner: userAddress,
        coinType: '0x2::sui::SUI',
      });

      return mistToSui(balance.totalBalance || 0);
    } catch (error) {
      console.error('Error fetching SUI balance:', error);
      return 0;
    }
  },

  /**
   * Fetch all user's coins
   * @param {string} userAddress - User's Sui address
   * @returns {Promise<Array>} Array of coin objects
   */
  fetchUserCoins: async (userAddress) => {
    try {
      const suiClient = getSuiClient();
      const coins = await suiClient.getCoins({
        owner: userAddress,
        coinType: '0x2::sui::SUI',
      });

      return coins.data || [];
    } catch (error) {
      console.error('Error fetching user coins:', error);
      return [];
    }
  },
};

/**
 * User Deposit Service - Track user deposits via events
 */
export const UserDepositService = {
  /**
   * Fetch user's deposit and withdrawal events to calculate net deposited amount
   * @param {string} userAddress - User's Sui address
   * @returns {Promise<Object>} User deposit data
   */
  fetchUserDeposits: async (userAddress) => {
    try {
      const suiClient = getSuiClient();
      
      // Query deposit events
      const depositEvents = await suiClient.queryEvents({
        query: {
          MoveEventType: `${SUI_PACKAGE_ID}::lending_logic::DepositEvent`,
        },
        limit: 1000,
      });

      // Query withdraw events
      const withdrawEvents = await suiClient.queryEvents({
        query: {
          MoveEventType: `${SUI_PACKAGE_ID}::lending_logic::WithdrawEvent`,
        },
        limit: 1000,
      });

      // Calculate user's deposits
      let totalDeposited = 0;
      let totalWithdrawn = 0;
      let depositCount = 0;
      let withdrawCount = 0;

      // Sum deposits for this user
      if (depositEvents.data) {
        depositEvents.data.forEach(event => {
          const parsedEvent = event.parsedJson;
          if (parsedEvent && parsedEvent.depositor === userAddress) {
            totalDeposited += mistToSui(parsedEvent.amount);
            depositCount++;
          }
        });
      }

      // Sum withdrawals for this user
      if (withdrawEvents.data) {
        withdrawEvents.data.forEach(event => {
          const parsedEvent = event.parsedJson;
          if (parsedEvent && parsedEvent.withdrawer === userAddress) {
            totalWithdrawn += mistToSui(parsedEvent.amount);
            withdrawCount++;
          }
        });
      }

      const netDeposited = totalDeposited - totalWithdrawn;

      return {
        totalDeposited,
        totalWithdrawn,
        netDeposited,
        depositCount,
        withdrawCount,
        // Yield calculation would require tracking time-weighted deposits
        // For now, return 0 - this should be implemented with proper yield tracking
        yieldEarned: 0,
      };
    } catch (error) {
      console.error('Error fetching user deposits:', error);
      return {
        totalDeposited: 0,
        totalWithdrawn: 0,
        netDeposited: 0,
        depositCount: 0,
        withdrawCount: 0,
        yieldEarned: 0,
      };
    }
  },
};

/**
 * Utility functions
 */
export const DataUtils = {
  /**
   * Format large numbers
   */
  formatNumber: (num, decimals = 2) => {
    if (num >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(decimals)}M`;
    }
    if (num >= 1_000) {
      return `${(num / 1_000).toFixed(decimals)}K`;
    }
    return num.toFixed(decimals);
  },

  /**
   * Format timestamp
   */
  formatTimestamp: (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString();
  },

  /**
   * Calculate APY
   */
  calculateAPY: (principal, rate, time) => {
    return principal * (rate / 100) * (time / 365);
  },

  /**
   * Calculate interest
   */
  calculateInterest: (principal, rate, days) => {
    return (principal * rate * days) / (365 * 100);
  },
};

export default {
  LendingPoolDataService,
  CreditProfileDataService,
  DePINDataService,
  TransactionDataService,
  BalanceService,
  UserDepositService,
  DataUtils,
  getSuiClient,
};
