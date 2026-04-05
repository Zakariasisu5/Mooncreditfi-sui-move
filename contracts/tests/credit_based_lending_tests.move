#[test_only]
module mooncreditfi::credit_based_lending_tests {
    use sui::test_scenario::{Self as ts, Scenario};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::clock::{Self, Clock};
    use mooncreditfi::lending_pool::{Self, LendingPool};
    use mooncreditfi::credit_profile::{Self, CreditProfile, ProfileRegistry};
    use mooncreditfi::lending_logic;
    use mooncreditfi::loan::Loan;
    use mooncreditfi::collateral::{Self, CollateralVault};

    // Test addresses
    const ADMIN: address = @0xAD;
    const LENDER: address = @0x1;
    const BORROWER_EXCELLENT: address = @0x2;  // Score 750+
    const BORROWER_GOOD: address = @0x3;       // Score 650+
    const BORROWER_FAIR: address = @0x4;       // Score 550+
    const BORROWER_POOR: address = @0x5;       // Score 500+
    const BORROWER_NEW: address = @0x6;        // Score 450+

    // Test constants
    const ONE_SUI: u64 = 1_000_000_000;
    const TEN_SUI: u64 = 10_000_000_000;
    const FIFTY_SUI: u64 = 50_000_000_000;
    const HUNDRED_SUI: u64 = 100_000_000_000;

    // ==================== SETUP HELPERS ====================

    fun setup_pool(scenario: &mut Scenario) {
        ts::next_tx(scenario, ADMIN);
        {
            lending_pool::init_for_testing(ts::ctx(scenario));
        };
    }

    fun setup_profile_registry(scenario: &mut Scenario) {
        ts::next_tx(scenario, ADMIN);
        {
            credit_profile::init_for_testing(ts::ctx(scenario));
        };
    }

    fun setup_clock(scenario: &mut Scenario): Clock {
        ts::next_tx(scenario, ADMIN);
        clock::create_for_testing(ts::ctx(scenario))
    }

    fun create_profile(scenario: &mut Scenario, user: address) {
        ts::next_tx(scenario, user);
        {
            let mut registry = ts::take_shared<ProfileRegistry>(scenario);
            credit_profile::create_profile(&mut registry, ts::ctx(scenario));
            ts::return_shared(registry);
        };
    }

    fun create_vault(scenario: &mut Scenario, user: address) {
        ts::next_tx(scenario, user);
        {
            collateral::create_vault(ts::ctx(scenario));
        };
    }

    fun deposit_to_pool(scenario: &mut Scenario, user: address, amount: u64, clock: &Clock) {
        ts::next_tx(scenario, user);
        {
            let mut pool = ts::take_shared<LendingPool>(scenario);
            let payment = coin::mint_for_testing<SUI>(amount, ts::ctx(scenario));
            lending_logic::deposit(&mut pool, payment, clock, ts::ctx(scenario));
            ts::return_shared(pool);
        };
    }

    fun deposit_collateral(scenario: &mut Scenario, user: address, amount: u64) {
        ts::next_tx(scenario, user);
        {
            let mut vault = ts::take_shared<CollateralVault>(scenario);
            let payment = coin::mint_for_testing<SUI>(amount, ts::ctx(scenario));
            collateral::deposit_collateral(&mut vault, payment, ts::ctx(scenario));
            ts::return_shared(vault);
        };
    }

    fun set_credit_score(profile: &mut CreditProfile, score: u64) {
        // Helper to manually set score for testing
        credit_profile::update_score(profile, score);
    }

    // ==================== TEST: Credit-Only Borrowing (Excellent Credit) ====================

    #[test]
    fun test_credit_only_borrow_excellent_score() {
        let mut scenario = ts::begin(ADMIN);
        let clock = setup_clock(&mut scenario);
        
        setup_pool(&mut scenario);
        setup_profile_registry(&mut scenario);
        
        // Lender deposits liquidity
        deposit_to_pool(&mut scenario, LENDER, HUNDRED_SUI * 10, &clock);
        
        // Create borrower profile
        create_profile(&mut scenario, BORROWER_EXCELLENT);
        
        // Set excellent credit score (750+)
        ts::next_tx(&mut scenario, BORROWER_EXCELLENT);
        {
            let mut profile = ts::take_from_sender<CreditProfile>(&scenario);
            set_credit_score(&mut profile, 800);
            ts::return_to_sender(&scenario, profile);
        };
        
        // Borrow without collateral (credit-only)
        ts::next_tx(&mut scenario, BORROWER_EXCELLENT);
        {
            let mut pool = ts::take_shared<LendingPool>(&scenario);
            let mut profile = ts::take_from_sender<CreditProfile>(&scenario);
            
            // Borrow 10 SUI with excellent credit (no collateral needed)
            lending_logic::borrow_credit_only(
                &mut pool,
                &mut profile,
                TEN_SUI,
                30,
                &clock,
                ts::ctx(&mut scenario)
            );
            
            ts::return_shared(pool);
            ts::return_to_sender(&scenario, profile);
        };
        
        // Verify loan was created
        ts::next_tx(&mut scenario, BORROWER_EXCELLENT);
        {
            assert!(ts::has_most_recent_for_sender<Loan>(&scenario), 0);
        };
        
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    // ==================== TEST: Hybrid Borrowing (Good Credit) ====================

    #[test]
    fun test_hybrid_borrow_good_score() {
        let mut scenario = ts::begin(ADMIN);
        let clock = setup_clock(&mut scenario);
        
        setup_pool(&mut scenario);
        setup_profile_registry(&mut scenario);
        
        // Lender deposits liquidity
        deposit_to_pool(&mut scenario, LENDER, HUNDRED_SUI * 10, &clock);
        
        // Create borrower profile and vault
        create_profile(&mut scenario, BORROWER_GOOD);
        create_vault(&mut scenario, BORROWER_GOOD);
        
        // Set good credit score (650+) - requires 25% collateral
        ts::next_tx(&mut scenario, BORROWER_GOOD);
        {
            let mut profile = ts::take_from_sender<CreditProfile>(&scenario);
            set_credit_score(&mut profile, 700);
            ts::return_to_sender(&scenario, profile);
        };
        
        // Deposit collateral (25% of 10 SUI = 2.5 SUI)
        deposit_collateral(&mut scenario, BORROWER_GOOD, TEN_SUI / 4);
        
        // Borrow with reduced collateral
        ts::next_tx(&mut scenario, BORROWER_GOOD);
        {
            let mut pool = ts::take_shared<LendingPool>(&scenario);
            let mut profile = ts::take_from_sender<CreditProfile>(&scenario);
            let mut vault = ts::take_shared<CollateralVault>(&scenario);
            
            lending_logic::borrow(
                &mut pool,
                &mut profile,
                &mut vault,
                TEN_SUI,
                30,
                &clock,
                ts::ctx(&mut scenario)
            );
            
            ts::return_shared(pool);
            ts::return_to_sender(&scenario, profile);
            ts::return_shared(vault);
        };
        
        // Verify loan was created
        ts::next_tx(&mut scenario, BORROWER_GOOD);
        {
            assert!(ts::has_most_recent_for_sender<Loan>(&scenario), 0);
        };
        
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    // ==================== TEST: Full Collateral (Poor Credit) ====================

    #[test]
    fun test_full_collateral_poor_score() {
        let mut scenario = ts::begin(ADMIN);
        let clock = setup_clock(&mut scenario);
        
        setup_pool(&mut scenario);
        setup_profile_registry(&mut scenario);
        
        // Lender deposits liquidity
        deposit_to_pool(&mut scenario, LENDER, HUNDRED_SUI * 10, &clock);
        
        // Create borrower profile and vault
        create_profile(&mut scenario, BORROWER_POOR);
        create_vault(&mut scenario, BORROWER_POOR);
        
        // Set poor credit score (500+) - requires 100% collateral
        ts::next_tx(&mut scenario, BORROWER_POOR);
        {
            let mut profile = ts::take_from_sender<CreditProfile>(&scenario);
            set_credit_score(&mut profile, 520);
            ts::return_to_sender(&scenario, profile);
        };
        
        // Deposit full collateral (100% of 5 SUI = 5 SUI)
        deposit_collateral(&mut scenario, BORROWER_POOR, TEN_SUI / 2);
        
        // Borrow with full collateral
        ts::next_tx(&mut scenario, BORROWER_POOR);
        {
            let mut pool = ts::take_shared<LendingPool>(&scenario);
            let mut profile = ts::take_from_sender<CreditProfile>(&scenario);
            let mut vault = ts::take_shared<CollateralVault>(&scenario);
            
            lending_logic::borrow(
                &mut pool,
                &mut profile,
                &mut vault,
                TEN_SUI / 2,  // 5 SUI
                30,
                &clock,
                ts::ctx(&mut scenario)
            );
            
            ts::return_shared(pool);
            ts::return_to_sender(&scenario, profile);
            ts::return_shared(vault);
        };
        
        // Verify loan was created
        ts::next_tx(&mut scenario, BORROWER_POOR);
        {
            assert!(ts::has_most_recent_for_sender<Loan>(&scenario), 0);
        };
        
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    // ==================== TEST: New User Small Loan ====================

    #[test]
    fun test_new_user_small_loan() {
        let mut scenario = ts::begin(ADMIN);
        let clock = setup_clock(&mut scenario);
        
        setup_pool(&mut scenario);
        setup_profile_registry(&mut scenario);
        
        // Lender deposits liquidity
        deposit_to_pool(&mut scenario, LENDER, HUNDRED_SUI * 10, &clock);
        
        // Create new user profile and vault
        create_profile(&mut scenario, BORROWER_NEW);
        create_vault(&mut scenario, BORROWER_NEW);
        
        // New user has default score (500) - can borrow up to 10 SUI with 100% collateral
        // Deposit collateral for 2 SUI loan
        deposit_collateral(&mut scenario, BORROWER_NEW, ONE_SUI * 2);
        
        // Borrow small amount (2 SUI)
        ts::next_tx(&mut scenario, BORROWER_NEW);
        {
            let mut pool = ts::take_shared<LendingPool>(&scenario);
            let mut profile = ts::take_from_sender<CreditProfile>(&scenario);
            let mut vault = ts::take_shared<CollateralVault>(&scenario);
            
            lending_logic::borrow(
                &mut pool,
                &mut profile,
                &mut vault,
                ONE_SUI * 2,
                30,
                &clock,
                ts::ctx(&mut scenario)
            );
            
            ts::return_shared(pool);
            ts::return_to_sender(&scenario, profile);
            ts::return_shared(vault);
        };
        
        // Verify loan was created
        ts::next_tx(&mut scenario, BORROWER_NEW);
        {
            assert!(ts::has_most_recent_for_sender<Loan>(&scenario), 0);
        };
        
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    // ==================== TEST: Cooldown Enforcement ====================

    #[test]
    #[expected_failure(abort_code = 9)] // ELoanCooldownActive
    fun test_cooldown_prevents_rapid_borrowing() {
        let mut scenario = ts::begin(ADMIN);
        let mut clock = setup_clock(&mut scenario);
        
        setup_pool(&mut scenario);
        setup_profile_registry(&mut scenario);
        
        deposit_to_pool(&mut scenario, LENDER, HUNDRED_SUI * 10, &clock);
        create_profile(&mut scenario, BORROWER_EXCELLENT);
        
        // Set excellent score
        ts::next_tx(&mut scenario, BORROWER_EXCELLENT);
        {
            let mut profile = ts::take_from_sender<CreditProfile>(&scenario);
            set_credit_score(&mut profile, 800);
            ts::return_to_sender(&scenario, profile);
        };
        
        // First borrow
        ts::next_tx(&mut scenario, BORROWER_EXCELLENT);
        {
            let mut pool = ts::take_shared<LendingPool>(&scenario);
            let mut profile = ts::take_from_sender<CreditProfile>(&scenario);
            
            lending_logic::borrow_credit_only(
                &mut pool,
                &mut profile,
                ONE_SUI,
                30,
                &clock,
                ts::ctx(&mut scenario)
            );
            
            ts::return_shared(pool);
            ts::return_to_sender(&scenario, profile);
        };
        
        // Try to borrow again immediately (should fail)
        ts::next_tx(&mut scenario, BORROWER_EXCELLENT);
        {
            let mut pool = ts::take_shared<LendingPool>(&scenario);
            let mut profile = ts::take_from_sender<CreditProfile>(&scenario);
            
            lending_logic::borrow_credit_only(
                &mut pool,
                &mut profile,
                ONE_SUI,
                30,
                &clock,
                ts::ctx(&mut scenario)
            );
            
            ts::return_shared(pool);
            ts::return_to_sender(&scenario, profile);
        };
        
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    // ==================== TEST: Borrow Limit Enforcement ====================

    #[test]
    #[expected_failure(abort_code = 2)] // EExceedsMaxBorrowLimit
    fun test_borrow_limit_enforcement() {
        let mut scenario = ts::begin(ADMIN);
        let clock = setup_clock(&mut scenario);
        
        setup_pool(&mut scenario);
        setup_profile_registry(&mut scenario);
        
        deposit_to_pool(&mut scenario, LENDER, HUNDRED_SUI * 10, &clock);
        create_profile(&mut scenario, BORROWER_GOOD);
        
        // Set good score (max 50 SUI)
        ts::next_tx(&mut scenario, BORROWER_GOOD);
        {
            let mut profile = ts::take_from_sender<CreditProfile>(&scenario);
            set_credit_score(&mut profile, 700);
            ts::return_to_sender(&scenario, profile);
        };
        
        // Try to borrow more than limit (should fail)
        ts::next_tx(&mut scenario, BORROWER_GOOD);
        {
            let mut pool = ts::take_shared<LendingPool>(&scenario);
            let mut profile = ts::take_from_sender<CreditProfile>(&scenario);
            
            lending_logic::borrow_credit_only(
                &mut pool,
                &mut profile,
                HUNDRED_SUI,  // Trying to borrow 100 SUI with 50 SUI limit
                30,
                &clock,
                ts::ctx(&mut scenario)
            );
            
            ts::return_shared(pool);
            ts::return_to_sender(&scenario, profile);
        };
        
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    // ==================== TEST: Credit Score Too Low ====================

    #[test]
    #[expected_failure(abort_code = 3)] // ECreditScoreTooLow
    fun test_credit_score_too_low() {
        let mut scenario = ts::begin(ADMIN);
        let clock = setup_clock(&mut scenario);
        
        setup_pool(&mut scenario);
        setup_profile_registry(&mut scenario);
        
        deposit_to_pool(&mut scenario, LENDER, HUNDRED_SUI * 10, &clock);
        create_profile(&mut scenario, BORROWER_NEW);
        
        // Set very low score (below minimum)
        ts::next_tx(&mut scenario, BORROWER_NEW);
        {
            let mut profile = ts::take_from_sender<CreditProfile>(&scenario);
            set_credit_score(&mut profile, 400);  // Below 450 minimum
            ts::return_to_sender(&scenario, profile);
        };
        
        // Try to borrow (should fail)
        ts::next_tx(&mut scenario, BORROWER_NEW);
        {
            let mut pool = ts::take_shared<LendingPool>(&scenario);
            let mut profile = ts::take_from_sender<CreditProfile>(&scenario);
            
            lending_logic::borrow_credit_only(
                &mut pool,
                &mut profile,
                ONE_SUI,
                30,
                &clock,
                ts::ctx(&mut scenario)
            );
            
            ts::return_shared(pool);
            ts::return_to_sender(&scenario, profile);
        };
        
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }
}
