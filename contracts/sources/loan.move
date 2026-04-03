module mooncreditfi::loan {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::clock::{Self, Clock};
    use sui::event;

    const ELoanAlreadyRepaid: u64 = 100;
    const ELoanNotDue: u64 = 101;
    const ENotBorrower: u64 = 102;
    const EInsufficientPayment: u64 = 103;
    const EZeroPayment: u64 = 104;
    const LOAN_DURATION_30_DAYS: u64 = 2592000000;
    const LOAN_DURATION_60_DAYS: u64 = 5184000000;
    const LOAN_DURATION_90_DAYS: u64 = 7776000000;
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
        }
    }

    public(package) fun record_payment(
        loan: &mut Loan,
        amount: u64,
        ctx: &TxContext
    ): (u64, bool) {
        let sender = tx_context::sender(ctx);
        assert!(loan.borrower == sender, ENotBorrower);
        assert!(!loan.is_repaid, ELoanAlreadyRepaid);
        assert!(amount > 0, 104);

        let remaining = loan.total_owed - loan.amount_repaid;
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

    public(package) fun mark_defaulted(loan: &mut Loan) {
        assert!(!loan.is_repaid, ELoanAlreadyRepaid);
        loan.is_defaulted = true;
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

    public entry fun transfer_loan(loan: Loan, recipient: address, _ctx: &mut TxContext) {
        transfer::transfer(loan, recipient);
    }

    public entry fun delete_repaid_loan(loan: Loan, _ctx: &mut TxContext) {
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
            is_defaulted: _ 
        } = loan;
        object::delete(id);
    }
}
