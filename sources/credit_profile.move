module mooncreditfi::credit_profile {

    use sui::object::{UID};
    use sui::tx_context::{TxContext};
    use sui::tx_context;
    use sui::transfer;

    public struct CreditProfile has key, store {
        id: UID,
        owner: address,
        score: u64,
        total_borrowed: u64,
        total_repaid: u64,
        loan_count: u64,
        default_count: u64,
    }

    public entry fun create_profile(ctx: &mut TxContext) {
        let sender = tx_context::sender(ctx);

        let profile = CreditProfile {
            id: object::new(ctx),
            owner: sender,
            score: 500,
    /// Create a new credit profile and transfer to sender (UI-callable)
    public entry fun create_profile(
        _dummy: u64, // Dummy parameter for Bitlabs IDE compatibility (just pass 0)
        ctx: &mut TxContext
    ) { };

        transfer::transfer(profile, sender);
    }

    public(package) fun record_borrow(profile: &mut CreditProfile, amount: u64) {
        profile.total_borrowed = profile.total_borrowed + amount;
        profile.loan_count = profile.loan_count + 1;
    }

    public(package) fun record_repayment(profile: &mut CreditProfile, amount: u64) {
        profile.total_repaid = profile.total_repaid + amount;

        if (profile.score < 850) {
            profile.score = profile.score + 10;
        };
    }
}