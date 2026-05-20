#[allow(duplicate_alias)]
module mooncreditfi::mudarabah {
    use sui::object::{Self, UID};
    use sui::tx_context::TxContext;
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::event;

    const EInvalidProfitRatio: u64 = 1;

    public struct MudarabahPool has key, store {
        id: UID,
        pool_capital: u64,
        profit_ratio: u64,
        balance: Balance<SUI>,
        manager: address,
    }

    public struct ProfitDistributedEvent has copy, drop {
        investor: address,
        manager: address,
        investor_share: u64,
        manager_share: u64,
        total_profit: u64,
    }

    public fun create_mudarabah_pool(
        initial_capital: Coin<SUI>,
        profit_ratio: u64,
        ctx: &mut TxContext
    ) {
        assert!(profit_ratio <= 10000, EInvalidProfitRatio);
        
        let manager = tx_context::sender(ctx);
        let capital_amount = coin::value(&initial_capital);
        let capital_balance = coin::into_balance(initial_capital);
        
        let pool = MudarabahPool {
            id: object::new(ctx),
            pool_capital: capital_amount,
            profit_ratio,
            balance: capital_balance,
            manager,
        };
        
        transfer::share_object(pool);
    }

    public fun calculate_profit(pool: &MudarabahPool): u64 {
        let current_balance = balance::value(&pool.balance);
        if (current_balance > pool.pool_capital) {
            current_balance - pool.pool_capital
        } else {
            0
        }
    }

    public fun distribute_profit(
        pool: &mut MudarabahPool,
        investor: address,
        ctx: &mut TxContext
    ) {
        let profit = calculate_profit(pool);
        
        let investor_share = (profit * pool.profit_ratio) / 10000;
        let manager_share = profit - investor_share;
        
        let investor_balance = balance::split(&mut pool.balance, investor_share);
        let investor_coin = coin::from_balance(investor_balance, ctx);
        transfer::public_transfer(investor_coin, investor);
        
        let manager_balance = balance::split(&mut pool.balance, manager_share);
        let manager_coin = coin::from_balance(manager_balance, ctx);
        transfer::public_transfer(manager_coin, pool.manager);
        
        event::emit(ProfitDistributedEvent {
            investor,
            manager: pool.manager,
            investor_share,
            manager_share,
            total_profit: profit,
        });
    }

    public fun get_pool_capital(pool: &MudarabahPool): u64 { pool.pool_capital }
    public fun get_profit_ratio(pool: &MudarabahPool): u64 { pool.profit_ratio }
    public fun get_manager(pool: &MudarabahPool): address { pool.manager }
}
