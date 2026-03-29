# MoonCreditFi Move Smart Contracts

This directory contains the Move smart contracts for MoonCreditFi, a decentralized lending protocol with on-chain credit scoring and DePIN infrastructure funding on Sui blockchain.

## Current Deployment (Sui Testnet)

**Package ID**: `0xb059616029897f6436640d7c254bcc6130f157c3677bda4eaaccf9f60014fe03`

**Deployed Objects**:
- **Lending Pool**: `0xdad7cc0f93773267022f8b94afab3743ba1f40214a049e8b64822c0dcbc80a1a`
- **Credit Profile**: `0x7332d82055668698dfb76c0f25a4da244a99d1e31af30ed0e8e2d9c3cb493ba2`
- **DePIN Project**: `0x3ac9433c7bbdce85254a5b0cad3be5f98fb656de63c4308b0f8c4b59a04fff53`

**Network**: Sui Testnet  
**Explorer**: https://suiscan.xyz/testnet

## Prerequisites

1. **Install Sui CLI**:
   ```bash
   # On macOS/Linux
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   cargo install --locked --git https://github.com/MystenLabs/sui.git --branch testnet sui
   
   # On Windows
   # Install Rust from https://rustup.rs/
   # Then run:
   cargo install --locked --git https://github.com/MystenLabs/sui.git --branch testnet sui
   ```

2. **Verify Installation**:
   ```bash
   sui --version
   ```

## Project Structure

```
contracts/
├── Move.toml                    # Package manifest
├── sources/
│   ├── credit_profile.move      # Credit scoring module
│   ├── lending_pool.move        # Liquidity pool module
│   ├── lending_logic.move       # Lending operations
│   └── depin.move               # DePIN funding module
└── README.md
```

## Modules

### 1. Credit Profile (`credit_profile.move`)
Manages user credit scores and loan history.

**Key Functions:**
- `new()` - Create a new credit profile
- `get_score()` - Get user's credit score
- `record_borrow()` - Record a new loan
- `record_repayment()` - Record loan repayment (increases score)
- `record_default()` - Record loan default (decreases score)

### 2. Lending Pool (`lending_pool.move`)
Manages liquidity for lending operations using Sui's Balance type for secure coin handling.

**Key Features:**
- Balance-based coin storage (prevents withdrawal issues)
- Shared object for concurrent access
- Interest rate management
- Liquidity tracking

**Key Functions:**
- `create_pool()` - Create a new lending pool (shared object)
- `add_liquidity()` - Add funds to pool (converts Coin to Balance)
- `remove_liquidity()` - Remove funds from pool (converts Balance to Coin)
- `record_borrow()` - Record a borrow operation
- `record_repayment()` - Record a repayment

### 3. Lending Logic (`lending_logic.move`)
Core lending operations combining credit profiles and pools with event emission.

**Key Features:**
- Credit score validation
- Event-driven architecture (DepositEvent, WithdrawEvent, BorrowEvent, RepayEvent)
- Automatic credit score updates
- Balance-based coin handling

**Key Functions:**
- `deposit()` - Deposit SUI into pool (emits DepositEvent)
- `withdraw()` - Withdraw SUI from pool (emits WithdrawEvent)
- `borrow()` - Borrow SUI from pool (requires min credit score, emits BorrowEvent)
- `repay()` - Repay a loan (improves credit score, emits RepayEvent)

### 4. DePIN (`depin.move`)
Decentralized Physical Infrastructure Network funding with NFT-based proof of investment.

**Key Features:**
- Shared project objects for concurrent funding
- NFT minting for investors (DepinNFT)
- Event-driven tracking (ProjectCreated, ProjectFunded, NFTTransferred)
- APY-based returns

**Key Functions:**
- `create_project()` - Create a new DePIN project (shared object)
- `fund_project()` - Fund a project and receive NFT proof of investment
- `transfer_nft()` - Transfer investment NFT to another address

**NFT Structure:**
- `project_id` - Reference to funded project
- `investor` - Original investor address
- `amount` - Investment amount in MIST
- `timestamp` - Investment epoch timestamp

## Building

```bash
cd contracts
sui move build
```

## Testing

```bash
sui move test
```

## Deployment

### Quick Deploy Script

Use the provided PowerShell script for easy deployment:

```powershell
# Windows
.\scripts\initialize-objects.ps1
```

```bash
# Linux/Mac
./scripts/initialize-objects.sh
```

### Manual Deployment

### 1. Configure Sui Client

```bash
# Connect to testnet
sui client new-env --alias testnet --rpc https://fullnode.testnet.sui.io:443

# Switch to testnet
sui client switch --env testnet

# Check active address
sui client active-address
```

### 2. Get Test SUI

Request test SUI from the faucet:
```bash
sui client faucet
```

Or use Discord: https://discord.com/channels/916379725201563759/971488439931392130

### 3. Deploy Contracts

```bash
cd contracts
sui client publish --gas-budget 100000000
```

**Important**: After deployment, you'll need to create the shared objects:

1. **Create Lending Pool**:
```bash
sui client call \
  --package <PACKAGE_ID> \
  --module lending_pool \
  --function create_pool \
  --gas-budget 10000000
```

2. **Create Credit Profile** (for testing):
```bash
sui client call \
  --package <PACKAGE_ID> \
  --module credit_profile \
  --function create_profile \
  --gas-budget 10000000
```

3. **Create DePIN Project**:
```bash
sui client call \
  --package <PACKAGE_ID> \
  --module depin \
  --function create_project \
  --args "Solar Farm" "Decentralized solar energy infrastructure" 100000000000000 800 \
  --gas-budget 10000000
```

Or use the automated script:
```powershell
.\scripts\create-depin-project.ps1
```

### 4. Save Deployment Info

After deployment, save the package ID and object IDs:

```bash
# Example output:
# Package ID: 0xb059616029897f6436640d7c254bcc6130f157c3677bda4eaaccf9f60014fe03
# LendingPool Object: 0xdad7cc0f93773267022f8b94afab3743ba1f40214a049e8b64822c0dcbc80a1a
# CreditProfile Object: 0x7332d82055668698dfb76c0f25a4da244a99d1e31af30ed0e8e2d9c3cb493ba2
# DePIN Project: 0x3ac9433c7bbdce85254a5b0cad3be5f98fb656de63c4308b0f8c4b59a04fff53
```

Update `src/config/sui.js` with these IDs:

```javascript
export const SUI_PACKAGE_ID = '0xb059616029897f6436640d7c254bcc6130f157c3677bda4eaaccf9f60014fe03';
export const LENDING_POOL_OBJECT_ID = '0xdad7cc0f93773267022f8b94afab3743ba1f40214a049e8b64822c0dcbc80a1a';
export const CREDIT_PROFILE_OBJECT_ID = '0x7332d82055668698dfb76c0f25a4da244a99d1e31af30ed0e8e2d9c3cb493ba2';
export const DEPIN_FINANCE_OBJECT_ID = '0x3ac9433c7bbdce85254a5b0cad3be5f98fb656de63c4308b0f8c4b59a04fff53';
```

## Upgrading Contracts

```bash
# Build with upgrade capability
sui client publish --gas-budget 100000000 --upgrade-capability

# Upgrade existing package
sui client upgrade --package-id <PACKAGE_ID> --gas-budget 100000000
```

## Interacting with Contracts

### Create Credit Profile

```bash
sui client call \
  --package 0xb059616029897f6436640d7c254bcc6130f157c3677bda4eaaccf9f60014fe03 \
  --module credit_profile \
  --function create_profile \
  --gas-budget 10000000
```

### Deposit to Lending Pool

```bash
sui client call \
  --package 0xb059616029897f6436640d7c254bcc6130f157c3677bda4eaaccf9f60014fe03 \
  --module lending_logic \
  --function deposit \
  --args 0xdad7cc0f93773267022f8b94afab3743ba1f40214a049e8b64822c0dcbc80a1a <COIN_OBJECT_ID> \
  --gas-budget 10000000
```

### Borrow from Pool

```bash
sui client call \
  --package 0xb059616029897f6436640d7c254bcc6130f157c3677bda4eaaccf9f60014fe03 \
  --module lending_logic \
  --function borrow \
  --args 0xdad7cc0f93773267022f8b94afab3743ba1f40214a049e8b64822c0dcbc80a1a <PROFILE_ID> <AMOUNT_IN_MIST> \
  --gas-budget 10000000
```

### Fund DePIN Project

```bash
sui client call \
  --package 0xb059616029897f6436640d7c254bcc6130f157c3677bda4eaaccf9f60014fe03 \
  --module depin \
  --function fund_project \
  --args 0x3ac9433c7bbdce85254a5b0cad3be5f98fb656de63c4308b0f8c4b59a04fff53 <COIN_OBJECT_ID> \
  --gas-budget 10000000
```

**Note**: Replace `<COIN_OBJECT_ID>`, `<PROFILE_ID>`, and `<AMOUNT_IN_MIST>` with actual values.

## Security Considerations

1. **Move Language Safety**: Move prevents reentrancy and double-spending by design
2. **Object Capability Model**: Access control through object ownership
3. **Balance-based Storage**: Using `Balance<SUI>` instead of tracking numbers prevents withdrawal issues
4. **Shared Objects**: Lending pool and DePIN projects use shared objects for concurrent access
5. **Event Emission**: All critical operations emit events for transparency and tracking
6. **Credit Score Validation**: Minimum credit score required for borrowing
7. **Formal Verification**: Consider using Move Prover for critical functions
8. **Audit**: Get contracts audited before mainnet deployment

## Key Design Decisions

### Why Balance<SUI> instead of u64?
The lending pool uses Sui's `Balance<SUI>` type to actually hold coins rather than just tracking amounts. This prevents issues where the pool tracks a balance but doesn't have the actual coins to return during withdrawals.

### Why Shared Objects?
The lending pool and DePIN projects are shared objects, allowing multiple users to interact with them concurrently without ownership transfers.

### Why Events?
Events are emitted for all critical operations (deposits, withdrawals, borrows, repayments, funding) to enable:
- Frontend tracking of user positions
- Analytics and monitoring
- Audit trails
- Off-chain indexing

## Common Issues

### Issue: "Protocol version mismatch"
**Solution**: Update Sui CLI to match network version:
```bash
cargo install --locked --git https://github.com/MystenLabs/sui.git --branch testnet sui
```

### Issue: "Insufficient gas"
**Solution**: Increase gas budget:
```bash
sui client publish --gas-budget 200000000
```

### Issue: "MoveAbort in lending_pool::remove_liquidity"
**Solution**: This was fixed by implementing Balance-based storage. Make sure you're using the latest version of the contracts.

### Issue: "CommandArgumentError { arg_idx: 0, kind: TypeMismatch }"
**Solution**: Ensure you're passing the correct object type. For shared objects like lending pool and DePIN projects, use the object ID directly.

### Issue: "Field access restricted"
**Solution**: Use public getter functions or `public(package)` visibility

### Issue: "Object not found"
**Solution**: Verify the object ID exists on the network using Sui Explorer: https://suiscan.xyz/testnet

## Resources

- [Sui Documentation](https://docs.sui.io/)
- [Move Language Book](https://move-language.github.io/move/)
- [Sui Move by Example](https://examples.sui.io/)
- [Sui Explorer (Testnet)](https://suiscan.xyz/testnet)
- [MoonCreditFi Package](https://suiscan.xyz/testnet/object/0xb059616029897f6436640d7c254bcc6130f157c3677bda4eaaccf9f60014fe03)
- [Sui Discord](https://discord.gg/sui)

## Development Tools

- **Sui CLI**: Command-line interface for Sui
- **Move Analyzer**: VS Code extension for Move development
- **Sui Explorer**: Block explorer for viewing transactions and objects
- **Sui Wallet**: Browser extension wallet for testing

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on testnet
5. Submit a pull request

## License

Apache 2.0
