# MoonCreditFi Move Smart Contracts

This directory contains the Move smart contracts for MoonCreditFi on Sui blockchain.

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
Manages liquidity for lending operations.

**Key Functions:**
- `new()` - Create a new lending pool
- `add_liquidity()` - Add funds to pool
- `remove_liquidity()` - Remove funds from pool
- `record_borrow()` - Record a borrow operation
- `record_repayment()` - Record a repayment

### 3. Lending Logic (`lending_logic.move`)
Core lending operations combining credit profiles and pools.

**Key Functions:**
- `borrow()` - Borrow SUI from pool (requires min credit score)
- `repay()` - Repay a loan
- `deposit()` - Deposit SUI into pool
- `withdraw()` - Withdraw SUI from pool

### 4. DePIN (`depin.move`)
Infrastructure funding and NFT rewards.

**Key Functions:**
- `create_project()` - Create a new DePIN project
- `fund_project()` - Fund a project and receive NFT
- `transfer_nft()` - Transfer investment NFT

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
sui client publish --gas-budget 100000000
```

### 4. Save Package ID

After deployment, save the package ID and object IDs:

```bash
# Example output:
# Package ID: 0xabcd1234...
# LendingPool Object: 0xef567890...
# CreditProfile Object: 0x12345678...
```

Update `src/config/sui.js` with these IDs:

```javascript
export const SUI_PACKAGE_ID = '0xabcd1234...';
export const LENDING_POOL_OBJECT_ID = '0xef567890...';
export const CREDIT_PROFILE_OBJECT_ID = '0x12345678...';
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
  --package <PACKAGE_ID> \
  --module credit_profile \
  --function new \
  --args <OWNER_ADDRESS> \
  --gas-budget 10000000
```

### Borrow from Pool

```bash
sui client call \
  --package <PACKAGE_ID> \
  --module lending_logic \
  --function borrow \
  --args <POOL_ID> <PROFILE_ID> <AMOUNT> \
  --gas-budget 10000000
```

## Security Considerations

1. **Move Language Safety**: Move prevents reentrancy by design
2. **Object Capability Model**: Access control through object ownership
3. **Formal Verification**: Consider using Move Prover for critical functions
4. **Audit**: Get contracts audited before mainnet deployment

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

### Issue: "Field access restricted"
**Solution**: Use public getter functions or `public(package)` visibility

## Resources

- [Sui Documentation](https://docs.sui.io/)
- [Move Language Book](https://move-language.github.io/move/)
- [Sui Move by Example](https://examples.sui.io/)
- [Sui Explorer](https://suiscan.xyz/testnet)

## License

Apache 2.0
