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
        debt: u64,              // Current outstanding debt (principal only)
        total_borrowed: u64,    // Lifetime total borrowed
        total_repaid: u64,      // Lifetime total repaid
        loan_count: u64,        // Number of loans taken
        default_count: u64,     // Number of defaults
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
            debt: 0,    // No debt initially
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

    /// Get current debt
    public fun get_debt(profile: &CreditProfile): u64 {
        profile.debt
    }

    /// Update score (internal function)
    public(package) fun update_score(profile: &mut CreditProfile, new_score: u64) {
        profile.score = new_score;
    }

    /// Record a borrow - updates debt and lifetime stats
    public(package) fun record_borrow(profile: &mut CreditProfile, amount: u64) {
        profile.debt = profile.debt + amount;              // Increase current debt
        profile.total_borrowed = profile.total_borrowed + amount;  // Track lifetime borrowed
        profile.loan_count = profile.loan_count + 1;       // Increment loan count
    }

    /// Record a full repayment - clears debt and rewards credit score
    /// Returns true if debt was fully paid
    public(package) fun record_full_repayment(profile: &mut CreditProfile, amount: u64): bool {
        assert!(amount >= profile.debt, 0); // Must pay at least the debt
        
        profile.total_repaid = profile.total_repaid + profile.debt;  // Track actual debt repaid
        profile.debt = 0;  // Clear debt
        
        // Reward good behavior with significant score increase
        if (profile.score <= 830) {
            profile.score = profile.score + 20;
        } else if (profile.score < 850) {
            profile.score = 850; // Cap at maximum
        };
        
        true
    }

    /// Record a partial repayment - reduces debt and gives small score boost
    /// Returns the amount actually applied to debt
    public(package) fun record_partial_repayment(profile: &mut CreditProfile, amount: u64): u64 {
        assert!(amount <= profile.debt, 1); // Cannot pay more than debt in partial repayment
        
        profile.debt = profile.debt - amount;              // Reduce current debt
        profile.total_repaid = profile.total_repaid + amount;  // Track lifetime repaid
        
        // Small score increase for partial repayment
        if (profile.score <= 845) {
            profile.score = profile.score + 5;
        };
        
        amount
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
