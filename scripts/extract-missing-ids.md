# How to Extract Missing Object IDs

Two object IDs were successfully created but their IDs were truncated in the console output:
1. **Lending Pool** (first transaction)
2. **Risk Pool Level 1** (second transaction)

## Method 1: Using Sui Explorer (Easiest)

### Step 1: Visit Your Account Page
Go to: https://suiscan.xyz/testnet/account/0x1b5f1da225b2ead0d8ed23c70bcbe78f872756953870a3429c7f347a239c1160

### Step 2: Find Recent Transactions
Look for transactions from today (May 20, 2026) that created shared objects.

### Step 3: Identify the Objects
- Look for objects of type `LendingPool` and `RiskPool`
- The first `RiskPool` with `risk_level: 1` is Risk Pool Level 1
- The `LendingPool` should have `interest_rate: 500` and `apy: 500`

### Step 4: Copy the Object IDs
Copy the full 66-character object IDs (starting with `0x`)

---

## Method 2: Using Sui CLI

### List All Your Objects
```bash
sui client objects
```

This will show all objects you own or have access to.

### Check Each Object
For each object ID in the list, check its type:

```bash
sui client object <OBJECT_ID>
```

Look for:
- **LendingPool**: Will show `ObjectType: ...::lending_pool::LendingPool`
- **RiskPool Level 1**: Will show `ObjectType: ...::risk_pool::RiskPool` with `risk_level: 1`

---

## Method 3: Query Shared Objects by Package

### Find All Shared Objects from Your Package
```bash
# This requires the Sui GraphQL service or indexer
# Check the package page on Sui Explorer for all created objects
```

Visit: https://suiscan.xyz/testnet/object/0x2388af4607e9a5462058b146fe8cbb1e1d2b602862f8205d7a7844fcb4b568e5

Click on "Objects" or "Created Objects" tab to see all objects created by this package.

---

## Method 4: Re-run with Output Capture

### PowerShell (Windows)
```powershell
# Run the script and save all output to a file
powershell -ExecutionPolicy Bypass -File scripts/initialize-all-objects.ps1 *> output.txt

# Then search the file for object IDs
Select-String -Path output.txt -Pattern "0x[a-f0-9]{64}"
```

### Bash (Linux/Mac)
```bash
# Run the script and save output
bash scripts/initialize-all-objects.sh 2>&1 | tee output.txt

# Search for object IDs
grep -oE "0x[a-f0-9]{64}" output.txt
```

---

## What to Look For

### Lending Pool
- **Type**: `lending_pool::LendingPool`
- **Fields**:
  - `interest_rate`: 500
  - `apy`: 500
  - `total_liquidity`: 0 (initially)
- **Owner**: Shared Object

### Risk Pool Level 1
- **Type**: `risk_pool::RiskPool`
- **Fields**:
  - `risk_level`: 1
  - `total_liquidity`: 0 (initially)
- **Owner**: Shared Object

---

## After Finding the IDs

### Update `src/config/sui.js`

Replace the empty strings with your found object IDs:

```javascript
export const LENDING_POOL_OBJECT_ID = '0xYOUR_LENDING_POOL_ID_HERE';
export const RISK_POOL_LOW = '0xYOUR_RISK_POOL_LEVEL_1_ID_HERE';
```

### Verify the Configuration

Make sure all object IDs are filled in:
- ✅ PROFILE_REGISTRY_OBJECT_ID
- ✅ UPGRADE_CAP_OBJECT_ID
- ⏳ LENDING_POOL_OBJECT_ID (needs your input)
- ⏳ RISK_POOL_LOW (needs your input)
- ✅ RISK_POOL_MEDIUM
- ✅ RISK_POOL_HIGH
- ✅ MUDARABAH_POOL
- ✅ DEPIN_FINANCE_OBJECT_ID

---

## Test Your Configuration

After updating the IDs, test that they work:

```bash
# Test Lending Pool
sui client call \
  --package 0x2388af4607e9a5462058b146fe8cbb1e1d2b602862f8205d7a7844fcb4b568e5 \
  --module lending_pool \
  --function get_total_liquidity \
  --args <YOUR_LENDING_POOL_ID> \
  --gas-budget 1000000

# Test Risk Pool Level 1
sui client call \
  --package 0x2388af4607e9a5462058b146fe8cbb1e1d2b602862f8205d7a7844fcb4b568e5 \
  --module risk_pool \
  --function get_total_liquidity \
  --args <YOUR_RISK_POOL_LEVEL_1_ID> \
  --gas-budget 1000000
```

If these commands return `0` (zero liquidity), your IDs are correct!

---

## Need Help?

If you're having trouble finding the IDs:
1. Check the Sui Explorer account page (Method 1 - easiest)
2. Look at the package's created objects on Sui Explorer
3. Use `sui client objects` to list all accessible objects
4. Re-run the initialization script with output capture

The objects were definitely created successfully - you just need to extract their IDs from the transaction output or blockchain state.
