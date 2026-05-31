#[allow(duplicate_alias)]
module mooncreditfi::credit_profile {
    use sui::object::{Self, UID};
    use sui::tx_context::TxContext;
    use sui::event;
    use sui::table::{Self, Table};
    use std::vector;
    use mooncreditfi::credit_scoring;

    public struct ProfileRegistry has key {
        id: UID,
        profiles: Table<address, address>,  // user address -> profile_id mapping
    }

    public struct CreditProfile has key, store {
        id: UID,
        owner: address,
        score: u64,
        debt: u64,
        reputation: u64,
        risk_level: u8,    
        total_borrowed: u64,
        total_repaid: u64,
        loan_count: u64,
        default_count: u64,
        repayment_history_count: u64,
        last_activity_time: u64,
        last_loan_time: u64,
        active_loans: vector<address>,
    }
    
    // Error codes
    const EProfileAlreadyExists: u64 = 10;
    
    public struct ProfileCreated has copy, drop {
        profile_id: address,
        owner: address,
        initial_score: u64,
    }

    fun init(ctx: &mut TxContext) {
        let registry = ProfileRegistry {
            id: object::new(ctx),
            profiles: table::new(ctx),
        };
        transfer::share_object(registry);
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }

    public fun create_profile(registry: &mut ProfileRegistry, ctx: &mut TxContext) {
        let sender = tx_context::sender(ctx);
        
        assert!(!table::contains(&registry.profiles, sender), EProfileAlreadyExists);
        
        let uid = object::new(ctx);
        let profile_id = object::uid_to_address(&uid);
        
        let profile = CreditProfile {
            id: uid,
            owner: sender,
            score: credit_scoring::get_default_score(), // 500
            debt: 0,
            reputation: 500,
            risk_level: 2, 
            total_borrowed: 0,
            total_repaid: 0,
            loan_count: 0,
            default_count: 0,
            repayment_history_count: 0,
            last_activity_time: 0,
            last_loan_time: 0,
            active_loans: vector::empty(),
        };


        table::add(&mut registry.profiles, sender, profile_id);

        event::emit(ProfileCreated {
            profile_id,
            owner: sender,
            initial_score: credit_scoring::get_default_score(),
        });

        transfer::public_transfer(profile, sender);
    }

    public fun get_score(profile: &CreditProfile): u64 { profile.score }
    public fun get_owner(profile: &CreditProfile): address { profile.owner }
    public fun get_total_borrowed(profile: &CreditProfile): u64 { profile.total_borrowed }
    public fun get_total_repaid(profile: &CreditProfile): u64 { profile.total_repaid }
    public fun get_loan_count(profile: &CreditProfile): u64 { profile.loan_count }
    public fun get_default_count(profile: &CreditProfile): u64 { profile.default_count }
    public fun get_debt(profile: &CreditProfile): u64 { profile.debt }
    public fun get_reputation(profile: &CreditProfile): u64 { profile.reputation }
    public fun get_risk_level(profile: &CreditProfile): u8 { profile.risk_level }
    public fun get_repayment_history_count(profile: &CreditProfile): u64 { profile.repayment_history_count }
    public fun get_last_activity_time(profile: &CreditProfile): u64 { profile.last_activity_time }
    public fun get_last_loan_time(profile: &CreditProfile): u64 { profile.last_loan_time }
    public fun get_active_loans(profile: &CreditProfile): &vector<address> { &profile.active_loans }
    
    public fun calculate_max_borrow_limit(profile: &CreditProfile): u64 {
        credit_scoring::calculate_max_borrow_limit(profile.score)
    }

    public fun calculate_interest_rate(profile: &CreditProfile): u64 {
        credit_scoring::calculate_interest_rate(profile.score)
    }

    public(package) fun update_score(profile: &mut CreditProfile, new_score: u64) {
        profile.score = new_score;
    }

    public(package) fun update_activity_time(profile: &mut CreditProfile, timestamp: u64) {
        profile.last_activity_time = timestamp;
    }

    public(package) fun update_reputation(profile: &mut CreditProfile, new_reputation: u64) {
        profile.reputation = new_reputation;
    }

    public(package) fun update_risk_level(profile: &mut CreditProfile, new_risk_level: u8) {
        profile.risk_level = new_risk_level;
    }

    public(package) fun update_reputation_on_repayment(profile: &mut CreditProfile, is_on_time: bool) {
        if (is_on_time) {
            // Increase reputation by 10, capped at 1000
            if (profile.reputation < 1000) {
                let new_reputation = profile.reputation + 10;
                if (new_reputation > 1000) {
                    profile.reputation = 1000;
                } else {
                    profile.reputation = new_reputation;
                };
            };
        } else {
            // Decrease reputation by 20, floored at 0
            if (profile.reputation >= 20) {
                profile.reputation = profile.reputation - 20;
            } else {
                profile.reputation = 0;
            };
        };
        
        // Update risk_level based on new reputation
        if (profile.reputation >= 750) {
            profile.risk_level = 1;  // low risk
        } else if (profile.reputation >= 400) {
            profile.risk_level = 2;  // medium risk
        } else {
            profile.risk_level = 3;  // high risk
        };
    }

    public(package) fun record_borrow(profile: &mut CreditProfile, amount: u64, timestamp: u64) {
        profile.debt = profile.debt + amount;
        profile.total_borrowed = profile.total_borrowed + amount;
        profile.loan_count = profile.loan_count + 1;
        profile.last_activity_time = timestamp;
        profile.last_loan_time = timestamp;
    }
    
    public(package) fun add_loan_to_profile(profile: &mut CreditProfile, loan_id: address) {
        vector::push_back(&mut profile.active_loans, loan_id);
    }
    
    public(package) fun remove_loan_from_profile(profile: &mut CreditProfile, loan_id: address) {
        let (found, index) = vector::index_of(&profile.active_loans, &loan_id);
        if (found) {
            vector::remove(&mut profile.active_loans, index);
        };
    }

    public(package) fun record_full_repayment(
        profile: &mut CreditProfile, 
        amount: u64,
        is_early: bool,
        timestamp: u64
    ): bool {
        assert!(amount >= profile.debt, 0);
        
        profile.total_repaid = profile.total_repaid + profile.debt;
        profile.debt = 0;
        profile.repayment_history_count = profile.repayment_history_count + 1;
        profile.last_activity_time = timestamp;
        
        if (is_early) {
            profile.score = credit_scoring::calculate_score_after_early_repayment(profile.score);
        } else {
            profile.score = credit_scoring::calculate_score_after_on_time_repayment(profile.score);
        };
        
        true
    }
    public(package) fun record_partial_repayment(
        profile: &mut CreditProfile, 
        amount: u64,
        timestamp: u64
    ): u64 {
        assert!(amount <= profile.debt, 1);
        
        profile.debt = profile.debt - amount;
        profile.total_repaid = profile.total_repaid + amount;
        profile.last_activity_time = timestamp;
        profile.score = credit_scoring::calculate_score_after_partial_repayment(profile.score);
        amount
    }
    public(package) fun record_late_repayment(
        profile: &mut CreditProfile,
        amount: u64,
        timestamp: u64
    ) {
        profile.total_repaid = profile.total_repaid + amount;
        profile.debt = if (profile.debt >= amount) { profile.debt - amount } else { 0 };
        profile.last_activity_time = timestamp;
        profile.score = credit_scoring::calculate_score_after_late_repayment(profile.score);
    }
    public(package) fun record_default(profile: &mut CreditProfile, timestamp: u64) {
        profile.default_count = profile.default_count + 1;
        profile.last_activity_time = timestamp;
        profile.score = credit_scoring::calculate_score_after_default(profile.score);
    }
    public(package) fun recalculate_comprehensive_score(profile: &mut CreditProfile) {
        profile.score = credit_scoring::calculate_comprehensive_score(
            profile.score,
            profile.total_borrowed,
            profile.total_repaid,
            profile.debt,
            profile.loan_count,
            profile.default_count,
        );
    }
    
    public fun has_profile(registry: &ProfileRegistry, user: address): bool {
        table::contains(&registry.profiles, user)
    }
    
    public fun get_profile_id(registry: &ProfileRegistry, user: address): address {
        *table::borrow(&registry.profiles, user)
    }
}
