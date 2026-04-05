module mooncreditfi::collateral {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::event;

    // Error constants
    const ENotOwner: u64 = 1;
    const EInsufficientCollateral: u64 = 2;
    const EHasActiveLoans: u64 = 3;
    const EBelowLiquidationThreshold: u64 = 4;
    const EAboveLiquidationThreshold: u64 = 5;
    const ENoCollateral: u64 = 6;

    // Liquidation threshold: 150% = 15000 basis points
    // Borrower must maintain collateral worth at least 150% of borrowed amount
    const LIQUIDATION_THRESHOLD: u64 = 15000;
    
    // Liquidation penalty: 10% = 1000 basis points
    // Liquidator receives 10% bonus from collateral
    const LIQUIDATION_PENALTY: u64 = 1000;

    // Collateral vault for each user
    public struct CollateralVault has key {
        id: UID,
        owner: address,
        collateral: Balance<SUI>,
        collateral_amount: u64,
        borrowed_amount: u64,  // Track total borrowed against this collateral
    }

    // Events
    public struct VaultCreated has copy, drop {
        vault_id: address,
        owner: address,
    }

    public struct CollateralDeposited has copy, drop {
        vault_id: address,
        owner: address,
        amount: u64,
        total_collateral: u64,
    }

    public struct CollateralWithdrawn has copy, drop {
        vault_id: address,
        owner: address,
        amount: u64,
        remaining_collateral: u64,
    }

    public struct CollateralLiquidated has copy, drop {
        vault_id: address,
        owner: address,
        liquidator: address,
        collateral_liquidated: u64,
        debt_covered: u64,
        liquidator_bonus: u64,
    }

    // Create a new collateral vault
    public entry fun create_vault(ctx: &mut TxContext) {
        let sender = tx_context::sender(ctx);
        let uid = object::new(ctx);
        let vault_id = object::uid_to_address(&uid);
        
        let vault = CollateralVault {
            id: uid,
            owner: sender,
            collateral: balance::zero(),
            collateral_amount: 0,
            borrowed_amount: 0,
        };
        
        event::emit(VaultCreated {
            vault_id,
            owner: sender,
        });
        
        transfer::share_object(vault);
    }

    // Deposit collateral into vault
    public entry fun deposit_collateral(
        vault: &mut CollateralVault,
        payment: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(vault.owner == sender, ENotOwner);
        
        let amount = coin::value(&payment);
        let payment_balance = coin::into_balance(payment);
        
        balance::join(&mut vault.collateral, payment_balance);
        vault.collateral_amount = vault.collateral_amount + amount;
        
        let vault_id = object::uid_to_address(&vault.id);
        event::emit(CollateralDeposited {
            vault_id,
            owner: sender,
            amount,
            total_collateral: vault.collateral_amount,
        });
    }

    // Withdraw collateral from vault (only if no active loans)
    public entry fun withdraw_collateral(
        vault: &mut CollateralVault,
        amount: u64,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(vault.owner == sender, ENotOwner);
        assert!(vault.borrowed_amount == 0, EHasActiveLoans);
        assert!(vault.collateral_amount >= amount, EInsufficientCollateral);
        
        let withdrawn_balance = balance::split(&mut vault.collateral, amount);
        let withdrawn_coin = coin::from_balance(withdrawn_balance, ctx);
        
        vault.collateral_amount = vault.collateral_amount - amount;
        
        transfer::public_transfer(withdrawn_coin, sender);
        
        let vault_id = object::uid_to_address(&vault.id);
        event::emit(CollateralWithdrawn {
            vault_id,
            owner: sender,
            amount,
            remaining_collateral: vault.collateral_amount,
        });
    }

    // Calculate collateral ratio in basis points
    // Returns: (collateral_amount * 10000) / borrowed_amount
    public fun calculate_collateral_ratio(vault: &CollateralVault): u64 {
        if (vault.borrowed_amount == 0) {
            return 0  // No debt, ratio is undefined (return 0 to indicate no risk)
        };
        (vault.collateral_amount * 10000) / vault.borrowed_amount
    }

    // Check if vault is below liquidation threshold
    public fun is_liquidatable(vault: &CollateralVault): bool {
        if (vault.borrowed_amount == 0) {
            return false  // No debt, cannot liquidate
        };
        let ratio = calculate_collateral_ratio(vault);
        ratio < LIQUIDATION_THRESHOLD
    }

    // Liquidate an underwater position
    public entry fun liquidate(
        vault: &mut CollateralVault,
        ctx: &mut TxContext
    ) {
        let liquidator = tx_context::sender(ctx);
        
        // Verify vault is liquidatable
        assert!(is_liquidatable(vault), EAboveLiquidationThreshold);
        assert!(vault.collateral_amount > 0, ENoCollateral);
        
        let debt = vault.borrowed_amount;
        let collateral = vault.collateral_amount;
        
        // Calculate liquidation amounts
        // Liquidator pays off debt and receives collateral + penalty
        let liquidator_bonus = (debt * LIQUIDATION_PENALTY) / 10000;
        let total_liquidation = debt + liquidator_bonus;
        
        // Ensure we don't liquidate more than available collateral
        let actual_liquidation = if (total_liquidation > collateral) {
            collateral
        } else {
            total_liquidation
        };
        
        // Transfer liquidated collateral to liquidator
        let liquidated_balance = balance::split(&mut vault.collateral, actual_liquidation);
        let liquidated_coin = coin::from_balance(liquidated_balance, ctx);
        transfer::public_transfer(liquidated_coin, liquidator);
        
        // Update vault state
        vault.collateral_amount = vault.collateral_amount - actual_liquidation;
        vault.borrowed_amount = 0;  // Debt is cleared
        
        let vault_id = object::uid_to_address(&vault.id);
        event::emit(CollateralLiquidated {
            vault_id,
            owner: vault.owner,
            liquidator,
            collateral_liquidated: actual_liquidation,
            debt_covered: debt,
            liquidator_bonus,
        });
    }

    // Package-level functions for lending_logic integration
    
    // Record a new borrow against collateral
    public(package) fun record_borrow(vault: &mut CollateralVault, amount: u64) {
        vault.borrowed_amount = vault.borrowed_amount + amount;
    }

    // Record a repayment
    public(package) fun record_repayment(vault: &mut CollateralVault, amount: u64) {
        if (vault.borrowed_amount >= amount) {
            vault.borrowed_amount = vault.borrowed_amount - amount;
        } else {
            vault.borrowed_amount = 0;
        };
    }

    // Check if vault has sufficient collateral for borrowing
    public fun check_collateral_sufficient(vault: &CollateralVault, borrow_amount: u64): bool {
        let new_borrowed = vault.borrowed_amount + borrow_amount;
        let required_collateral = (new_borrowed * LIQUIDATION_THRESHOLD) / 10000;
        vault.collateral_amount >= required_collateral
    }

    // Getters
    public fun get_owner(vault: &CollateralVault): address { vault.owner }
    public fun get_collateral_amount(vault: &CollateralVault): u64 { vault.collateral_amount }
    public fun get_borrowed_amount(vault: &CollateralVault): u64 { vault.borrowed_amount }
    public fun get_liquidation_threshold(): u64 { LIQUIDATION_THRESHOLD }
    public fun get_liquidation_penalty(): u64 { LIQUIDATION_PENALTY }
}
