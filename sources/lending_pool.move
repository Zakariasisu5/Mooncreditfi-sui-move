module mooncreditfi::lending_pool {
    use sui::object;
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;

    /// Lending pool for managing liquidity
    public struct LendingPool has key, store {
        id: object::UID,
        total_liquidity: u64,
        total_borrowed: u64,
        total_deposited: u64,
        interest_rate: u64, // Basis points (e.g., 500 = 5%)
    }

    /// Create a new lending pool and share it (UI-callable)
    public entry fun create_pool(
        interest_rate: u64,
        ctx: &mut TxContext
    ) {
        let pool = LendingPool {
            id: object::new(ctx),
            total_liquidity: 0,
            total_borrowed: 0,
            total_deposited: 0,
            interest_rate,
        };
        transfer::share_object(pool);
    }

    /// Get total liquidity
    public fun get_total_liquidity(pool: &LendingPool): u64 {
        pool.total_liquidity
    }

    /// Get total borrowed
    public fun get_total_borrowed(pool: &LendingPool): u64 {
        pool.total_borrowed
    }

    /// Get total deposited
    public fun get_total_deposited(pool: &LendingPool): u64 {
        pool.total_deposited
    }

    /// Get interest rate
    public fun get_interest_rate(pool: &LendingPool): u64 {
        pool.interest_rate
    }

    /// Add liquidity to pool
    public(package) fun add_liquidity(pool: &mut LendingPool, amount: u64) {
        pool.total_liquidity = pool.total_liquidity + amount;
        pool.total_deposited = pool.total_deposited + amount;
    }

    /// Remove liquidity from pool
    public(package) fun remove_liquidity(pool: &mut LendingPool, amount: u64) {
        assert!(pool.total_liquidity >= amount, 0);
        pool.total_liquidity = pool.total_liquidity - amount;
    }

    /// Record a borrow
    public(package) fun record_borrow(pool: &mut LendingPool, amount: u64) {
        assert!(pool.total_liquidity >= amount, 0);
        pool.total_liquidity = pool.total_liquidity - amount;
        pool.total_borrowed = pool.total_borrowed + amount;
    }

    /// Record a repayment
    public(package) fun record_repayment(pool: &mut LendingPool, amount: u64) {
        pool.total_liquidity = pool.total_liquidity + amount;
        pool.total_borrowed = pool.total_borrowed - amount;
    }

    /// Update interest rate
    public(package) fun update_interest_rate(pool: &mut LendingPool, new_rate: u64) {
        pool.interest_rate = new_rate;
    }
}
