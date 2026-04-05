# Implementation Plan

## Bug 1: Collateral Vault Lookup Failure

- [x] 1. Write bug condition exploration test for vault lookup
  - **Property 1: Bug Condition** - Shared Vault Lookup Fails with getOwnedObjects
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: For deterministic bugs, scope the property to the concrete failing case(s) to ensure reproducibility
  - Test that fetchCollateralVault() returns null for existing shared vaults (from Bug Condition in design)
  - Create a CollateralVault using the Move contract, verify it's shared, attempt to fetch using UNFIXED fetchCollateralVault()
  - The test assertions should match the Expected Behavior Properties from design: vault should be successfully located with objectId, owner, collateralAmount, and borrowedAmount
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found to understand root cause (e.g., "fetchCollateralVault() returns null even though vault exists on-chain")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Write preservation property tests for vault operations (BEFORE implementing fix)
  - **Property 2: Preservation** - Collateral Vault Operations Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (vault creation, deposits, withdrawals, liquidations)
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements
  - Test that create_vault() continues to emit events and create shared objects
  - Test that deposit_collateral() continues to update balances and emit CollateralDeposited events
  - Test that withdraw_collateral() continues to enforce loan checks and transfer coins
  - Test that multiple users' vaults remain correctly isolated (no data mixing)
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [~] 3. Fix for collateral vault lookup failure

  - [x] 3.1 Implement the fix in CollateralVaultDataService.fetchCollateralVault
    - Remove reliance on getOwnedObjects() for shared vaults
    - Implement event-based lookup using CollateralDeposited events as primary method
    - Add error handling for cases where no vault is found
    - Consider adding VaultCreated event to Move contract for newly created vaults with zero collateral
    - Update fallback logic to handle newly created vaults
    - _Bug_Condition: isBugCondition_Vault(input) where input.vaultExists == true AND vaultIsSharedObject(input.userAddress) AND fetchMethodUsesGetOwnedObjects()_
    - _Expected_Behavior: For any user address where a CollateralVault exists as a shared object, fetchCollateralVault SHALL successfully locate the vault by querying CollateralDeposited events and return vault data including objectId, owner, collateralAmount, and borrowedAmount_
    - _Preservation: Vault creation, deposits, withdrawals, and liquidations must continue to work exactly as before with same event emissions and field updates_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Shared Vault Lookup Succeeds
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - Verify fetchCollateralVault() successfully locates shared vaults and returns correct data
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Collateral Vault Operations Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all vault operations (create, deposit, withdraw, liquidate) still work correctly

- [x] 4. Checkpoint - Ensure all Bug 1 tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Bug 2: DePIN Funding Transaction Error

- [x] 5. Write bug condition exploration test for DePIN funding
  - **Property 1: Bug Condition** - DePIN Funding Transaction Argument Mismatch
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: For deterministic bugs, scope the property to the concrete failing case(s) to ensure reproducibility
  - Test that createFundProjectTransaction() constructs transaction with incorrect argument count (from Bug Condition in design)
  - Create a DePIN project, build funding transaction using UNFIXED createFundProjectTransaction(), verify argument count is 2 instead of 3
  - The test assertions should match the Expected Behavior Properties from design: transaction should have exactly 3 arguments (project, coin, clock)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found to understand root cause (e.g., "Transaction fails with 'Incorrect number of arguments' error")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.4, 1.5, 1.6_

- [x] 6. Write preservation property tests for DePIN operations (BEFORE implementing fix)
  - **Property 2: Preservation** - DePIN Operations Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (project creation, NFT transfers, yield claims, redemptions)
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements
  - Test that create_project() continues to emit events and create shared projects
  - Test that transfer_nft() continues to emit events and transfer ownership
  - Test that claim_yield() continues to calculate and distribute yield correctly
  - Test that redeem_at_maturity() continues to enforce maturity checks and return principal + yield
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.5, 3.6, 3.7, 3.8_

- [~] 7. Fix for DePIN funding transaction error

  - [x] 7.1 Implement the fix in DePINService.createFundProjectTransaction
    - Add clock argument tx.object('0x6') as the third argument in moveCall
    - Ensure argument order matches Move function signature: project object, coin, clock
    - Update code comment to accurately reflect the implementation
    - Verify arguments array has exactly 3 elements before ctx is auto-added
    - _Bug_Condition: isBugCondition_DePIN(input) where input.fundingAmount > 0 AND projectExists(input.projectId) AND projectIsActive(input.projectId) AND transactionArgumentCount() != 3_
    - _Expected_Behavior: For any DePIN project funding request where the project exists and is active, createFundProjectTransaction SHALL construct a transaction with exactly 3 arguments (project object, coin, clock) matching the Move function signature_
    - _Preservation: Project creation, NFT transfers, yield claims, and redemptions must continue to work exactly as before with same event emissions and state updates_
    - _Requirements: 2.4, 2.5, 2.6, 3.5, 3.6, 3.7, 3.8_

  - [x] 7.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - DePIN Funding Transaction Succeeds
    - **IMPORTANT**: Re-run the SAME test from task 5 - do NOT write a new test
    - The test from task 5 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 5
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - Verify transaction is constructed with 3 arguments and executes successfully
    - _Requirements: 2.4, 2.5, 2.6_

  - [x] 7.3 Verify preservation tests still pass
    - **Property 2: Preservation** - DePIN Operations Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 6 - do NOT write new tests
    - Run preservation property tests from step 6
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all DePIN operations (create, transfer, claim, redeem) still work correctly

- [x] 8. Checkpoint - Ensure all Bug 2 tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Final Validation

- [x] 9. Run full test suite
  - Execute all unit tests, property-based tests, and integration tests
  - Verify no regressions in any part of the application
  - Confirm both bugs are fixed and all preservation requirements are met
