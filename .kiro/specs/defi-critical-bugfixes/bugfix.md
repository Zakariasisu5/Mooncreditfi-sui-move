# Bugfix Requirements Document

## Introduction

This document addresses two critical bugs in the DeFi application that prevent core functionality from working. Bug 1 prevents users from depositing collateral due to incorrect vault lookup logic for shared objects. Bug 2 prevents users from funding DePIN projects due to missing transaction arguments. Both bugs block essential user workflows and must be fixed to restore application functionality.

## Bug Analysis

### Bug 1: Failed to Fetch Collateral Vault

#### Current Behavior (Defect)

1.1 WHEN a user attempts to deposit collateral into their vault THEN the system displays "Failed to fetch vault. Please try again." even though the vault exists on-chain

1.2 WHEN CollateralVaultDataService.fetchCollateralVault() executes THEN the system uses getOwnedObjects() to search for the vault which returns no results because the vault is a shared object

1.3 WHEN a CollateralVault is created using transfer::share_object() in the Move contract THEN the system makes it a shared object that cannot be found via getOwnedObjects()

#### Expected Behavior (Correct)

2.1 WHEN a user attempts to deposit collateral into their vault THEN the system SHALL successfully locate the vault and allow the deposit operation

2.2 WHEN CollateralVaultDataService.fetchCollateralVault() executes THEN the system SHALL use a method that works for shared objects (such as querying CollateralDeposited events or using getDynamicFields on a registry)

2.3 WHEN searching for a user's CollateralVault THEN the system SHALL correctly handle shared objects created with transfer::share_object()

#### Unchanged Behavior (Regression Prevention)

3.1 WHEN a CollateralVault is created THEN the system SHALL CONTINUE TO emit CollateralDeposited events with vault_id and owner fields

3.2 WHEN collateral is deposited or withdrawn THEN the system SHALL CONTINUE TO update the vault's collateral_amount and borrowed_amount fields correctly

3.3 WHEN a vault has no collateral deposited yet THEN the system SHALL CONTINUE TO allow the vault to be found and displayed to the user

3.4 WHEN multiple users have vaults THEN the system SHALL CONTINUE TO correctly identify each user's vault without mixing data between users

### Bug 2: Incorrect Number of Arguments for fund_project

#### Current Behavior (Defect)

1.4 WHEN a user attempts to fund a DePIN project THEN the system displays "Unable to process transaction: Incorrect number of arguments for 0xea0bcec63b5d7593cc972d2c5e919324778ec69f5e68a9756dd0c91a2c42b812::depin::fund_project"

1.5 WHEN DePINService.createFundProjectTransaction() builds the transaction THEN the system passes only the project object, coin, and clock arguments to fund_project

1.6 WHEN the Move contract fund_project function signature requires (project: &mut DepinProject, payment: Coin<SUI>, clock: &Clock, ctx: &mut TxContext) THEN the system expects exactly 3 explicit arguments (ctx is auto-added by the runtime)

#### Expected Behavior (Correct)

2.4 WHEN a user attempts to fund a DePIN project THEN the system SHALL successfully submit the transaction and mint a DepinNFT to the user

2.5 WHEN DePINService.createFundProjectTransaction() builds the transaction THEN the system SHALL pass the correct number and order of arguments matching the Move function signature

2.6 WHEN calling fund_project via moveCall THEN the system SHALL provide exactly 3 arguments: project object, coin, and clock (with ctx auto-added by the Sui runtime)

#### Unchanged Behavior (Regression Prevention)

3.5 WHEN a DePIN project is funded successfully THEN the system SHALL CONTINUE TO emit ProjectFunded events with correct project_id, investor, amount, and nft_id

3.6 WHEN funding causes a project to reach its target amount THEN the system SHALL CONTINUE TO set is_active to false and emit ProjectClosed event

3.7 WHEN a DepinNFT is minted THEN the system SHALL CONTINUE TO set the maturity_date to 365 days from the funding timestamp

3.8 WHEN the transaction completes THEN the system SHALL CONTINUE TO transfer the DepinNFT to the investor's address
