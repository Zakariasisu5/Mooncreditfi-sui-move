#[allow(unused_use)]
#[test_only]
module mooncreditfi::lending_pool_tests {
    use sui::test_scenario::{Self as ts, Scenario};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::clock::{Self, Clock};
    use sui::test_utils;
    use mooncreditfi::lending_pool::{Self, LendingPool};

    const ADMIN: address = @0xAD;
    const USER1: address = @0x1;
    const INITIAL_APY: u64 = 500; // 5% APY
    const INTEREST_RATE: u64 = 5;

    fun setup_test(): Scenario {
        let mut scenario = ts::begin(ADMIN);
        {
            let ctx = ts::ctx(&mut scenario);
            lending_pool::create_pool(INTEREST_RATE, INITIAL_APY, ctx);
        };
        scenario
    }

    #[test]
    fun test_remove_user_position_success() {
        let mut scenario = setup_test();
        let clock = clock::create_for_testing(ts::ctx(&mut scenario));
        
        // First, create a user position by depositing
        ts::next_tx(&mut scenario, USER1);
        {
            let mut pool = ts::take_shared<LendingPool>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            
            // Create a deposit to establish a position
            let deposit_amount = 1_000_000_000; // 1 SUI
            let payment = coin::mint_for_testing<SUI>(deposit_amount, ctx);
            let coin_balance = coin::into_balance(payment);
            
            lending_pool::add_liquidity(&mut pool, coin_balance);
            lending_pool::update_user_position_on_deposit(&mut pool, USER1, deposit_amount, &clock);
            
            // Verify position exists
            let (principal, accumulated_yield, _last_update) = lending_pool::get_user_position(&pool, USER1);
            assert!(principal == deposit_amount, 0);
            assert!(accumulated_yield == 0, 1);
            
            ts::return_shared(pool);
        };
        
        // Now remove the user position
        ts::next_tx(&mut scenario, USER1);
        {
            let mut pool = ts::take_shared<LendingPool>(&scenario);
            
            // Remove the position
            lending_pool::remove_user_position(&mut pool, USER1);
            
            // Verify position no longer exists (should return zeros)
            let (principal, accumulated_yield, last_update) = lending_pool::get_user_position(&pool, USER1);
            assert!(principal == 0, 2);
            assert!(accumulated_yield == 0, 3);
            assert!(last_update == 0, 4);
            
            ts::return_shared(pool);
        };
        
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 21, location = mooncreditfi::lending_pool)]
    fun test_remove_user_position_no_position() {
        let mut scenario = setup_test();
        
        // Try to remove a position that doesn't exist
        ts::next_tx(&mut scenario, USER1);
        {
            let mut pool = ts::take_shared<LendingPool>(&scenario);
            
            // This should fail with ENoPosition error
            lending_pool::remove_user_position(&mut pool, USER1);
            
            ts::return_shared(pool);
        };
        
        ts::end(scenario);
    }

    #[test]
    fun test_calculate_pending_yield_no_position() {
        let mut scenario = setup_test();
        let clock = clock::create_for_testing(ts::ctx(&mut scenario));
        
        ts::next_tx(&mut scenario, USER1);
        {
            let pool = ts::take_shared<LendingPool>(&scenario);
            
            // Calculate pending yield for user with no position
            let pending_yield = lending_pool::calculate_pending_yield(&pool, USER1, &clock);
            
            // Should return 0 for user with no position
            assert!(pending_yield == 0, 0);
            
            ts::return_shared(pool);
        };
        
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    fun test_calculate_pending_yield_with_time_elapsed() {
        let mut scenario = setup_test();
        let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
        
        // Set initial time
        clock::set_for_testing(&mut clock, 1000000);
        
        // Create a user position
        ts::next_tx(&mut scenario, USER1);
        {
            let mut pool = ts::take_shared<LendingPool>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            
            let deposit_amount = 1_000_000_000; // 1 SUI
            let payment = coin::mint_for_testing<SUI>(deposit_amount, ctx);
            let coin_balance = coin::into_balance(payment);
            
            lending_pool::add_liquidity(&mut pool, coin_balance);
            lending_pool::update_user_position_on_deposit(&mut pool, USER1, deposit_amount, &clock);
            
            ts::return_shared(pool);
        };
        
        // Advance time by 1 year (31,536,000,000 milliseconds)
        clock::increment_for_testing(&mut clock, 31_536_000_000);
        
        // Calculate pending yield
        ts::next_tx(&mut scenario, USER1);
        {
            let pool = ts::take_shared<LendingPool>(&scenario);
            
            let pending_yield = lending_pool::calculate_pending_yield(&pool, USER1, &clock);
            
            // With 5% APY and 1 SUI deposited for 1 year, should have ~50,000,000 MIST (0.05 SUI)
            // Allow some tolerance for rounding
            assert!(pending_yield > 45_000_000 && pending_yield < 55_000_000, 0);
            
            ts::return_shared(pool);
        };
        
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    fun test_calculate_pending_yield_no_state_change() {
        let mut scenario = setup_test();
        let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
        
        clock::set_for_testing(&mut clock, 1000000);
        
        // Create a user position
        ts::next_tx(&mut scenario, USER1);
        {
            let mut pool = ts::take_shared<LendingPool>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            
            let deposit_amount = 1_000_000_000; // 1 SUI
            let payment = coin::mint_for_testing<SUI>(deposit_amount, ctx);
            let coin_balance = coin::into_balance(payment);
            
            lending_pool::add_liquidity(&mut pool, coin_balance);
            lending_pool::update_user_position_on_deposit(&mut pool, USER1, deposit_amount, &clock);
            
            ts::return_shared(pool);
        };
        
        // Advance time
        clock::increment_for_testing(&mut clock, 10_000_000);
        
        // Calculate pending yield multiple times
        ts::next_tx(&mut scenario, USER1);
        {
            let pool = ts::take_shared<LendingPool>(&scenario);
            
            let pending_yield_1 = lending_pool::calculate_pending_yield(&pool, USER1, &clock);
            let pending_yield_2 = lending_pool::calculate_pending_yield(&pool, USER1, &clock);
            
            // Both calls should return the same value (no state change)
            assert!(pending_yield_1 == pending_yield_2, 0);
            
            // Verify position data hasn't changed
            let (principal, accumulated_yield, _) = lending_pool::get_user_position(&pool, USER1);
            assert!(principal == 1_000_000_000, 1);
            assert!(accumulated_yield == 0, 2); // Should still be 0 since we didn't accrue
            
            ts::return_shared(pool);
        };
        
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    fun test_get_apy_returns_correct_value() {
        let mut scenario = setup_test();
        
        ts::next_tx(&mut scenario, ADMIN);
        {
            let pool = ts::take_shared<LendingPool>(&scenario);
            
            // Get APY from pool
            let apy = lending_pool::get_apy(&pool);
            
            // Should return the initial APY set during pool creation (500 = 5%)
            assert!(apy == INITIAL_APY, 0);
            
            ts::return_shared(pool);
        };
        
        ts::end(scenario);
    }
}
