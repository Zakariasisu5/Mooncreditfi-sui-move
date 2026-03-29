module mooncreditfi::credit_profile {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;

    /// Credit profile for a user
    public struct CreditProfile has key, store {
        id: UID,
        owner: address,
        score: u64,
        total_borrowed: u64,
        total_repaid: u64,
        loan_count: u64,
        default_count: u64,
    }

    /// Event emitted when a credit profile is created
    public struct ProfileCreated has copy, drop {
        profile_id: address,
        owner: address,
        initial_score: u64,
    }

    /// Create a new credit profile and transfer to sender (UI-callable)
    /// This function has NO parameters except TxContext - maximum UI compatibility
    public entry fun create_profile(
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let uid = object::new(ctx);
        let profile_id = object::uid_to_address(&uid);
        
        let profile = CreditProfile {
            id: uid,
            owner: sender,
            score: 500, // Starting score
            total_borrowed: 0,
            total_repaid: 0,
            loan_count: 0,
            default_count: 0,
        };

        // Emit event for debugging
        event::emit(ProfileCreated {
            profile_id,
            owner: sender,
            initial_score: 500,
        });

        // Transfer to sender using public_transfer
        transfer::public_transfer(profile, sender);
    }

    /// Get credit score
    public fun get_score(profile: &CreditProfile): u64 {
        profile.score
    }

    /// Get owner
    public fun get_owner(profile: &CreditProfile): address {
        profile.owner
    }

    /// Get total borrowed
    public fun get_total_borrowed(profile: &CreditProfile): u64 {
        profile.total_borrowed
    }

    /// Get total repaid
    public fun get_total_repaid(profile: &CreditProfile): u64 {
        profile.total_repaid
    }

    /// Get loan count
    public fun get_loan_count(profile: &CreditProfile): u64 {
        profile.loan_count
    }

    /// Get default count
    public fun get_default_count(profile: &CreditProfile): u64 {
        profile.default_count
    }

    /// Update score (internal function)
    public(package) fun update_score(profile: &mut CreditProfile, new_score: u64) {
        profile.score = new_score;
    }

    /// Record a borrow
    public(package) fun record_borrow(profile: &mut CreditProfile, amount: u64) {
        profile.total_borrowed = profile.total_borrowed + amount;
        profile.loan_count = profile.loan_count + 1;
    }

    /// Record a repayment
    public(package) fun record_repayment(profile: &mut CreditProfile, amount: u64) {
        profile.total_repaid = profile.total_repaid + amount;
        // Increase score on successful repayment
        if (profile.score < 850) {
            profile.score = profile.score + 10;
        };
    }

    /// Record a default
    public(package) fun record_default(profile: &mut CreditProfile) {
        profile.default_count = profile.default_count + 1;
        // Decrease score on default
        if (profile.score > 50) {
            profile.score = profile.score - 50;
        } else {
            profile.score = 300; // Minimum score
        };
    }
}
