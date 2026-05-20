#[allow(duplicate_alias)]
module mooncreditfi::depin {
    use std::string::{Self, String};
    use sui::object::{Self, UID};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::tx_context::TxContext;
    use sui::event;
    use sui::clock::{Self, Clock};
    use sui::balance::{Self, Balance};

    const EExceedsFundingTarget: u64 = 1;
    const EProjectNotActive: u64 = 2;
    const ENotOwner: u64 = 3;
    const ENotMatured: u64 = 4;
    const EInsufficientTreasury: u64 = 5;
    const EDivisionByZero: u64 = 6;
    const EOverflowPrevention: u64 = 8;

    public struct DepinProject has key, store {
        id: UID,
        name: String,
        description: String,
        target_amount: u64,
        current_amount: u64,
        apy: u64,
        is_active: bool,
        treasury_balance: Balance<SUI>,
        total_funded: u64,
        total_revenue: u64,
    }

    public struct DepinNFT has key, store {
        id: UID,
        project_id: address,
        investor: address,
        amount: u64,
        timestamp: u64,
        accumulated_yield: u64,
        last_yield_claim: u64,
        maturity_date: u64,
    }

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

    public struct ProjectClosed has copy, drop {
        project_id: address,
        final_amount: u64,
    }

    public struct YieldClaimed has copy, drop {
        nft_id: address,
        investor: address,
        yield_amount: u64,
        timestamp: u64,
    }

    public struct NFTRedeemed has copy, drop {
        nft_id: address,
        investor: address,
        principal: u64,
        final_yield: u64,
        total_return: u64,
    }

    public struct RevenueDistributedEvent has copy, drop {
        recipient: address,
        amount: u64,
        timestamp: u64,
    }

    public fun create_project(
        name: vector<u8>,
        description: vector<u8>,
        target_amount: u64,
        apy: u64,
        _clock: &Clock,
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
            treasury_balance: balance::zero(),
            total_funded: 0,
            total_revenue: 0,
        };

        event::emit(ProjectCreated { project_id, name: name_str, target_amount, apy });
        transfer::share_object(project);
    }

    public fun fund_project(
        project: &mut DepinProject,
        payment: Coin<SUI>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let amount = coin::value(&payment);
        let investor = tx_context::sender(ctx);
        let project_id = object::uid_to_address(&project.id);
        let current_time = clock::timestamp_ms(clock);

        assert!(project.is_active, EProjectNotActive);

        let remaining_capacity = project.target_amount - project.current_amount;
        assert!(amount <= remaining_capacity, EExceedsFundingTarget);

        let old_current = project.current_amount;
        let old_funded = project.total_funded;
        project.current_amount = project.current_amount + amount;
        project.total_funded = project.total_funded + amount;
        assert!(project.current_amount >= old_current, EOverflowPrevention);
        assert!(project.total_funded >= old_funded, EOverflowPrevention);

        if (project.current_amount >= project.target_amount) {
            project.is_active = false;
            event::emit(ProjectClosed {
                project_id,
                final_amount: project.current_amount,
            });
        };

        let payment_balance = coin::into_balance(payment);
        balance::join(&mut project.treasury_balance, payment_balance);

        let nft_uid = object::new(ctx);
        let nft_id = object::uid_to_address(&nft_uid);

        let maturity_date = current_time + 31536000000; // 365 days in milliseconds

        let nft = DepinNFT {
            id: nft_uid,
            project_id,
            investor,
            amount,
            timestamp: current_time,
            accumulated_yield: 0,
            last_yield_claim: current_time,
            maturity_date,
        };

        event::emit(ProjectFunded {
            project_id,
            investor,
            amount,
            nft_id,
            total_funded: project.current_amount,
        });

        transfer::transfer(nft, investor);
    }

    public fun transfer_nft(nft: DepinNFT, recipient: address, ctx: &mut TxContext) {
        let sender = tx_context::sender(ctx);
        let nft_id = object::uid_to_address(&nft.id);
        event::emit(NFTTransferred { nft_id, from: sender, to: recipient });
        transfer::public_transfer(nft, recipient);
    }

    public fun calculate_pending_yield(
        nft: &DepinNFT,
        project: &DepinProject,
        clock: &Clock
    ): u64 {
        let current_time = clock::timestamp_ms(clock);
        let time_elapsed = current_time - nft.last_yield_claim;

        // Calculate yield: (principal * APY * time_elapsed) / (365 days in ms * 10000 basis points)
        (nft.amount * project.apy * time_elapsed) / (365 * 86400000 * 10000)
    }

    public fun claim_yield(
        project: &mut DepinProject,
        nft: &mut DepinNFT,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let investor = tx_context::sender(ctx);
        let nft_id = object::uid_to_address(&nft.id);
        let current_time = clock::timestamp_ms(clock);

        assert!(nft.investor == investor, ENotOwner);

        let yield_amount = calculate_pending_yield(nft, project, clock);

        assert!(balance::value(&project.treasury_balance) >= yield_amount, EInsufficientTreasury);

        let yield_balance = balance::split(&mut project.treasury_balance, yield_amount);
        let yield_coin = coin::from_balance(yield_balance, ctx);
        transfer::public_transfer(yield_coin, investor);

        nft.accumulated_yield = nft.accumulated_yield + yield_amount;
        nft.last_yield_claim = current_time;

        event::emit(YieldClaimed {
            nft_id,
            investor,
            yield_amount,
            timestamp: current_time,
        });
    }

    public fun redeem_at_maturity(
        project: &mut DepinProject,
        nft: DepinNFT,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let investor = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);

        assert!(nft.investor == investor, ENotOwner);
        assert!(current_time >= nft.maturity_date, ENotMatured);

        let final_yield = calculate_pending_yield(&nft, project, clock);
        let total_return = nft.amount + final_yield;

        assert!(balance::value(&project.treasury_balance) >= total_return, EInsufficientTreasury);

        let return_balance = balance::split(&mut project.treasury_balance, total_return);
        let return_coin = coin::from_balance(return_balance, ctx);
        transfer::public_transfer(return_coin, investor);

        let nft_id = object::uid_to_address(&nft.id);
        event::emit(NFTRedeemed {
            nft_id,
            investor,
            principal: nft.amount,
            final_yield,
            total_return,
        });

        let DepinNFT {
            id,
            project_id: _,
            investor: _,
            amount: _,
            timestamp: _,
            accumulated_yield: _,
            last_yield_claim: _,
            maturity_date: _
        } = nft;
        object::delete(id);
    }

    // Getters
    public fun get_project_name(project: &DepinProject): &String { &project.name }
    public fun get_project_description(project: &DepinProject): &String { &project.description }
    public fun get_project_target(project: &DepinProject): u64 { project.target_amount }
    public fun get_project_current(project: &DepinProject): u64 { project.current_amount }
    public fun get_project_apy(project: &DepinProject): u64 { project.apy }
    public fun is_project_active(project: &DepinProject): bool { project.is_active }
    public fun get_treasury_balance(project: &DepinProject): u64 { balance::value(&project.treasury_balance) }
    public fun get_total_funded(project: &DepinProject): u64 { project.total_funded }
    public fun get_total_revenue(project: &DepinProject): u64 { project.total_revenue }

    public fun get_nft_project_id(nft: &DepinNFT): address { nft.project_id }
    public fun get_nft_investor(nft: &DepinNFT): address { nft.investor }
    public fun get_nft_amount(nft: &DepinNFT): u64 { nft.amount }
    public fun get_nft_timestamp(nft: &DepinNFT): u64 { nft.timestamp }
    public fun get_nft_accumulated_yield(nft: &DepinNFT): u64 { nft.accumulated_yield }
    public fun get_nft_last_yield_claim(nft: &DepinNFT): u64 { nft.last_yield_claim }
    public fun get_nft_maturity_date(nft: &DepinNFT): u64 { nft.maturity_date }

    public(package) fun record_revenue(project: &mut DepinProject, amount: u64) {
        let old_revenue = project.total_revenue;
        project.total_revenue = project.total_revenue + amount;
        assert!(project.total_revenue >= old_revenue, EOverflowPrevention);
    }

    public fun distribute_revenue(
        project: &mut DepinProject,
        nft: &DepinNFT,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let recipient = tx_context::sender(ctx);
        assert!(nft.investor == recipient, ENotOwner);
        assert!(project.total_funded > 0, EDivisionByZero);
        
        let user_share = (project.total_revenue * nft.amount) / project.total_funded;
        let treasury_balance = balance::value(&project.treasury_balance);
        assert!(treasury_balance >= user_share, EInsufficientTreasury);
        
        let share_balance = balance::split(&mut project.treasury_balance, user_share);
        let share_coin = coin::from_balance(share_balance, ctx);
        transfer::public_transfer(share_coin, recipient);
        
        let current_time = clock::timestamp_ms(clock);
        event::emit(RevenueDistributedEvent {
            recipient,
            amount: user_share,
            timestamp: current_time,
        });
    }
}
