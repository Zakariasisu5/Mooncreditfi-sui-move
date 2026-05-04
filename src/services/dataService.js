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
        debt: mistToSui(fields.debt || 0),  // Current outstanding debt
        totalBorrowed: mistToSui(fields.total_borrowed || 0),
        totalRepaid: mistToSui(fields.total_repaid || 0),
        loanCount: parseInt(fields.loan_count || 0),
        defaultCount: parseInt(fields.default_count || 0),
        reputation: parseInt(fields.reputation || 500),  // NEW: Reputation score
        risk_level: parseInt(fields.risk_level || 2),    // NEW: Risk level
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
 * Collateral Vault Data Service
 */
export const CollateralVaultDataService = {
  /**
   * Retry helper function with exponential backoff
   * @param {Function} fn - Function to retry
   * @param {number} maxRetries - Max retry attempts
   * @param {number} baseDelay - Base delay in ms
   * @returns {Promise<any>} Function result
   */
  _retryWithBackoff: async (fn, maxRetries = 4, baseDelay = 1500) => {
    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
          console.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`, error.message);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  },

  /**
   * Fetch user's collateral vault
   * @param {string} userAddress - User's Sui address
   * @returns {Promise<Object>} Collateral vault data
   */
  fetchCollateralVault: async (userAddress) => {
    try {
      const suiClient = getSuiClient();
      
      let vaultId = null;

      // Helper function to query events with retry logic
      const queryEventsWithRetry = async (eventType, limit = 100) => {
        return await CollateralVaultDataService._retryWithBackoff(async () => {
          const events = await suiClient.queryEvents({
            query: {
              MoveEventType: `${SUI_PACKAGE_ID}::collateral::${eventType}`,
            },
            limit,
            order: 'descending',
          });
          return events;
        }, 4, 1500); // 4 retries with 1.5s base delay
      };

      // Step 1: Try to find vault via VaultCreated events (for all vaults)
      try {
        const createEvents = await queryEventsWithRetry('VaultCreated', 100);

        for (const event of createEvents.data || []) {
          if (event.parsedJson?.owner === userAddress) {
            vaultId = event.parsedJson?.vault_id;
            console.log('Found vault via VaultCreated event:', vaultId);
            break;
          }
        }
      } catch (e) {
        console.warn('VaultCreated events query failed after retries:', e.message);
      }

      // Step 2: If not found, try CollateralDeposited events (for vaults with deposits)
      if (!vaultId) {
        try {
          const depositEvents = await queryEventsWithRetry('CollateralDeposited', 50);

          for (const event of depositEvents.data || []) {
            if (event.parsedJson?.owner === userAddress) {
              vaultId = event.parsedJson?.vault_id;
              console.log('Found vault via CollateralDeposited event:', vaultId);
              break;
            }
          }
        } catch (e) {
          console.warn('CollateralDeposited events query failed after retries:', e.message);
        }
      }

      // Step 3: If still not found, try withdrawal events
      if (!vaultId) {
        try {
          const withdrawEvents = await queryEventsWithRetry('CollateralWithdrawn', 50);

          for (const event of withdrawEvents.data || []) {
            if (event.parsedJson?.owner === userAddress) {
              vaultId = event.parsedJson?.vault_id;
              console.log('Found vault via CollateralWithdrawn event:', vaultId);
              break;
            }
          }
        } catch (e) {
          console.warn('Withdrawal events query failed after retries:', e.message);
        }
      }

      // Note: CollateralVault is a SHARED object (created with transfer::share_object)
      // so it cannot be found via getOwnedObjects(). We rely on events to find it.

      if (!vaultId) {
        console.warn(`No vault found for user ${userAddress}. Events may not be indexed yet or vault doesn't exist.`);
        return null; // No vault found
      }

      // Fetch the vault object with retry logic for indexing delays
      let vaultObject;
      try {
        vaultObject = await CollateralVaultDataService._retryWithBackoff(async () => {
          const result = await suiClient.getObject({
            id: vaultId,
            options: {
              showContent: true,
              showType: true,
            },
          });
          if (!result.data) {
            throw new Error('Vault object data not found');
          }
          return result;
        }, 3, 1000);
      } catch (error) {
        console.error('Failed to fetch vault object after retries:', error);
        return null;
      }

      if (!vaultObject.data) {
        console.error('Vault object has no data');
        return null;
      }

      const fields = vaultObject.data.content?.fields;
      if (!fields) {
        console.error('Vault fields not found');
        return null;
      }

      const collateralAmount = mistToSui(fields.collateral_amount || 0);
      const borrowedAmount = mistToSui(fields.borrowed_amount || 0);
      
      // Calculate collateral ratio (in percentage)
      let collateralRatio = 0;
      if (borrowedAmount > 0) {
        collateralRatio = (collateralAmount / borrowedAmount) * 100;
      }

      // Liquidation threshold is 150%
      const liquidationThreshold = 150;
      const isHealthy = borrowedAmount === 0 || collateralRatio >= liquidationThreshold;
      const isAtRisk = collateralRatio > 0 && collateralRatio < liquidationThreshold * 1.2; // Within 20% of liquidation
      const isLiquidatable = borrowedAmount > 0 && collateralRatio < liquidationThreshold;

      return {
        objectId: vaultObject.data.objectId,
        owner: fields.owner,
        collateralAmount,
        borrowedAmount,
        collateralRatio,
        liquidationThreshold,
        isHealthy,
        isAtRisk,
        isLiquidatable,
        availableToWithdraw: borrowedAmount === 0 ? collateralAmount : 0,
        requiredCollateral: borrowedAmount * (liquidationThreshold / 100),
      };
    } catch (error) {
      console.error('Error fetching collateral vault:', error);
      return null;
    }
  },

  /**
   * Calculate required collateral for a borrow amount
   * @param {number} borrowAmount - Amount to borrow in SUI
   * @param {number} existingBorrowed - Existing borrowed amount in SUI
   * @returns {Object} Collateral requirements
   */
  calculateRequiredCollateral: (borrowAmount, existingBorrowed = 0) => {
    const liquidationThreshold = 1.5; // 150%
    const safeThreshold = 1.8; // 180% (recommended)
    
    const totalBorrowed = borrowAmount + existingBorrowed;
    const minimumCollateral = totalBorrowed * liquidationThreshold;
    const recommendedCollateral = totalBorrowed * safeThreshold;

    return {
      minimumCollateral,
      recommendedCollateral,
      totalBorrowed,
      liquidationThreshold: 150,
      safeThreshold: 180,
    };
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
        totalFunded: mistToSui(fields.total_funded || 0),  // NEW: Total funded
        totalRevenue: mistToSui(fields.total_revenue || 0), // NEW: Total revenue
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
   * Fetch multiple DePIN projects
   * @param {Array} projectIds - Array of project object IDs with metadata
   * @returns {Promise<Array>} Array of project data
   */
  fetchMultipleProjects: async (projectIds) => {
    try {
      const suiClient = getSuiClient();
      
      // Fetch all projects in parallel
      const projectPromises = projectIds.map(async (projectInfo) => {
        try {
          const projectObject = await suiClient.getObject({
            id: projectInfo.id,
            options: {
              showContent: true,
              showType: true,
            },
          });

          if (!projectObject.data) {
            return null;
          }

          const fields = projectObject.data.content?.fields;
          if (!fields) {
            return null;
          }

          return {
            objectId: projectObject.data.objectId,
            name: fields.name || projectInfo.name,
            description: fields.description,
            category: projectInfo.category,
            targetAmount: mistToSui(fields.target_amount || 0),
            currentAmount: mistToSui(fields.current_amount || 0),
            apy: parseFloat(fields.apy || 0) / 100,
            isActive: fields.is_active || false,
            totalFunded: mistToSui(fields.total_funded || 0),  // NEW: Total funded
            totalRevenue: mistToSui(fields.total_revenue || 0), // NEW: Total revenue
            fundingProgress: fields.target_amount > 0
              ? (parseFloat(fields.current_amount) / parseFloat(fields.target_amount)) * 100
              : 0,
          };
        } catch (error) {
          console.error(`Error fetching project ${projectInfo.id}:`, error);
          return null;
        }
      });

      const projects = await Promise.all(projectPromises);
      return projects.filter(p => p !== null);
    } catch (error) {
      console.error('Error fetching multiple projects:', error);
      return [];
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
   * Fetch user's deposit data directly from lending pool object
   * This is more reliable than events as it reads the current on-chain state
   * @param {string} userAddress - User's Sui address
   * @param {number} poolAPY - Current pool APY
   * @returns {Promise<Object>} User deposit data
   */
  fetchUserDepositsFromPool: async (userAddress, poolAPY = 5.0) => {
    try {
      const suiClient = getSuiClient();
      
      console.log('🔍 Fetching deposits from pool for user:', userAddress);
      
      // Fetch the lending pool object
      const poolObject = await suiClient.getObject({
        id: LENDING_POOL_OBJECT_ID,
        options: {
          showContent: true,
        },
      });

      if (!poolObject.data || !poolObject.data.content) {
        console.warn('⚠️ Pool object not found');
        return {
          totalDeposited: 0,
          totalWithdrawn: 0,
          netDeposited: 0,
          depositCount: 0,
          withdrawCount: 0,
          yieldEarned: 0,
          firstDepositTimestamp: null,
          lastActivityTimestamp: null,
        };
      }

      const fields = poolObject.data.content.fields;
      const userPositions = fields.user_positions;

      console.log('📦 Pool fields:', fields);
      console.log('👥 User positions table ID:', userPositions?.fields?.id?.id);

      // Try to get user position from the dynamic field
      if (userPositions?.fields?.id?.id) {
        try {
          const userPosition = await suiClient.getDynamicFieldObject({
            parentId: userPositions.fields.id.id,
            name: {
              type: 'address',
              value: userAddress,
            },
          });

          console.log('📊 User position:', userPosition);

          if (userPosition.data && userPosition.data.content) {
            const positionFields = userPosition.data.content.fields.value.fields;
            const principal = mistToSui(positionFields.principal || 0);
            const accumulatedYield = mistToSui(positionFields.accumulated_yield || 0);
            const lastUpdateTime = parseInt(positionFields.last_update_time || 0);

            console.log('💰 Principal:', principal, 'SUI');
            console.log('📈 Accumulated Yield:', accumulatedYield, 'SUI');

            return {
              totalDeposited: principal,
              totalWithdrawn: 0, // Not tracked in position
              netDeposited: principal,
              depositCount: principal > 0 ? 1 : 0,
              withdrawCount: 0,
              yieldEarned: accumulatedYield,
              firstDepositTimestamp: lastUpdateTime,
              lastActivityTimestamp: lastUpdateTime,
            };
          }
        } catch (error) {
          console.warn('⚠️ User has no position in pool:', error.message);
        }
      }

      // If no position found, return zeros
      return {
        totalDeposited: 0,
        totalWithdrawn: 0,
        netDeposited: 0,
        depositCount: 0,
        withdrawCount: 0,
        yieldEarned: 0,
        firstDepositTimestamp: null,
        lastActivityTimestamp: null,
      };
    } catch (error) {
      console.error('❌ Error fetching deposits from pool:', error);
      return {
        totalDeposited: 0,
        totalWithdrawn: 0,
        netDeposited: 0,
        depositCount: 0,
        withdrawCount: 0,
        yieldEarned: 0,
        firstDepositTimestamp: null,
        lastActivityTimestamp: null,
      };
    }
  },

  /**
   * Fetch user's deposit and withdrawal events to calculate net deposited amount and yield
   * @param {string} userAddress - User's Sui address
   * @param {number} poolAPY - Current pool APY
   * @returns {Promise<Object>} User deposit data
   */
  fetchUserDeposits: async (userAddress, poolAPY = 5.0) => {
    // Try pool-based approach first (more reliable)
    const poolData = await UserDepositService.fetchUserDepositsFromPool(userAddress, poolAPY);
    
    // If pool data shows deposits, return it
    if (poolData.netDeposited > 0) {
      console.log('✅ Using pool-based deposit data');
      return poolData;
    }
    
    // Otherwise fall back to event-based approach
    console.log('🔄 Falling back to event-based deposit tracking');
    
    try {
      const suiClient = getSuiClient();
      
      console.log('🔍 Fetching deposits for user:', userAddress);
      console.log('📦 Package ID:', SUI_PACKAGE_ID);
      
      // Query deposit events with error handling
      let depositEvents = { data: [] };
      try {
        const eventType = `${SUI_PACKAGE_ID}::lending_logic::DepositEvent`;
        console.log('🔍 Querying deposit events with type:', eventType);
        
        depositEvents = await suiClient.queryEvents({
          query: {
            MoveEventType: eventType,
          },
          limit: 1000,
        });
        
        console.log('✅ Found deposit events:', depositEvents.data?.length || 0);
        if (depositEvents.data && depositEvents.data.length > 0) {
          console.log('📋 Sample deposit event:', depositEvents.data[0]);
        }
      } catch (eventError) {
        // Gracefully handle missing events or transaction digest errors
        console.warn('⚠️ Could not fetch deposit events:', eventError.message);
      }

      // Query withdraw events with error handling
      let withdrawEvents = { data: [] };
      try {
        const eventType = `${SUI_PACKAGE_ID}::lending_logic::WithdrawEvent`;
        console.log('🔍 Querying withdraw events with type:', eventType);
        
        withdrawEvents = await suiClient.queryEvents({
          query: {
            MoveEventType: eventType,
          },
          limit: 1000,
        });
        
        console.log('✅ Found withdraw events:', withdrawEvents.data?.length || 0);
      } catch (eventError) {
        // Gracefully handle missing events or transaction digest errors
        console.warn('⚠️ Could not fetch withdraw events:', eventError.message);
      }

      // Calculate user's deposits
      let totalDeposited = 0;
      let totalWithdrawn = 0;
      let depositCount = 0;
      let withdrawCount = 0;
      let firstDepositTimestamp = null;
      let lastActivityTimestamp = null;

      // Sum deposits for this user
      if (depositEvents.data) {
        depositEvents.data.forEach(event => {
          const parsedEvent = event.parsedJson;
          if (parsedEvent && parsedEvent.depositor === userAddress) {
            const amount = mistToSui(parsedEvent.amount);
            console.log('💰 Found user deposit:', amount, 'SUI');
            totalDeposited += amount;
            depositCount++;
            const timestamp = event.timestampMs || Date.now();
            if (!firstDepositTimestamp || timestamp < firstDepositTimestamp) {
              firstDepositTimestamp = timestamp;
            }
            if (!lastActivityTimestamp || timestamp > lastActivityTimestamp) {
              lastActivityTimestamp = timestamp;
            }
          }
        });
      }

      console.log('📊 Total deposited for user:', totalDeposited, 'SUI');
      console.log('📊 Deposit count:', depositCount);

      // Sum withdrawals for this user
      if (withdrawEvents.data) {
        withdrawEvents.data.forEach(event => {
          const parsedEvent = event.parsedJson;
          if (parsedEvent && parsedEvent.withdrawer === userAddress) {
            const amount = mistToSui(parsedEvent.amount);
            console.log('💸 Found user withdrawal:', amount, 'SUI');
            totalWithdrawn += amount;
            withdrawCount++;
            const timestamp = event.timestampMs || Date.now();
            if (!lastActivityTimestamp || timestamp > lastActivityTimestamp) {
              lastActivityTimestamp = timestamp;
            }
          }
        });
      }

      const netDeposited = totalDeposited - totalWithdrawn;
      
      console.log('📊 Net deposited:', netDeposited, 'SUI');

      // Calculate yield earned based on time-weighted deposits
      let yieldEarned = 0;
      if (netDeposited > 0 && firstDepositTimestamp) {
        const daysSinceFirstDeposit = (Date.now() - firstDepositTimestamp) / (1000 * 60 * 60 * 24);
        // Simple yield calculation: principal * APY * (days / 365)
        yieldEarned = (netDeposited * poolAPY / 100) * (daysSinceFirstDeposit / 365);
      }

      const result = {
        totalDeposited,
        totalWithdrawn,
        netDeposited,
        depositCount,
        withdrawCount,
        yieldEarned: Math.max(0, yieldEarned), // Ensure non-negative
        firstDepositTimestamp,
        lastActivityTimestamp,
      };
      
      console.log('✅ Final deposit data:', result);
      return result;
    } catch (error) {
      console.error('Error fetching user deposits:', error);
      return {
        totalDeposited: 0,
        totalWithdrawn: 0,
        netDeposited: 0,
        depositCount: 0,
        withdrawCount: 0,
        yieldEarned: 0,
        firstDepositTimestamp: null,
        lastActivityTimestamp: null,
      };
    }
  },
};

/**
 * User Loan Service - Track user loans via events
 */
export const UserLoanService = {
  /**
   * Fetch user's loan data directly from credit profile
   * This is more reliable than events as it reads the current on-chain state
   * @param {string} userAddress - User's Sui address
   * @returns {Promise<Object>} User loan data
   */
  fetchUserLoansFromProfile: async (userAddress) => {
    try {
      console.log('🔍 Fetching loans from credit profile for user:', userAddress);
      
      // Fetch the credit profile
      const profile = await CreditProfileDataService.fetchCreditProfile(userAddress);
      
      if (!profile) {
        console.warn('⚠️ No credit profile found for user');
        return {
          totalBorrowed: 0,
          totalRepaid: 0,
          outstandingDebt: 0,
          estimatedInterest: 0,
          totalOwed: 0,
          borrowCount: 0,
          repayCount: 0,
          hasActiveLoan: false,
          lastBorrowTimestamp: null,
          lastRepayTimestamp: null,
          interestRate: 5.0,
        };
      }

      const totalBorrowed = profile.totalBorrowed || 0;
      const totalRepaid = profile.totalRepaid || 0;
      const borrowCount = profile.loanCount || 0;
      const outstandingDebt = profile.debt || 0; // Current debt from profile
      const hasActiveLoan = outstandingDebt > 0.001;

      console.log('💰 Total Borrowed:', totalBorrowed, 'SUI');
      console.log('💸 Total Repaid:', totalRepaid, 'SUI');
      console.log('📊 Outstanding Debt:', outstandingDebt, 'SUI');
      console.log('📈 Loan Count:', borrowCount);

      // Calculate estimated interest (5% APR for simplicity)
      const interestRate = 5.0;
      let estimatedInterest = 0;
      if (hasActiveLoan && profile.lastLoanTime) {
        const daysSinceBorrow = (Date.now() - profile.lastLoanTime) / (1000 * 60 * 60 * 24);
        estimatedInterest = (outstandingDebt * interestRate / 100) * (daysSinceBorrow / 365);
      }

      const result = {
        totalBorrowed,
        totalRepaid,
        outstandingDebt,
        estimatedInterest,
        totalOwed: outstandingDebt + estimatedInterest,
        borrowCount,
        repayCount: 0, // Not tracked separately in profile
        hasActiveLoan,
        lastBorrowTimestamp: profile.lastLoanTime || null,
        lastRepayTimestamp: profile.lastActivityTime || null,
        interestRate,
      };

      console.log('✅ Final loan data:', result);
      return result;
    } catch (error) {
      console.error('❌ Error fetching loans from profile:', error);
      return {
        totalBorrowed: 0,
        totalRepaid: 0,
        outstandingDebt: 0,
        estimatedInterest: 0,
        totalOwed: 0,
        borrowCount: 0,
        repayCount: 0,
        hasActiveLoan: false,
        lastBorrowTimestamp: null,
        lastRepayTimestamp: null,
        interestRate: 5.0,
      };
    }
  },

  /**
   * Fetch user's borrow and repay events to calculate active loans
   * @param {string} userAddress - User's Sui address
   * @returns {Promise<Object>} User loan data
   */
  fetchUserLoans: async (userAddress) => {
    // Try profile-based approach first (more reliable)
    const profileData = await UserLoanService.fetchUserLoansFromProfile(userAddress);
    
    // If profile data shows loans, return it
    if (profileData.totalBorrowed > 0 || profileData.borrowCount > 0) {
      console.log('✅ Using profile-based loan data');
      return profileData;
    }
    
    // Otherwise fall back to event-based approach
    console.log('🔄 Falling back to event-based loan tracking');
    
    try {
      const suiClient = getSuiClient();
      
      console.log('🔍 Fetching loans for user:', userAddress);
      console.log('📦 Package ID:', SUI_PACKAGE_ID);
      
      // Query borrow events with error handling
      let borrowEvents = { data: [] };
      try {
        const eventType = `${SUI_PACKAGE_ID}::lending_logic::BorrowEvent`;
        console.log('🔍 Querying borrow events with type:', eventType);
        
        borrowEvents = await suiClient.queryEvents({
          query: {
            MoveEventType: eventType,
          },
          limit: 1000,
        });
        
        console.log('✅ Found borrow events:', borrowEvents.data?.length || 0);
      } catch (eventError) {
        // Gracefully handle missing events or transaction digest errors
        console.warn('⚠️ Could not fetch borrow events:', eventError.message);
      }

      // Query repay events with error handling
      let repayEvents = { data: [] };
      try {
        const eventType = `${SUI_PACKAGE_ID}::lending_logic::RepayEvent`;
        console.log('🔍 Querying repay events with type:', eventType);
        
        repayEvents = await suiClient.queryEvents({
          query: {
            MoveEventType: eventType,
          },
          limit: 1000,
        });
        
        console.log('✅ Found repay events:', repayEvents.data?.length || 0);
      } catch (eventError) {
        // Gracefully handle missing events or transaction digest errors
        console.warn('⚠️ Could not fetch repay events:', eventError.message);
      }

      // Calculate user's loans
      let totalBorrowed = 0;
      let totalRepaid = 0;
      let borrowCount = 0;
      let repayCount = 0;
      let lastBorrowTimestamp = null;
      let lastRepayTimestamp = null;

      // Sum borrows for this user
      if (borrowEvents.data) {
        borrowEvents.data.forEach(event => {
          const parsedEvent = event.parsedJson;
          if (parsedEvent && parsedEvent.borrower === userAddress) {
            const amount = mistToSui(parsedEvent.amount);
            console.log('💰 Found user borrow:', amount, 'SUI');
            totalBorrowed += amount;
            borrowCount++;
            if (!lastBorrowTimestamp || event.timestampMs > lastBorrowTimestamp) {
              lastBorrowTimestamp = event.timestampMs;
            }
          }
        });
      }

      console.log('📊 Total borrowed for user:', totalBorrowed, 'SUI');
      console.log('📊 Borrow count:', borrowCount);

      // Sum repayments for this user
      if (repayEvents.data) {
        repayEvents.data.forEach(event => {
          const parsedEvent = event.parsedJson;
          if (parsedEvent && parsedEvent.borrower === userAddress) {
            const amount = mistToSui(parsedEvent.amount);
            console.log('💸 Found user repayment:', amount, 'SUI');
            totalRepaid += amount;
            repayCount++;
            if (!lastRepayTimestamp || event.timestampMs > lastRepayTimestamp) {
              lastRepayTimestamp = event.timestampMs;
            }
          }
        });
      }

      console.log('📊 Total repaid for user:', totalRepaid, 'SUI');

      const outstandingDebt = totalBorrowed - totalRepaid;
      const hasActiveLoan = outstandingDebt > 0.001; // Consider loans > 0.001 SUI as active
      
      console.log('📊 Outstanding debt:', outstandingDebt, 'SUI');

      // Calculate estimated interest (5% APR for simplicity)
      const interestRate = 5.0;
      let estimatedInterest = 0;
      if (hasActiveLoan && lastBorrowTimestamp) {
        const daysSinceBorrow = (Date.now() - lastBorrowTimestamp) / (1000 * 60 * 60 * 24);
        estimatedInterest = (outstandingDebt * interestRate / 100) * (daysSinceBorrow / 365);
      }

      const result = {
        totalBorrowed,
        totalRepaid,
        outstandingDebt,
        estimatedInterest,
        totalOwed: outstandingDebt + estimatedInterest,
        borrowCount,
        repayCount,
        hasActiveLoan,
        lastBorrowTimestamp,
        lastRepayTimestamp,
        interestRate,
      };
      
      console.log('✅ Final loan data from events:', result);
      return result;
    } catch (error) {
      console.error('Error fetching user loans:', error);
      return {
        totalBorrowed: 0,
        totalRepaid: 0,
        outstandingDebt: 0,
        estimatedInterest: 0,
        totalOwed: 0,
        borrowCount: 0,
        repayCount: 0,
        hasActiveLoan: false,
        lastBorrowTimestamp: null,
        lastRepayTimestamp: null,
        interestRate: 5.0,
      };
    }
  },
};

/**
 * Risk Pool Data Service
 */
export const RiskPoolDataService = {
  /**
   * Fetch risk pool data
   * @param {string} poolObjectId - Risk pool object ID
   * @returns {Promise<Object>} Risk pool data
   */
  fetchRiskPoolData: async (poolObjectId) => {
    try {
      const suiClient = getSuiClient();
      const poolObject = await suiClient.getObject({
        id: poolObjectId,
        options: {
          showContent: true,
          showType: true,
        },
      });

      if (!poolObject.data) {
        return null;
      }

      const fields = poolObject.data.content?.fields;
      if (!fields) {
        return null;
      }

      return {
        objectId: poolObject.data.objectId,
        totalLiquidity: mistToSui(fields.total_liquidity || 0),
        riskLevel: parseInt(fields.risk_level || 3),
        balance: mistToSui(fields.balance || 0),
      };
    } catch (error) {
      console.error('Error fetching risk pool data:', error);
      return null;
    }
  },

  /**
   * Fetch multiple risk pools
   * @param {Array} poolIds - Array of pool object IDs with metadata
   * @returns {Promise<Array>} Array of risk pool data
   */
  fetchMultipleRiskPools: async (poolIds) => {
    try {
      const suiClient = getSuiClient();
      
      const poolPromises = poolIds.map(async (poolInfo) => {
        try {
          const poolObject = await suiClient.getObject({
            id: poolInfo.id,
            options: {
              showContent: true,
              showType: true,
            },
          });

          if (!poolObject.data) {
            return null;
          }

          const fields = poolObject.data.content?.fields;
          if (!fields) {
            return null;
          }

          return {
            objectId: poolObject.data.objectId,
            name: poolInfo.name,
            riskLevel: parseInt(fields.risk_level || 3),
            totalLiquidity: mistToSui(fields.total_liquidity || 0),
            balance: mistToSui(fields.balance || 0),
            minReputation: poolInfo.minReputation,
          };
        } catch (error) {
          console.error(`Error fetching risk pool ${poolInfo.id}:`, error);
          return null;
        }
      });

      const pools = await Promise.all(poolPromises);
      return pools.filter(p => p !== null);
    } catch (error) {
      console.error('Error fetching multiple risk pools:', error);
      return [];
    }
  },
};

/**
 * Mudarabah Pool Data Service
 */
export const MudarabahPoolDataService = {
  /**
   * Fetch Mudarabah pool data
   * @param {string} poolObjectId - Mudarabah pool object ID
   * @returns {Promise<Object>} Mudarabah pool data
   */
  fetchMudarabahPoolData: async (poolObjectId) => {
    try {
      const suiClient = getSuiClient();
      const poolObject = await suiClient.getObject({
        id: poolObjectId,
        options: {
          showContent: true,
          showType: true,
        },
      });

      if (!poolObject.data) {
        return null;
      }

      const fields = poolObject.data.content?.fields;
      if (!fields) {
        return null;
      }

      const poolCapital = mistToSui(fields.pool_capital || 0);
      const currentBalance = mistToSui(fields.balance || 0);
      const profit = Math.max(0, currentBalance - poolCapital);

      return {
        objectId: poolObject.data.objectId,
        poolCapital,
        currentBalance,
        profit,
        profitRatio: parseInt(fields.profit_ratio || 7000), // basis points
        manager: fields.manager,
      };
    } catch (error) {
      console.error('Error fetching Mudarabah pool data:', error);
      return null;
    }
  },

  /**
   * Fetch profit distribution events for a pool
   * @param {string} poolObjectId - Mudarabah pool object ID
   * @returns {Promise<Array>} Array of distribution events
   */
  fetchDistributionHistory: async (poolObjectId) => {
    try {
      const suiClient = getSuiClient();
      
      let distributionEvents = { data: [] };
      try {
        distributionEvents = await suiClient.queryEvents({
          query: {
            MoveEventType: `${SUI_PACKAGE_ID}::mudarabah::ProfitDistributedEvent`,
          },
          limit: 100,
        });
      } catch (eventError) {
        console.warn('Could not fetch distribution events:', eventError.message);
      }

      // Filter events for this pool
      const poolEvents = (distributionEvents.data || [])
        .filter(event => event.parsedJson?.pool_id === poolObjectId)
        .map(event => ({
          timestamp: event.timestampMs,
          investorShare: mistToSui(event.parsedJson?.investor_share || 0),
          managerShare: mistToSui(event.parsedJson?.manager_share || 0),
          totalProfit: mistToSui(event.parsedJson?.total_profit || 0),
          txDigest: event.id?.txDigest,
        }));

      return poolEvents;
    } catch (error) {
      console.error('Error fetching distribution history:', error);
      return [];
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
  CollateralVaultDataService,
  DePINDataService,
  RiskPoolDataService,
  MudarabahPoolDataService,
  TransactionDataService,
  BalanceService,
  UserDepositService,
  UserLoanService,
  DataUtils,
  getSuiClient,
};
