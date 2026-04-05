module mooncreditfi::credit_scoring {
    // Credit score range
    const MIN_CREDIT_SCORE: u64 = 300;
    const MAX_CREDIT_SCORE: u64 = 850;
    const DEFAULT_CREDIT_SCORE: u64 = 500;

    // Trust score range
    const MAX_TRUST_SCORE: u64 = 1000;
    const TRUST_SCORE_WEIGHT: u64 = 15;  // Trust score contributes up to 15% boost

    // Score adjustments
    const SCORE_BOOST_ON_TIME: u64 = 20;
    const SCORE_BOOST_EARLY: u64 = 30;
    const SCORE_BOOST_PARTIAL: u64 = 5;
    const SCORE_PENALTY_LATE: u64 = 75;        // Increased from 50
    const SCORE_PENALTY_DEFAULT: u64 = 150;    // Increased from 100

    // Enhanced borrow limits for credit-based lending (in SUI, multiplied by 1_000_000_000)
    const MULTIPLIER_EXCELLENT: u64 = 100;  // 100 SUI (score >= 750)
    const MULTIPLIER_GOOD: u64 = 50;        // 50 SUI (score >= 650)
    const MULTIPLIER_FAIR: u64 = 25;        // 25 SUI (score >= 550)
    const MULTIPLIER_POOR: u64 = 10;        // 10 SUI (score >= 500)
    const MULTIPLIER_NEW: u64 = 5;          // 5 SUI (score >= 450) - New users
    const MULTIPLIER_BAD: u64 = 0;          // 0 SUI (score < 450)

    // Interest rates (in basis points, 100 = 1%)
    const INTEREST_RATE_EXCELLENT: u64 = 300;   // 3%
    const INTEREST_RATE_GOOD: u64 = 500;        // 5%
    const INTEREST_RATE_FAIR: u64 = 800;        // 8%
    const INTEREST_RATE_POOR: u64 = 1200;       // 12%
    const INTEREST_RATE_NEW: u64 = 1500;        // 15%
    const INTEREST_RATE_BAD: u64 = 1800;        // 18%

    // Trust score bonus multipliers (in basis points)
    const TRUST_BORROW_BONUS_HIGH: u64 = 2000;    // 20% increase for high trust
    const TRUST_BORROW_BONUS_MEDIUM: u64 = 1000;  // 10% increase for medium trust
    const TRUST_BORROW_BONUS_LOW: u64 = 500;      // 5% increase for low trust

    const TRUST_INTEREST_DISCOUNT_HIGH: u64 = 100;   // -1% for high trust
    const TRUST_INTEREST_DISCOUNT_MEDIUM: u64 = 50;  // -0.5% for medium trust

    // ==================== COMBINED SCORE CALCULATION ====================

    /// Calculate combined score (credit + trust bonus)
    /// Trust score adds up to 15% boost to credit score
    public fun calculate_combined_score(credit_score: u64, trust_score: u64): u64 {
        // Trust score contributes proportionally (max 15% boost)
        let trust_bonus = (trust_score * TRUST_SCORE_WEIGHT) / 100;
        
        let combined = credit_score + trust_bonus;
        
        // Cap at maximum credit score
        if (combined > MAX_CREDIT_SCORE) {
            MAX_CREDIT_SCORE
        } else {
            combined
        }
    }

    /// Calculate maximum borrow limit with trust score bonus
    public fun calculate_max_borrow_limit_with_trust(combined_score: u64, trust_score: u64): u64 {
        // Base limit from combined score
        let base_limit = calculate_max_borrow_limit(combined_score);
        
        // Apply trust bonus multiplier
        let trust_multiplier = if (trust_score >= 700) {
            TRUST_BORROW_BONUS_HIGH  // 20% bonus
        } else if (trust_score >= 400) {
            TRUST_BORROW_BONUS_MEDIUM  // 10% bonus
        } else if (trust_score >= 200) {
            TRUST_BORROW_BONUS_LOW  // 5% bonus
        } else {
            10000  // No bonus
        };
        
        // Apply multiplier
        (base_limit * trust_multiplier) / 10000
    }

    /// Calculate interest rate with trust score discount
    public fun calculate_interest_rate_with_trust(combined_score: u64, trust_score: u64): u64 {
        // Base rate from combined score
        let base_rate = calculate_interest_rate(combined_score);
        
        // Apply trust discount
        let discount = if (trust_score >= 700) {
            TRUST_INTEREST_DISCOUNT_HIGH  // -1%
        } else if (trust_score >= 400) {
            TRUST_INTEREST_DISCOUNT_MEDIUM  // -0.5%
        } else {
            0  // No discount
        };
        
        // Apply discount with underflow protection
        if (base_rate > discount) {
            base_rate - discount
        } else {
            base_rate
        }
    }

    // ==================== BASE CREDIT SCORING ====================

    /// Calculate maximum borrow limit based on credit score
    /// Enhanced for credit-based lending with more granular tiers
    public fun calculate_max_borrow_limit(credit_score: u64): u64 {
        if (credit_score >= 850) {
            MULTIPLIER_EXCELLENT * 1_000_000_000 // 100 SUI
        } else if (credit_score >= 750) {
            MULTIPLIER_GOOD * 1_000_000_000      // 50 SUI
        } else if (credit_score >= 650) {
            MULTIPLIER_FAIR * 1_000_000_000      // 25 SUI
        } else if (credit_score >= 550) {
            MULTIPLIER_POOR * 1_000_000_000      // 10 SUI
        } else if (credit_score >= 450) {
            MULTIPLIER_NEW * 1_000_000_000       // 5 SUI - New users can start small
        } else {
            MULTIPLIER_BAD                        // 0 SUI - Too risky
        }
    }

    /// Calculate interest rate based on credit score
    public fun calculate_interest_rate(credit_score: u64): u64 {
        if (credit_score >= 850) {
            INTEREST_RATE_EXCELLENT  // 3%
        } else if (credit_score >= 750) {
            INTEREST_RATE_GOOD       // 5%
        } else if (credit_score >= 650) {
            INTEREST_RATE_FAIR       // 8%
        } else if (credit_score >= 550) {
            INTEREST_RATE_POOR       // 12%
        } else if (credit_score >= 450) {
            INTEREST_RATE_NEW        // 15%
        } else {
            INTEREST_RATE_BAD        // 18%
        }
    }

    /// Calculate score after on-time repayment
    public fun calculate_score_after_on_time_repayment(current_score: u64): u64 {
        let new_score = current_score + SCORE_BOOST_ON_TIME;
        if (new_score > MAX_CREDIT_SCORE) {
            MAX_CREDIT_SCORE
        } else {
            new_score
        }
    }

    /// Calculate score after early repayment (bonus for paying early)
    public fun calculate_score_after_early_repayment(current_score: u64): u64 {
        let new_score = current_score + SCORE_BOOST_EARLY;
        if (new_score > MAX_CREDIT_SCORE) {
            MAX_CREDIT_SCORE
        } else {
            new_score
        }
    }

    /// Calculate score after partial repayment
    public fun calculate_score_after_partial_repayment(current_score: u64): u64 {
        let new_score = current_score + SCORE_BOOST_PARTIAL;
        if (new_score > MAX_CREDIT_SCORE) {
            MAX_CREDIT_SCORE
        } else {
            new_score
        }
    }

    /// Calculate score after late repayment (heavy penalty)
    public fun calculate_score_after_late_repayment(current_score: u64): u64 {
        if (current_score > SCORE_PENALTY_LATE + MIN_CREDIT_SCORE) {
            current_score - SCORE_PENALTY_LATE
        } else {
            MIN_CREDIT_SCORE
        }
    }

    /// Calculate score after default (very heavy penalty)
    public fun calculate_score_after_default(current_score: u64): u64 {
        if (current_score > SCORE_PENALTY_DEFAULT + MIN_CREDIT_SCORE) {
            current_score - SCORE_PENALTY_DEFAULT
        } else {
            MIN_CREDIT_SCORE
        }
    }

    /// Comprehensive score calculation based on full credit history
    /// Enhanced with stronger penalties for defaults
    public fun calculate_comprehensive_score(
        base_score: u64,
        total_borrowed: u64,
        total_repaid: u64,
        active_debt: u64,
        loan_count: u64,
        default_count: u64,
    ): u64 {
        let mut score = base_score;

        // Repayment ratio bonus/penalty
        if (total_borrowed > 0) {
            let repayment_ratio = (total_repaid * 100) / total_borrowed;
            if (repayment_ratio >= 95) {
                score = score + 40;  // Excellent repayment history
            } else if (repayment_ratio >= 80) {
                score = score + 20;  // Good repayment history
            } else if (repayment_ratio < 50) {
                if (score > 30) { score = score - 30; };  // Poor repayment
            };
        };

        // Debt utilization ratio
        if (total_borrowed > 0) {
            let debt_ratio = (active_debt * 100) / total_borrowed;
            if (debt_ratio == 0) {
                score = score + 30;  // No active debt
            } else if (debt_ratio < 30) {
                score = score + 15;  // Low debt utilization
            } else if (debt_ratio > 70) {
                if (score > 20) { score = score - 20; };  // High debt utilization
            };
        };

        // Loan history bonus (rewards experience)
        if (loan_count >= 10) {
            score = score + 20;  // Experienced borrower
        } else if (loan_count >= 5) {
            score = score + 10;  // Some experience
        };

        // Default penalty (very severe for credit-based lending)
        if (default_count > 0) {
            let penalty = default_count * 75;  // Increased from 50
            if (score > penalty) {
                score = score - penalty;
            } else {
                score = MIN_CREDIT_SCORE;
            };
        };

        // Ensure score stays within bounds
        if (score > MAX_CREDIT_SCORE) {
            MAX_CREDIT_SCORE
        } else if (score < MIN_CREDIT_SCORE) {
            MIN_CREDIT_SCORE
        } else {
            score
        }
    }

    // ==================== TIER & QUALIFICATION ====================

    /// Get credit score tier name
    public fun get_score_tier(credit_score: u64): vector<u8> {
        if (credit_score >= 850) {
            b"Excellent"
        } else if (credit_score >= 750) {
            b"Very Good"
        } else if (credit_score >= 650) {
            b"Good"
        } else if (credit_score >= 550) {
            b"Fair"
        } else if (credit_score >= 450) {
            b"Poor"
        } else {
            b"Very Poor"
        }
    }

    /// Get trust score tier name
    public fun get_trust_tier(trust_score: u64): vector<u8> {
        if (trust_score >= 700) {
            b"High Trust"
        } else if (trust_score >= 400) {
            b"Medium Trust"
        } else if (trust_score >= 200) {
            b"Low Trust"
        } else if (trust_score > 0) {
            b"Building Trust"
        } else {
            b"No Trust"
        }
    }

    /// Check if user can borrow (minimum score requirement)
    public fun can_borrow(credit_score: u64): bool {
        credit_score >= 450  // Lowered from 500 to allow new users
    }

    /// Check if user qualifies for credit-only borrowing (no collateral)
    public fun qualifies_for_credit_only(credit_score: u64): bool {
        credit_score >= 750  // Excellent credit required
    }

    /// Get minimum required collateral ratio based on score (in basis points)
    public fun get_collateral_ratio_requirement(credit_score: u64): u64 {
        if (credit_score >= 750) {
            0      // 0% - No collateral needed
        } else if (credit_score >= 650) {
            2500   // 25% collateral
        } else if (credit_score >= 550) {
            5000   // 50% collateral
        } else if (credit_score >= 450) {
            10000  // 100% collateral
        } else {
            15000  // 150% collateral (high risk)
        }
    }

    // Getters
    public fun get_min_score(): u64 { MIN_CREDIT_SCORE }
    public fun get_max_score(): u64 { MAX_CREDIT_SCORE }
    public fun get_default_score(): u64 { DEFAULT_CREDIT_SCORE }
    public fun get_max_trust_score(): u64 { MAX_TRUST_SCORE }
}
