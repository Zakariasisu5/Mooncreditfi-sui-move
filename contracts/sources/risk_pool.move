module mooncreditfi::risk_pool {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::event;
    use mooncreditfi::credit_profile::{Self, CreditProfile};

    const EInsufficientReputation: u64 = 1;
    const EInsufficientLiquidity: u64 = 2;
    const EInvalidRiskLevel: u64 = 3;

    public struct RiskPool has key, store {
        id: UID,
        total_liquidity: u64,
        risk_level: u8,
        balance: Balance<SUI>,
    }

    public struct DepositEvent has copy, drop {
        user: address,
        amount: u64,
        new_total_liquidity: u64,
    }

    public struct BorrowEvent has copy, drop {
        user: address,
        amount: u64,
        remaining_liquidity: u64,
    }

    public entry fun create_risk_pool(risk_level: u8, ctx: &mut TxContext) {
        assert!(risk_level >= 1 && risk_level <= 3, EInvalidRiskLevel);
        
        let pool = RiskPool {
            id: object::new(ctx),
            total_liquidity: 0,
            risk_level,
            balance: balance::zero<SUI>(),
        };
        
        transfer::share_object(pool);
    }

    public entry fun deposit_to_risk_pool(
        pool: &mut RiskPool,
        payment: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let amount = coin::value(&payment);
        
        let payment_balance = coin::into_balance(payment);
        balance::join(&mut pool.balance, payment_balance);
        
        let old_liquidity = pool.total_liquidity;
        pool.total_liquidity = pool.total_liquidity + amount;
        
        assert!(pool.total_liquidity >= old_liquidity, 0);
        
        event::emit(DepositEvent {
            user: sender,
            amount,
            new_total_liquidity: pool.total_liquidity,
        });
    }

    fun get_reputation_threshold(risk_level: u8): u64 {
        if (risk_level == 1) {
            600
        } else if (risk_level == 2) {
            400
        } else {
            0
        }
    }

    public entry fun borrow_from_risk_pool(
        pool: &mut RiskPool,
        profile: &CreditProfile,
        amount: u64,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let reputation = credit_profile::get_reputation(profile);
        let threshold = get_reputation_threshold(pool.risk_level);
        
        assert!(reputation >= threshold, EInsufficientReputation);
        assert!(pool.total_liquidity >= amount, EInsufficientLiquidity);
        
        pool.total_liquidity = pool.total_liquidity - amount;
        let borrowed_balance = balance::split(&mut pool.balance, amount);
        let borrowed_coin = coin::from_balance(borrowed_balance, ctx);
        
        event::emit(BorrowEvent {
            user: sender,
            amount,
            remaining_liquidity: pool.total_liquidity,
        });
        
        transfer::public_transfer(borrowed_coin, sender);
    }

    public fun get_total_liquidity(pool: &RiskPool): u64 { pool.total_liquidity }
    public fun get_risk_level(pool: &RiskPool): u8 { pool.risk_level }
}
