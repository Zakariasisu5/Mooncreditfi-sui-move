# Requirements Document

## Introduction

This document specifies requirements for extending MoonCreditFi with advanced DeFi features including credit-aware risk-based lending pools, Islamic finance-compliant profit-sharing (Mudarabah), enhanced credit profiles with reputation tracking, and DePIN revenue distribution. The system must maintain backward compatibility with existing lending, collateral, and credit profile modules while adding new capabilities for risk-tiered borrowing, reputation-based access control, and deterministic profit distribution.

## Glossary

- **Credit_Profile_Module**: The existing Sui Move module that tracks user credit scores, debt, borrowing history, and repayment behavior
- **Risk_Pool**: A lending pool with an assigned risk level (1=low, 2=medium, 3=high) that tracks liquidity and enforces credit-based access
- **Reputation_Score**: A numeric value (0-1000) within a credit profile that increases with successful repayments and decreases with defaults
- **Risk_Level**: An integer value (1, 2, or 3) representing the risk tier of a lending pool
- **Mudarabah_Module**: An Islamic finance-compliant profit-sharing module that calculates and distributes profits deterministically
- **DePIN_Project**: A decentralized physical infrastructure network project that tracks funding and revenue
- **Collateral_Vault**: The existing module that manages user collateral deposits and tracks borrowed amounts
- **Lending_Pool_Module**: The existing module that manages liquidity, deposits, withdrawals, and yield accrual
- **Backward_Compatibility**: The property that existing contract functions and data structures continue to work without modification
- **Underflow**: An arithmetic error where subtraction results in a negative value in unsigned integer operations
- **Overflow**: An arithmetic error where addition or multiplication exceeds the maximum value for a data type
- **Liquidation_Threshold**: The collateral ratio (150%) below which a position can be liquidated
- **Gas_Optimization**: Minimizing computational cost and storage writes in blockchain transactions

## Requirements

### Requirement 1: Credit Profile Enhancement

**User Story:** As a borrower, I want my credit profile to track additional risk metrics (debt, reputation, risk level), so that I can access better lending terms based on my complete financial behavior.

#### Acceptance Criteria

1. THE Credit_Profile_Module SHALL add a debt field (u64) to track current outstanding debt
2. THE Credit_Profile_Module SHALL add a reputation field (u64, range 0-1000) to track repayment reliability
3. THE Credit_Profile_Module SHALL add a risk_level field (u8, values 1-3) to categorize borrower risk
4. WHEN a credit profile is created, THE Credit_Profile_Module SHALL initialize debt to 0, reputation to 500, and risk_level to 2
5. WHEN existing credit profiles are accessed, THE Credit_Profile_Module SHALL provide default values (debt=0, reputation=500, risk_level=2) for backward compatibility
6. THE Credit_Profile_Module SHALL provide getter functions for debt, reputation, and risk_level fields
7. THE Credit_Profile_Module SHALL provide package-level update functions for debt, reputation, and risk_level fields

### Requirement 2: Reputation Update Logic

**User Story:** As a lender, I want borrower reputation scores to reflect actual repayment behavior, so that I can assess creditworthiness accurately.

#### Acceptance Criteria

1. WHEN a loan is fully repaid on time, THE Credit_Profile_Module SHALL increase reputation by 10 points
2. WHEN a loan is fully repaid on time AND reputation is less than 1000, THE Credit_Profile_Module SHALL apply the reputation increase
3. WHEN a loan is fully repaid on time AND reputation equals 1000, THE Credit_Profile_Module SHALL maintain reputation at 1000
4. WHEN a loan defaults or is repaid late, THE Credit_Profile_Module SHALL decrease reputation by 20 points
5. WHEN a loan defaults or is repaid late AND reputation is greater than 0, THE Credit_Profile_Module SHALL apply the reputation decrease
6. WHEN a loan defaults or is repaid late AND reputation is less than or equal to 20, THE Credit_Profile_Module SHALL set reputation to 0
7. THE Credit_Profile_Module SHALL update risk_level to 1 (low) when reputation is greater than or equal to 750
8. THE Credit_Profile_Module SHALL update risk_level to 2 (medium) when reputation is between 400 and 749 inclusive
9. THE Credit_Profile_Module SHALL update risk_level to 3 (high) when reputation is less than 400

### Requirement 3: Risk-Based Lending Pools

**User Story:** As a protocol administrator, I want to create multiple lending pools with different risk levels, so that borrowers can access appropriate pools based on their credit profiles.

#### Acceptance Criteria

1. THE Risk_Pool SHALL store an id field (UID) for unique identification
2. THE Risk_Pool SHALL store a total_liquidity field (u64) tracking available funds
3. THE Risk_Pool SHALL store a risk_level field (u8, values 1-3) defining the pool's risk tier
4. THE Risk_Pool SHALL store a balance field (Balance<SUI>) holding the pool's SUI tokens
5. WHEN a risk pool is created, THE system SHALL validate that risk_level is 1, 2, or 3
6. WHEN a risk pool is created, THE system SHALL initialize total_liquidity to 0
7. THE Risk_Pool SHALL provide a getter function for total_liquidity
8. THE Risk_Pool SHALL provide a getter function for risk_level

### Requirement 4: Risk Pool Deposit Operations

**User Story:** As a lender, I want to deposit SUI into risk pools, so that I can earn yield based on the pool's risk level.

#### Acceptance Criteria

1. WHEN a user deposits SUI, THE Risk_Pool SHALL accept a Coin<SUI> parameter
2. WHEN a user deposits SUI, THE Risk_Pool SHALL convert the coin to a balance
3. WHEN a user deposits SUI, THE Risk_Pool SHALL join the balance to the pool's balance field
4. WHEN a user deposits SUI, THE Risk_Pool SHALL increase total_liquidity by the deposit amount
5. WHEN a user deposits SUI, THE Risk_Pool SHALL emit a DepositEvent with user address, amount, and new total_liquidity
6. THE Risk_Pool SHALL prevent Underflow when updating total_liquidity
7. THE Risk_Pool SHALL prevent Overflow when updating total_liquidity

### Requirement 5: Credit-Aware Borrowing

**User Story:** As a borrower, I want to borrow from risk pools that match my credit profile, so that I can access funds appropriate to my creditworthiness.

#### Acceptance Criteria

1. WHEN a user requests a borrow, THE Risk_Pool SHALL accept a credit profile reference
2. WHEN a user requests a borrow, THE Risk_Pool SHALL accept a borrow amount (u64)
3. WHEN a user requests a borrow, THE Risk_Pool SHALL verify the user's reputation is greater than or equal to 600 for risk_level 1 pools
4. WHEN a user requests a borrow, THE Risk_Pool SHALL verify the user's reputation is greater than or equal to 400 for risk_level 2 pools
5. WHEN a user requests a borrow, THE Risk_Pool SHALL allow any reputation for risk_level 3 pools
6. WHEN reputation is below the threshold, THE Risk_Pool SHALL abort with error code EInsufficientReputation
7. WHEN a borrow is approved, THE Risk_Pool SHALL verify total_liquidity is greater than or equal to the borrow amount
8. WHEN liquidity is insufficient, THE Risk_Pool SHALL abort with error code EInsufficientLiquidity
9. WHEN a borrow is approved, THE Risk_Pool SHALL decrease total_liquidity by the borrow amount
10. WHEN a borrow is approved, THE Risk_Pool SHALL split the borrow amount from the pool's balance
11. WHEN a borrow is approved, THE Risk_Pool SHALL return the borrowed balance to the caller
12. WHEN a borrow is approved, THE Risk_Pool SHALL emit a BorrowEvent with user address, amount, and remaining liquidity

### Requirement 6: Mudarabah Profit-Sharing Module

**User Story:** As an Islamic finance user, I want a Sharia-compliant profit-sharing mechanism, so that I can participate in DeFi without interest-based transactions.

#### Acceptance Criteria

1. THE Mudarabah_Module SHALL store a pool_capital field (u64) tracking the initial investment
2. THE Mudarabah_Module SHALL store a profit_ratio field (u64) defining the profit split in basis points (0-10000)
3. THE Mudarabah_Module SHALL store a balance field (Balance<SUI>) holding pool funds
4. WHEN a Mudarabah pool is created, THE Mudarabah_Module SHALL accept an initial capital amount
5. WHEN a Mudarabah pool is created, THE Mudarabah_Module SHALL accept a profit_ratio parameter
6. WHEN a Mudarabah pool is created, THE Mudarabah_Module SHALL validate profit_ratio is less than or equal to 10000
7. WHEN profit is calculated, THE Mudarabah_Module SHALL compute profit as (current_balance - pool_capital)
8. WHEN current_balance is less than pool_capital, THE Mudarabah_Module SHALL return 0 profit
9. WHEN profit is distributed, THE Mudarabah_Module SHALL calculate investor_share as (profit * profit_ratio) / 10000
10. WHEN profit is distributed, THE Mudarabah_Module SHALL calculate manager_share as (profit - investor_share)
11. THE Mudarabah_Module SHALL distribute profits deterministically without external dependencies
12. THE Mudarabah_Module SHALL prevent Underflow when calculating profit
13. THE Mudarabah_Module SHALL prevent Overflow when calculating profit shares

### Requirement 7: DePIN Revenue Tracking

**User Story:** As a DePIN project investor, I want to track project funding and revenue, so that I can monitor returns on my infrastructure investment.

#### Acceptance Criteria

1. THE DePIN_Project SHALL add a total_funded field (u64) tracking cumulative funding received
2. THE DePIN_Project SHALL add a total_revenue field (u64) tracking cumulative revenue generated
3. WHEN a DePIN project is created, THE DePIN_Project SHALL initialize total_funded to 0
4. WHEN a DePIN project is created, THE DePIN_Project SHALL initialize total_revenue to 0
5. WHEN funding is received, THE DePIN_Project SHALL increase total_funded by the funding amount
6. WHEN revenue is recorded, THE DePIN_Project SHALL increase total_revenue by the revenue amount
7. THE DePIN_Project SHALL provide getter functions for total_funded and total_revenue
8. THE DePIN_Project SHALL prevent Underflow when updating funding and revenue
9. THE DePIN_Project SHALL prevent Overflow when updating funding and revenue

### Requirement 8: DePIN Revenue Distribution

**User Story:** As a DePIN project investor, I want to receive my proportional share of project revenue, so that I can earn returns on my infrastructure investment.

#### Acceptance Criteria

1. WHEN revenue is distributed, THE DePIN_Project SHALL accept a recipient address
2. WHEN revenue is distributed, THE DePIN_Project SHALL calculate the recipient's share based on their funding proportion
3. WHEN revenue is distributed, THE DePIN_Project SHALL verify the treasury has sufficient balance
4. WHEN the treasury is insufficient, THE DePIN_Project SHALL abort with error code EInsufficientTreasury
5. WHEN revenue is distributed, THE DePIN_Project SHALL split the distribution amount from the treasury balance
6. WHEN revenue is distributed, THE DePIN_Project SHALL transfer the amount to the recipient
7. WHEN revenue is distributed, THE DePIN_Project SHALL emit a RevenueDistributedEvent with recipient, amount, and timestamp
8. THE DePIN_Project SHALL prevent division by zero when calculating proportional shares
9. THE DePIN_Project SHALL prevent Underflow when splitting treasury balance
10. THE DePIN_Project SHALL complete distribution in a single transaction without blocking calls

### Requirement 9: Backward Compatibility

**User Story:** As an existing user, I want all my current deposits, loans, and credit profiles to continue working, so that the upgrade does not disrupt my activities.

#### Acceptance Criteria

1. THE Lending_Pool_Module SHALL continue to support existing deposit functions without modification
2. THE Lending_Pool_Module SHALL continue to support existing withdrawal functions without modification
3. THE Collateral_Vault SHALL continue to support existing collateral deposit functions without modification
4. THE Collateral_Vault SHALL continue to support existing borrow recording functions without modification
5. THE Credit_Profile_Module SHALL provide default values for new fields when accessing existing profiles
6. WHEN existing lending pool functions are called, THE system SHALL execute without errors
7. WHEN existing collateral vault functions are called, THE system SHALL execute without errors
8. WHEN existing credit profile functions are called, THE system SHALL execute without errors
9. THE system SHALL maintain existing event structures for backward compatibility
10. THE system SHALL maintain existing error codes for backward compatibility

### Requirement 10: Security and Validation

**User Story:** As a protocol user, I want all operations to be validated and protected against common vulnerabilities, so that my funds and data are secure.

#### Acceptance Criteria

1. WHEN any arithmetic operation is performed, THE system SHALL use assert checks to prevent Underflow
2. WHEN any arithmetic operation is performed, THE system SHALL use assert checks to prevent Overflow
3. WHEN a borrow is requested, THE system SHALL verify the pool has sufficient liquidity
4. WHEN a borrow is requested, THE system SHALL verify the user meets reputation requirements
5. WHEN collateral is withdrawn, THE system SHALL verify no active loans exist
6. WHEN a liquidation is triggered, THE system SHALL verify the position is below the Liquidation_Threshold
7. WHEN state is updated, THE system SHALL minimize storage writes for Gas_Optimization
8. WHEN a transaction fails, THE system SHALL revert all state changes atomically
9. THE system SHALL validate all input parameters are within acceptable ranges
10. THE system SHALL emit events for all critical state changes for auditability

### Requirement 11: Frontend Integration

**User Story:** As a user, I want the web interface to display new credit metrics and risk pool options, so that I can make informed decisions about lending and borrowing.

#### Acceptance Criteria

1. THE dashboard SHALL display the user's debt field from their credit profile
2. THE dashboard SHALL display the user's reputation score from their credit profile
3. THE dashboard SHALL display the user's risk_level from their credit profile
4. THE lending interface SHALL display available risk pools (low, medium, high)
5. THE lending interface SHALL allow users to select a risk pool for deposits
6. THE borrowing interface SHALL display eligible risk pools based on user reputation
7. THE borrowing interface SHALL prevent selection of pools where reputation is below the threshold
8. WHEN a transaction is submitted, THE interface SHALL display loading states
9. WHEN a transaction completes, THE interface SHALL display success or error messages
10. WHEN a transaction completes, THE interface SHALL refresh displayed data within 3 seconds
11. THE interface SHALL handle transaction errors gracefully without infinite loading states
12. THE interface SHALL display transaction feedback with explorer links

### Requirement 12: Round-Trip Property for Data Serialization

**User Story:** As a developer, I want to ensure that credit profile data can be serialized and deserialized without loss, so that off-chain indexing and caching work correctly.

#### Acceptance Criteria

1. WHEN a credit profile is read from the blockchain, THE system SHALL parse all fields correctly
2. WHEN credit profile data is formatted for display, THE system SHALL preserve all numeric precision
3. WHEN credit profile data is formatted and then parsed, THE system SHALL produce equivalent values
4. THE system SHALL maintain u64 precision for debt, reputation, and all numeric fields
5. THE system SHALL maintain u8 precision for risk_level field
6. WHEN data is cached off-chain, THE system SHALL validate data integrity on retrieval
7. FOR ALL valid credit profiles, reading then formatting then reading SHALL produce equivalent objects

