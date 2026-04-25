# Implementation Plan: Advanced DeFi Features

## Overview

This implementation plan extends MoonCreditFi with advanced DeFi capabilities including credit-aware risk-based lending pools, Islamic finance-compliant profit-sharing (Mudarabah), enhanced credit profiles with reputation tracking, and DePIN revenue distribution. The implementation follows a modular approach, extending existing modules first, then adding new modules, and finally integrating with the frontend.

## Tasks

- [ ] 1. Extend Credit Profile Module with new fields and reputation logic
  - [x] 1.1 Add new fields to CreditProfile struct
    - Add reputation field (u64, range 0-1000)
    - Add risk_level field (u8, values 1-3)
    - Initialize reputation to 500 and risk_level to 2 in create_profile function
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 1.2 Implement getter functions for new fields
    - Create public fun get_reputation(profile: &CreditProfile): u64
    - Create public fun get_risk_level(profile: &CreditProfile): u8
    - _Requirements: 1.6_

  - [x] 1.3 Implement package-level update functions
    - Create public(package) fun update_reputation(profile: &mut CreditProfile, new_reputation: u64)
    - Create public(package) fun update_risk_level(profile: &mut CreditProfile, new_risk_level: u8)
    - _Requirements: 1.7_

  - [-] 1.4 Implement reputation update logic
    - Create public(package) fun update_reputation_on_repayment(profile: &mut CreditProfile, is_on_time: bool)
    - Increase reputation by 10 (capped at 1000) for on-time repayments
    - Decrease reputation by 20 (floored at 0) for late/default repayments
    - Update risk_level based on reputation: 1 if >=750, 2 if 400-749, 3 if <400
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9_

  - [ ]* 1.5 Write property tests for credit profile enhancements
    - **Property 1: Credit Profile Getter Consistency**
    - **Validates: Requirements 1.6**
    - **Property 2: Credit Profile Update Persistence**
    - **Validates: Requirements 1.7**
    - **Property 3: Reputation Increase on On-Time Repayment**
    - **Validates: Requirements 2.1, 2.2**
    - **Property 4: Reputation Decrease on Default**
    - **Validates: Requirements 2.4, 2.5**
    - **Property 5: Risk Level Calculation from Reputation**
    - **Validates: Requirements 2.7, 2.8, 2.9**

- [ ] 2. Checkpoint - Verify credit profile extensions
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 3. Implement Risk Pool Module
  - [ ] 3.1 Create risk_pool.move module with data structures
    - Create RiskPool struct with id, total_liquidity, risk_level, balance fields
    - Define error constants: EInsufficientReputation, EInsufficientLiquidity, EInvalidRiskLevel
    - Define events: DepositEvent, BorrowEvent
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ] 3.2 Implement pool creation function
    - Create public entry fun create_risk_pool(risk_level: u8, ctx: &mut TxContext)
    - Validate risk_level is 1, 2, or 3
    - Initialize total_liquidity to 0
    - Share the pool object
    - _Requirements: 3.5, 3.6_

  - [ ] 3.3 Implement getter functions
    - Create public fun get_total_liquidity(pool: &RiskPool): u64
    - Create public fun get_risk_level(pool: &RiskPool): u8
    - _Requirements: 3.7, 3.8_

  - [ ] 3.4 Implement deposit operations
    - Create public entry fun deposit_to_risk_pool(pool: &mut RiskPool, payment: Coin<SUI>, ctx: &mut TxContext)
    - Convert coin to balance and join to pool balance
    - Increase total_liquidity by deposit amount
    - Emit DepositEvent with user, amount, new total_liquidity
    - Add overflow/underflow checks
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [ ] 3.5 Implement reputation threshold checking
    - Create helper function get_reputation_threshold(risk_level: u8): u64
    - Return 600 for risk_level 1, 400 for risk_level 2, 0 for risk_level 3
    - _Requirements: 5.3, 5.4, 5.5_

  - [ ] 3.6 Implement credit-aware borrowing
    - Create public entry fun borrow_from_risk_pool(pool: &mut RiskPool, profile: &CreditProfile, amount: u64, ctx: &mut TxContext): Coin<SUI>
    - Get user reputation from profile
    - Verify reputation meets threshold for pool risk_level
    - Verify total_liquidity >= amount
    - Decrease total_liquidity by amount
    - Split balance and return as Coin<SUI>
    - Emit BorrowEvent with user, amount, remaining liquidity
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11, 5.12_

  - [ ]* 3.7 Write property tests for risk pool
    - **Property 6: Risk Pool Creation Validation**
    - **Validates: Requirements 3.5**
    - **Property 7: Risk Pool Getter Consistency**
    - **Validates: Requirements 3.7, 3.8**
    - **Property 8: Risk Pool Deposit Increases Liquidity**
    - **Validates: Requirements 4.4**
    - **Property 9: Risk Pool Deposit Event Emission**
    - **Validates: Requirements 4.5**
    - **Property 10: Risk Pool Reputation Threshold for Low Risk**
    - **Validates: Requirements 5.3**
    - **Property 11: Risk Pool Reputation Threshold for Medium Risk**
    - **Validates: Requirements 5.4**
    - **Property 12: Risk Pool No Reputation Threshold for High Risk**
    - **Validates: Requirements 5.5**
    - **Property 13: Risk Pool Liquidity Check**
    - **Validates: Requirements 5.7**
    - **Property 14: Risk Pool Borrow Decreases Liquidity**
    - **Validates: Requirements 5.9**
    - **Property 15: Risk Pool Borrow Returns Correct Amount**
    - **Validates: Requirements 5.11**
    - **Property 16: Risk Pool Borrow Event Emission**
    - **Validates: Requirements 5.12**

- [ ] 4. Checkpoint - Verify risk pool implementation
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement Mudarabah Module
  - [ ] 5.1 Create mudarabah.move module with data structures
    - Create MudarabahPool struct with id, pool_capital, profit_ratio, balance, manager fields
    - Define error constants: EInvalidProfitRatio
    - Define events: ProfitDistributedEvent
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ] 5.2 Implement pool creation function
    - Create public entry fun create_mudarabah_pool(initial_capital: Coin<SUI>, profit_ratio: u64, ctx: &mut TxContext)
    - Validate profit_ratio <= 10000
    - Store initial capital amount in pool_capital
    - Convert coin to balance and store in balance field
    - Store manager address from tx_context
    - Share the pool object
    - _Requirements: 6.4, 6.5, 6.6_

  - [ ] 5.3 Implement profit calculation
    - Create public fun calculate_profit(pool: &MudarabahPool): u64
    - Calculate profit as max(0, current_balance - pool_capital)
    - Add underflow checks
    - _Requirements: 6.7, 6.8, 6.12_

  - [ ] 5.4 Implement profit distribution
    - Create public entry fun distribute_profit(pool: &mut MudarabahPool, investor: address, ctx: &mut TxContext)
    - Calculate investor_share = (profit * profit_ratio) / 10000
    - Calculate manager_share = profit - investor_share
    - Transfer investor_share to investor
    - Transfer manager_share to manager
    - Emit ProfitDistributedEvent
    - Add overflow checks
    - _Requirements: 6.9, 6.10, 6.11, 6.13_

  - [ ]* 5.5 Write property tests for Mudarabah
    - **Property 17: Mudarabah Profit Ratio Validation**
    - **Validates: Requirements 6.6**
    - **Property 18: Mudarabah Profit Calculation**
    - **Validates: Requirements 6.7**
    - **Property 19: Mudarabah Profit Distribution Calculation**
    - **Validates: Requirements 6.9, 6.10**

- [ ] 6. Checkpoint - Verify Mudarabah implementation
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Extend DePIN Module with revenue tracking
  - [ ] 7.1 Add new fields to DepinProject struct
    - Add total_funded field (u64)
    - Add total_revenue field (u64)
    - Initialize both to 0 in create_project function
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ] 7.2 Implement getter functions
    - Create public fun get_total_funded(project: &DepinProject): u64
    - Create public fun get_total_revenue(project: &DepinProject): u64
    - _Requirements: 7.7_

  - [ ] 7.3 Update fund_project to track total_funded
    - Modify fund_project to increase total_funded by funding amount
    - Add overflow checks
    - _Requirements: 7.5, 7.8_

  - [ ] 7.4 Implement revenue recording function
    - Create public(package) fun record_revenue(project: &mut DepinProject, amount: u64)
    - Increase total_revenue by amount
    - Add overflow checks
    - _Requirements: 7.6, 7.9_

  - [ ] 7.5 Implement revenue distribution function
    - Create public entry fun distribute_revenue(project: &mut DepinProject, nft: &DepinNFT, ctx: &mut TxContext)
    - Calculate user_share = (total_revenue * nft.amount) / total_funded
    - Verify treasury balance >= user_share
    - Split user_share from treasury balance
    - Transfer to user
    - Emit RevenueDistributedEvent
    - Add division by zero, underflow checks
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10_

  - [ ]* 7.6 Write property tests for DePIN extensions
    - **Property 20: DePIN Funding Accumulation**
    - **Validates: Requirements 7.5**
    - **Property 21: DePIN Revenue Accumulation**
    - **Validates: Requirements 7.6**
    - **Property 22: DePIN Getter Consistency**
    - **Validates: Requirements 7.7**
    - **Property 23: DePIN Proportional Revenue Distribution**
    - **Validates: Requirements 8.2**
    - **Property 24: DePIN Treasury Sufficiency Check**
    - **Validates: Requirements 8.3**
    - **Property 25: DePIN Revenue Transfer Correctness**
    - **Validates: Requirements 8.6**
    - **Property 26: DePIN Revenue Distribution Event Emission**
    - **Validates: Requirements 8.7**

- [ ] 8. Checkpoint - Verify DePIN extensions
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Implement backward compatibility tests
  - [ ]* 9.1 Write backward compatibility tests
    - **Property 27: Lending Pool Backward Compatibility**
    - **Validates: Requirements 9.1, 9.2**
    - **Property 28: Collateral Vault Backward Compatibility**
    - **Validates: Requirements 9.3, 9.4**
    - **Property 29: Collateral Withdrawal with Active Loans**
    - **Validates: Requirements 10.5**
    - **Property 30: Liquidation Threshold Verification**
    - **Validates: Requirements 10.6**
    - **Property 31: Credit Profile Data Round-Trip**
    - **Validates: Requirements 12.1, 12.2, 12.3**

- [ ] 10. Update frontend to display new credit metrics
  - [ ] 10.1 Update CreditProfile.jsx to display new fields
    - Add display for reputation score (0-1000 range)
    - Add display for risk_level (Low/Medium/High)
    - Add visual indicators for reputation (color-coded)
    - Fetch new fields from credit profile contract
    - _Requirements: 11.1, 11.2, 11.3_

  - [ ] 10.2 Create RiskPoolSelector component
    - Display available risk pools (Low, Medium, High)
    - Show pool liquidity and risk level
    - Allow users to select pool for deposits
    - Filter pools based on user reputation
    - Disable pools where reputation is below threshold
    - _Requirements: 11.4, 11.5, 11.6, 11.7_

  - [ ] 10.3 Update transaction handling
    - Add loading states for all new transactions
    - Display success/error messages with explorer links
    - Refresh data after transaction completion
    - Handle errors gracefully without infinite loading
    - _Requirements: 11.8, 11.9, 11.10, 11.11, 11.12_

  - [ ] 10.4 Create Mudarabah pool interface
    - Add component to display Mudarabah pools
    - Show pool capital, profit ratio, and current profit
    - Add button to distribute profit
    - Display profit distribution history
    - _Requirements: 11.4, 11.8, 11.9_

  - [ ] 10.5 Update DePIN interface for revenue tracking
    - Display total_funded and total_revenue for projects
    - Show user's proportional share of revenue
    - Add button to claim revenue distribution
    - Display revenue distribution history
    - _Requirements: 11.1, 11.8, 11.9, 11.10_

- [ ] 11. Final checkpoint - Integration testing
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- All Move code follows Sui Move conventions and best practices
- Frontend updates use existing React/JSX patterns from the codebase
- Backward compatibility is maintained throughout all changes
