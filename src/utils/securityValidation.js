
/**
 * Input Validation Layer
 * Validates all user inputs before sending to blockchain
 */
export const InputValidator = {
  /**
   * Validate amount input
   * @param {any} amount - Amount to validate
   * @param {number} minAmount - Minimum allowed amount
   * @param {number} maxAmount - Maximum allowed amount (optional)
   * @returns {Object} { isValid, error, sanitizedValue }
   */
  validateAmount: (amount, minAmount = 0.01, maxAmount = null) => {
    // Check for null/undefined
    if (amount === null || amount === undefined || amount === '') {
      return {
        isValid: false,
        error: 'Amount is required',
        sanitizedValue: null,
      };
    }

    // Convert to number
    const numAmount = parseFloat(amount);

    // Check for NaN
    if (isNaN(numAmount)) {
      return {
        isValid: false,
        error: 'Amount must be a valid number',
        sanitizedValue: null,
      };
    }

    // Check for negative or zero
    if (numAmount <= 0) {
      return {
        isValid: false,
        error: 'Amount must be greater than zero',
        sanitizedValue: null,
      };
    }

    // Check minimum
    if (numAmount < minAmount) {
      return {
        isValid: false,
        error: `Amount must be at least ${minAmount} SUI`,
        sanitizedValue: null,
      };
    }

    // Check maximum if provided
    if (maxAmount !== null && numAmount > maxAmount) {
      return {
        isValid: false,
        error: `Amount cannot exceed ${maxAmount} SUI`,
        sanitizedValue: null,
      };
    }

    // Check for reasonable precision (max 9 decimals for SUI)
    const decimalPlaces = (numAmount.toString().split('.')[1] || '').length;
    if (decimalPlaces > 9) {
      return {
        isValid: false,
        error: 'Amount has too many decimal places (max 9)',
        sanitizedValue: null,
      };
    }

    return {
      isValid: true,
      error: null,
      sanitizedValue: numAmount,
    };
  },

  /**
   * Validate Sui address
   * @param {string} address - Address to validate
   * @returns {Object} { isValid, error, sanitizedValue }
   */
  validateAddress: (address) => {
    if (!address || typeof address !== 'string') {
      return {
        isValid: false,
        error: 'Address is required',
        sanitizedValue: null,
      };
    }

    // Sui addresses start with 0x and are 66 characters long (including 0x)
    if (!address.startsWith('0x')) {
      return {
        isValid: false,
        error: 'Invalid Sui address format (must start with 0x)',
        sanitizedValue: null,
      };
    }

    // Check length (64 hex chars + 0x prefix = 66)
    if (address.length !== 66) {
      return {
        isValid: false,
        error: 'Invalid Sui address length',
        sanitizedValue: null,
      };
    }

    // Check if valid hex
    const hexPattern = /^0x[0-9a-fA-F]{64}$/;
    if (!hexPattern.test(address)) {
      return {
        isValid: false,
        error: 'Invalid Sui address format',
        sanitizedValue: null,
      };
    }

    return {
      isValid: true,
      error: null,
      sanitizedValue: address.toLowerCase(), // Normalize to lowercase
    };
  },

  /**
   * Validate object ID
   * @param {string} objectId - Object ID to validate
   * @returns {Object} { isValid, error, sanitizedValue }
   */
  validateObjectId: (objectId) => {
    // Same validation as address for Sui
    return InputValidator.validateAddress(objectId);
  },

  /**
   * Validate loan duration
   * @param {any} duration - Duration in days
   * @returns {Object} { isValid, error, sanitizedValue }
   */
  validateLoanDuration: (duration) => {
    const validDurations = [30, 60, 90];
    const numDuration = parseInt(duration);

    if (isNaN(numDuration)) {
      return {
        isValid: false,
        error: 'Duration must be a number',
        sanitizedValue: null,
      };
    }

    if (!validDurations.includes(numDuration)) {
      return {
        isValid: false,
        error: 'Duration must be 30, 60, or 90 days',
        sanitizedValue: null,
      };
    }

    return {
      isValid: true,
      error: null,
      sanitizedValue: numDuration,
    };
  },

  /**
   * Validate credit score
   * @param {any} score - Credit score
   * @param {number} minScore - Minimum required score
   * @returns {Object} { isValid, error, sanitizedValue }
   */
  validateCreditScore: (score, minScore = 500) => {
    const numScore = parseInt(score);

    if (isNaN(numScore)) {
      return {
        isValid: false,
        error: 'Credit score must be a number',
        sanitizedValue: null,
      };
    }

    if (numScore < minScore) {
      return {
        isValid: false,
        error: `Credit score must be at least ${minScore}`,
        sanitizedValue: null,
      };
    }

    if (numScore < 300 || numScore > 850) {
      return {
        isValid: false,
        error: 'Credit score must be between 300 and 850',
        sanitizedValue: null,
      };
    }

    return {
      isValid: true,
      error: null,
      sanitizedValue: numScore,
    };
  },
};

/**
 * Transaction Security Layer
 * Prevents common transaction attacks
 */
export const TransactionSecurity = {
  // Track pending transactions to prevent duplicates
  pendingTransactions: new Set(),

  /**
   * Check if transaction is already pending
   * @param {string} txKey - Unique transaction key
   * @returns {boolean}
   */
  isPending: (txKey) => {
    return TransactionSecurity.pendingTransactions.has(txKey);
  },

  /**
   * Mark transaction as pending
   * @param {string} txKey - Unique transaction key
   */
  markPending: (txKey) => {
    TransactionSecurity.pendingTransactions.add(txKey);
  },

  /**
   * Mark transaction as complete
   * @param {string} txKey - Unique transaction key
   */
  markComplete: (txKey) => {
    TransactionSecurity.pendingTransactions.delete(txKey);
  },

  /**
   * Generate unique transaction key
   * @param {string} type - Transaction type
   * @param {string} address - User address
   * @param {Object} params - Transaction parameters
   * @returns {string}
   */
  generateTxKey: (type, address, params = {}) => {
    const paramsStr = JSON.stringify(params);
    return `${type}-${address}-${paramsStr}`;
  },

  /**
   * Validate transaction before submission
   * @param {string} type - Transaction type
   * @param {string} address - User address
   * @param {Object} params - Transaction parameters
   * @returns {Object} { isValid, error }
   */
  validateTransaction: (type, address, params = {}) => {
    // Check if wallet is connected
    if (!address) {
      return {
        isValid: false,
        error: 'Wallet not connected',
      };
    }

    // Validate address
    const addressValidation = InputValidator.validateAddress(address);
    if (!addressValidation.isValid) {
      return {
        isValid: false,
        error: addressValidation.error,
      };
    }

    // Check for duplicate transaction
    const txKey = TransactionSecurity.generateTxKey(type, address, params);
    if (TransactionSecurity.isPending(txKey)) {
      return {
        isValid: false,
        error: 'Transaction already in progress',
      };
    }

    return {
      isValid: true,
      error: null,
      txKey,
    };
  },
};

/**
 * Wallet Security Layer
 * Detects wallet switching and other wallet-related attacks
 */
export const WalletSecurity = {
  // Store last known wallet address
  lastKnownAddress: null,

  /**
   * Initialize wallet security
   * @param {string} address - Current wallet address
   */
  initialize: (address) => {
    WalletSecurity.lastKnownAddress = address;
  },

  /**
   * Check if wallet has switched during transaction
   * @param {string} currentAddress - Current wallet address
   * @returns {boolean}
   */
  hasWalletSwitched: (currentAddress) => {
    if (!WalletSecurity.lastKnownAddress) {
      return false;
    }
    return WalletSecurity.lastKnownAddress !== currentAddress;
  },

  /**
   * Update last known address
   * @param {string} address - New wallet address
   */
  updateAddress: (address) => {
    WalletSecurity.lastKnownAddress = address;
  },

  /**
   * Validate wallet state before transaction
   * @param {string} currentAddress - Current wallet address
   * @returns {Object} { isValid, error }
   */
  validateWalletState: (currentAddress) => {
    if (!currentAddress) {
      return {
        isValid: false,
        error: 'Wallet not connected',
      };
    }

    if (WalletSecurity.hasWalletSwitched(currentAddress)) {
      return {
        isValid: false,
        error: 'Wallet address changed during transaction. Please refresh and try again.',
      };
    }

    return {
      isValid: true,
      error: null,
    };
  },
};

/**
 * Rate Limiting Layer
 * Prevents spam transactions
 */
export const RateLimiter = {
  // Track transaction timestamps per address
  transactionHistory: new Map(),

  // Rate limit configuration
  config: {
    maxTransactionsPerMinute: 10,
    maxTransactionsPerHour: 50,
    cooldownPeriod: 1000, // 1 second between transactions
  },

  /**
   * Check if rate limit is exceeded
   * @param {string} address - User address
   * @returns {Object} { isAllowed, error, remainingTime }
   */
  checkRateLimit: (address) => {
    const now = Date.now();
    const history = RateLimiter.transactionHistory.get(address) || [];

    // Remove old entries (older than 1 hour)
    const recentHistory = history.filter(timestamp => now - timestamp < 3600000);

    // Check cooldown period
    if (recentHistory.length > 0) {
      const lastTx = recentHistory[recentHistory.length - 1];
      const timeSinceLastTx = now - lastTx;
      if (timeSinceLastTx < RateLimiter.config.cooldownPeriod) {
        return {
          isAllowed: false,
          error: 'Please wait before submitting another transaction',
          remainingTime: RateLimiter.config.cooldownPeriod - timeSinceLastTx,
        };
      }
    }

    // Check per-minute limit
    const lastMinute = recentHistory.filter(timestamp => now - timestamp < 60000);
    if (lastMinute.length >= RateLimiter.config.maxTransactionsPerMinute) {
      return {
        isAllowed: false,
        error: 'Too many transactions per minute. Please slow down.',
        remainingTime: 60000,
      };
    }

    // Check per-hour limit
    if (recentHistory.length >= RateLimiter.config.maxTransactionsPerHour) {
      return {
        isAllowed: false,
        error: 'Transaction limit reached. Please try again later.',
        remainingTime: 3600000,
      };
    }

    return {
      isAllowed: true,
      error: null,
      remainingTime: 0,
    };
  },

  /**
   * Record transaction
   * @param {string} address - User address
   */
  recordTransaction: (address) => {
    const now = Date.now();
    const history = RateLimiter.transactionHistory.get(address) || [];
    history.push(now);
    
    // Keep only last hour of history
    const recentHistory = history.filter(timestamp => now - timestamp < 3600000);
    RateLimiter.transactionHistory.set(address, recentHistory);
  },

  /**
   * Clear history for address
   * @param {string} address - User address
   */
  clearHistory: (address) => {
    RateLimiter.transactionHistory.delete(address);
  },
};

/**
 * On-Chain Validation Layer
 * Validates data against blockchain state (NEVER TRUST FRONTEND)
 */
export const OnChainValidator = {
  /**
   * Validate borrow amount against on-chain limits
   * @param {number} amount - Amount to borrow
   * @param {Object} profile - User's credit profile from blockchain
   * @param {Object} pool - Lending pool data from blockchain
   * @returns {Object} { isValid, error }
   */
  validateBorrowAmount: (amount, profile, pool) => {
    if (!profile) {
      return {
        isValid: false,
        error: 'Credit profile not found. Please create a profile first.',
      };
    }

    if (!pool) {
      return {
        isValid: false,
        error: 'Pool data not available. Please try again.',
      };
    }

    // Validate credit score (on-chain enforcement)
    if (profile.score < 500) {
      return {
        isValid: false,
        error: `Credit score too low (${profile.score}). Minimum required: 500`,
      };
    }

    // Calculate max borrow limit based on on-chain credit score
    let maxBorrowLimit = 0;
    if (profile.score >= 850) maxBorrowLimit = 100;
    else if (profile.score >= 750) maxBorrowLimit = 50;
    else if (profile.score >= 650) maxBorrowLimit = 25;
    else if (profile.score >= 500) maxBorrowLimit = 10;

    // Check against current debt
    const currentDebt = profile.debt || 0;
    const availableCredit = maxBorrowLimit - currentDebt;

    if (amount > availableCredit) {
      return {
        isValid: false,
        error: `Amount exceeds available credit (${availableCredit.toFixed(4)} SUI)`,
      };
    }

    // Check pool liquidity
    if (amount > pool.availableLiquidity) {
      return {
        isValid: false,
        error: `Insufficient pool liquidity (${pool.availableLiquidity.toFixed(4)} SUI available)`,
      };
    }

    return {
      isValid: true,
      error: null,
    };
  },

  /**
   * Validate withdraw amount against on-chain balance
   * @param {number} amount - Amount to withdraw
   * @param {Object} userDeposits - User's deposit data from blockchain
   * @returns {Object} { isValid, error }
   */
  validateWithdrawAmount: (amount, userDeposits) => {
    if (!userDeposits) {
      return {
        isValid: false,
        error: 'Deposit data not available. Please try again.',
      };
    }

    const netDeposited = userDeposits.netDeposited || 0;

    if (amount > netDeposited) {
      return {
        isValid: false,
        error: `Insufficient deposited balance (${netDeposited.toFixed(4)} SUI available)`,
      };
    }

    return {
      isValid: true,
      error: null,
    };
  },

  /**
   * Validate repay amount against on-chain loan
   * @param {number} amount - Amount to repay
   * @param {Object} profile - User's credit profile from blockchain
   * @returns {Object} { isValid, error }
   */
  validateRepayAmount: (amount, profile) => {
    if (!profile) {
      return {
        isValid: false,
        error: 'Credit profile not found',
      };
    }

    const currentDebt = profile.debt || 0;

    if (currentDebt === 0) {
      return {
        isValid: false,
        error: 'No active loan to repay',
      };
    }

    // Allow overpayment (will be handled by contract)
    return {
      isValid: true,
      error: null,
    };
  },
};

/**
 * Comprehensive Security Validator
 * Combines all validation layers
 */
export const SecurityValidator = {
  /**
   * Validate borrow transaction
   * @param {Object} params - Transaction parameters
   * @returns {Object} { isValid, errors }
   */
  validateBorrowTransaction: (params) => {
    const errors = [];

    // Input validation
    const amountValidation = InputValidator.validateAmount(params.amount, 0.01);
    if (!amountValidation.isValid) {
      errors.push(amountValidation.error);
    }

    const durationValidation = InputValidator.validateLoanDuration(params.duration);
    if (!durationValidation.isValid) {
      errors.push(durationValidation.error);
    }

    // Wallet validation
    const walletValidation = WalletSecurity.validateWalletState(params.address);
    if (!walletValidation.isValid) {
      errors.push(walletValidation.error);
    }

    // Rate limiting
    const rateLimitCheck = RateLimiter.checkRateLimit(params.address);
    if (!rateLimitCheck.isAllowed) {
      errors.push(rateLimitCheck.error);
    }

    // On-chain validation
    if (amountValidation.isValid) {
      const onChainValidation = OnChainValidator.validateBorrowAmount(
        amountValidation.sanitizedValue,
        params.profile,
        params.pool
      );
      if (!onChainValidation.isValid) {
        errors.push(onChainValidation.error);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  /**
   * Validate deposit transaction
   * @param {Object} params - Transaction parameters
   * @returns {Object} { isValid, errors }
   */
  validateDepositTransaction: (params) => {
    const errors = [];

    // Input validation
    const amountValidation = InputValidator.validateAmount(params.amount, 0.01);
    if (!amountValidation.isValid) {
      errors.push(amountValidation.error);
    }

    // Wallet validation
    const walletValidation = WalletSecurity.validateWalletState(params.address);
    if (!walletValidation.isValid) {
      errors.push(walletValidation.error);
    }

    // Rate limiting
    const rateLimitCheck = RateLimiter.checkRateLimit(params.address);
    if (!rateLimitCheck.isAllowed) {
      errors.push(rateLimitCheck.error);
    }

    // Check balance
    if (amountValidation.isValid && params.balance !== undefined) {
      if (amountValidation.sanitizedValue > params.balance) {
        errors.push(`Insufficient balance (${params.balance.toFixed(4)} SUI available)`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  /**
   * Validate withdraw transaction
   * @param {Object} params - Transaction parameters
   * @returns {Object} { isValid, errors }
   */
  validateWithdrawTransaction: (params) => {
    const errors = [];

    // Input validation
    const amountValidation = InputValidator.validateAmount(params.amount, 0.01);
    if (!amountValidation.isValid) {
      errors.push(amountValidation.error);
    }

    // Wallet validation
    const walletValidation = WalletSecurity.validateWalletState(params.address);
    if (!walletValidation.isValid) {
      errors.push(walletValidation.error);
    }

    // Rate limiting
    const rateLimitCheck = RateLimiter.checkRateLimit(params.address);
    if (!rateLimitCheck.isAllowed) {
      errors.push(rateLimitCheck.error);
    }

    // On-chain validation
    if (amountValidation.isValid) {
      const onChainValidation = OnChainValidator.validateWithdrawAmount(
        amountValidation.sanitizedValue,
        params.userDeposits
      );
      if (!onChainValidation.isValid) {
        errors.push(onChainValidation.error);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  /**
   * Validate repay transaction
   * @param {Object} params - Transaction parameters
   * @returns {Object} { isValid, errors }
   */
  validateRepayTransaction: (params) => {
    const errors = [];

    // Input validation
    const amountValidation = InputValidator.validateAmount(params.amount, 0.01);
    if (!amountValidation.isValid) {
      errors.push(amountValidation.error);
    }

    // Wallet validation
    const walletValidation = WalletSecurity.validateWalletState(params.address);
    if (!walletValidation.isValid) {
      errors.push(walletValidation.error);
    }

    // Rate limiting
    const rateLimitCheck = RateLimiter.checkRateLimit(params.address);
    if (!rateLimitCheck.isAllowed) {
      errors.push(rateLimitCheck.error);
    }

    // On-chain validation
    if (amountValidation.isValid) {
      const onChainValidation = OnChainValidator.validateRepayAmount(
        amountValidation.sanitizedValue,
        params.profile
      );
      if (!onChainValidation.isValid) {
        errors.push(onChainValidation.error);
      }
    }

    // Check balance
    if (amountValidation.isValid && params.balance !== undefined) {
      if (amountValidation.sanitizedValue > params.balance) {
        errors.push(`Insufficient balance (${params.balance.toFixed(4)} SUI available)`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },
};

export default {
  InputValidator,
  TransactionSecurity,
  WalletSecurity,
  RateLimiter,
  OnChainValidator,
  SecurityValidator,
};
