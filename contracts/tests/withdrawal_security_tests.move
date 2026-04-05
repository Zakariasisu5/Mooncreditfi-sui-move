#[test_only]
module mooncreditfi::withdrawal_security_tests {
    use sui::test_scenario::{Self as ts, Scenario};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::clock::{Self, Clock};
    use sui::test_utils;
    use mooncreditfi::lending_pool::{Self, LendingPool};
    use mooncreditfi::lending_logic;

    // Test helper: Create a pool
    fun create_test_pool(scenario: &mut Scenario) {
        ts::next_tx(scenario, @0x1);
        {
            lending_pool::create_pool(500, 500, ts::ctx(scenario));
        };
    }

    // Test helper: Deposit funds
    fun deposit_funds(scenario: &mut Scenario, user: address, amount: u64) {
        ts::next_tx(scenario, user);
        {
            let mut pool = ts::take_shared<LendingPool>(scenario);
            let clock = clock::create_for_testing(ts::ctx(scenario));
            let payment = coin::mint_for_testing<SUI>(amount, ts::ctx(scenario));
            
            lending_logic::deposit(&mut pool, payment, &clock, ts::ctx(scenario));
            
            clock::destroy_for_testing(clock);
            ts::return_shared(pool);
        };
    }

    /// TEST 1.3: Test unauthorized withdrawal attempt fails
    /// This is the critical security test for C-01
    #[test]
    #[expected_failure(abort_code = 21)] // ENoPosition
    fun test_unauthorized_withdrawal_no_deposit() {
        let mut scenario = ts::begin(@0x1);
        create_test_pool(&mut scenario);
        
        // User tries to withdraw without ever depositing
        ts::next_tx(&mut scenario, @0x999);
        {
            let mut pool = ts::take_shared<LendingPool>(&scenario);
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            
            // This should FAIL - attacker has no position
            lending_logic::withdraw(&mut pool, 1000_000_000_000, &clock, ts::ctx(&mut scenario));
            
            clock::destroy_for_testing(clock);
            ts::return_shared(pool);
        };
        
        ts::end(scenario);
    }

    /// TEST 1.4: Test withdrawal exceeding balance fails
    #[test]
    #[expected_failure(abort_code = 24)] // EInsufficientPrincipal
    fun test_withdrawal_exceeds_balance() {
        let mut scenario = ts::begin(@0x1);
        create_test_pool(&mut scenario);
        
        // User deposits 10 SUI
        deposit_funds(&mut scenario, @0x2, 10_000_000_000);
        
        // User tries to withdraw 100 SUI (more than deposited)
        ts::next_tx(&mut scenario, @0x2);
        {
            let mut pool = ts::take_shared<LendingPool>(&scenario);
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            
            // This should FAIL - user only has 10 SUI
            lending_logic::withdraw(&mut pool, 100_000_000_000, &clock, ts::ctx(&mut scenario));
            
            clock::destroy_for_testing(clock);
            ts::return_shared(pool);
        };
        
        ts::end(scenario);
    }

    /// TEST 1.4: Test exact balance withdrawal succeeds
    #[test]
    fun test_withdrawal_exact_balance() {
        let mut scenario = ts::begin(@0x1);
        create_test_pool(&mut scenario);
        
        // User deposits 10 SUI
        deposit_funds(&mut scenario, @0x2, 10_000_000_000);
        
        // User withdraws exactly 10 SUI
        ts::next_tx(&mut scenario, @0x2);
        {
            let mut pool = ts::take_shared<LendingPool>(&scenario);
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            
            lending_logic::withdraw(&mut pool, 10_000_000_000, &clock, ts::ctx(&mut scenario));
            
            clock::destroy_for_testing(clock);
            ts::return_shared(pool);
        };
        
        // Verify user position is removed
        ts::next_tx(&mut scenario, @0x2);
        {
            let pool = ts::take_shared<LendingPool>(&scenario);
            let (principal, accumulated_yield, _) = lending_pool::get_user_position(&pool, @0x2);
            
            assert!(principal == 0, 0);
            assert!(accumulated_yield == 0, 1);
            
            ts::return_shared(pool);
        };
        
        ts::end(scenario);
    }

    /// TEST 1.4: Test partial withdrawal succeeds
    #[test]
    fun test_withdrawal_partial_balance() {
        let mut scenario = ts::begin(@0x1);
        create_test_pool(&mut scenario);
        
        // User deposits 100 SUI
        deposit_funds(&mut scenario, @0x2, 100_000_000_000);
        
        // User withdraws 30 SUI
        ts::next_tx(&mut scenario, @0x2);
        {
            let mut pool = ts::take_shared<LendingPool>(&scenario);
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            
            lending_logic::withdraw(&mut pool, 30_000_000_000, &clock, ts::ctx(&mut scenario));
            
            clock::destroy_for_testing(clock);
            ts::return_shared(pool);
        };
        
        // Verify user still has 70 SUI
        ts::next_tx(&mut scenario, @0x2);
        {
            let pool = ts::take_shared<LendingPool>(&scenario);
            let (principal, _, _) = lending_pool::get_user_position(&pool, @0x2);
            
            assert!(principal == 70_000_000_000, 0);
            
            ts::return_shared(pool);
        };
        
        ts::end(scenario);
    }

    /// TEST 1.4: Test zero withdrawal is allowed (harmless operation)
    #[test]
    fun test_withdrawal_zero_amount() {
        let mut scenario = ts::begin(@0x1);
        create_test_pool(&mut scenario);
        
        // User deposits 10 SUI
        deposit_funds(&mut scenario, @0x2, 10_000_000_000);
        
        // User withdraws 0 SUI (should succeed - it's harmless)
        ts::next_tx(&mut scenario, @0x2);
        {
            let mut pool = ts::take_shared<LendingPool>(&scenario);
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            
            lending_logic::withdraw(&mut pool, 0, &clock, ts::ctx(&mut scenario));
            
            clock::destroy_for_testing(clock);
            ts::return_shared(pool);
        };
        
        // Verify user still has 10 SUI
        ts::next_tx(&mut scenario, @0x2);
        {
            let pool = ts::take_shared<LendingPool>(&scenario);
            let (principal, _, _) = lending_pool::get_user_position(&pool, @0x2);
            
            assert!(principal == 10_000_000_000, 0);
            
            ts::return_shared(pool);
        };
        
        ts::end(scenario);
    }

    /// TEST: Attack simulation - User A tries to withdraw User B's funds
    #[test]
    #[expected_failure(abort_code = 24)] // EInsufficientPrincipal
    fun test_attack_steal_other_user_funds() {
        let mut scenario = ts::begin(@0x1);
        create_test_pool(&mut scenario);
        
        // User A deposits 10 SUI
        deposit_funds(&mut scenario, @0x2, 10_000_000_000);
        
        // User B deposits 100 SUI
        deposit_funds(&mut scenario, @0x3, 100_000_000_000);
        
        // User A tries to withdraw 100 SUI (User B's funds)
        ts::next_tx(&mut scenario, @0x2);
        {
            let mut pool = ts::take_shared<LendingPool>(&scenario);
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            
            // This should FAIL - User A only has 10 SUI
            lending_logic::withdraw(&mut pool, 100_000_000_000, &clock, ts::ctx(&mut scenario));
            
            clock::destroy_for_testing(clock);
            ts::return_shared(pool);
        };
        
        ts::end(scenario);
    }

    /// TEST: Multiple users can withdraw their own funds correctly
    #[test]
    fun test_multiple_users_independent_withdrawals() {
        let mut scenario = ts::begin(@0x1);
        create_test_pool(&mut scenario);
        
        // User A deposits 10 SUI
        deposit_funds(&mut scenario, @0x2, 10_000_000_000);
        
        // User B deposits 20 SUI
        deposit_funds(&mut scenario, @0x3, 20_000_000_000);
        
        // User C deposits 30 SUI
        deposit_funds(&mut scenario, @0x4, 30_000_000_000);
        
        // User A withdraws 5 SUI
        ts::next_tx(&mut scenario, @0x2);
        {
            let mut pool = ts::take_shared<LendingPool>(&scenario);
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            lending_logic::withdraw(&mut pool, 5_000_000_000, &clock, ts::ctx(&mut scenario));
            clock::destroy_for_testing(clock);
            ts::return_shared(pool);
        };
        
        // User B withdraws 15 SUI
        ts::next_tx(&mut scenario, @0x3);
        {
            let mut pool = ts::take_shared<LendingPool>(&scenario);
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            lending_logic::withdraw(&mut pool, 15_000_000_000, &clock, ts::ctx(&mut scenario));
            clock::destroy_for_testing(clock);
            ts::return_shared(pool);
        };
        
        // Verify final balances
        ts::next_tx(&mut scenario, @0x1);
        {
            let pool = ts::take_shared<LendingPool>(&scenario);
            
            let (principal_a, _, _) = lending_pool::get_user_position(&pool, @0x2);
            let (principal_b, _, _) = lending_pool::get_user_position(&pool, @0x3);
            let (principal_c, _, _) = lending_pool::get_user_position(&pool, @0x4);
            
            assert!(principal_a == 5_000_000_000, 0);  // 10 - 5 = 5
            assert!(principal_b == 5_000_000_000, 1);  // 20 - 15 = 5
            assert!(principal_c == 30_000_000_000, 2); // 30 - 0 = 30
            
            ts::return_shared(pool);
        };
        
        ts::end(scenario);
    }
}
