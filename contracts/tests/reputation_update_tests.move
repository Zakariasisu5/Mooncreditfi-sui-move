#[test_only]
module mooncreditfi::reputation_update_tests {
    use sui::test_scenario as ts;
    use mooncreditfi::credit_profile::{Self, ProfileRegistry, CreditProfile};

    const USER: address = @0x1;
    const ADMIN: address = @0xAD;

    #[test]
    fun test_reputation_increase_on_time_repayment() {
        let mut scenario = ts::begin(ADMIN);
        
        // Initialize the module (creates ProfileRegistry)
        {
            credit_profile::init_for_testing(ts::ctx(&mut scenario));
        };
        
        ts::next_tx(&mut scenario, USER);
        
        // Create profile
        {
            let mut registry = ts::take_shared<ProfileRegistry>(&scenario);
            credit_profile::create_profile(&mut registry, ts::ctx(&mut scenario));
            ts::return_shared(registry);
        };
        
        ts::next_tx(&mut scenario, USER);
        
        // Get profile and test reputation increase
        {
            let mut profile = ts::take_from_sender<CreditProfile>(&scenario);
            let initial_reputation = credit_profile::get_reputation(&profile);
            assert!(initial_reputation == 500, 0);
            
            // Update reputation for on-time repayment
            credit_profile::update_reputation_on_repayment(&mut profile, true);
            
            let new_reputation = credit_profile::get_reputation(&profile);
            assert!(new_reputation == 510, 1);
            
            let risk_level = credit_profile::get_risk_level(&profile);
            assert!(risk_level == 2, 2); // Still medium risk (400-749)
            
            ts::return_to_sender(&scenario, profile);
        };
        
        ts::end(scenario);
    }

    #[test]
    fun test_reputation_decrease_on_late_repayment() {
        let mut scenario = ts::begin(ADMIN);
        
        // Initialize the module (creates ProfileRegistry)
        {
            credit_profile::init_for_testing(ts::ctx(&mut scenario));
        };
        
        ts::next_tx(&mut scenario, USER);
        
        // Create profile
        {
            let mut registry = ts::take_shared<ProfileRegistry>(&scenario);
            credit_profile::create_profile(&mut registry, ts::ctx(&mut scenario));
            ts::return_shared(registry);
        };
        
        ts::next_tx(&mut scenario, USER);
        
        // Get profile and test reputation decrease
        {
            let mut profile = ts::take_from_sender<CreditProfile>(&scenario);
            let initial_reputation = credit_profile::get_reputation(&profile);
            assert!(initial_reputation == 500, 0);
            
            // Update reputation for late repayment
            credit_profile::update_reputation_on_repayment(&mut profile, false);
            
            let new_reputation = credit_profile::get_reputation(&profile);
            assert!(new_reputation == 480, 1);
            
            let risk_level = credit_profile::get_risk_level(&profile);
            assert!(risk_level == 2, 2); // Still medium risk (400-749)
            
            ts::return_to_sender(&scenario, profile);
        };
        
        ts::end(scenario);
    }

    #[test]
    fun test_reputation_cap_at_1000() {
        let mut scenario = ts::begin(ADMIN);
        
        // Initialize the module (creates ProfileRegistry)
        {
            credit_profile::init_for_testing(ts::ctx(&mut scenario));
        };
        
        ts::next_tx(&mut scenario, USER);
        
        // Create profile
        {
            let mut registry = ts::take_shared<ProfileRegistry>(&scenario);
            credit_profile::create_profile(&mut registry, ts::ctx(&mut scenario));
            ts::return_shared(registry);
        };
        
        ts::next_tx(&mut scenario, USER);
        
        // Get profile and test reputation cap
        {
            let mut profile = ts::take_from_sender<CreditProfile>(&scenario);
            
            // Set reputation to 995
            credit_profile::update_reputation(&mut profile, 995);
            
            // Update reputation for on-time repayment (should cap at 1000)
            credit_profile::update_reputation_on_repayment(&mut profile, true);
            
            let new_reputation = credit_profile::get_reputation(&profile);
            assert!(new_reputation == 1000, 0);
            
            let risk_level = credit_profile::get_risk_level(&profile);
            assert!(risk_level == 1, 1); // Low risk (>=750)
            
            ts::return_to_sender(&scenario, profile);
        };
        
        ts::end(scenario);
    }

    #[test]
    fun test_reputation_floor_at_0() {
        let mut scenario = ts::begin(ADMIN);
        
        // Initialize the module (creates ProfileRegistry)
        {
            credit_profile::init_for_testing(ts::ctx(&mut scenario));
        };
        
        ts::next_tx(&mut scenario, USER);
        
        // Create profile
        {
            let mut registry = ts::take_shared<ProfileRegistry>(&scenario);
            credit_profile::create_profile(&mut registry, ts::ctx(&mut scenario));
            ts::return_shared(registry);
        };
        
        ts::next_tx(&mut scenario, USER);
        
        // Get profile and test reputation floor
        {
            let mut profile = ts::take_from_sender<CreditProfile>(&scenario);
            
            // Set reputation to 10
            credit_profile::update_reputation(&mut profile, 10);
            
            // Update reputation for late repayment (should floor at 0)
            credit_profile::update_reputation_on_repayment(&mut profile, false);
            
            let new_reputation = credit_profile::get_reputation(&profile);
            assert!(new_reputation == 0, 0);
            
            let risk_level = credit_profile::get_risk_level(&profile);
            assert!(risk_level == 3, 1); // High risk (<400)
            
            ts::return_to_sender(&scenario, profile);
        };
        
        ts::end(scenario);
    }

    #[test]
    fun test_risk_level_transitions() {
        let mut scenario = ts::begin(ADMIN);
        
        // Initialize the module (creates ProfileRegistry)
        {
            credit_profile::init_for_testing(ts::ctx(&mut scenario));
        };
        
        ts::next_tx(&mut scenario, USER);
        
        // Create profile
        {
            let mut registry = ts::take_shared<ProfileRegistry>(&scenario);
            credit_profile::create_profile(&mut registry, ts::ctx(&mut scenario));
            ts::return_shared(registry);
        };
        
        ts::next_tx(&mut scenario, USER);
        
        // Get profile and test risk level transitions
        {
            let mut profile = ts::take_from_sender<CreditProfile>(&scenario);
            
            // Test low risk (>=750)
            credit_profile::update_reputation(&mut profile, 750);
            credit_profile::update_reputation_on_repayment(&mut profile, true);
            assert!(credit_profile::get_risk_level(&profile) == 1, 0);
            
            // Test medium risk (400-749)
            credit_profile::update_reputation(&mut profile, 600);
            credit_profile::update_reputation_on_repayment(&mut profile, false);
            assert!(credit_profile::get_risk_level(&profile) == 2, 1);
            
            // Test high risk (<400)
            credit_profile::update_reputation(&mut profile, 350);
            credit_profile::update_reputation_on_repayment(&mut profile, false);
            assert!(credit_profile::get_risk_level(&profile) == 3, 2);
            
            ts::return_to_sender(&scenario, profile);
        };
        
        ts::end(scenario);
    }
}
