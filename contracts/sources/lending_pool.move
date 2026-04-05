module mooncreditfi::lending_pool {
    use sui::object;
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::balance::{Self, Balance};
    use sui::sui::SUI;
    use sui::table::{Self, Table};
    use sui::clock::{Self, Clock};
    use sui::event;
    use sui::coin::{Self, Coin};

    // Error codes
    const ENoPosition: u64 = 21;
    const ENoYieldToClaim: u64 = 22;
    const ENoYieldToCompound: u64 = 23;
    const EInsufficientPrincipal: u64 = 24;
    const EIndexUnderflow: u64 = 25;
    
    // Liquidity reserve protection
    const MIN_RESERVE_RATIO: u64 = 1000; // 10% = 1000 basis points
    const EInsufficientReserve: u64 = 26;
    const EInvalidAPY: u64 = 26;

    public struct UserPosition has store, drop {
        principal: u64,
        accumulated_yield: u64,
        user_yield_index: u128,
        last_update_time: u64,
    }

    public struct LendingPool has key, store {
        id: object::UID,
        balance: Balance<SUI>,
        total_liquidity: u64,
        total_borrowed: u64,
        total_deposited: u64,
        interest_rate: u64,
        user_positions: Table<address, UserPosition>,
        yield_index: u128,
        last_index_update: u64,
        apy: u64,
    }

    public struct YieldAccrualEvent has copy, drop {
        user: address,
        accrued_amount: u64,
        new_accumulated_yield: u64,
        timestamp: u64,
    }

    public struct YieldClaimEvent has copy, drop {
        user: address,
        amount: u64,
        timestamp: u64,
    }

    public struct YieldCompoundEvent has copy, drop {
        user: address,
        amount: u64,
        new_principal: u64,
        timestamp: u64,
    }

    public struct YieldIndexUpdateEvent has copy, drop {
        old_index: u128,
        new_index: u128,
        apy: u64,
        time_elapsed_ms: u64,
        timestamp: u64,
    }
    public entry fun create_pool(interest_rate: u64, apy: u64, ctx: &mut TxContext) {
        let pool = LendingPool {
            id: object::new(ctx),
            balance: balance::zero<SUI>(),
            total_liquidity: 0,
            total_borrowed: 0,
            total_deposited: 0,
            interest_rate,
            user_positions: table::new<address, UserPosition>(ctx),
            yield_index: 1_000_000_000_000_000_000,
            last_index_update: 0,
            apy,
        };
        transfer::share_object(pool);
    }

    public fun get_total_liquidity(pool: &LendingPool): u64 { pool.total_liquidity }
    public fun get_total_borrowed(pool: &LendingPool): u64 { pool.total_borrowed }
    public fun get_total_deposited(pool: &LendingPool): u64 { pool.total_deposited }
    public fun get_interest_rate(pool: &LendingPool): u64 { pool.interest_rate }
    public fun get_balance(pool: &LendingPool): u64 { balance::value(&pool.balance) }
    
    /// Get current global yield index
    /// Validates: Requirements 8.3
    public fun get_yield_index(pool: &LendingPool): u128 { pool.yield_index }
    
    /// Get current APY in basis points
    /// Validates: Requirements 8.4
    public fun get_apy(pool: &LendingPool): u64 { pool.apy }
    
    // Reserve calculation helper functions
    /// Calculate available liquidity that can be withdrawn without breaching reserve
    public fun calculate_available_liquidity(pool: &LendingPool): u64 {
        let min_reserve = (pool.total_deposited * MIN_RESERVE_RATIO) / 10000;
        if (pool.total_liquidity > min_reserve) {
            pool.total_liquidity - min_reserve
        } else {
            0
        }
    }
    
    /// Get current reserve ratio in basis points (e.g., 1000 = 10%)
    public fun get_reserve_ratio(pool: &LendingPool): u64 {
        if (pool.total_deposited == 0) {
            return 10000  // 100% if no deposits
        };
        (pool.total_liquidity * 10000) / pool.total_deposited
    }
    public(package) fun add_liquidity(pool: &mut LendingPool, coin_balance: Balance<SUI>) {
        let amount = balance::value(&coin_balance);
        balance::join(&mut pool.balance, coin_balance);
        pool.total_liquidity = pool.total_liquidity + amount;
        pool.total_deposited = pool.total_deposited + amount;
    }

    public(package) fun remove_liquidity(pool: &mut LendingPool, amount: u64): Balance<SUI> {
        assert!(pool.total_liquidity >= amount, 0);
        assert!(balance::value(&pool.balance) >= amount, 1);
        
        // Calculate minimum reserve to prevent bank runs
        // Only enforce reserve if there are outstanding borrows (to ensure borrowers can repay)
        // If no borrows, users can withdraw freely
        if (pool.total_borrowed > 0) {
            let min_reserve = (pool.total_deposited * MIN_RESERVE_RATIO) / 10000;
            let remaining_liquidity = pool.total_liquidity - amount;
            assert!(remaining_liquidity >= min_reserve, EInsufficientReserve);
        };
        
        pool.total_liquidity = pool.total_liquidity - amount;
        balance::split(&mut pool.balance, amount)
    }

    public(package) fun record_borrow(pool: &mut LendingPool, amount: u64): Balance<SUI> {
        assert!(pool.total_liquidity >= amount, 0);
        assert!(balance::value(&pool.balance) >= amount, 1);
        pool.total_liquidity = pool.total_liquidity - amount;
        pool.total_borrowed = pool.total_borrowed + amount;
        balance::split(&mut pool.balance, amount)
    }

    public(package) fun record_repayment(pool: &mut LendingPool, coin_balance: Balance<SUI>, debt_amount: u64) {
        let amount = balance::value(&coin_balance);
        balance::join(&mut pool.balance, coin_balance);
        pool.total_liquidity = pool.total_liquidity + amount;
        
        if (pool.total_borrowed >= debt_amount) {
            pool.total_borrowed = pool.total_borrowed - debt_amount;
        } else {
            pool.total_borrowed = 0;
        };
    }
    public(package) fun update_interest_rate(pool: &mut LendingPool, new_rate: u64) {
        pool.interest_rate = new_rate;
    }

    /// Update global yield index based on time elapsed
    /// Implements the formula: new_index = old_index × (1 + APY × Δt / year)
    public(package) fun update_yield_index(
        pool: &mut LendingPool,
        clock: &Clock
    ) {
        let current_time = clock::timestamp_ms(clock);
        
        // Calculate time elapsed since last update
        let time_elapsed = current_time - pool.last_index_update;
        
        // Return early if time elapsed is zero
        if (time_elapsed == 0) {
            return
        };
        
        // Store old index for event
        let old_index = pool.yield_index;
        
        // Calculate growth factor: (10000 + (apy * time_elapsed) / 31_536_000_000) / 10000
        // APY is in basis points, year is 31_536_000_000 milliseconds
        let growth_numerator = 10000 + ((pool.apy * time_elapsed) / 31_536_000_000);
        let growth_denominator = 10000;
        
        // Update yield_index using fixed-point arithmetic
        pool.yield_index = (pool.yield_index * (growth_numerator as u128)) / (growth_denominator as u128);
        
        // Update last_index_update to current timestamp
        pool.last_index_update = current_time;
        
        // Emit YieldIndexUpdateEvent
        event::emit(YieldIndexUpdateEvent {
            old_index,
            new_index: pool.yield_index,
            apy: pool.apy,
            time_elapsed_ms: time_elapsed,
            timestamp: current_time,
        });
    }

    /// Accrue yield for a specific user
    /// Calculates yield using formula: principal × (current_index / user_index - 1)
    public(package) fun accrue_yield(
        pool: &mut LendingPool,
        user: address,
        clock: &Clock
    ) {
        // Call update_yield_index first
        update_yield_index(pool, clock);
        
        // Get user position from table (return early if none exists)
        if (!table::contains(&pool.user_positions, user)) {
            return
        };
        
        let position = table::borrow_mut(&mut pool.user_positions, user);
        
        // Return early if principal is zero
        if (position.principal == 0) {
            return
        };
        
        // Calculate yield using formula: principal × (current_index / user_index - 1)
        // Using fixed-point arithmetic with 1e18 precision
        let current_index = pool.yield_index;
        let user_index = position.user_yield_index;
        
        // Calculate index ratio (scaled by 1e18)
        let index_ratio = (current_index * 1_000_000_000_000_000_000) / user_index;
        
        // Calculate yield: principal × (index_ratio - 1e18) / 1e18
        let yield_amount = if (index_ratio > 1_000_000_000_000_000_000) {
            ((position.principal as u128) * (index_ratio - 1_000_000_000_000_000_000) / 1_000_000_000_000_000_000) as u64
        } else {
            0
        };
        
        // Add calculated yield to accumulated_yield
        position.accumulated_yield = position.accumulated_yield + yield_amount;
        
        // Update user_yield_index to current global index
        position.user_yield_index = current_index;
        
        // Update last_update_time
        let current_time = clock::timestamp_ms(clock);
        position.last_update_time = current_time;
        
        // Emit YieldAccrualEvent if accrued amount > 0
        if (yield_amount > 0) {
            event::emit(YieldAccrualEvent {
                user,
                accrued_amount: yield_amount,
                new_accumulated_yield: position.accumulated_yield,
                timestamp: current_time,
            });
        };
    }

    /// Update or create user position on deposit
    /// If user has existing position, adds deposit amount to principal
    /// If new user, creates UserPosition with current global index
    public(package) fun update_user_position_on_deposit(
        pool: &mut LendingPool,
        user: address,
        amount: u64,
        clock: &Clock
    ) {
        let current_time = clock::timestamp_ms(clock);
        
        // Check if user has existing position
        if (table::contains(&pool.user_positions, user)) {
            // User exists: add deposit amount to principal
            let position = table::borrow_mut(&mut pool.user_positions, user);
            position.principal = position.principal + amount;
            position.last_update_time = current_time;
        } else {
            // New user: create UserPosition with current global index
            let new_position = UserPosition {
                principal: amount,
                accumulated_yield: 0,
                user_yield_index: pool.yield_index,
                last_update_time: current_time,
            };
            table::add(&mut pool.user_positions, user, new_position);
        };
    }

    /// Validate that user is authorized to withdraw the requested amount
    /// This function MUST be called before remove_liquidity
    public(package) fun validate_withdrawal_authorization(
        pool: &LendingPool,
        user: address,
        amount: u64
    ) {
        // Check if user has a position
        assert!(table::contains(&pool.user_positions, user), ENoPosition);
        
        let position = table::borrow(&pool.user_positions, user);
        
        // Ensure withdrawal amount doesn't exceed user's principal
        // This is the critical security check that prevents unauthorized withdrawals
        assert!(position.principal >= amount, EInsufficientPrincipal);
    }

    /// Update user position on withdrawal
    /// Subtracts withdrawal amount from principal
    public(package) fun update_user_position_on_withdraw(
        pool: &mut LendingPool,
        user: address,
        amount: u64
    ) {
        // Get user position from table
        assert!(table::contains(&pool.user_positions, user), 21); // ENoPosition
        
        let position = table::borrow_mut(&mut pool.user_positions, user);
        
        // Ensure withdrawal amount doesn't exceed principal
        assert!(position.principal >= amount, 24); // EInsufficientPrincipal
        
        // Subtract withdrawal amount from principal
        position.principal = position.principal - amount;
    }

    /// Remove user position from table
    /// Used when user withdraws their full position
    public(package) fun remove_user_position(
        pool: &mut LendingPool,
        user: address
    ) {
        // Check if user has a position
        assert!(table::contains(&pool.user_positions, user), 21); // ENoPosition
        
        // Remove the position from the table
        table::remove(&mut pool.user_positions, user);
    }

    /// Check if withdrawal is a full withdrawal and return yield info
    /// Returns (should_claim_yield: bool, yield_amount: u64)
    /// If withdrawal amount equals principal, returns (true, accumulated_yield)
    /// Otherwise returns (false, 0)
    public(package) fun check_full_withdrawal(
        pool: &LendingPool,
        user: address,
        amount: u64
    ): (bool, u64) {
        // Check if user has a position
        if (!table::contains(&pool.user_positions, user)) {
            return (false, 0)
        };
        
        let position = table::borrow(&pool.user_positions, user);
        
        // Check if withdrawal amount equals principal
        if (amount == position.principal) {
            // Full withdrawal: should claim yield
            (true, position.accumulated_yield)
        } else {
            // Partial withdrawal: don't claim yield
            (false, 0)
        }
    }

    /// Get user's position data
    /// Returns (principal, accumulated_yield, last_update_time)
    /// Returns (0, 0, 0) if user has no position
    public fun get_user_position(
        pool: &LendingPool,
        user: address
    ): (u64, u64, u64) {
        if (!table::contains(&pool.user_positions, user)) {
            return (0, 0, 0)
        };
        
        let position = table::borrow(&pool.user_positions, user);
        (position.principal, position.accumulated_yield, position.last_update_time)
    }

    /// Calculate pending yield without updating state
    /// Returns what the user's yield would be if accrued at current time
    /// Validates: Requirements 8.2
    public fun calculate_pending_yield(
        pool: &LendingPool,
        user: address,
        clock: &Clock
    ): u64 {
        // Return 0 if user has no position
        if (!table::contains(&pool.user_positions, user)) {
            return 0
        };
        
        let position = table::borrow(&pool.user_positions, user);
        
        // Return accumulated_yield if principal is zero
        if (position.principal == 0) {
            return position.accumulated_yield
        };
        
        // Calculate what the new index would be (without updating it)
        let current_time = clock::timestamp_ms(clock);
        let time_elapsed = current_time - pool.last_index_update;
        
        // Calculate the current index value (same logic as update_yield_index but read-only)
        let current_index = if (time_elapsed == 0) {
            pool.yield_index
        } else {
            let growth_numerator = 10000 + ((pool.apy * time_elapsed) / 31_536_000_000);
            let growth_denominator = 10000;
            (pool.yield_index * (growth_numerator as u128)) / (growth_denominator as u128)
        };
        
        // Calculate yield using formula: principal × (current_index / user_index - 1)
        let user_index = position.user_yield_index;
        
        // Calculate index ratio (scaled by 1e18)
        let index_ratio = (current_index * 1_000_000_000_000_000_000) / user_index;
        
        // Calculate new yield that would be accrued
        let new_yield = if (index_ratio > 1_000_000_000_000_000_000) {
            ((position.principal as u128) * (index_ratio - 1_000_000_000_000_000_000) / 1_000_000_000_000_000_000) as u64
        } else {
            0
        };
        
        // Return accumulated_yield + new_yield (total pending yield)
        position.accumulated_yield + new_yield
    }

    /// Claim accumulated yield as SUI tokens
    /// Validates: Requirements 3.3, 5.1, 5.2, 5.3, 5.4, 5.5
    public entry fun claim_yield(
        pool: &mut LendingPool,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        // Call accrue_yield for sender
        accrue_yield(pool, sender, clock);
        
        // Get user position and check it exists
        assert!(table::contains(&pool.user_positions, sender), ENoPosition);
        
        let position = table::borrow_mut(&mut pool.user_positions, sender);
        
        // Check accumulated_yield > 0
        assert!(position.accumulated_yield > 0, ENoYieldToClaim);
        
        let yield_amount = position.accumulated_yield;
        
        // Reset accumulated_yield to 0
        position.accumulated_yield = 0;
        
        // Transfer accumulated_yield as SUI to sender
        let yield_balance = balance::split(&mut pool.balance, yield_amount);
        let yield_coin = coin::from_balance(yield_balance, ctx);
        transfer::public_transfer(yield_coin, sender);
        
        // Emit YieldClaimEvent
        let current_time = clock::timestamp_ms(clock);
        event::emit(YieldClaimEvent {
            user: sender,
            amount: yield_amount,
            timestamp: current_time,
        });
    }

    /// Compound accumulated yield into principal
    /// Validates: Requirements 3.4, 6.1, 6.2, 6.3, 6.4, 6.5
    public entry fun compound_yield(
        pool: &mut LendingPool,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        // Call accrue_yield for sender
        accrue_yield(pool, sender, clock);
        
        // Get user position and check it exists
        assert!(table::contains(&pool.user_positions, sender), ENoPosition);
        
        let position = table::borrow_mut(&mut pool.user_positions, sender);
        
        // Check accumulated_yield > 0
        assert!(position.accumulated_yield > 0, ENoYieldToCompound);
        
        let yield_amount = position.accumulated_yield;
        
        // Add accumulated_yield to principal
        position.principal = position.principal + yield_amount;
        
        // Update total_deposited in pool
        pool.total_deposited = pool.total_deposited + yield_amount;
        
        // Reset accumulated_yield to 0
        position.accumulated_yield = 0;
        
        // Emit YieldCompoundEvent
        let current_time = clock::timestamp_ms(clock);
        event::emit(YieldCompoundEvent {
            user: sender,
            amount: yield_amount,
            new_principal: position.principal,
            timestamp: current_time,
        });
    }

    /// Update APY (package-level function)
    /// Validates: Requirements 4.1, 4.2, 4.3, 4.4
    public(package) fun update_apy(
        pool: &mut LendingPool,
        new_apy: u64,
        clock: &Clock
    ) {
        // Validate new APY is within valid range (0-10000 basis points = 0-100%)
        assert!(new_apy <= 10000, EInvalidAPY);
        
        // Call update_yield_index to accrue at old APY first
        update_yield_index(pool, clock);
        
        // Update apy field to new value
        pool.apy = new_apy;
    }

    /// Internal function to claim yield and return the balance
    /// Used for automatic yield claim during full withdrawals
    public(package) fun claim_yield_internal(
        pool: &mut LendingPool,
        user: address
    ): Balance<SUI> {
        // Get user position
        assert!(table::contains(&pool.user_positions, user), ENoPosition);
        
        let position = table::borrow_mut(&mut pool.user_positions, user);
        let yield_amount = position.accumulated_yield;
        
        // Reset accumulated_yield to 0
        position.accumulated_yield = 0;
        
        // Return the yield balance
        balance::split(&mut pool.balance, yield_amount)
    }

    /// Emit YieldClaimEvent (package-level function)
    /// Used by lending_logic to emit event for automatic yield claim during withdrawals
    public(package) fun emit_yield_claim_event(
        user: address,
        amount: u64,
        clock: &Clock
    ) {
        event::emit(YieldClaimEvent {
            user,
            amount,
            timestamp: clock::timestamp_ms(clock),
        });
    }
}
