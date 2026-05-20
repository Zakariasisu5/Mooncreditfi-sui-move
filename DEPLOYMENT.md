# MoonCredit DeFi - Deployment Information

## Latest Deployment - May 20, 2026

### Network
- **Network**: Sui Testnet
- **Protocol Version**: 124
- **Transaction Digest**: `yWYxR975eQrt2uuQuuMBqvAiGbHLYZXfgdSZ6SXjo3e`

### Package Information
- **Package ID**: `0x2388af4607e9a5462058b146fe8cbb1e1d2b602862f8205d7a7844fcb4b568e5`
- **Version**: 1
- **Digest**: `G6Ag1DHzhHyuMs6ZCDCL2whdq3zqu5YQLAheqRy6fPGh`

### Deployed Modules
1. ✅ `collateral` - Collateral vault management
2. ✅ `credit_profile` - User credit profiles and scoring
3. ✅ `credit_scoring` - Credit score calculation logic
4. ✅ `depin` - Decentralized Physical Infrastructure Network
5. ✅ `lending_logic` - Core lending operations
6. ✅ `lending_pool` - Liquidity pool management
7. ✅ `loan` - Loan lifecycle management
8. ✅ `mudarabah` - Islamic finance profit-sharing
9. ✅ `risk_pool` - Risk-tiered lending pools

### Shared Objects Created

#### ProfileRegistry (Shared)
- **Object ID**: `0x59bee28062384ea12e53a1014dc32443090fc90e15caf4e90d56559d7bff315f`
- **Type**: `credit_profile::ProfileRegistry`
- **Purpose**: Global registry for all user credit profiles
- **Version**: 349181664

### Owned Objects

#### UpgradeCap
- **Object ID**: `0xc1f4a8ad5a8526647d61cd4a1e14e8f6cfbc78e3e38354aa9ad7f7a8551abd26`
- **Owner**: `0x1b5f1da225b2ead0d8ed23c70bcbe78f872756953870a3429c7f347a239c1160`
- **Type**: `0x2::package::UpgradeCap`
- **Purpose**: Required for future package upgrades
- **⚠️ IMPORTANT**: Keep this safe! Required for contract upgrades

### Deployment Costs
- **Total Cost**: 202.78 SUI (202,785,480 MIST)
  - Storage Cost: 201.86 SUI
  - Computation Cost: 1.90 SUI
  - Storage Rebate: -0.98 SUI

### Explorer Links
- **Package**: https://suiscan.xyz/testnet/object/0x2388af4607e9a5462058b146fe8cbb1e1d2b602862f8205d7a7844fcb4b568e5
- **Transaction**: https://suiscan.xyz/testnet/tx/yWYxR975eQrt2uuQuuMBqvAiGbHLYZXfgdSZ6SXjo3e
- **ProfileRegistry**: https://suiscan.xyz/testnet/object/0x59bee28062384ea12e53a1014dc32443090fc90e15caf4e90d56559d7bff315f

## Objects to Create After Deployment

✅ **All objects have been created successfully!**

### Created Objects (May 20, 2026)

#### 1. Lending Pool ✅
- **Status**: Created
- **Parameters**: interest_rate=500 (5%), apy=500 (5%)
- **Object ID**: *Pending extraction from transaction output*
- **Note**: Successfully created but ID needs to be extracted from first transaction

#### 2. Risk Pool - Level 1 (Low Risk) ✅
- **Status**: Created
- **Parameters**: risk_level=1 (600+ reputation required)
- **Object ID**: *Pending extraction from transaction output*
- **Note**: Successfully created but ID needs to be extracted from transaction

#### 3. Risk Pool - Level 2 (Medium Risk) ✅
- **Status**: Created
- **Parameters**: risk_level=2 (400+ reputation required)
- **Object ID**: `0xdc498215dd5bbaec9377222cefcb559a10f7a814290fbd1572a2df40749b98e6`
- **Explorer**: https://suiscan.xyz/testnet/object/0xdc498215dd5bbaec9377222cefcb559a10f7a814290fbd1572a2df40749b98e6

#### 4. Risk Pool - Level 3 (High Risk) ✅
- **Status**: Created
- **Parameters**: risk_level=3 (No minimum reputation)
- **Object ID**: `0x9276e0e3f3eeb9653a5c23fadeedc4bfa73e404fbf2870138e9aef2052c82311`
- **Explorer**: https://suiscan.xyz/testnet/object/0x9276e0e3f3eeb9653a5c23fadeedc4bfa73e404fbf2870138e9aef2052c82311

#### 5. Mudarabah Pool (Islamic Finance) ✅
- **Status**: Created
- **Parameters**: initial_capital=~7000 MIST, profit_ratio=7000 (70% investor, 30% manager)
- **Object ID**: `0x61064a963336445556012d57a7827e342e8fe6eb5be899da4f50263fbf4fab90`
- **Explorer**: https://suiscan.xyz/testnet/object/0x61064a963336445556012d57a7827e342e8fe6eb5be899da4f50263fbf4fab90

#### 6. DePIN Project - Solar Farm Network ✅
- **Status**: Created
- **Parameters**: 
  - Name: "Solar Farm Network"
  - Description: "Decentralized solar energy infrastructure"
  - Target: 100 SUI (100,000,000,000 MIST)
  - APY: 1200 (12%)
- **Object ID**: `0xc19729095eaf30af890aa66172f906ce9f7050d0cff1137ac460b0fb0a283c36`
- **Explorer**: https://suiscan.xyz/testnet/object/0xc19729095eaf30af890aa66172f906ce9f7050d0cff1137ac460b0fb0a283c36

### Total Gas Spent on Object Creation
- Lending Pool: ~3.2 SUI
- Risk Pool 1: ~2.5 SUI
- Risk Pool 2: ~2.5 SUI
- Risk Pool 3: ~2.5 SUI
- Mudarabah Pool: ~2.8 SUI
- DePIN Project: ~3.2 SUI
- **Total**: ~16.7 SUI

## Frontend Configuration

The frontend has been updated with the new package ID and ProfileRegistry ID in:
- `src/config/sui.js`
- `scripts/test-contracts.ts`

## Next Steps

1. ✅ Package deployed successfully
2. ✅ Create lending pool
3. ✅ Create risk pools (3 tiers)
4. ✅ Create Mudarabah pool
5. ✅ Create DePIN projects
6. ⏳ Extract missing object IDs (Lending Pool, Risk Pool Level 1)
7. ⏳ Update frontend with all object IDs
8. ⏳ Test all functionality on testnet
9. ⏳ Deploy to mainnet (when ready)

### How to Extract Missing Object IDs

The Lending Pool and Risk Pool Level 1 were created successfully, but their object IDs were truncated in the console output. To find them:

**Option 1: Check Sui Explorer**
1. Go to https://suiscan.xyz/testnet/account/0x1b5f1da225b2ead0d8ed23c70bcbe78f872756953870a3429c7f347a239c1160
2. Look for recent transactions that created shared objects
3. Find the LendingPool and first RiskPool objects

**Option 2: Query via CLI**
```bash
# List all objects owned/accessible by your address
sui client objects

# For each object, check its type
sui client object <OBJECT_ID> --json
```

**Option 3: Re-run with Better Logging**
```bash
# Run the initialization script again and save output to file
powershell -ExecutionPolicy Bypass -File scripts/initialize-all-objects.ps1 > output.txt
```

## Upgrade Instructions

To upgrade the package in the future:

```bash
sui client upgrade --gas-budget 100000000 --upgrade-capability 0xc1f4a8ad5a8526647d61cd4a1e14e8f6cfbc78e3e38354aa9ad7f7a8551abd26
```

## Security Notes

- ✅ All contracts compiled without errors
- ✅ 18/18 tests passing
- ✅ Duplicate alias warnings suppressed
- ✅ Self-transfer patterns are intentional (DeFi platform design)
- ⚠️ UpgradeCap stored securely
- ⚠️ ProfileRegistry is shared (accessible by all users)

## Contract Features

### Credit-Based Lending
- Hybrid collateral model based on credit scores
- Credit scores: 450-1000 range
- Collateral requirements:
  - Score ≥ 750: 0% collateral (credit-only)
  - Score 550-749: 25-75% collateral
  - Score < 550: 100% collateral

### Risk Pools
- 3-tier system based on reputation
- Tier 1 (Low): 600+ reputation
- Tier 2 (Medium): 400+ reputation  
- Tier 3 (High): No minimum

### DePIN Funding
- Infrastructure project funding
- NFT-based investment tracking
- Yield generation and distribution
- Revenue sharing

### Islamic Finance (Mudarabah)
- Profit-sharing pools
- Configurable profit ratios
- Sharia-compliant structure

## Support

For issues or questions:
- GitHub: [Your Repository]
- Documentation: [Your Docs]
- Discord: [Your Discord]
