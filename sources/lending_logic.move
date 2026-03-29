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
        
        // Update pool liquidity
        lending_pool::add_liquidity(pool, amount);
        
        // Emit event
        event::emit(DepositEvent {
            depositor: sender,
            amount,
        });
        
        // Transfer the deposit to the pool treasury
        transfer::public_transfer(payment, @mooncreditfi);
    }

    /// Withdraw from lending pool (UI-callable)
    /// Note: In production, this would require pool to hold actual Balance<SUI>
    /// For now, this is a placeholder that records the withdrawal
    public entry fun withdraw(
        pool: &mut LendingPool,
        amount: u64,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        // Remove liquidity from pool
        lending_pool::remove_liquidity(pool, amount);
        
        // Emit event
        event::emit(WithdrawEvent {
            withdrawer: sender,
            amount,
        });
        
        // Note: In production, you would create a coin from pool balance and transfer it
        // let withdrawn_coin = coin::from_balance(pool_balance.split(amount), ctx);
        // transfer::public_transfer(withdrawn_coin, sender);
    }

    /// Borrow from the lending pool (UI-callable)
    /// Note: In production, this would transfer actual coins from pool balance
    /// For now, this records the borrow and updates credit profile
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

        // Record borrow in profile and pool
        credit_profile::record_borrow(profile, amount);
        lending_pool::record_borrow(pool, amount);

        // Emit event
        event::emit(BorrowEvent {
            borrower: sender,
            amount,
            credit_score: score,
        });

        // Note: In production, you would create a coin from pool balance and transfer it
        // let borrowed_coin = coin::from_balance(pool_balance.split(amount), ctx);
        // transfer::public_transfer(borrowed_coin, sender);
    }

    /// Repay a loan (UI-callable)
    public entry fun repay(
        pool: &mut LendingPool,
        profile: &mut CreditProfile,
        payment: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        // Verify ownership
        assert!(credit_profile::get_owner(profile) == sender, ENotOwner);

        let amount = coin::value(&payment);

        // Record repayment in profile and pool
        credit_profile::record_repayment(profile, amount);
        lending_pool::record_repayment(pool, amount);

        // Get updated credit score
        let new_score = credit_profile::get_score(profile);

        // Emit event
        event::emit(RepayEvent {
            borrower: sender,
            amount,
            new_credit_score: new_score,
        });

        // Transfer the repayment to the pool treasury
        transfer::public_transfer(payment, @mooncreditfi);
    }
}
