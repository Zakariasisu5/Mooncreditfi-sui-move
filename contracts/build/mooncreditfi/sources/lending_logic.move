module mooncreditfi::lending_logic {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use mooncreditfi::credit_profile::{Self, CreditProfile};
    use mooncreditfi::lending_pool::{Self, LendingPool};

    /// Error codes
    const EInsufficientLiquidity: u64 = 1;
    const ECreditScoreTooLow: u64 = 3;
    const ENotOwner: u64 = 4;
    const ENoDebt: u64 = 5;
    const EUnderflowPrevention: u64 = 6;

    /// Minimum credit score required to borrow
    const MIN_CREDIT_SCORE: u64 = 500;

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

    /// Borrow from the lending pool (UI-callable)
    /// Updates user's debt and pool's borrowed amount
    public entry fun borrow(
        pool: &mut LendingPool,
        profile: &mut CreditProfile,
        amount: u64,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        // Verify ownership
        assert!(credit_profile::get_owner(profile) == sender, ENotOwner);

        // Check credit score
        let score = credit_profile::get_score(profile);
        assert!(score >= MIN_CREDIT_SCORE, ECreditScoreTooLow);

        // Check pool liquidity
        let liquidity = lending_pool::get_total_liquidity(pool);
        assert!(liquidity >= amount, EInsufficientLiquidity);

        // Record borrow in profile (updates debt + total_borrowed + loan_count)
        credit_profile::record_borrow(profile, amount);
        
        // Get balance from pool (updates pool.total_liquidity and pool.total_borrowed)
        let borrowed_balance = lending_pool::record_borrow(pool, amount);
        
        // Convert balance to coin and transfer to borrower
        let borrowed_coin = coin::from_balance(borrowed_balance, ctx);
        transfer::public_transfer(borrowed_coin, sender);

        // Emit event
        event::emit(BorrowEvent {
            borrower: sender,
            amount,
            credit_score: score,
        });
    }

    /// Repay a loan (UI-callable)
    /// Handles both full and partial repayments with proper debt tracking
    public entry fun repay(
        pool: &mut LendingPool,
        profile: &mut CreditProfile,
        payment: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        // Verify ownership
        assert!(credit_profile::get_owner(profile) == sender, ENotOwner);

        // Get payment amount and current debt
        let amount = coin::value(&payment);
        let current_debt = credit_profile::get_debt(profile);
        
        // User must have debt to repay
        assert!(current_debt > 0, ENoDebt);

        // Determine if this is a full or partial repayment
        if (amount >= current_debt) {
            // FULL REPAYMENT (or overpayment)
            
            // Record full repayment in profile (clears debt, updates total_repaid, boosts score +20)
            credit_profile::record_full_repayment(profile, amount);
            
            // Update pool: add full payment to liquidity, reduce borrowed by debt amount
            let current_borrowed = lending_pool::get_total_borrowed(pool);
            
            // Prevent underflow: ensure we don't subtract more than what's borrowed
            assert!(current_borrowed >= current_debt, EUnderflowPrevention);
            
            // Convert coin to balance and add to pool
            let payment_balance = coin::into_balance(payment);
            lending_pool::record_repayment(pool, payment_balance);
            
            // Note: If amount > current_debt, the extra goes to the pool as a bonus
            // This incentivizes overpayment and benefits liquidity providers
            
        } else {
            // PARTIAL REPAYMENT
            
            // Record partial repayment in profile (reduces debt, updates total_repaid, small score boost +5)
            credit_profile::record_partial_repayment(profile, amount);
            
            // Update pool: add payment to liquidity, reduce borrowed by payment amount
            let current_borrowed = lending_pool::get_total_borrowed(pool);
            
            // Prevent underflow
            assert!(current_borrowed >= amount, EUnderflowPrevention);
            
            // Convert coin to balance and add to pool
            let payment_balance = coin::into_balance(payment);
            lending_pool::record_repayment(pool, payment_balance);
        };

        // Get updated credit score for event
        let new_score = credit_profile::get_score(profile);

        // Emit event
        event::emit(RepayEvent {
            borrower: sender,
            amount,
            new_credit_score: new_score,
        });
    }
}
