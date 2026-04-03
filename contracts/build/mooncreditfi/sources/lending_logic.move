/// Lending Logic Module - Production Ready
/// Handles deposit, withdraw, borrow, and repay operations with comprehensive loan tracking
module mooncreditfi::lending_logic {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use sui::clock::{Self, Clock};
    use mooncreditfi::credit_profile::{Self, CreditProfile};
    use mooncreditfi::lending_pool::{Self, LendingPool};
    use mooncreditfi::loan::{Self, Loan};
    use mooncreditfi::credit_scoring;

    /// Error codes
    const EInsufficientLiquidity: u64 = 1;
    const EExceedsMaxBorrowLimit: u64 = 2;
    const ECreditScoreTooLow: u64 = 3;
    const ENotOwner: u64 = 4;
    const ENoDebt: u64 = 5;
    const EUnderflowPrevention: u64 = 6;
    const EInvalidLoanDuration: u64 = 7;

    /// Minimum credit score required to borrow
    const MIN_CREDIT_SCORE: u64 = 500;

    /// Valid loan durations in days
    const LOAN_DURATION_30: u64 = 30;
    const LOAN_DURATION_60: u64 = 60;
    const LOAN_DURATION_90: u64 = 90;

    /// Events
    public struct DepositEvent has copy, drop {
        depositor: address,
        amount: u64,
    }

    public struct WithdrawEvent has copy, drop {
        withdrawer: address,
        amount: u64,
    }

    public struct BorrowEvent has copy, drop {
        borrower: address,
        amount: u64,
        credit_score: u64,
    }

    public struct RepayEvent has copy, drop {
        borrower: address,
        amount: u64,
        new_credit_score: u64,
    }

    /// Deposit into lending pool (UI-callable)
    public entry fun deposit(
        pool: &mut LendingPool,
        payment: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let amount = coin::value(&payment);
        
        // Convert coin to balance and add to pool
        let coin_balance = coin::into_balance(payment);
        lending_pool::add_liquidity(pool, coin_balance);
        
        // Emit event
        event::emit(DepositEvent {
            depositor: sender,
            amount,
        });
    }

    /// Withdraw from lending pool (UI-callable)
    public entry fun withdraw(
        pool: &mut LendingPool,
        amount: u64,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        // Remove liquidity from pool and get balance
        let withdrawn_balance = lending_pool::remove_liquidity(pool, amount);
        
        // Convert balance to coin and transfer to user
        let withdrawn_coin = coin::from_balance(withdrawn_balance, ctx);
        transfer::public_transfer(withdrawn_coin, sender);
        
        // Emit event
        event::emit(WithdrawEvent {
            withdrawer: sender,
            amount,
        });
    }

    /// Borrow from the lending pool with loan creation (UI-callable)
    /// Creates an individual Loan object and transfers borrowed funds
    /// duration_days: 30, 60, or 90 days
    /// 
    /// SECURITY HARDENING:
    /// - Strict ownership verification
    /// - Amount validation (non-zero, within limits)
    /// - Credit score enforcement (on-chain only)
    /// - Borrow limit enforcement (on-chain only)
    /// - Liquidity validation
    /// - Prevents double borrowing via debt check
    public entry fun borrow(
        pool: &mut LendingPool,
        profile: &mut CreditProfile,
        amount: u64,
        duration_days: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);
        
        // SECURITY: Verify ownership - CRITICAL
        assert!(credit_profile::get_owner(profile) == sender, ENotOwner);

        // SECURITY: Validate amount is non-zero
        assert!(amount > 0, 8); // EZeroAmount

        // SECURITY: Validate loan duration (only 30, 60, or 90 days allowed)
        assert!(
            duration_days == LOAN_DURATION_30 || 
            duration_days == LOAN_DURATION_60 || 
            duration_days == LOAN_DURATION_90,
            EInvalidLoanDuration
        );

        // SECURITY: Check credit score (ON-CHAIN ENFORCEMENT - NEVER TRUST FRONTEND)
        let score = credit_profile::get_score(profile);
        assert!(score >= MIN_CREDIT_SCORE, ECreditScoreTooLow);

        // SECURITY: Check max borrow limit based on credit score (ON-CHAIN ENFORCEMENT)
        // This prevents frontend manipulation attacks
        let max_limit = credit_profile::calculate_max_borrow_limit(profile);
        let current_debt = credit_profile::get_debt(profile);
        assert!(current_debt + amount <= max_limit, EExceedsMaxBorrowLimit);

        // SECURITY: Check pool liquidity (prevent liquidity draining)
        let liquidity = lending_pool::get_total_liquidity(pool);
        assert!(liquidity >= amount, EInsufficientLiquidity);

        // Calculate interest rate based on credit score
        let interest_rate = credit_profile::calculate_interest_rate(profile);

        // Create loan object
        let loan = loan::create_loan(
            sender,
            amount,
            interest_rate,
            duration_days,
            clock,
            ctx
        );

        // Calculate total owed (principal + interest)
        let total_owed = loan::get_total_owed(&loan);

        // Record borrow in profile (updates debt with total_owed, not just principal)
        credit_profile::record_borrow(profile, total_owed, current_time);
        
        // Get balance from pool
        let borrowed_balance = lending_pool::record_borrow(pool, amount);
        
        // Convert balance to coin and transfer to borrower
        let borrowed_coin = coin::from_balance(borrowed_balance, ctx);
        transfer::public_transfer(borrowed_coin, sender);

        // Transfer loan object to borrower
        transfer::public_transfer(loan, sender);

        // Emit event
        event::emit(BorrowEvent {
            borrower: sender,
            amount,
            credit_score: score,
        });
    }

    /// Repay a loan with timing consideration (UI-callable)
    /// Handles full/partial repayments and updates credit score based on timing
    /// 
    /// SECURITY HARDENING:
    /// - Strict ownership verification (profile + loan)
    /// - Prevents double repayment via loan state check
    /// - Amount validation
    /// - Safe arithmetic (underflow prevention)
    /// - Immutable repayment state enforcement
    public entry fun repay(
        pool: &mut LendingPool,
        profile: &mut CreditProfile,
        loan: &mut Loan,
        payment: Coin<SUI>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);
        
        // SECURITY: Verify ownership - CRITICAL (both profile and loan)
        assert!(credit_profile::get_owner(profile) == sender, ENotOwner);
        assert!(loan::get_borrower(loan) == sender, ENotOwner);

        // Get payment amount and loan details
        let amount = coin::value(&payment);
        let remaining_loan = loan::get_remaining_amount(loan);
        
        // SECURITY: Validate amount is non-zero
        assert!(amount > 0, 8); // EZeroAmount
        
        // SECURITY: User must have outstanding loan amount (prevent double repayment)
        assert!(remaining_loan > 0, ENoDebt);
        
        // SECURITY: Verify loan is not already fully repaid (immutable state check)
        assert!(!loan::is_repaid(loan), 9); // ELoanAlreadyRepaid

        // Check if this is early repayment
        let is_early = loan::is_early_repayment(loan, clock);
        let is_overdue = loan::is_overdue(loan, clock);

        // Record payment in loan
        let (amount_applied, is_fully_repaid) = loan::record_payment(loan, amount, ctx);

        // Update profile based on repayment type and timing
        if (is_fully_repaid) {
            if (is_overdue) {
                // Late but full repayment
                credit_profile::record_late_repayment(profile, amount_applied, current_time);
            } else {
                // On-time or early full repayment
                credit_profile::record_full_repayment(profile, amount_applied, is_early, current_time);
            };
        } else {
            // Partial repayment
            if (is_overdue) {
                credit_profile::record_late_repayment(profile, amount_applied, current_time);
            } else {
                credit_profile::record_partial_repayment(profile, amount_applied, current_time);
            };
        };

        // Update pool
        let current_borrowed = lending_pool::get_total_borrowed(pool);
        assert!(current_borrowed >= amount_applied, EUnderflowPrevention);
        
        let payment_balance = coin::into_balance(payment);
        lending_pool::record_repayment(pool, payment_balance, amount_applied);

        // Get updated credit score for event
        let new_score = credit_profile::get_score(profile);

        // Emit event
        event::emit(RepayEvent {
            borrower: sender,
            amount,
            new_credit_score: new_score,
        });
    }

    /// Mark loan as defaulted (can be called by anyone after due date)
    public entry fun mark_loan_default(
        profile: &mut CreditProfile,
        loan: &mut Loan,
        clock: &Clock,
        _ctx: &mut TxContext
    ) {
        // Check if loan is overdue
        assert!(loan::is_overdue(loan, clock), 0);

        let _borrower = loan::get_borrower(loan);
        let current_time = clock::timestamp_ms(clock);
        
        // Mark loan as defaulted
        loan::mark_defaulted(loan);
        
        // Record default in profile
        credit_profile::record_default(profile, current_time);
    }
}
