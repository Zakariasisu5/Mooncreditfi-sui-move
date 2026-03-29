module mooncreditfi::depin {
    use std::string::{Self, String};
    use sui::object::{Self, UID};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;

    /// DePIN project for infrastructure funding
    public struct DepinProject has key, store {
        id: UID,
        name: String,
        description: String,
        target_amount: u64,
        current_amount: u64,
        apy: u64, // Annual percentage yield in basis points
        is_active: bool,
    }

    /// DePIN NFT representing investment
    public struct DepinNFT has key, store {
        id: UID,
        project_id: address,
        investor: address,
        amount: u64,
        timestamp: u64,
    }

    /// Events
    public struct ProjectCreated has copy, drop {
        project_id: address,
        name: String,
        target_amount: u64,
        apy: u64,
    }

    public struct ProjectFunded has copy, drop {
        project_id: address,
        investor: address,
        amount: u64,
        nft_id: address,
        total_funded: u64,
    }

    public struct NFTTransferred has copy, drop {
        nft_id: address,
        from: address,
        to: address,
    }

    /// Create a new DePIN project and share it (UI-callable)
    public entry fun create_project(
        name: vector<u8>,
        description: vector<u8>,
        target_amount: u64,
        apy: u64,
        ctx: &mut TxContext
    ) {
        let uid = object::new(ctx);
        let project_id = object::uid_to_address(&uid);
        let name_str = string::utf8(name);
        
        let project = DepinProject {
            id: uid,
            name: name_str,
            description: string::utf8(description),
            target_amount,
            current_amount: 0,
            apy,
            is_active: true,
        };

        // Emit event
        event::emit(ProjectCreated {
            project_id,
            name: name_str,
            target_amount,
            apy,
        });

        transfer::share_object(project);
    }

    /// Fund a DePIN project and receive NFT (UI-callable)
    public entry fun fund_project(
        project: &mut DepinProject,
        payment: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        let amount = coin::value(&payment);
        let investor = tx_context::sender(ctx);
        let project_id = object::uid_to_address(&project.id);

        // Update project funding
        project.current_amount = project.current_amount + amount;

        // Transfer payment to project treasury
        transfer::public_transfer(payment, @mooncreditfi);

        // Create NFT
        let nft_uid = object::new(ctx);
        let nft_id = object::uid_to_address(&nft_uid);
        
        let nft = DepinNFT {
            id: nft_uid,
            project_id,
            investor,
            amount,
            timestamp: tx_context::epoch(ctx),
        };

        // Emit event
        event::emit(ProjectFunded {
            project_id,
            investor,
            amount,
            nft_id,
            total_funded: project.current_amount,
        });

        // Transfer NFT to investor
        transfer::transfer(nft, investor);
    }

    /// Transfer NFT to another address (UI-callable)
    public entry fun transfer_nft(
        nft: DepinNFT,
        recipient: address,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let nft_id = object::uid_to_address(&nft.id);

        // Emit event
        event::emit(NFTTransferred {
            nft_id,
            from: sender,
            to: recipient,
        });

        transfer::transfer(nft, recipient);
    }

    /// Get project details
    public fun get_project_name(project: &DepinProject): &String {
        &project.name
    }

    public fun get_project_description(project: &DepinProject): &String {
        &project.description
    }

    public fun get_project_target(project: &DepinProject): u64 {
        project.target_amount
    }

    public fun get_project_current(project: &DepinProject): u64 {
        project.current_amount
    }

    public fun get_project_apy(project: &DepinProject): u64 {
        project.apy
    }

    public fun is_project_active(project: &DepinProject): bool {
        project.is_active
    }

    /// Get NFT details
    public fun get_nft_project_id(nft: &DepinNFT): address {
        nft.project_id
    }

    public fun get_nft_investor(nft: &DepinNFT): address {
        nft.investor
    }

    public fun get_nft_amount(nft: &DepinNFT): u64 {
        nft.amount
    }

    public fun get_nft_timestamp(nft: &DepinNFT): u64 {
        nft.timestamp
    }
}
