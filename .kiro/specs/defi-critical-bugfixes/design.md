# DeFi Critical Bugfixes Design

## Overview

This design addresses two critical bugs that prevent core DeFi functionality:

1. **Collateral Vault Lookup Failure**: Users cannot deposit collateral because the system incorrectly uses `getOwnedObjects()` to find shared CollateralVault objects, which were created with `transfer::share_object()` in the Move contract.

2. **DePIN Funding Transaction Error**: Users cannot fund DePIN projects due to incorrect transaction argument construction - the system is missing the clock argument required by the Move contract's `fund_project` function.

Both bugs block essential user workflows and require targeted fixes that preserve all existing functionality.

## Glossary

- **Bug_Condition (C)**: The condition that triggers each bug
  - Bug 1: When a user attempts to deposit collateral and the vault is a shared object
  - Bug 2: When a user attempts to fund a DePIN project
- **Property (P)**: The desired behavior when the bug condition holds
  - Bug 1: The vault should be successfully located and the deposit should proceed
  - Bug 2: The transaction should be successfully submitted and a DepinNFT should be minted
- **Preservation**: Existing behaviors that must remain unchanged by the fixes
- **CollateralVault**: A shared object in `contracts/sources/collateral.move` that stores user collateral
- **getOwnedObjects()**: Sui RPC method that queries objects owned by an address (does NOT return shared objects)
- **transfer::share_object()**: Move function that makes an object shared (accessible by multiple transactions)
- **fund_project**: Entry function in `contracts/sources/depin.move` that accepts funding for a DePIN project
- **moveCall**: Transaction builder method in `@mysten/sui/transactions` that invokes Move functions

## Bug Details

### Bug 1: Collateral Vault Lookup Failure

#### Bug Condition

The bug manifests when a user attempts to deposit collateral into their vault. The `CollateralVaultDataService.fetchCollateralVault()` function uses `getOwnedObjects()` to search for the vault, but this method only returns objects owned by an address. Since CollateralVault objects are created with `transfer::share_object()` in the Move contract, they are shared objects and will not appear in `getOwnedObjects()` results.

**Formal Specification:**
```
FUNCTION isBugCondition_Vault(input)
  INPUT: input of type { userAddress: string, vaultExists: boolean }
  OUTPUT: boolean
  
  RETURN input.vaultExists == true
         AND vaultIsSharedObject(input.userAddress)
         AND fetchMethodUsesGetOwnedObjects()
END FUNCTION
```

#### Examples

- User creates a vault via `create_vault()` → vault is shared → user attempts to deposit collateral → system displays "Failed to fetch vault. Please try again."
- User has an existing vault with collateral → user attempts to deposit more collateral → system cannot find the vault via `getOwnedObjects()` → deposit fails
- User's vault exists on-chain (verifiable via explorer) → system's `fetchCollateralVault()` returns `null` → UI shows error message
- Edge case: User has never created a vault → system correctly returns `null` (expected behavior, not a bug)

### Bug 2: DePIN Funding Transaction Error

#### Bug Condition

The bug manifests when a user attempts to fund a DePIN project. The `DePINService.createFundProjectTransaction()` function builds a transaction that passes only the project object and coin arguments to `fund_project`, but the Move contract function signature requires three arguments: `project: &mut DepinProject`, `payment: Coin<SUI>`, and `clock: &Clock` (with `ctx: &mut TxContext` auto-added by the Sui runtime).

**Formal Specification:**
```
FUNCTION isBugCondition_DePIN(input)
  INPUT: input of type { projectId: string, fundingAmount: number }
  OUTPUT: boolean
  
  RETURN input.fundingAmount > 0
         AND projectExists(input.projectId)
         AND projectIsActive(input.projectId)
         AND transactionArgumentCount() != 3
END FUNCTION
```

#### Examples

- User selects a DePIN project → enters funding amount → clicks "Fund Project" → system displays "Unable to process transaction: Incorrect number of arguments"
- User attempts to fund any active DePIN project → transaction construction fails before submission → no on-chain transaction occurs
- User's wallet has sufficient balance → project is active and not fully funded → transaction still fails due to argument mismatch
- Edge case: User attempts to fund an inactive project → should fail with `EProjectNotActive` error (expected behavior, not this bug)

## Expected Behavior

### Preservation Requirements

**Bug 1 - Unchanged Behaviors:**
- CollateralVault creation via `create_vault()` must continue to use `transfer::share_object()`
- CollateralDeposited events must continue to be emitted with `vault_id` and `owner` fields
- Collateral deposit and withdrawal operations must continue to update vault fields correctly
- Multiple users' vaults must continue to be correctly isolated (no data mixing)
- The fallback to `getOwnedObjects()` for newly created vaults (if applicable) should remain

**Bug 2 - Unchanged Behaviors:**
- ProjectFunded events must continue to be emitted with correct fields
- Project closure logic (when target is reached) must continue to work
- DepinNFT minting with 365-day maturity must continue to work
- NFT transfer to investor must continue to work
- All other DePIN operations (create_project, claim_yield, redeem_at_maturity) must remain unchanged

**Scope:**
- Bug 1: All inputs that do NOT involve fetching a CollateralVault should be completely unaffected. This includes vault creation, withdrawal operations, and liquidation checks.
- Bug 2: All inputs that do NOT involve funding a DePIN project should be completely unaffected. This includes project creation, NFT transfers, yield claiming, and redemption operations.

## Hypothesized Root Cause

### Bug 1: Collateral Vault Lookup Failure

Based on the bug description and code analysis, the root cause is:

1. **Incorrect Query Method**: The code uses `getOwnedObjects()` which only returns objects where the user is the owner in Sui's ownership model. Shared objects created with `transfer::share_object()` are not "owned" by any address - they are shared and accessible by anyone.

2. **Misunderstanding of Sui Ownership Model**: The developer assumed that because the vault has an `owner` field in its struct, it would be returned by `getOwnedObjects()`. However, Sui's ownership model is separate from struct fields - the ownership is determined by how the object was transferred (`transfer::transfer` vs `transfer::share_object`).

3. **Incomplete Fallback Logic**: The code has a fallback to search via `CollateralDeposited` events, but this only works for vaults that have had collateral deposited. Newly created vaults with zero collateral will not have any deposit events and cannot be found.

### Bug 2: DePIN Funding Transaction Error

Based on the bug description and code analysis, the root cause is:

1. **Missing Clock Argument**: The `createFundProjectTransaction()` function does not pass the clock object to the `fund_project` Move function. The Move function signature requires `clock: &Clock` as the third argument, but the transaction builder only provides two arguments (project and coin).

2. **Inconsistent Pattern**: Other transaction builders in the same file (e.g., `createBorrowTransaction`, `createRepayTransaction`) correctly include the clock object as `tx.object('0x6')`, but `createFundProjectTransaction` omits it.

3. **Incorrect Comment**: The code comment says "Call fund_project with the project object, coin, clock, and ctx" but the actual implementation does not include the clock argument, indicating a copy-paste error or incomplete implementation.

## Correctness Properties

Property 1: Bug Condition - Collateral Vault Lookup for Shared Objects

_For any_ user address where a CollateralVault exists as a shared object, the fixed `fetchCollateralVault` function SHALL successfully locate the vault by querying CollateralDeposited events or using an alternative method that works for shared objects, and return the vault data including objectId, owner, collateralAmount, and borrowedAmount.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Bug Condition - DePIN Project Funding Transaction

_For any_ DePIN project funding request where the project exists and is active, the fixed `createFundProjectTransaction` function SHALL construct a transaction with exactly 3 arguments (project object, coin, clock) matching the Move function signature, allowing the transaction to be successfully submitted and a DepinNFT to be minted.

**Validates: Requirements 2.4, 2.5, 2.6**

Property 3: Preservation - Collateral Vault Operations

_For any_ collateral vault operation that is NOT fetching a vault (such as creating a vault, depositing collateral, withdrawing collateral, or liquidating), the fixed code SHALL produce exactly the same behavior as the original code, preserving all existing functionality including event emissions, field updates, and object transfers.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

Property 4: Preservation - DePIN Operations

_For any_ DePIN operation that is NOT funding a project (such as creating a project, transferring an NFT, claiming yield, or redeeming at maturity), the fixed code SHALL produce exactly the same behavior as the original code, preserving all existing functionality including event emissions, state updates, and token transfers.

**Validates: Requirements 3.5, 3.6, 3.7, 3.8**

## Fix Implementation

### Bug 1: Collateral Vault Lookup Failure

Assuming our root cause analysis is correct:

**File**: `src/services/dataService.js`

**Function**: `CollateralVaultDataService.fetchCollateralVault`

**Specific Changes**:

1. **Remove Reliance on getOwnedObjects for Shared Vaults**: Since shared objects cannot be found via `getOwnedObjects()`, we need an alternative approach.

2. **Primary Strategy - Event-Based Lookup**: Query `CollateralDeposited` events to find the vault_id for the user. This works for vaults that have had at least one deposit.

3. **Secondary Strategy - Query All Vaults**: For newly created vaults with zero collateral, we need to query `CollateralVault` objects directly using `queryEvents` on the `create_vault` transaction or maintain a registry. However, since the Move contract doesn't emit a VaultCreated event, we have two options:
   - Option A: Add a `VaultCreated` event to the Move contract and query it
   - Option B: Use `getOwnedObjects()` immediately after vault creation (before it's shared) or track vault IDs in the frontend state
   - Option C: Accept that newly created vaults with zero collateral cannot be found until the first deposit

4. **Recommended Approach**: Implement Option A (add VaultCreated event) for completeness, but also improve the existing event-based lookup to be more robust.

5. **Code Changes**:
   - Keep the existing `CollateralDeposited` event query as the primary method
   - Add error handling for cases where no vault is found
   - Consider adding a `VaultCreated` event to the Move contract for better tracking
   - Update the fallback logic to handle newly created vaults

### Bug 2: DePIN Funding Transaction Error

Assuming our root cause analysis is correct:

**File**: `src/services/contractService.js`

**Function**: `DePINService.createFundProjectTransaction`

**Specific Changes**:

1. **Add Clock Argument**: Include `tx.object('0x6')` as the third argument in the `moveCall` arguments array.

2. **Match Move Function Signature**: Ensure the transaction arguments match the Move function signature:
   ```move
   public entry fun fund_project(
       project: &mut DepinProject,
       payment: Coin<SUI>,
       clock: &Clock,
       ctx: &mut TxContext
   )
   ```

3. **Argument Order**: The arguments array should be:
   - `tx.object(projectObjectId)` - project: &mut DepinProject
   - `coin` - payment: Coin<SUI>
   - `tx.object('0x6')` - clock: &Clock
   - (ctx is auto-added by Sui runtime)

4. **Code Changes**:
   - Modify the `arguments` array in the `moveCall` to include the clock object
   - Verify the argument order matches the Move function signature
   - Update the comment to accurately reflect the implementation

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bugs on unfixed code, then verify the fixes work correctly and preserve existing behavior.

### Exploratory Bug Condition Checking

#### Bug 1: Collateral Vault Lookup

**Goal**: Surface counterexamples that demonstrate the vault lookup bug BEFORE implementing the fix. Confirm that shared vaults cannot be found via `getOwnedObjects()`.

**Test Plan**: Create a test that:
1. Creates a CollateralVault using the Move contract
2. Verifies the vault is shared (check object ownership type)
3. Attempts to fetch the vault using the UNFIXED `fetchCollateralVault()` function
4. Observes that the function returns `null` even though the vault exists

**Test Cases**:
1. **Shared Vault Not Found**: Create a vault, deposit collateral, attempt to fetch → will fail on unfixed code (returns null)
2. **Event-Based Lookup Works**: Create a vault, deposit collateral, verify CollateralDeposited event exists → should work on unfixed code
3. **Newly Created Vault**: Create a vault without depositing → will fail on unfixed code (no events, not in getOwnedObjects)
4. **Multiple Deposits**: Create a vault, deposit multiple times, fetch → may work on unfixed code if event query succeeds

**Expected Counterexamples**:
- `fetchCollateralVault()` returns `null` for existing shared vaults
- Possible causes: `getOwnedObjects()` doesn't return shared objects, no fallback for newly created vaults

#### Bug 2: DePIN Funding Transaction

**Goal**: Surface counterexamples that demonstrate the transaction argument bug BEFORE implementing the fix. Confirm that the transaction fails with "Incorrect number of arguments" error.

**Test Plan**: Create a test that:
1. Creates a DePIN project using the Move contract
2. Builds a funding transaction using the UNFIXED `createFundProjectTransaction()` function
3. Attempts to execute the transaction
4. Observes the "Incorrect number of arguments" error

**Test Cases**:
1. **Argument Count Mismatch**: Build funding transaction, count arguments → will fail on unfixed code (2 args instead of 3)
2. **Transaction Execution Failure**: Submit funding transaction → will fail on unfixed code with argument error
3. **Other DePIN Operations**: Create project, transfer NFT → should work on unfixed code (not affected by this bug)
4. **Edge Case - Inactive Project**: Attempt to fund inactive project → should fail with `EProjectNotActive` (different error, not this bug)

**Expected Counterexamples**:
- Transaction fails with "Incorrect number of arguments for fund_project"
- Possible causes: Missing clock argument in moveCall

### Fix Checking

#### Bug 1: Collateral Vault Lookup

**Goal**: Verify that for all inputs where the bug condition holds (user has a shared vault), the fixed function successfully locates the vault.

**Pseudocode:**
```
FOR ALL userAddress WHERE hasSharedVault(userAddress) DO
  result := fetchCollateralVault_fixed(userAddress)
  ASSERT result != null
  ASSERT result.objectId == expectedVaultId(userAddress)
  ASSERT result.owner == userAddress
END FOR
```

**Test Cases**:
- Vault with collateral deposits → should be found via events
- Newly created vault → should be found via VaultCreated event (if implemented)
- Vault with multiple deposits → should return correct aggregated data
- Vault with borrowed amount → should calculate collateral ratio correctly

#### Bug 2: DePIN Funding Transaction

**Goal**: Verify that for all inputs where the bug condition holds (user attempts to fund a project), the fixed function constructs a valid transaction.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition_DePIN(input) DO
  tx := createFundProjectTransaction_fixed(input.projectId, input.amount)
  ASSERT tx.arguments.length == 3
  ASSERT tx.arguments[0] == projectObject
  ASSERT tx.arguments[1] == coin
  ASSERT tx.arguments[2] == clockObject
  result := executeTransaction(tx)
  ASSERT result.success == true
  ASSERT DepinNFT_minted(result)
END FOR
```

**Test Cases**:
- Fund active project with sufficient balance → should succeed and mint NFT
- Fund project that reaches target → should close project and mint NFT
- Fund project with exact remaining capacity → should succeed
- Fund multiple projects sequentially → all should succeed

### Preservation Checking

#### Bug 1: Collateral Vault Operations

**Goal**: Verify that for all inputs where the bug condition does NOT hold (operations other than fetching), the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL operation WHERE operation != "fetchVault" DO
  ASSERT executeOperation_original(operation) = executeOperation_fixed(operation)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because it generates many test cases automatically and catches edge cases that manual tests might miss.

**Test Plan**: Observe behavior on UNFIXED code first for vault creation, deposits, withdrawals, and liquidations, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Vault Creation Preservation**: Verify `create_vault()` continues to emit events and create shared objects
2. **Deposit Preservation**: Verify `deposit_collateral()` continues to update balances and emit events correctly
3. **Withdrawal Preservation**: Verify `withdraw_collateral()` continues to enforce loan checks and transfer coins
4. **Liquidation Preservation**: Verify liquidation logic continues to work for underwater positions

#### Bug 2: DePIN Operations

**Goal**: Verify that for all inputs where the bug condition does NOT hold (operations other than funding), the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL operation WHERE operation != "fundProject" DO
  ASSERT executeOperation_original(operation) = executeOperation_fixed(operation)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because it generates many test cases automatically and catches edge cases that manual tests might miss.

**Test Plan**: Observe behavior on UNFIXED code first for project creation, NFT transfers, yield claims, and redemptions, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Project Creation Preservation**: Verify `create_project()` continues to emit events and create shared projects
2. **NFT Transfer Preservation**: Verify `transfer_nft()` continues to emit events and transfer ownership
3. **Yield Claim Preservation**: Verify `claim_yield()` continues to calculate and distribute yield correctly
4. **Redemption Preservation**: Verify `redeem_at_maturity()` continues to enforce maturity checks and return principal + yield

### Unit Tests

#### Bug 1: Collateral Vault Lookup
- Test event-based vault lookup with single deposit
- Test event-based vault lookup with multiple deposits
- Test vault lookup for newly created vault (if VaultCreated event is added)
- Test vault lookup returns null for non-existent vault
- Test vault data calculation (collateral ratio, liquidation status)

#### Bug 2: DePIN Funding Transaction
- Test transaction construction with correct argument count
- Test transaction construction with correct argument types
- Test transaction construction with correct argument order
- Test funding transaction execution succeeds
- Test NFT is minted and transferred to investor

### Property-Based Tests

#### Bug 1: Collateral Vault Lookup
- Generate random vault states (various collateral and borrowed amounts) and verify lookup succeeds
- Generate random deposit sequences and verify vault data is correctly aggregated
- Generate random user addresses and verify vault isolation (no data mixing)

#### Bug 2: DePIN Funding Transaction
- Generate random funding amounts and verify transactions are constructed correctly
- Generate random project states and verify funding logic works across all states
- Generate random sequences of funding operations and verify all succeed

### Integration Tests

#### Bug 1: Collateral Vault Lookup
- Full flow: Create vault → Deposit collateral → Fetch vault → Verify data
- Full flow: Create vault → Deposit → Borrow → Fetch vault → Verify collateral ratio
- Full flow: Create vault → Deposit → Withdraw → Fetch vault → Verify updated balance
- Cross-user flow: Multiple users create vaults → Each user fetches their own vault → Verify isolation

#### Bug 2: DePIN Funding Transaction
- Full flow: Create project → Fund project → Verify NFT minted → Verify project state updated
- Full flow: Create project → Fund to target → Verify project closed → Verify final NFT
- Full flow: Create project → Multiple users fund → Verify all NFTs minted correctly
- Full flow: Fund project → Claim yield → Verify yield calculation and distribution
