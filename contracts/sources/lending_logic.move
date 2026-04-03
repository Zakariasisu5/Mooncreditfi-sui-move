module mooncreditfi::lending_logic {
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
    /// Error codes
    const EInsufficientLiquidity: u64 = 1;
    const EInsufficientLiquidity: u64 = 1;
    const EExceedsMaxBorrowLimit: u64 = 2;
    const ECreditScoreTooLow: u64 = 3;
    const ENotOwner: u64 = 4;
    const ENoDebt: u64 = 5;
    const EUnderflowPrevention: u64 = 6;
    const EInvalidLoanDuration: u64 = 7;
    const MIN_CREDIT_SCORE: u64 = 500;
    const LOAN_DURATION_30: u64 = 30;
    const LOAN_DURATION_60: u64 = 60;
    const LOAN_DURATION_90: u64 = 90;
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

    
    /// - Safe balance operations
    /// - Event logging for monitoring
    public entry fun deposit(
        pool: &mut LendingPool,
        payment: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let amount = coin::value(&payment);
        let coin_balance = coin::into_balance(payment);
        lending_pool::add_liquidity(pool, coin_balance);
        event::emit(DepositEvent { depositor: sender, amount });
    }       amount,
        });
    }

    /// Withdraw from lending pool (UI-callable)
    /// 
    /// SECURITY HARDENING:
    /// - Amount validation (non-zero, within limits)
    /// - Liquidity check
    /// - Safe balance operations
    public entry fun withdraw(
        pool: &mut LendingPool,
        amount: u64,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let withdrawn_balance = lending_pool::remove_liquidity(pool, amount);
        let withdrawn_coin = coin::from_balance(withdrawn_balance, ctx);
        transfer::public_transfer(withdrawn_coin, sender);
        event::emit(WithdrawEvent { withdrawer: sender, amount });
    }   transfer::public_transfer(withdrawn_coin, sender);
        
        // Emit event for security monitoring
        event::emit(WithdrawEvent {
            withdrawer: sender,
            amount,
        });
    }
    /// Borrow from the lending pool with loan creation (UI-callable)
    /// Creates an individual Loan object and transfers borrowed funds
    /// duration_days: 30, 60, or 90 days
    /// 
    public entry fun borrow(
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
        let sender = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);
        
        assert!(credit_profile::get_owner(profile) == sender, ENotOwner);
        assert!(amount > 0, 8);
        assert!(
            duration_days == LOAN_DURATION_30 || 
            duration_days == LOAN_DURATION_60 || 
            duration_days == LOAN_DURATION_90,
            EInvalidLoanDuration
        );

        let score = credit_profile::get_score(profile);
        assert!(score >= MIN_CREDIT_SCORE, ECreditScoreTooLow);

        let max_limit = credit_profile::calculate_max_borrow_limit(profile);
        let current_debt = credit_profile::get_debt(profile);
        assert!(current_debt + amount <= max_limit, EExceedsMaxBorrowLimit);

        let liquidity = lending_pool::get_total_liquidity(pool);
        assert!(liquidity >= amount, EInsufficientLiquidity);

        let interest_rate = credit_profile::calculate_interest_rate(profile);
        let loan = loan::create_loan(sender, amount, interest_rate, duration_days, clock, ctx);
        let total_owed = loan::get_total_owed(&loan);

        credit_profile::record_borrow(profile, total_owed, current_time);
        let borrowed_balance = lending_pool::record_borrow(pool, amount);
        let borrowed_coin = coin::from_balance(borrowed_balance, ctx);
        transfer::public_transfer(borrowed_coin, sender);
        transfer::public_transfer(loan, sender);

        event::emit(BorrowEvent { borrower: sender, amount, credit_score: score });n: &mut Loan,
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
        // Check if this is early repayment
        let is_early = loan::is_early_repayment(loan, clock);
        let is_overdue = loan::is_overdue(loan, clock);

        // Record payment in loan (SECURITY: loan module enforces immutable repayment state)
        let (amount_applied, is_fully_repaid) = loan::record_payment(loan, amount, ctx);

        // Update profile based on repayment type and timing
        if (is_fully_repaid) {
            if (is_overdue) {
    public entry fun repay(ile::record_late_repayment(profile, amount_applied, current_time);
            } else {
                credit_profile::record_partial_repayment(profile, amount_applied, current_time);
    /// Mark loan as defaulted (can be called by anyone after due date)
    /// 
    /// SECURITY HARDENING:
    /// - Time-based validation (must be overdue)
    /// - Prevents marking repaid loans as defaulted
    /// - Event logging for monitoring
    public entry fun mark_loan_default(
        profile: &mut CreditProfile,
        loan: &mut Loan,
        clock: &Clock,
        _ctx: &mut TxContext
    ) {
        // SECURITY: Check if loan is overdue (time-based validation)
        assert!(loan::is_overdue(loan, clock), 10); // ELoanNotOverdue
        let sender = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);
        
        assert!(credit_profile::get_owner(profile) == sender, ENotOwner);
        assert!(loan::get_borrower(loan) == sender, ENotOwner);

        let amount = coin::value(&payment);
        let remaining_loan = loan::get_remaining_amount(loan);
        
        assert!(amount > 0, 8);
        assert!(remaining_loan > 0, ENoDebt);
        assert!(!loan::is_repaid(loan), 9);

        let is_early = loan::is_early_repayment(loan, clock);
        let is_overdue = loan::is_overdue(loan, clock);
        let (amount_applied, is_fully_repaid) = loan::record_payment(loan, amount, ctx);

        if (is_fully_repaid) {
            if (is_overdue) {
                credit_profile::record_late_repayment(profile, amount_applied, current_time);
            } else {
                credit_profile::record_full_repayment(profile, amount_applied, is_early, current_time);
            };
        } else {
            if (is_overdue) {
                credit_profile::record_late_repayment(profile, amount_applied, current_time);
            } else {
                credit_profile::record_partial_repayment(profile, amount_applied, current_time);
            };
        };

        let current_borrowed = lending_pool::get_total_borrowed(pool);
        assert!(current_borrowed >= amount_applied, EUnderflowPrevention);
        
        let payment_balance = coin::into_balance(payment);
        lending_pool::record_repayment(pool, payment_balance, amount_applied);
        let new_score = credit_profile::get_score(profile);

        event::emit(RepayEvent { borrower: sender, amount, new_credit_score: new_score });    public entry fun mark_loan_default(
        profile: &mut CreditProfile,
        loan: &mut Loan,
        clock: &Clock,
        _ctx: &mut TxContext
    ) {
        assert!(loan::is_overdue(loan, clock), 0);
        let _borrower = loan::get_borrower(loan);
        let current_time = clock::timestamp_ms(clock);
        loan::mark_defaulted(loan);
        credit_profile::record_default(profile, current_time);
    }