#[allow(duplicate_alias)]
module mooncreditfi::lending_logic {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::tx_context::TxContext;
    use sui::event;
    use sui::clock::{Self, Clock};
    use mooncreditfi::credit_profile::{Self, CreditProfile};
    use mooncreditfi::credit_scoring;
    use mooncreditfi::lending_pool::{Self, LendingPool};
    use mooncreditfi::loan::{Self, Loan};
    use mooncreditfi::collateral::{Self, CollateralVault};

    const EInsufficientLiquidity: u64 = 1;
    const EExceedsMaxBorrowLimit: u64 = 2;
    const ECreditScoreTooLow: u64 = 3;
    const ENotOwner: u64 = 4;
    const ENoDebt: u64 = 5;
    const EUnderflowPrevention: u64 = 6;
    const EInvalidLoanDuration: u64 = 7;
    const ELoanTooSmall: u64 = 8;
    const ELoanCooldownActive: u64 = 9;
    const EInsufficientCollateral: u64 = 10;
    
    // Credit-based lending parameters
    const MIN_LOAN_SIZE: u64 = 1_000_000_000; // 1 SUI minimum (prevents micro-loan farming)
    const LOAN_COOLDOWN_MS: u64 = 86400000; // 24 hours (prevents rapid loan cycling)
    
    const MIN_CREDIT_SCORE: u64 = 450;  // Lowered from 500 to allow new users
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

    public fun deposit(
        pool: &mut LendingPool,
        payment: Coin<SUI>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let amount = coin::value(&payment);
        
        // Accrue yield before modifying position
        lending_pool::accrue_yield(pool, sender, clock);
        
        let coin_balance = coin::into_balance(payment);
        lending_pool::add_liquidity(pool, coin_balance);
        
        // Update or create user position after deposit
        lending_pool::update_user_position_on_deposit(pool, sender, amount, clock);
        
        event::emit(DepositEvent { depositor: sender, amount });
    }

    public fun withdraw(
        pool: &mut LendingPool,
        amount: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        // Accrue yield before modifying position
        lending_pool::accrue_yield(pool, sender, clock);
        
        // Check user authorization BEFORE removing liquidity
        // This prevents unauthorized withdrawals
        lending_pool::validate_withdrawal_authorization(pool, sender, amount);
        
        // Check if full withdrawal and get yield info
        let (should_claim_yield, yield_amount) = 
            lending_pool::check_full_withdrawal(pool, sender, amount);
        
        // Remove liquidity (now safe after authorization check)
        let withdrawn_balance = lending_pool::remove_liquidity(pool, amount);
        let mut withdrawn_coin = coin::from_balance(withdrawn_balance, ctx);
        
        // Handle full vs partial withdrawal
        if (should_claim_yield) {
            // Full withdrawal: claim yield and include in transferred amount
            let yield_balance = lending_pool::claim_yield_internal(pool, sender);
            let yield_coin = coin::from_balance(yield_balance, ctx);
            coin::join(&mut withdrawn_coin, yield_coin);
            
            // Remove user position from table
            lending_pool::remove_user_position(pool, sender);
            
            // Emit YieldClaimEvent for automatic yield claim
            if (yield_amount > 0) {
                lending_pool::emit_yield_claim_event(sender, yield_amount, clock);
            };
        } else {
            // Partial withdrawal: update position with reduced principal
            lending_pool::update_user_position_on_withdraw(pool, sender, amount);
        };
        
        transfer::public_transfer(withdrawn_coin, sender);
        event::emit(WithdrawEvent { withdrawer: sender, amount });
    }

    public fun borrow(
        pool: &mut LendingPool,
        profile: &mut CreditProfile,
        vault: &mut CollateralVault,
        amount: u64,
        duration_days: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);
        
        assert!(credit_profile::get_owner(profile) == sender, ENotOwner);
        assert!(collateral::get_owner(vault) == sender, ENotOwner);
        
        // Enforce minimum loan size to prevent farming
        assert!(amount >= MIN_LOAN_SIZE, ELoanTooSmall);
        
        // Enforce cooldown between loans
        let last_loan_time = credit_profile::get_last_loan_time(profile);
        if (last_loan_time > 0) {
            assert!(current_time >= last_loan_time + LOAN_COOLDOWN_MS, ELoanCooldownActive);
        };
        
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
        
        // CREDIT-BASED LENDING: Hybrid collateral model based on credit score
        // High score (>= 750) = No collateral required
        // Medium score (550-749) = Partial collateral required
        // Low score (< 550) = Full collateral required
        let required_collateral_ratio = credit_scoring::get_collateral_ratio_requirement(score);
        
        if (required_collateral_ratio > 0) {
            // Calculate required collateral based on score tier
            let current_collateral = collateral::get_collateral_amount(vault);
            let current_borrowed = collateral::get_borrowed_amount(vault);
            let new_total_borrowed = current_borrowed + amount;
            let total_required = (new_total_borrowed * required_collateral_ratio) / 10000;
            
            assert!(current_collateral >= total_required, EInsufficientCollateral);
        };
        // If required_collateral_ratio == 0, no collateral check needed (credit-only borrowing)

        let interest_rate = credit_profile::calculate_interest_rate(profile);
        let loan = loan::create_loan(sender, amount, interest_rate, duration_days, clock, ctx);
        let total_owed = loan::get_total_owed(&loan);
        let loan_id = loan::get_loan_id(&loan);  // Get loan ID before transfer

        credit_profile::record_borrow(profile, total_owed, current_time);
        credit_profile::add_loan_to_profile(profile, loan_id);
        collateral::record_borrow(vault, total_owed);
        
        let borrowed_balance = lending_pool::record_borrow(pool, amount);
        let borrowed_coin = coin::from_balance(borrowed_balance, ctx);
        transfer::public_transfer(borrowed_coin, sender);
        transfer::public_transfer(loan, sender);

        event::emit(BorrowEvent { borrower: sender, amount, credit_score: score });
    }

    public fun repay(
        pool: &mut LendingPool,
        profile: &mut CreditProfile,
        vault: &mut CollateralVault,
        loan: &mut Loan,
        payment: Coin<SUI>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);
        
        assert!(credit_profile::get_owner(profile) == sender, ENotOwner);
        assert!(loan::get_borrower(loan) == sender, ENotOwner);
        assert!(collateral::get_owner(vault) == sender, ENotOwner);

        let amount = coin::value(&payment);
        let remaining_loan = loan::get_remaining_amount(loan);
        
        assert!(amount > 0, 8);
        assert!(remaining_loan > 0, ENoDebt);
        assert!(!loan::is_repaid(loan), 9);

        let is_early = loan::is_early_repayment(loan, clock);
        let is_overdue = loan::is_overdue(loan, clock);
        let loan_id = loan::get_loan_id(loan);
        let (amount_applied, is_fully_repaid) = loan::record_payment(loan, amount, clock, ctx);

        if (is_fully_repaid) {
            // Remove loan from active loans when fully repaid
            credit_profile::remove_loan_from_profile(profile, loan_id);
            
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
        
        // Record repayment in collateral vault
        collateral::record_repayment(vault, amount_applied);

        let current_borrowed = lending_pool::get_total_borrowed(pool);
        assert!(current_borrowed >= amount_applied, EUnderflowPrevention);
        
        let payment_balance = coin::into_balance(payment);
        lending_pool::record_repayment(pool, payment_balance, amount_applied);
        let new_score = credit_profile::get_score(profile);

        event::emit(RepayEvent { borrower: sender, amount, new_credit_score: new_score });
    }

    public fun mark_loan_default(
        profile: &mut CreditProfile,
        loan: &mut Loan,
        clock: &Clock,
        _ctx: &mut TxContext
    ) {
        assert!(loan::is_overdue(loan, clock), 0);
        let _borrower = loan::get_borrower(loan);
        let current_time = clock::timestamp_ms(clock);
        loan::mark_defaulted(loan, clock);
        credit_profile::record_default(profile, current_time);
    }
}
