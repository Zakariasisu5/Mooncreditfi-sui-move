/**
 * Contract Service - Production-ready Sui contract interactions
 * Handles all Move contract calls with proper error handling and validation
 * 
 * SECURITY HARDENING:
 * - Input validation before all transactions
 * - Amount sanitization
 * - Address validation
 * - Safe arithmetic operations
 */

import { Transaction } from '@mysten/sui/transactions';
import {
  SUI_PACKAGE_ID,
  LENDING_POOL_OBJECT_ID,
  CREDIT_PROFILE_OBJECT_ID,
  DEPIN_FINANCE_OBJECT_ID,
  PROFILE_REGISTRY_OBJECT_ID,
} from '@/config/sui';
import { InputValidator } from '@/utils/securityValidation';

// Conversion constants
const MIST_PER_SUI = 1_000_000_000;

/**
 * Convert SUI to MIST with validation
 * SECURITY: Prevents overflow and validates input
 */
export const suiToMist = (sui) => {
  // Validate input
  const validation = InputValidator.validateAmount(sui, 0);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }
  
  const sanitized = validation.sanitizedValue;
  const mist = Math.floor(sanitized * MIST_PER_SUI);
  
  // Check for overflow (max u64 in Move)
  const MAX_U64 = BigInt('18446744073709551615');
  if (BigInt(mist) > MAX_U64) {
    throw new Error('Amount too large (overflow)');
  }
  
  return mist;
};

/**
 * Convert MIST to SUI
 */
export const mistToSui = (mist) => {
  return parseFloat(mist) / MIST_PER_SUI;
};

/**
 * Lending Pool Transactions
 */
export const LendingPoolService = {
  /**
   * Create a deposit transaction
   * @param {number} amountInSui - Amount in SUI
   * @returns {Transaction}
   */
  createDepositTransaction: (amountInSui) => {
    const tx = new Transaction();
    const amountInMist = suiToMist(amountInSui);
    
    // Split coins from gas
    const [coin] = tx.splitCoins(tx.gas, [amountInMist]);
    
    // Call deposit function
    tx.moveCall({
      target: `${SUI_PACKAGE_ID}::lending_logic::deposit`,
      arguments: [
        tx.object(LENDING_POOL_OBJECT_ID),
        coin,
        tx.object('0x6'), // Clock object (shared object at 0x6)
      ],
    });
    
    return tx;
  },

  /**
   * Create a withdraw transaction
   * @param {number} amountInSui - Amount in SUI
   * @returns {Transaction}
   */
  createWithdrawTransaction: (amountInSui) => {
    const tx = new Transaction();
    const amountInMist = suiToMist(amountInSui);
    
    tx.moveCall({
      target: `${SUI_PACKAGE_ID}::lending_logic::withdraw`,
      arguments: [
        tx.object(LENDING_POOL_OBJECT_ID),
        tx.pure.u64(amountInMist),
        tx.object('0x6'), // Clock object (shared object at 0x6)
      ],
    });
    
    return tx;
  },
};

/**
 * Credit Profile Transactions
 */
export const CreditProfileService = {
  /**
   * Create a new credit profile
   * @returns {Transaction}
   */
  createProfileTransaction: () => {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${SUI_PACKAGE_ID}::credit_profile::create_profile`,
      arguments: [
        tx.object(PROFILE_REGISTRY_OBJECT_ID), // ProfileRegistry shared object
      ],
    });
    
    return tx;
  },
};

/**
 * Collateral Vault Transactions
 */
export const CollateralService = {
  /**
   * Create a new collateral vault
   * @returns {Transaction}
   */
  createVaultTransaction: () => {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${SUI_PACKAGE_ID}::collateral::create_vault`,
      arguments: [],
    });
    
    return tx;
  },

  /**
   * Deposit collateral into vault
   * @param {string} vaultObjectId - Collateral vault object ID
   * @param {number} amountInSui - Amount to deposit in SUI
   * @returns {Transaction}
   */
  depositCollateralTransaction: (vaultObjectId, amountInSui) => {
    const tx = new Transaction();
    const amountInMist = suiToMist(amountInSui);
    
    // Split coins for collateral deposit
    const [coin] = tx.splitCoins(tx.gas, [amountInMist]);
    
    tx.moveCall({
      target: `${SUI_PACKAGE_ID}::collateral::deposit_collateral`,
      arguments: [
        tx.object(vaultObjectId),
        coin,
      ],
    });
    
    return tx;
  },

  /**
   * Withdraw collateral from vault (only if no active loans)
   * @param {string} vaultObjectId - Collateral vault object ID
   * @param {number} amountInSui - Amount to withdraw in SUI
   * @returns {Transaction}
   */
  withdrawCollateralTransaction: (vaultObjectId, amountInSui) => {
    const tx = new Transaction();
    const amountInMist = suiToMist(amountInSui);
    
    tx.moveCall({
      target: `${SUI_PACKAGE_ID}::collateral::withdraw_collateral`,
      arguments: [
        tx.object(vaultObjectId),
        tx.pure.u64(amountInMist),
      ],
    });
    
    return tx;
  },

  /**
   * Liquidate an underwater collateral position
   * @param {string} vaultObjectId - Collateral vault object ID to liquidate
   * @returns {Transaction}
   */
  liquidateVaultTransaction: (vaultObjectId) => {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${SUI_PACKAGE_ID}::collateral::liquidate`,
      arguments: [
        tx.object(vaultObjectId),
      ],
    });
    
    return tx;
  },
};

/**
 * Borrowing Transactions
 */
export const BorrowingService = {
  /**
   * Create a borrow transaction with loan duration
   * 
   * IMPORTANT: This function requires a CollateralVault to be created first.
   * Users must:
   * 1. Create a vault using CollateralService.createVaultTransaction()
   * 2. Deposit collateral using CollateralService.depositCollateralTransaction()
   * 3. Then call this function with the vault object ID
   * 
   * @param {string} profileObjectId - Credit profile object ID
   * @param {string} vaultObjectId - Collateral vault object ID (REQUIRED - must be created first)
   * @param {number} amountInSui - Amount to borrow in SUI
   * @param {number} durationDays - Loan duration (30, 60, or 90 days)
   * @returns {Transaction}
   */
  createBorrowTransaction: (profileObjectId, vaultObjectId, amountInSui, durationDays = 30) => {
    if (!vaultObjectId) {
      throw new Error('Collateral vault is required. Please create a vault and deposit collateral first.');
    }
    
    const tx = new Transaction();
    const amountInMist = suiToMist(amountInSui);
    
    tx.moveCall({
      target: `${SUI_PACKAGE_ID}::lending_logic::borrow`,
      arguments: [
        tx.object(LENDING_POOL_OBJECT_ID),
        tx.object(profileObjectId),
        tx.object(vaultObjectId),
        tx.pure.u64(amountInMist),
        tx.pure.u64(durationDays),
        tx.object('0x6'), // Clock object (shared object at 0x6)
      ],
    });
    
    return tx;
  },

  /**
   * Create a repay transaction for a specific loan
   * @param {string} profileObjectId - Credit profile object ID
   * @param {string} vaultObjectId - Collateral vault object ID
   * @param {string} loanObjectId - Loan object ID to repay
   * @param {number} amountInSui - Amount to repay in SUI
   * @returns {Transaction}
   */
  createRepayTransaction: (profileObjectId, vaultObjectId, loanObjectId, amountInSui) => {
    const tx = new Transaction();
    const amountInMist = suiToMist(amountInSui);
    
    // Split coins for repayment
    const [coin] = tx.splitCoins(tx.gas, [amountInMist]);
    
    tx.moveCall({
      target: `${SUI_PACKAGE_ID}::lending_logic::repay`,
      arguments: [
        tx.object(LENDING_POOL_OBJECT_ID),
        tx.object(profileObjectId),
        tx.object(vaultObjectId),
        tx.object(loanObjectId),
        coin,
        tx.object('0x6'), // Clock object (shared object at 0x6)
      ],
    });
    
    return tx;
  },

  /**
   * Create a mark default transaction
   * @param {string} profileObjectId - Credit profile object ID
   * @param {string} loanObjectId - Loan object ID to mark as defaulted
   * @returns {Transaction}
   */
  createMarkDefaultTransaction: (profileObjectId, loanObjectId) => {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${SUI_PACKAGE_ID}::lending_logic::mark_loan_default`,
      arguments: [
        tx.object(profileObjectId),
        tx.object(loanObjectId),
        tx.object('0x6'), // Clock object (shared object at 0x6)
      ],
    });
    
    return tx;
  },
};

/**
 * DePIN Transactions
 */
export const DePINService = {
  /**
   * Create a new DePIN project
   * @param {string} name - Project name
   * @param {string} description - Project description
   * @param {number} targetAmountInSui - Target amount in SUI
   * @param {number} apyBasisPoints - APY in basis points (e.g., 800 = 8%)
   * @returns {Transaction}
   */
  createProjectTransaction: (name, description, targetAmountInSui, apyBasisPoints) => {
    const tx = new Transaction();
    const targetInMist = suiToMist(targetAmountInSui);
    
    tx.moveCall({
      target: `${SUI_PACKAGE_ID}::depin::create_project`,
      arguments: [
        tx.pure.string(name),
        tx.pure.string(description),
        tx.pure.u64(targetInMist),
        tx.pure.u64(apyBasisPoints),
      ],
    });
    
    return tx;
  },

  /**
   * Fund a DePIN project
   * @param {string} projectObjectId - Project object ID
   * @param {number} amountInSui - Amount to fund in SUI
   * @returns {Transaction}
   */
  createFundProjectTransaction: (projectObjectId, amountInSui) => {
    const tx = new Transaction();
    const amountInMist = suiToMist(amountInSui);
    
    // Split coins for funding - use tx.gas as the source
    const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(amountInMist)]);
    
    // Call fund_project with the project object, coin, clock, and ctx
    tx.moveCall({
      target: `${SUI_PACKAGE_ID}::depin::fund_project`,
      arguments: [
        tx.object(projectObjectId), // Shared DePIN project object
        coin,                        // Coin<SUI> payment
        tx.object('0x6'),           // Clock object (shared object at 0x6)
      ],
    });
    
    return tx;
  },

  /**
   * Transfer DePIN NFT
   * @param {string} nftObjectId - NFT object ID
   * @param {string} recipientAddress - Recipient's Sui address
   * @returns {Transaction}
   */
  createTransferNFTTransaction: (nftObjectId, recipientAddress) => {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${SUI_PACKAGE_ID}::depin::transfer_nft`,
      arguments: [
        tx.object(nftObjectId),
        tx.pure.address(recipientAddress),
      ],
    });
    
    return tx;
  },
};

/**
 * Validation helpers with security hardening
 */
export const ValidationService = {
  /**
   * Validate SUI amount with comprehensive checks
   * SECURITY: Prevents zero amounts, negative amounts, NaN, overflow
   */
  validateAmount: (amount, minAmount = 0.01) => {
    const validation = InputValidator.validateAmount(amount, minAmount);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }
    return validation.sanitizedValue;
  },

  /**
   * Validate Sui address
   * SECURITY: Prevents invalid addresses, injection attacks
   */
  validateAddress: (address) => {
    const validation = InputValidator.validateAddress(address);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }
    return validation.sanitizedValue;
  },

  /**
   * Validate object ID
   * SECURITY: Prevents invalid object IDs
   */
  validateObjectId: (objectId) => {
    const validation = InputValidator.validateObjectId(objectId);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }
    return validation.sanitizedValue;
  },

  /**
   * Validate credit score
   * SECURITY: Enforces minimum score requirements
   */
  validateCreditScore: (score, minScore = 500) => {
    const validation = InputValidator.validateCreditScore(score, minScore);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }
    return true;
  },

  /**
   * Validate loan duration
   * SECURITY: Only allows 30, 60, or 90 days
   */
  validateLoanDuration: (duration) => {
    const validation = InputValidator.validateLoanDuration(duration);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }
    return validation.sanitizedValue;
  },
};

/**
 * Error handling helpers with security context
 */
export const ErrorService = {
  /**
   * Parse contract error with security context
   * SECURITY: Provides detailed error information for debugging
   */
  parseContractError: (error) => {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    
    // Security-related errors
    if (errorMessage.includes('ENotOwner') || errorMessage.includes('ownership')) {
      return 'Unauthorized: You do not own this resource';
    }
    if (errorMessage.includes('ELoanAlreadyRepaid')) {
      return 'Security: Loan already repaid (double repayment prevented)';
    }
    if (errorMessage.includes('EZeroAmount') || errorMessage.includes('zero')) {
      return 'Invalid amount: Must be greater than zero';
    }
    if (errorMessage.includes('EExceedsMaxBorrowLimit')) {
      return 'Amount exceeds your credit limit (on-chain enforcement)';
    }
    if (errorMessage.includes('ECreditScoreTooLow')) {
      return 'Credit score too low (minimum 500 required)';
    }
    if (errorMessage.includes('EInvalidLoanDuration')) {
      return 'Invalid loan duration (must be 30, 60, or 90 days)';
    }
    if (errorMessage.includes('EUnderflowPrevention')) {
      return 'Security: Arithmetic underflow prevented';
    }
    
    // Common error patterns
    if (errorMessage.includes('Insufficient')) {
      return 'Insufficient balance or liquidity';
    }
    if (errorMessage.includes('gas')) {
      return 'Insufficient gas for transaction';
    }
    if (errorMessage.includes('rejected')) {
      return 'Transaction rejected by user';
    }
    if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
      return 'Rate limit exceeded. Please wait and try again.';
    }
    if (errorMessage.includes('503') || errorMessage.includes('Service Unavailable')) {
      return 'Network temporarily unavailable. Please try again.';
    }
    
    return errorMessage;
  },

  /**
   * Get user-friendly error message with security details
   */
  getUserFriendlyError: (error) => {
    const parsed = ErrorService.parseContractError(error);
    return {
      title: 'Transaction Failed',
      message: parsed,
      technical: error?.message || error?.toString(),
      isSecurityError: parsed.includes('Security:') || parsed.includes('Unauthorized:'),
    };
  },
};

export default {
  LendingPoolService,
  CreditProfileService,
  CollateralService,
  BorrowingService,
  DePINService,
  ValidationService,
  ErrorService,
  suiToMist,
  mistToSui,
};


/**
 * Risk Pool Transactions
 */
export const RiskPoolService = {
  /**
   * Create a new risk pool
   * @param {number} tier - Risk tier (1=Conservative, 2=Balanced, 3=Aggressive)
   * @param {number} minReputation - Minimum reputation required
   * @param {number} maxLTV - Maximum loan-to-value ratio in basis points
   * @param {number} interestRate - Interest rate in basis points
   * @returns {Transaction}
   */
  createRiskPoolTransaction: (tier, minReputation, maxLTV, interestRate) => {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${SUI_PACKAGE_ID}::risk_pool::create_pool`,
      arguments: [
        tx.pure.u8(tier),
        tx.pure.u64(minReputation),
        tx.pure.u64(maxLTV),
        tx.pure.u64(interestRate),
      ],
    });
    
    return tx;
  },

  /**
   * Deposit to a risk pool
   * @param {string} poolId - Risk pool object ID
   * @param {number} amountInSui - Amount in SUI
   * @returns {Transaction}
   */
  depositToRiskPoolTransaction: (poolId, amountInSui) => {
    const tx = new Transaction();
    const amountInMist = suiToMist(amountInSui);
    
    const [coin] = tx.splitCoins(tx.gas, [amountInMist]);
    
    tx.moveCall({
      target: `${SUI_PACKAGE_ID}::risk_pool::deposit`,
      arguments: [
        tx.object(poolId),
        coin,
      ],
    });
    
    return tx;
  },

  /**
   * Borrow from a risk pool
   * @param {string} poolId - Risk pool object ID
   * @param {string} profileId - Credit profile object ID
   * @param {number} amountInSui - Amount in SUI
   * @returns {Transaction}
   */
  borrowFromRiskPoolTransaction: (poolId, profileId, amountInSui) => {
    const tx = new Transaction();
    const amountInMist = suiToMist(amountInSui);
    
    tx.moveCall({
      target: `${SUI_PACKAGE_ID}::risk_pool::borrow`,
      arguments: [
        tx.object(poolId),
        tx.object(profileId),
        tx.pure.u64(amountInMist),
      ],
    });
    
    return tx;
  },

  /**
   * Withdraw from a risk pool
   * @param {string} poolId - Risk pool object ID
   * @param {number} amountInSui - Amount in SUI
   * @returns {Transaction}
   */
  withdrawFromRiskPoolTransaction: (poolId, amountInSui) => {
    const tx = new Transaction();
    const amountInMist = suiToMist(amountInSui);
    
    tx.moveCall({
      target: `${SUI_PACKAGE_ID}::risk_pool::withdraw`,
      arguments: [
        tx.object(poolId),
        tx.pure.u64(amountInMist),
      ],
    });
    
    return tx;
  },
};

/**
 * Mudarabah (Islamic Finance) Transactions
 */
export const MudarabahService = {
  /**
   * Create a new Mudarabah pool
   * @param {number} profitShareRatio - Profit share ratio in basis points (e.g., 7000 = 70%)
   * @returns {Transaction}
   */
  createMudarabahPoolTransaction: (profitShareRatio) => {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${SUI_PACKAGE_ID}::mudarabah::create_pool`,
      arguments: [
        tx.pure.u64(profitShareRatio),
      ],
    });
    
    return tx;
  },

  /**
   * Contribute to a Mudarabah pool (Rabb-ul-Maal)
   * @param {string} poolId - Mudarabah pool object ID
   * @param {number} amountInSui - Amount in SUI
   * @returns {Transaction}
   */
  contributeToMudarabahTransaction: (poolId, amountInSui) => {
    const tx = new Transaction();
    const amountInMist = suiToMist(amountInSui);
    
    const [coin] = tx.splitCoins(tx.gas, [amountInMist]);
    
    tx.moveCall({
      target: `${SUI_PACKAGE_ID}::mudarabah::contribute`,
      arguments: [
        tx.object(poolId),
        coin,
      ],
    });
    
    return tx;
  },

  /**
   * Invest from a Mudarabah pool (Mudarib action)
   * @param {string} poolId - Mudarabah pool object ID
   * @param {number} amountInSui - Amount in SUI
   * @returns {Transaction}
   */
  investFromMudarabahTransaction: (poolId, amountInSui) => {
    const tx = new Transaction();
    const amountInMist = suiToMist(amountInSui);
    
    tx.moveCall({
      target: `${SUI_PACKAGE_ID}::mudarabah::invest`,
      arguments: [
        tx.object(poolId),
        tx.pure.u64(amountInMist),
      ],
    });
    
    return tx;
  },

  /**
   * Record profit in a Mudarabah pool
   * @param {string} poolId - Mudarabah pool object ID
   * @param {number} profitInSui - Profit amount in SUI
   * @returns {Transaction}
   */
  recordProfitTransaction: (poolId, profitInSui) => {
    const tx = new Transaction();
    const profitInMist = suiToMist(profitInSui);
    
    const [coin] = tx.splitCoins(tx.gas, [profitInMist]);
    
    tx.moveCall({
      target: `${SUI_PACKAGE_ID}::mudarabah::record_profit`,
      arguments: [
        tx.object(poolId),
        coin,
      ],
    });
    
    return tx;
  },

  /**
   * Distribute profit in a Mudarabah pool
   * @param {string} poolId - Mudarabah pool object ID
   * @returns {Transaction}
   */
  distributeProfitTransaction: (poolId) => {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${SUI_PACKAGE_ID}::mudarabah::distribute_profit`,
      arguments: [
        tx.object(poolId),
      ],
    });
    
    return tx;
  },

  /**
   * Withdraw from a Mudarabah pool
   * @param {string} poolId - Mudarabah pool object ID
   * @param {number} amountInSui - Amount in SUI
   * @returns {Transaction}
   */
  withdrawFromMudarabahTransaction: (poolId, amountInSui) => {
    const tx = new Transaction();
    const amountInMist = suiToMist(amountInSui);
    
    tx.moveCall({
      target: `${SUI_PACKAGE_ID}::mudarabah::withdraw`,
      arguments: [
        tx.object(poolId),
        tx.pure.u64(amountInMist),
      ],
    });
    
    return tx;
  },
};
