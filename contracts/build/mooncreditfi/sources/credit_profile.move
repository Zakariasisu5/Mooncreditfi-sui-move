module mooncreditfi::credit_profile {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use mooncreditfi::credit_scoring;

    public struct CreditProfile has key, store {
        id: UID,
        owner: address,
        score: u64,
        debt: u64,
        total_borrowed: u64,
        total_repaid: u64,
        loan_count: u64,
        default_count: u64,
        repayment_history_count: u64,
        last_activity_time: u64,
    }
    public struct ProfileCreated has copy, drop {
        profile_id: address,
        owner: address,
        initial_score: u64,
    }

    public entry fun create_profile(ctx: &mut TxContext) {
        let sender = tx_context::sender(ctx);
        let uid = object::new(ctx);
        let profile_id = object::uid_to_address(&uid);
        
        let profile = CreditProfile {
            id: uid,
            owner: sender,
            score: credit_scoring::get_default_score(), // 500
            debt: 0,
            total_borrowed: 0,
            total_repaid: 0,
            loan_count: 0,
            default_count: 0,
            repayment_history_count: 0,
            last_activity_time: 0,
        };

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
    public fun get_repayment_history_count(profile: &CreditProfile): u64 { profile.repayment_history_count }
    public fun get_last_activity_time(profile: &CreditProfile): u64 { profile.last_activity_time }
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

    public(package) fun record_borrow(profile: &mut CreditProfile, amount: u64, timestamp: u64) {
        profile.debt = profile.debt + amount;
        profile.total_borrowed = profile.total_borrowed + amount;
        profile.loan_count = profile.loan_count + 1;
        profile.last_activity_time = timestamp;
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
}
