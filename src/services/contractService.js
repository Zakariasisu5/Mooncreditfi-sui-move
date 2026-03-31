/**
 * Contract Service - Production-ready Sui contract interactions
 * Handles all Move contract calls with proper error handling and validation
 */

import { Transaction } from '@mysten/sui/transactions';
import {
  SUI_PACKAGE_ID,
  LENDING_POOL_OBJECT_ID,
  CREDIT_PROFILE_OBJECT_ID,
  DEPIN_FINANCE_OBJECT_ID,
} from '@/config/sui';

// Conversion constants
const MIST_PER_SUI = 1_000_000_000;

/**
 * Convert SUI to MIST
 */
export const suiToMist = (sui) => {
  return Math.floor(parseFloat(sui) * MIST_PER_SUI);
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
      arguments: [],
    });
    
    return tx;
  },
};

/**
 * Borrowing Transactions
 */
export const BorrowingService = {
  /**
   * Create a borrow transaction
   * @param {string} profileObjectId - Credit profile object ID
   * @param {number} amountInSui - Amount to borrow in SUI
   * @returns {Transaction}
   */
  createBorrowTransaction: (profileObjectId, amountInSui) => {
    const tx = new Transaction();
    const amountInMist = suiToMist(amountInSui);
    
    tx.moveCall({
      target: `${SUI_PACKAGE_ID}::lending_logic::borrow`,
      arguments: [
        tx.object(LENDING_POOL_OBJECT_ID),
        tx.object(profileObjectId),
        tx.pure.u64(amountInMist),
      ],
    });
    
    return tx;
  },

  /**
   * Create a repay transaction
   * @param {string} profileObjectId - Credit profile object ID
   * @param {number} amountInSui - Amount to repay in SUI
   * @returns {Transaction}
   */
  createRepayTransaction: (profileObjectId, amountInSui) => {
    const tx = new Transaction();
    const amountInMist = suiToMist(amountInSui);
    
    // Split coins for repayment
    const [coin] = tx.splitCoins(tx.gas, [amountInMist]);
    
    tx.moveCall({
      target: `${SUI_PACKAGE_ID}::lending_logic::repay`,
      arguments: [
        tx.object(LENDING_POOL_OBJECT_ID),
        tx.object(profileObjectId),
        coin,
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
    
    // Call fund_project with the project object and coin
    tx.moveCall({
      target: `${SUI_PACKAGE_ID}::depin::fund_project`,
      arguments: [
        tx.object(projectObjectId), // Shared DePIN project object
        coin,                        // Coin<SUI> payment
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
 * Validation helpers
 */
export const ValidationService = {
  /**
   * Validate SUI amount
   */
  validateAmount: (amount, minAmount = 0.01) => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < minAmount) {
      throw new Error(`Amount must be at least ${minAmount} SUI`);
    }
    return numAmount;
  },

  /**
   * Validate Sui address
   */
  validateAddress: (address) => {
    if (!address || !address.startsWith('0x')) {
      throw new Error('Invalid Sui address');
    }
    return address;
  },

  /**
   * Validate object ID
   */
  validateObjectId: (objectId) => {
    if (!objectId || !objectId.startsWith('0x')) {
      throw new Error('Invalid object ID');
    }
    return objectId;
  },

  /**
   * Validate credit score
   */
  validateCreditScore: (score, minScore = 500) => {
    if (score < minScore) {
      throw new Error(`Credit score must be at least ${minScore} to borrow`);
    }
    return true;
  },
};

/**
 * Error handling helpers
 */
export const ErrorService = {
  /**
   * Parse contract error
   */
  parseContractError: (error) => {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    
    // Common error patterns
    if (errorMessage.includes('Insufficient')) {
      return 'Insufficient balance or liquidity';
    }
    if (errorMessage.includes('credit score')) {
      return 'Credit score too low to borrow';
    }
    if (errorMessage.includes('gas')) {
      return 'Insufficient gas for transaction';
    }
    if (errorMessage.includes('rejected')) {
      return 'Transaction rejected by user';
    }
    
    return errorMessage;
  },

  /**
   * Get user-friendly error message
   */
  getUserFriendlyError: (error) => {
    const parsed = ErrorService.parseContractError(error);
    return {
      title: 'Transaction Failed',
      message: parsed,
      technical: error?.message || error?.toString(),
    };
  },
};

export default {
  LendingPoolService,
  CreditProfileService,
  BorrowingService,
  DePINService,
  ValidationService,
  ErrorService,
  suiToMist,
  mistToSui,
};
