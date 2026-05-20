#[allow(duplicate_alias)]
module mooncreditfi::loan {
    use sui::object::{Self, UID};
    use sui::tx_context::TxContext;
    use sui::clock::{Self, Clock};
    use sui::event;
    use std::option::{Self, Option};

    const ELoanAlreadyRepaid: u64 = 100;
    const ENotBorrower: u64 = 102;
    
    const DEFAULT_PENALTY_RATE: u64 = 500; // 5% annual penalty rate (500 basis points)
    public struct Loan has key, store {
        id: UID,
        borrower: address,
        principal: u64,
        interest_rate: u64,
        start_time: u64,
        due_time: u64,
        total_owed: u64,
        amount_repaid: u64,
        is_repaid: bool,
        is_defaulted: bool,
        penalty_rate: u64,
        overdue_since: Option<u64>,
    }
    public struct LoanCreated has copy, drop {
        loan_id: address,
        borrower: address,
        principal: u64,
        interest_rate: u64,
        due_time: u64,
        total_owed: u64,
    }

    public struct LoanRepaid has copy, drop {
        loan_id: address,
        borrower: address,
        amount: u64,
        remaining: u64,
        is_fully_repaid: bool,
    }

    public struct LoanDefaulted has copy, drop {
        loan_id: address,
        borrower: address,
        amount_owed: u64,
    }
    
    #[allow(unused_field)]
    public struct PenaltyAccrued has copy, drop {
        loan_id: address,
        borrower: address,
        penalty_amount: u64,
        overdue_time_ms: u64,
    }

    public(package) fun create_loan(
        borrower: address,
        principal: u64,
        interest_rate: u64,
        duration_days: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ): Loan {
        let current_time = clock::timestamp_ms(clock);
        let duration_ms = duration_days * 86400000;
        let due_time = current_time + duration_ms;
        let interest = (principal * interest_rate * duration_days) / (365 * 10000);
        let total_owed = principal + interest;
        let uid = object::new(ctx);
        let loan_id = object::uid_to_address(&uid);

        event::emit(LoanCreated {
            loan_id,
            borrower,
            principal,
            interest_rate,
            due_time,
            total_owed,
        });

        Loan {
            id: uid,
            borrower,
            principal,
            interest_rate,
            start_time: current_time,
            due_time,
            total_owed,
            amount_repaid: 0,
            is_repaid: false,
            is_defaulted: false,
            penalty_rate: DEFAULT_PENALTY_RATE,
            overdue_since: option::none(),
        }
    }

    public fun calculate_current_owed(loan: &Loan, clock: &Clock): u64 {
        if (loan.is_repaid) {
            return 0
        };
        
        let base_owed = loan.total_owed - loan.amount_repaid;
        
        // If loan is overdue, calculate and add penalty
        if (is_overdue(loan, clock) && option::is_some(&loan.overdue_since)) {
            let current_time = clock::timestamp_ms(clock);
            let overdue_start = *option::borrow(&loan.overdue_since);
            let overdue_time_ms = current_time - overdue_start;
            
            // Calculate penalty: (base_owed * penalty_rate * overdue_time_ms) / (365 days in ms * 10000 basis points)
            // penalty_rate is in basis points (e.g., 500 = 5%)
            let penalty = (base_owed * loan.penalty_rate * overdue_time_ms) / (365 * 86400000 * 10000);
            base_owed + penalty
        } else {
            base_owed
        }
    }

    public(package) fun record_payment(
        loan: &mut Loan,
        amount: u64,
        clock: &Clock,
        ctx: &TxContext
    ): (u64, bool) {
        let sender = tx_context::sender(ctx);
        assert!(loan.borrower == sender, ENotBorrower);
        assert!(!loan.is_repaid, ELoanAlreadyRepaid);
        assert!(amount > 0, 104);

        let current_owed = calculate_current_owed(loan, clock);
        let remaining = current_owed - loan.amount_repaid;
        
        let amount_applied = if (amount >= remaining) {
            loan.amount_repaid = loan.total_owed;
            loan.is_repaid = true;
            remaining
        } else {
            loan.amount_repaid = loan.amount_repaid + amount;
            amount
        };

        let loan_id = object::uid_to_address(&loan.id);
        event::emit(LoanRepaid {
            loan_id,
            borrower: loan.borrower,
            amount: amount_applied,
            remaining: loan.total_owed - loan.amount_repaid,
            is_fully_repaid: loan.is_repaid,
        });

        (amount_applied, loan.is_repaid)
    }

    public(package) fun mark_defaulted(loan: &mut Loan, clock: &Clock) {
        assert!(!loan.is_repaid, ELoanAlreadyRepaid);
        loan.is_defaulted = true;
        
        if (option::is_none(&loan.overdue_since)) {
            let current_time = clock::timestamp_ms(clock);
            loan.overdue_since = option::some(current_time);
        };
        
        let loan_id = object::uid_to_address(&loan.id);
        event::emit(LoanDefaulted {
            loan_id,
            borrower: loan.borrower,
            amount_owed: loan.total_owed - loan.amount_repaid,
        });
    }
    public fun is_overdue(loan: &Loan, clock: &Clock): bool {
        let current_time = clock::timestamp_ms(clock);
        !loan.is_repaid && current_time > loan.due_time
    }

    public fun is_early_repayment(loan: &Loan, clock: &Clock): bool {
        let current_time = clock::timestamp_ms(clock);
        loan.is_repaid && current_time < loan.due_time
    }

    public fun get_borrower(loan: &Loan): address { loan.borrower }
    public fun get_loan_id(loan: &Loan): address { object::uid_to_address(&loan.id) }
    public fun get_principal(loan: &Loan): u64 { loan.principal }
    public fun get_interest_rate(loan: &Loan): u64 { loan.interest_rate }
    public fun get_start_time(loan: &Loan): u64 { loan.start_time }
    public fun get_due_time(loan: &Loan): u64 { loan.due_time }
    public fun get_total_owed(loan: &Loan): u64 { loan.total_owed }
    public fun get_amount_repaid(loan: &Loan): u64 { loan.amount_repaid }
    public fun is_repaid(loan: &Loan): bool { loan.is_repaid }
    public fun is_defaulted(loan: &Loan): bool { loan.is_defaulted }
    public fun get_remaining_amount(loan: &Loan): u64 { 
        loan.total_owed - loan.amount_repaid 
    }
    
    public fun get_penalty_rate(loan: &Loan): u64 { loan.penalty_rate }
    public fun get_overdue_since(loan: &Loan): Option<u64> { loan.overdue_since }

    // SECURITY: Loan transfers are intentionally disabled to prevent debt escaping
    // 
    // Vulnerability C-02: If loans could be transferred, borrowers could:
    // 1. Borrow funds with their good credit score
    // 2. Transfer the loan to a burner address
    // 3. Their credit profile would show no debt
    // 4. They could borrow again, repeating the exploit
    //
    // Loans are non-transferable and must be held by the original borrower.
    // This ensures debt accountability and prevents credit score manipulation.
    //
    // If transfer functionality is needed in the future, it must:
    // - Update both old and new owner's credit profiles
    // - Require protocol admin approval
    // - Emit transfer events for tracking
    // - Validate recipient's creditworthiness

    public fun delete_repaid_loan(loan: Loan, _ctx: &mut TxContext) {
        assert!(loan.is_repaid, ELoanAlreadyRepaid);
        let Loan { 
            id, 
            borrower: _, 
            principal: _, 
            interest_rate: _, 
            start_time: _, 
            due_time: _, 
            total_owed: _, 
            amount_repaid: _, 
            is_repaid: _, 
            is_defaulted: _,
            penalty_rate: _,
            overdue_since: _,
        } = loan;
        object::delete(id);
    }
}
