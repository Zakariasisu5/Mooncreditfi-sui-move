# MoonCreditFi Move Smart Contracts

This directory contains the Move smart contracts for MoonCreditFi, a decentralized lending protocol with on-chain credit scoring and DePIN infrastructure funding on Sui blockchain.

## Current Deployment (Sui Testnet)

**Package ID**: `0x2388af4607e9a5462058b146fe8cbb1e1d2b602862f8205d7a7844fcb4b568e5`

**Core Deployed Objects**:
- **Profile Registry**: `0x59bee28062384ea12e53a1014dc32443090fc90e15caf4e90d56559d7bff315f`
- **Lending Pool**: `0xb1d0c030979b33b1266984a979c3d98958e0a735b6628d473e5df9166615b03e`
- **Upgrade Cap**: `0xc1f4a8ad5a8526647d61cd4a1e14e8f6cfbc78e3e38354aa9ad7f7a8551abd26`

**Risk-Based Lending Pools**:
- **Low Risk Pool** (Level 1): `0xb70fa7c6e48e0a8f79a3d12c9a7df37f0c9a3d3b3b2cda2aacc0e3bd903d8cc4`
  - Min Reputation: 600+
  - APY: 3.5%
- **Medium Risk Pool** (Level 2): `0xdc498215dd5bbaec9377222cefcb559a10f7a814290fbd1572a2df40749b98e6`
  - Min Reputation: 400+
  - APY: 6.5%
- **High Risk Pool** (Level 3): `0x9276e0e3f3eeb9653a5c23fadeedc4bfa73e404fbf2870138e9aef2052c82311`
  - Min Reputation: 0 (No minimum)
  - APY: 12.0%

**Islamic Finance Pool**:
- **Mudarabah Pool**: `0x61064a963336445556012d57a7827e342e8fe6eb5be899da4f50263fbf4fab90`
  - Profit-sharing: 70/30 split
  - Sharia-compliant

**DePIN Projects**:
- **Solar Farm Network**: `0xc19729095eaf30af890aa66172f906ce9f7050d0cff1137ac460b0fb0a283c36` (100 SUI, 12% APY)
- **EV Charging Network**: `0x16ff67f07c3141cccc8602bd13485cd1721d2157c38e4d725471910ee6769eb5` (120 SUI, 11% APY)
- **IoT Sensor Network**: `0x067bb4f01c62c6ffb2962a351e718beb53f26a475a672d14b0e463e12ef589d4` (80 SUI, 13% APY)
- **Satellite Internet**: `0x3cf276315abb1ca26e4d581eddb1c39e6938d7978b12a99c1f5249dd0f2e5579` (300 SUI, 18% APY)

**Network**: Sui Testnet  
**Deployed**: May 2026  
**Explorer**: https://suiscan.xyz/testnet/object/0x2388af4607e9a5462058b146fe8cbb1e1d2b602862f8205d7a7844fcb4b568e5  
**Status**: ✅ Production Ready (18/18 tests passing)

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
├── Published.toml               # Published package info
├── Move.lock                    # Dependency lock file
├── sources/
│   ├── credit_profile.move      # Credit scoring & profile management
│   ├── credit_scoring.move      # Advanced credit scoring algorithms
│   ├── lending_pool.move        # Standard liquidity pool
│   ├── lending_logic.move       # Standard lending operations
│   ├── collateral.move          # Collateral vault management
│   ├── loan.move                # Loan lifecycle management
│   ├── risk_pool.move           # Risk-based lending pools
│   ├── mudarabah.move           # Islamic finance (profit-sharing)
│   └── depin.move               # DePIN funding & NFTs
├── tests/
│   ├── credit_based_lending_tests.move
│   ├── lending_pool_tests.move
│   ├── referral_trust_tests.move
│   ├── reputation_update_tests.move
│   └── withdrawal_security_tests.move
└── README.md
```

## Modules

### 1. Credit Profile (`credit_profile.move`)
Manages user credit scores, reputation, and loan history.

**Key Functions:**
- `create_profile()` - Create a new credit profile
- `get_score()` - Get user's credit score (300-850)
- `get_reputation()` - Get user's reputation score (0-1000)
- `get_owner()` - Get profile owner address
- `record_borrow()` - Record a new loan
- `record_repayment()` - Record loan repayment (increases score)
- `record_default()` - Record loan default (decreases score)
- `update_reputation()` - Update reputation score

**Credit Score Range**: 300-850  
**Reputation Range**: 0-1000

---

### 2. Credit Scoring (`credit_scoring.move`)
Advanced credit scoring algorithms and risk assessment.

**Key Functions:**
- `calculate_credit_score()` - Calculate credit score based on history
- `assess_risk()` - Assess borrower risk level
- `get_collateral_requirement()` - Calculate required collateral
- `get_interest_rate()` - Calculate interest rate based on score

---

### 3. Lending Pool (`lending_pool.move`)
Manages liquidity for standard lending operations using Sui's Balance type.

**Key Features:**
- Balance-based coin storage (prevents withdrawal issues)
- Shared object for concurrent access
- Dynamic interest rate management
- Liquidity tracking

**Key Functions:**
- `create_pool(base_rate, risk_premium)` - Create lending pool (shared object)
- `add_liquidity()` - Add funds to pool (converts Coin to Balance)
- `remove_liquidity()` - Remove funds from pool (converts Balance to Coin)
- `record_borrow()` - Record a borrow operation
- `record_repayment()` - Record a repayment
- `get_total_liquidity()` - Get pool liquidity
- `get_interest_rate()` - Get current interest rate

---

### 4. Lending Logic (`lending_logic.move`)
Core lending operations combining credit profiles and pools with event emission.

**Key Features:**
- Credit score validation
- Event-driven architecture (DepositEvent, WithdrawEvent, BorrowEvent, RepayEvent)
- Automatic credit score updates
- Balance-based coin handling
- **Security**: Loans are non-transferable to prevent debt escaping

**Key Functions:**
- `deposit()` - Deposit SUI into pool (emits DepositEvent)
- `withdraw()` - Withdraw SUI from pool (emits WithdrawEvent)
- `borrow()` - Borrow SUI from pool (requires min credit score, emits BorrowEvent)
- `repay()` - Repay a loan (improves credit score, emits RepayEvent)

**Security Note**: Loan objects cannot be transferred between addresses. This prevents borrowers from escaping debt by transferring loans to burner addresses. Loans must be held and repaid by the original borrower.

---

### 5. Collateral (`collateral.move`)
Manages collateral vaults for secured lending.

**Key Features:**
- User-owned collateral vaults
- Secure deposit/withdrawal
- Collateral tracking
- Integration with lending logic

**Key Functions:**
- `create_vault()` - Create collateral vault
- `deposit_collateral()` - Deposit collateral
- `withdraw_collateral()` - Withdraw collateral
- `get_collateral_amount()` - Get vault balance
- `get_owner()` - Get vault owner

---

### 6. Loan (`loan.move`)
Manages loan lifecycle and repayment tracking.

**Key Features:**
- Loan creation and tracking
- Repayment management
- Interest calculation
- Loan status tracking

**Key Functions:**
- `create_loan()` - Create new loan
- `record_repayment()` - Record loan repayment
- `calculate_interest()` - Calculate accrued interest
- `get_loan_status()` - Get current loan status
- `is_defaulted()` - Check if loan is in default

---

### 7. Risk Pool (`risk_pool.move`)
Risk-based lending pools with reputation-gated access.

**Key Features:**
- Three risk levels (1=Low, 2=Medium, 3=High)
- Reputation-based access control
- Separate liquidity pools per risk level
- Event-driven tracking

**Key Functions:**
- `create_risk_pool(risk_level)` - Create risk pool (1, 2, or 3)
- `deposit_to_risk_pool()` - Deposit liquidity to risk pool
- `borrow_from_risk_pool()` - Borrow based on reputation
- `get_total_liquidity()` - Get pool liquidity
- `get_risk_level()` - Get risk level

**Risk Levels:**
- Level 1 (Low): 600+ reputation required
- Level 2 (Medium): 400+ reputation required
- Level 3 (High): No minimum reputation

---

### 8. Mudarabah (`mudarabah.move`)
Islamic finance module with profit-sharing (Sharia-compliant).

**Key Features:**
- Interest-free lending
- Profit-sharing model (70/30 split)
- Sharia-compliant operations
- Shared pool for concurrent access

**Key Functions:**
- `create_mudarabah_pool()` - Create Islamic finance pool
- `deposit_to_mudarabah()` - Deposit to profit-sharing pool
- `distribute_profit()` - Distribute profits (70% investor, 30% manager)
- `withdraw_from_mudarabah()` - Withdraw investment
- `get_pool_balance()` - Get pool balance

**Profit Distribution:**
- 70% to investors (Rab-ul-Mal)
- 30% to manager (Mudarib)

---

### 9. DePIN (`depin.move`)
Decentralized Physical Infrastructure Network funding with NFT-based proof of investment and proportional revenue distribution.

**Key Features:**
- Shared project objects for concurrent funding
- NFT minting for investors (DepinNFT)
- Revenue tracking and proportional distribution
- Event-driven tracking (ProjectCreated, ProjectFunded, RevenueDistributed, NFTTransferred)
- APY-based returns
- Treasury management for revenue distribution

**Key Functions:**
- `create_project()` - Create a new DePIN project (shared object)
- `fund_project()` - Fund a project and receive NFT proof of investment
- `distribute_revenue()` - Claim proportional revenue share based on contribution
- `transfer_nft()` - Transfer investment NFT to another address
- `add_revenue()` - Add revenue to project treasury (admin function)
- `get_project_name()` - Get project name
- `get_project_target()` - Get funding target
- `get_project_current()` - Get current funding
- `get_project_apy()` - Get project APY

**NFT Structure (DepinNFT):**
- `project_id` - Reference to funded project
- `investor` - Original investor address
- `amount` - Investment amount in MIST
- `timestamp` - Investment epoch timestamp

**Project Structure (DepinProject):**
- `name` - Project name
- `description` - Project description
- `target_amount` - Funding goal in MIST
- `current_amount` - Current funding progress
- `total_funded` - Cumulative total funded (for revenue calculation)
- `total_revenue` - Cumulative revenue generated
- `treasury` - Balance holding revenue for distribution
- `apy` - Expected annual percentage yield
- `is_active` - Whether project accepts new funding

**Revenue Distribution:**
- Revenue share = (total_revenue × user_contribution) / total_funded
- Proportional to contribution amount
- Claimable anytime via `distribute_revenue()`
- Verified through NFT ownership

---

## Building

```bash
cd contracts
sui move build
```

## Testing

```bash
cd contracts
sui move test
```

**Test Results**: ✅ 18/18 tests passing

**Test Coverage:**
- ✅ `credit_based_lending_tests.move` - Credit-based lending scenarios
- ✅ `lending_pool_tests.move` - Pool operations and liquidity management
- ✅ `referral_trust_tests.move` - Referral and trust mechanisms
- ✅ `reputation_update_tests.move` - Reputation score updates
- ✅ `withdrawal_security_tests.move` - Withdrawal security and validation

**Test Command Output:**
```
INCLUDING DEPENDENCY Sui
INCLUDING DEPENDENCY MoveStdlib
BUILDING mooncreditfi
Running Move unit tests
[ PASS    ] 0x2388af...::credit_based_lending_tests::test_credit_based_lending
[ PASS    ] 0x2388af...::lending_pool_tests::test_pool_operations
[ PASS    ] 0x2388af...::referral_trust_tests::test_referral_system
[ PASS    ] 0x2388af...::reputation_update_tests::test_reputation_updates
[ PASS    ] 0x2388af...::withdrawal_security_tests::test_withdrawal_security
...
Test result: OK. Total tests: 18; passed: 18; failed: 0
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
sui client publish --gas-budget 500000000
```

**Important**: After deployment, you'll need to create the shared objects:

#### 1. Create Lending Pool
```bash
sui client call \
  --package 0x2388af4607e9a5462058b146fe8cbb1e1d2b602862f8205d7a7844fcb4b568e5 \
  --module lending_pool \
  --function create_pool \
  --args 500 500 \
  --gas-budget 100000000
```

#### 2. Create Risk Pools

**Low Risk Pool (Level 1)**:
```bash
sui client call \
  --package 0x2388af4607e9a5462058b146fe8cbb1e1d2b602862f8205d7a7844fcb4b568e5 \
  --module risk_pool \
  --function create_risk_pool \
  --args 1 \
  --gas-budget 100000000
```

**Medium Risk Pool (Level 2)**:
```bash
sui client call \
  --package 0x2388af4607e9a5462058b146fe8cbb1e1d2b602862f8205d7a7844fcb4b568e5 \
  --module risk_pool \
  --function create_risk_pool \
  --args 2 \
  --gas-budget 100000000
```

**High Risk Pool (Level 3)**:
```bash
sui client call \
  --package 0x2388af4607e9a5462058b146fe8cbb1e1d2b602862f8205d7a7844fcb4b568e5 \
  --module risk_pool \
  --function create_risk_pool \
  --args 3 \
  --gas-budget 100000000
```

#### 3. Create Mudarabah Pool
```bash
sui client call \
  --package 0x2388af4607e9a5462058b146fe8cbb1e1d2b602862f8205d7a7844fcb4b568e5 \
  --module mudarabah \
  --function create_mudarabah_pool \
  --gas-budget 100000000
```

#### 4. Create DePIN Projects

**Solar Farm Network**:
```bash
sui client call \
  --package 0x2388af4607e9a5462058b146fe8cbb1e1d2b602862f8205d7a7844fcb4b568e5 \
  --module depin \
  --function create_project \
  --args "Solar Farm Network" "Decentralized solar energy infrastructure" 100000000000 1200 \
  --gas-budget 100000000
```

**EV Charging Network**:
```bash
sui client call \
  --package 0x2388af4607e9a5462058b146fe8cbb1e1d2b602862f8205d7a7844fcb4b568e5 \
  --module depin \
  --function create_project \
  --args "EV Charging Network" "Decentralized electric vehicle charging stations" 120000000000 1100 \
  --gas-budget 100000000
```

**IoT Sensor Network**:
```bash
sui client call \
  --package 0x2388af4607e9a5462058b146fe8cbb1e1d2b602862f8205d7a7844fcb4b568e5 \
  --module depin \
  --function create_project \
  --args "IoT Sensor Network" "Decentralized environmental monitoring sensors" 80000000000 1300 \
  --gas-budget 100000000
```

**Satellite Internet Network**:
```bash
sui client call \
  --package 0x2388af4607e9a5462058b146fe8cbb1e1d2b602862f8205d7a7844fcb4b568e5 \
  --module depin \
  --function create_project \
  --args "Satellite Internet Network" "Decentralized low-earth orbit satellite constellation" 300000000000 1800 \
  --gas-budget 100000000
```

Or use the automated scripts:
```powershell
# Windows
.\scripts\initialize-all-objects.ps1
.\scripts\create-risk-pool-low.ps1
.\scripts\create-depin-project.ps1
```

```bash
# Linux/Mac
./scripts/initialize-all-objects.sh
./scripts/create-risk-pool-low.sh
./scripts/create-depin-project.sh
```

### 4. Save Deployment Info

After deployment, save the package ID and object IDs:

```bash
# Example output:
# Package ID: 0x2388af4607e9a5462058b146fe8cbb1e1d2b602862f8205d7a7844fcb4b568e5
# Profile Registry: 0x59bee28062384ea12e53a1014dc32443090fc90e15caf4e90d56559d7bff315f
# Lending Pool: 0xb1d0c030979b33b1266984a979c3d98958e0a735b6628d473e5df9166615b03e
# Risk Pool Low: 0xb70fa7c6e48e0a8f79a3d12c9a7df37f0c9a3d3b3b2cda2aacc0e3bd903d8cc4
# Risk Pool Medium: 0xdc498215dd5bbaec9377222cefcb559a10f7a814290fbd1572a2df40749b98e6
# Risk Pool High: 0x9276e0e3f3eeb9653a5c23fadeedc4bfa73e404fbf2870138e9aef2052c82311
# Mudarabah Pool: 0x61064a963336445556012d57a7827e342e8fe6eb5be899da4f50263fbf4fab90
# DePIN Projects: (4 project IDs)
```

Update `src/config/sui.js` with these IDs:

```javascript
// Core Configuration
export const SUI_PACKAGE_ID = '0x2388af4607e9a5462058b146fe8cbb1e1d2b602862f8205d7a7844fcb4b568e5';
export const PROFILE_REGISTRY_OBJECT_ID = '0x59bee28062384ea12e53a1014dc32443090fc90e15caf4e90d56559d7bff315f';
export const LENDING_POOL_OBJECT_ID = '0xb1d0c030979b33b1266984a979c3d98958e0a735b6628d473e5df9166615b03e';
export const UPGRADE_CAP_OBJECT_ID = '0xc1f4a8ad5a8526647d61cd4a1e14e8f6cfbc78e3e38354aa9ad7f7a8551abd26';

// Risk Pools
export const RISK_POOL_LOW = '0xb70fa7c6e48e0a8f79a3d12c9a7df37f0c9a3d3b3b2cda2aacc0e3bd903d8cc4';
export const RISK_POOL_MEDIUM = '0xdc498215dd5bbaec9377222cefcb559a10f7a814290fbd1572a2df40749b98e6';
export const RISK_POOL_HIGH = '0x9276e0e3f3eeb9653a5c23fadeedc4bfa73e404fbf2870138e9aef2052c82311';

// Islamic Finance
export const MUDARABAH_POOL = '0x61064a963336445556012d57a7827e342e8fe6eb5be899da4f50263fbf4fab90';

// DePIN Projects
export const DEPIN_PROJECTS = [
  {
    id: '0xc19729095eaf30af890aa66172f906ce9f7050d0cff1137ac460b0fb0a283c36',
    category: 'Solar',
    name: 'Solar Farm Network',
    target_amount: 100000000000,
    apy: 1200
  },
  // ... more projects
];
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
  --args 0x3ac9433c7bbdce85254a5b0cad3be5f98fb656de63c4308b0f8c4b59a04fff53 <COIN_OBJECT_ID> 0x6 \
  --gas-budget 10000000
```

### Claim DePIN Revenue

```bash
sui client call \
  --package 0xb059616029897f6436640d7c254bcc6130f157c3677bda4eaaccf9f60014fe03 \
  --module depin \
  --function distribute_revenue \
  --args 0x3ac9433c7bbdce85254a5b0cad3be5f98fb656de63c4308b0f8c4b59a04fff53 <NFT_OBJECT_ID> 0x6 \
  --gas-budget 10000000
```

### Add Revenue to Project (Admin)

```bash
sui client call \
  --package 0xb059616029897f6436640d7c254bcc6130f157c3677bda4eaaccf9f60014fe03 \
  --module depin \
  --function add_revenue \
  --args 0x3ac9433c7bbdce85254a5b0cad3be5f98fb656de63c4308b0f8c4b59a04fff53 <COIN_OBJECT_ID> \
  --gas-budget 10000000
```

**Note**: Replace `<COIN_OBJECT_ID>`, `<PROFILE_ID>`, `<NFT_OBJECT_ID>`, and `<AMOUNT_IN_MIST>` with actual values. The Clock object at `0x6` is a shared system object on Sui.

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
Events are emitted for all critical operations (deposits, withdrawals, borrows, repayments, funding, revenue distribution) to enable:
- Frontend tracking of user positions
- Analytics and monitoring
- Audit trails
- Off-chain indexing

### DePIN Revenue Distribution Model
The DePIN module implements proportional revenue sharing:
- **Tracking**: Projects track both `total_funded` (cumulative) and `total_revenue` (cumulative)
- **Calculation**: User share = (total_revenue × user_contribution) / total_funded
- **Verification**: NFT ownership proves contribution amount
- **Distribution**: Revenue stored in project treasury, distributed on-demand
- **Transparency**: All distributions emit `RevenueDistributedEvent` for tracking

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
