module mooncreditfi::credit_scoring {
    const MIN_CREDIT_SCORE: u64 = 300;
    const MAX_CREDIT_SCORE: u64 = 850;
    const DEFAULT_CREDIT_SCORE: u64 = 500;
    const SCORE_BOOST_ON_TIME: u64 = 20;
    const SCORE_BOOST_EARLY: u64 = 30;
    const SCORE_BOOST_PARTIAL: u64 = 5;
    const SCORE_PENALTY_LATE: u64 = 50;
    const SCORE_PENALTY_DEFAULT: u64 = 100;
    const MULTIPLIER_EXCELLENT: u64 = 100;
    const MULTIPLIER_GOOD: u64 = 50;
    const MULTIPLIER_FAIR: u64 = 25;
    const MULTIPLIER_POOR: u64 = 10;
    const MULTIPLIER_BAD: u64 = 0;
    const INTEREST_RATE_EXCELLENT: u64 = 300;
    const INTEREST_RATE_GOOD: u64 = 500;
    const INTEREST_RATE_FAIR: u64 = 800;
    const INTEREST_RATE_POOR: u64 = 1200;
    const INTEREST_RATE_BAD: u64 = 1800;
    public fun calculate_max_borrow_limit(credit_score: u64): u64 {
        if (credit_score >= 850) {
            MULTIPLIER_EXCELLENT * 1_000_000_000 // 100 SUI
        } else if (credit_score >= 750) {
            MULTIPLIER_GOOD * 1_000_000_000      // 50 SUI
        } else if (credit_score >= 650) {
            MULTIPLIER_FAIR * 1_000_000_000      // 25 SUI
        } else if (credit_score >= 500) {
            MULTIPLIER_POOR * 1_000_000_000      // 10 SUI
        } else {
            MULTIPLIER_BAD                        // 0 SUI
        }
    }

    public fun calculate_interest_rate(credit_score: u64): u64 {
        if (credit_score >= 850) {
            INTEREST_RATE_EXCELLENT  // 3%
        } else if (credit_score >= 750) {
            INTEREST_RATE_GOOD       // 5%
        } else if (credit_score >= 650) {
            INTEREST_RATE_FAIR       // 8%
        } else if (credit_score >= 500) {
            INTEREST_RATE_POOR       // 12%
        } else {
            INTEREST_RATE_BAD        // 18%
        }
    }

    public fun calculate_score_after_on_time_repayment(current_score: u64): u64 {
        let new_score = current_score + SCORE_BOOST_ON_TIME;
        if (new_score > MAX_CREDIT_SCORE) {
            MAX_CREDIT_SCORE
        } else {
            new_score
        }
    }

    public fun calculate_score_after_early_repayment(current_score: u64): u64 {
        let new_score = current_score + SCORE_BOOST_EARLY;
        if (new_score > MAX_CREDIT_SCORE) {
            MAX_CREDIT_SCORE
        } else {
            new_score
        }
    }

    public fun calculate_score_after_partial_repayment(current_score: u64): u64 {
        let new_score = current_score + SCORE_BOOST_PARTIAL;
        if (new_score > MAX_CREDIT_SCORE) {
            MAX_CREDIT_SCORE
        } else {
            new_score
        }
    }

    public fun calculate_score_after_late_repayment(current_score: u64): u64 {
        if (current_score > SCORE_PENALTY_LATE + MIN_CREDIT_SCORE) {
            current_score - SCORE_PENALTY_LATE
        } else {
            MIN_CREDIT_SCORE
        }
    }

    public fun calculate_score_after_default(current_score: u64): u64 {
        if (current_score > SCORE_PENALTY_DEFAULT + MIN_CREDIT_SCORE) {
            current_score - SCORE_PENALTY_DEFAULT
        } else {
            MIN_CREDIT_SCORE
        }
    }

    public fun calculate_comprehensive_score(
        base_score: u64,
        total_borrowed: u64,
        total_repaid: u64,
        active_debt: u64,
        loan_count: u64,
        default_count: u64,
    ): u64 {
        let mut score = base_score;

        if (total_borrowed > 0) {
            let repayment_ratio = (total_repaid * 100) / total_borrowed;
            if (repayment_ratio >= 95) {
                score = score + 40;
            } else if (repayment_ratio >= 80) {
                score = score + 20;
            } else if (repayment_ratio < 50) {
                if (score > 30) { score = score - 30; };
            };
        };

        if (total_borrowed > 0) {
            let debt_ratio = (active_debt * 100) / total_borrowed;
            if (debt_ratio == 0) {
                score = score + 30;
            } else if (debt_ratio < 30) {
                score = score + 15;
            } else if (debt_ratio > 70) {
                if (score > 20) { score = score - 20; };
            };
        };

        if (loan_count >= 10) {
            score = score + 20;
        } else if (loan_count >= 5) {
            score = score + 10;
        };

        if (default_count > 0) {
            let penalty = default_count * 50;
            if (score > penalty) {
                score = score - penalty;
            } else {
                score = MIN_CREDIT_SCORE;
            };
        };

        if (score > MAX_CREDIT_SCORE) {
            MAX_CREDIT_SCORE
        } else if (score < MIN_CREDIT_SCORE) {
            MIN_CREDIT_SCORE
        } else {
            score
        }
    }
    public fun get_score_tier(credit_score: u64): vector<u8> {
        if (credit_score >= 850) {
            b"Excellent"
        } else if (credit_score >= 750) {
            b"Good"
        } else if (credit_score >= 650) {
            b"Fair"
        } else if (credit_score >= 500) {
            b"Poor"
        } else {
            b"Bad"
        }
    }

    public fun can_borrow(credit_score: u64): bool { credit_score >= 500 }
    public fun get_min_score(): u64 { MIN_CREDIT_SCORE }
    public fun get_max_score(): u64 { MAX_CREDIT_SCORE }
    public fun get_default_score(): u64 { DEFAULT_CREDIT_SCORE }
}
