#[test_only]
module mooncreditfi::referral_trust_tests {
    use sui::test_scenario::{Self as ts, Scenario};
    use sui::clock::{Self, Clock};
    use std::option;
    use mooncreditfi::credit_profile::{Self, CreditProfile, ProfileRegistry};
    use mooncreditfi::credit_scoring;

    // Test addresses
    const ADMIN: address = @0xAD;
    const REFERRER: address = @0x1;
    const USER1: address = @0x2;
    const USER2: address = @0x3;
    const USER3: address = @0x4;

    // ==================== SETUP HELPERS ====================

    fun setup_registry(scenario: &mut Scenario) {
        ts::next_tx(scenario, ADMIN);
        {
            credit_profile::init_for_testing(ts::ctx(scenario));
        };
    }

    fun create_profile(scenario: &mut Scenario, user: address) {
        ts::next_tx(scenario, user);
        {
            let mut registry = ts::take_shared<ProfileRegistry>(scenario);
            credit_profile::create_profile(&mut registry, ts::ctx(scenario));
            ts::return_shared(registry);
        };
    }

    // ==================== TEST: Set Referrer ====================

    #[test]
    fun test_set_referrer_success() {
        let mut scenario = ts::begin(ADMIN);
        setup_registry(&mut scenario);
        
        // Create profiles
        create_profile(&mut scenario, REFERRER);
        create_profile(&mut scenario, USER1);
        
        // Set referrer
        ts::next_tx(&mut scenario, USER1);
        {
            let mut user_profile = ts::take_from_sender<CreditProfile>(&scenario);
            let mut referrer_profile = ts::take_from_address<CreditProfile>(&scenario, REFERRER);
            
            credit_profile::set_referrer(
                &mut user_profile,
                &mut referrer_profile,
                ts::ctx(&mut scenario)
            );
            
            // Verify referrer was set
            assert!(credit_profile::has_referrer(&user_profile), 0);
            
            // Verify referrer's count increased
            assert!(credit_profile::get_referral_count(&referrer_profile) == 1, 1);
            
            ts::return_to_sender(&scenario, user_profile);
            ts::return_to_address(REFERRER, referrer_profile);
        };
        
        ts::end(scenario);
    }

    // ==================== TEST: Prevent Self-Referral ====================

    #[test]
    #[expected_failure(abort_code = 12)] // ESelfReferralNotAllowed
    fun test_prevent_self_referral() {
        let mut scenario = ts::begin(ADMIN);
        setup_registry(&mut scenario);
        
        create_profile(&mut scenario, USER1);
        
        // Try to set self as referrer (should fail)
        ts::next_tx(&mut scenario, USER1);
        {
            let mut user_profile = ts::take_from_sender<CreditProfile>(&scenario);
            let mut referrer_profile = ts::take_from_sender<CreditProfile>(&scenario);
            
            credit_profile::set_referrer(
                &mut user_profile,
                &mut referrer_profile,
                ts::ctx(&mut scenario)
            );
            
            ts::return_to_sender(&scenario, user_profile);
            ts::return_to_sender(&scenario, referrer_profile);
        };
        
        ts::end(scenario);
    }

    // ==================== TEST: Prevent Re-setting Referrer ====================

    #[test]
    #[expected_failure(abort_code = 11)] // EReferrerAlreadySet
    fun test_prevent_referrer_reset() {
        let mut scenario = ts::begin(ADMIN);
        setup_registry(&mut scenario);
        
        create_profile(&mut scenario, REFERRER);
        create_profile(&mut scenario, USER2);
        create_profile(&mut scenario, USER1);
        
        // Set referrer first time
        ts::next_tx(&mut scenario, USER1);
        {
            let mut user_profile = ts::take_from_sender<CreditProfile>(&scenario);
            let mut referrer_profile = ts::take_from_address<CreditProfile>(&scenario, REFERRER);
            
            credit_profile::set_referrer(
                &mut user_profile,
                &mut referrer_profile,
                ts::ctx(&mut scenario)
            );
            
            ts::return_to_sender(&scenario, user_profile);
            ts::return_to_address(REFERRER, referrer_profile);
        };
        
        // Try to set different referrer (should fail)
        ts::next_tx(&mut scenario, USER1);
        {
            let mut user_profile = ts::take_from_sender<CreditProfile>(&scenario);
            let mut new_referrer_profile = ts::take_from_address<CreditProfile>(&scenario, USER2);
            
            credit_profile::set_referrer(
                &mut user_profile,
                &mut new_referrer_profile,
                ts::ctx(&mut scenario)
            );
            
            ts::return_to_sender(&scenario, user_profile);
            ts::return_to_address(USER2, new_referrer_profile);
        };
        
        ts::end(scenario);
    }

    // ==================== TEST: Successful Referral Tracking ====================

    #[test]
    fun test_successful_referral_tracking() {
        let mut scenario = ts::begin(ADMIN);
        setup_registry(&mut scenario);
        
        create_profile(&mut scenario, REFERRER);
        create_profile(&mut scenario, USER1);
        
        // Set referrer
        ts::next_tx(&mut scenario, USER1);
        {
            let mut user_profile = ts::take_from_sender<CreditProfile>(&scenario);
            let mut referrer_profile = ts::take_from_address<CreditProfile>(&scenario, REFERRER);
            
            credit_profile::set_referrer(
                &mut user_profile,
                &mut referrer_profile,
                ts::ctx(&mut scenario)
            );
            
            ts::return_to_sender(&scenario, user_profile);
            ts::return_to_address(REFERRER, referrer_profile);
        };
        
        // Simulate successful repayment
        ts::next_tx(&mut scenario, REFERRER);
        {
            let mut referrer_profile = ts::take_from_sender<CreditProfile>(&scenario);
            
            // Record successful referral
            credit_profile::record_referral_success(&mut referrer_profile, USER1);
            
            // Verify counts
            assert!(credit_profile::get_successful_referrals(&referrer_profile) == 1, 0);
            assert!(credit_profile::get_trust_score(&referrer_profile) > 0, 1);
            
            ts::return_to_sender(&scenario, referrer_profile);
        };
        
        ts::end(scenario);
    }

    // ==================== TEST: Failed Referral Tracking ====================

    #[test]
    fun test_failed_referral_tracking() {
        let mut scenario = ts::begin(ADMIN);
        setup_registry(&mut scenario);
        
        create_profile(&mut scenario, REFERRER);
        create_profile(&mut scenario, USER1);
        
        // Set referrer
        ts::next_tx(&mut scenario, USER1);
        {
            let mut user_profile = ts::take_from_sender<CreditProfile>(&scenario);
            let mut referrer_profile = ts::take_from_address<CreditProfile>(&scenario, REFERRER);
            
            credit_profile::set_referrer(
                &mut user_profile,
                &mut referrer_profile,
                ts::ctx(&mut scenario)
            );
            
            ts::return_to_sender(&scenario, user_profile);
            ts::return_to_address(REFERRER, referrer_profile);
        };
        
        // Simulate default
        ts::next_tx(&mut scenario, REFERRER);
        {
            let mut referrer_profile = ts::take_from_sender<CreditProfile>(&scenario);
            
            // Record failed referral
            credit_profile::record_referral_failure(&mut referrer_profile, USER1);
            
            // Verify counts
            assert!(credit_profile::get_failed_referrals(&referrer_profile) == 1, 0);
            
            ts::return_to_sender(&scenario, referrer_profile);
        };
        
        ts::end(scenario);
    }

    // ==================== TEST: Multiple Referrals ====================

    #[test]
    fun test_multiple_referrals() {
        let mut scenario = ts::begin(ADMIN);
        setup_registry(&mut scenario);
        
        create_profile(&mut scenario, REFERRER);
        create_profile(&mut scenario, USER1);
        create_profile(&mut scenario, USER2);
        create_profile(&mut scenario, USER3);
        
        // User1 sets referrer
        ts::next_tx(&mut scenario, USER1);
        {
            let mut user_profile = ts::take_from_sender<CreditProfile>(&scenario);
            let mut referrer_profile = ts::take_from_address<CreditProfile>(&scenario, REFERRER);
            
            credit_profile::set_referrer(&mut user_profile, &mut referrer_profile, ts::ctx(&mut scenario));
            
            ts::return_to_sender(&scenario, user_profile);
            ts::return_to_address(REFERRER, referrer_profile);
        };
        
        // User2 sets referrer
        ts::next_tx(&mut scenario, USER2);
        {
            let mut user_profile = ts::take_from_sender<CreditProfile>(&scenario);
            let mut referrer_profile = ts::take_from_address<CreditProfile>(&scenario, REFERRER);
            
            credit_profile::set_referrer(&mut user_profile, &mut referrer_profile, ts::ctx(&mut scenario));
            
            ts::return_to_sender(&scenario, user_profile);
            ts::return_to_address(REFERRER, referrer_profile);
        };
        
        // User3 sets referrer
        ts::next_tx(&mut scenario, USER3);
        {
            let mut user_profile = ts::take_from_sender<CreditProfile>(&scenario);
            let mut referrer_profile = ts::take_from_address<CreditProfile>(&scenario, REFERRER);
            
            credit_profile::set_referrer(&mut user_profile, &mut referrer_profile, ts::ctx(&mut scenario));
            
            ts::return_to_sender(&scenario, user_profile);
            ts::return_to_address(REFERRER, referrer_profile);
        };
        
        // Verify referral count
        ts::next_tx(&mut scenario, REFERRER);
        {
            let referrer_profile = ts::take_from_sender<CreditProfile>(&scenario);
            assert!(credit_profile::get_referral_count(&referrer_profile) == 3, 0);
            ts::return_to_sender(&scenario, referrer_profile);
        };
        
        ts::end(scenario);
    }

    // ==================== TEST: Trust Score Calculation ====================

    #[test]
    fun test_trust_score_calculation() {
        let mut scenario = ts::begin(ADMIN);
        setup_registry(&mut scenario);
        
        create_profile(&mut scenario, REFERRER);
        
        ts::next_tx(&mut scenario, REFERRER);
        {
            let mut referrer_profile = ts::take_from_sender<CreditProfile>(&scenario);
            
            // Record 3 successful referrals
            credit_profile::record_referral_success(&mut referrer_profile, USER1);
            credit_profile::record_referral_success(&mut referrer_profile, USER2);
            credit_profile::record_referral_success(&mut referrer_profile, USER3);
            
            // Verify trust score increased
            let trust_score = credit_profile::get_trust_score(&referrer_profile);
            assert!(trust_score > 0, 0);
            assert!(credit_profile::get_successful_referrals(&referrer_profile) == 3, 1);
            
            // Record 1 failure
            credit_profile::record_referral_failure(&mut referrer_profile, @0x5);
            
            // Trust score should decrease but still be positive
            let new_trust_score = credit_profile::get_trust_score(&referrer_profile);
            assert!(new_trust_score < trust_score, 2);
            
            ts::return_to_sender(&scenario, referrer_profile);
        };
        
        ts::end(scenario);
    }

    // ==================== TEST: Referral Tier Progression ====================

    #[test]
    fun test_referral_tier_progression() {
        let mut scenario = ts::begin(ADMIN);
        setup_registry(&mut scenario);
        
        create_profile(&mut scenario, REFERRER);
        
        ts::next_tx(&mut scenario, REFERRER);
        {
            let mut referrer_profile = ts::take_from_sender<CreditProfile>(&scenario);
            
            // Start at tier 0
            assert!(credit_profile::get_referral_tier(&referrer_profile) == 0, 0);
            
            // Add 3 successful referrals -> Bronze (tier 1)
            credit_profile::record_referral_success(&mut referrer_profile, USER1);
            credit_profile::record_referral_success(&mut referrer_profile, USER2);
            credit_profile::record_referral_success(&mut referrer_profile, USER3);
            
            assert!(credit_profile::get_referral_tier(&referrer_profile) == 1, 1);
            
            ts::return_to_sender(&scenario, referrer_profile);
        };
        
        ts::end(scenario);
    }

    // ==================== TEST: Combined Score ====================

    #[test]
    fun test_combined_score() {
        let mut scenario = ts::begin(ADMIN);
        setup_registry(&mut scenario);
        
        create_profile(&mut scenario, REFERRER);
        
        ts::next_tx(&mut scenario, REFERRER);
        {
            let mut referrer_profile = ts::take_from_sender<CreditProfile>(&scenario);
            
            let base_score = credit_profile::get_score(&referrer_profile);
            let initial_combined = credit_profile::get_combined_score(&referrer_profile);
            
            // Initially, combined score should equal base score (no trust)
            assert!(initial_combined == base_score, 0);
            
            // Add successful referrals to build trust
            credit_profile::record_referral_success(&mut referrer_profile, USER1);
            credit_profile::record_referral_success(&mut referrer_profile, USER2);
            
            let new_combined = credit_profile::get_combined_score(&referrer_profile);
            
            // Combined score should be higher than base score
            assert!(new_combined > base_score, 1);
            
            ts::return_to_sender(&scenario, referrer_profile);
        };
        
        ts::end(scenario);
    }

    // ==================== TEST: Trust Score Impact on Borrow Limit ====================

    #[test]
    fun test_trust_impact_on_borrow_limit() {
        let mut scenario = ts::begin(ADMIN);
        setup_registry(&mut scenario);
        
        create_profile(&mut scenario, REFERRER);
        
        ts::next_tx(&mut scenario, REFERRER);
        {
            let mut referrer_profile = ts::take_from_sender<CreditProfile>(&scenario);
            
            let initial_limit = credit_profile::calculate_max_borrow_limit(&referrer_profile);
            
            // Build high trust score
            let mut i = 0;
            while (i < 15) {
                credit_profile::record_referral_success(&mut referrer_profile, @0x100);
                i = i + 1;
            };
            
            let new_limit = credit_profile::calculate_max_borrow_limit(&referrer_profile);
            
            // Borrow limit should increase with trust
            assert!(new_limit > initial_limit, 0);
            
            ts::return_to_sender(&scenario, referrer_profile);
        };
        
        ts::end(scenario);
    }
}
