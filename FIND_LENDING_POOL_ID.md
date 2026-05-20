# How to Find Your Lending Pool ID

## Quick Fix (2 minutes)

The error `Object 0x0000... does not exist` happens because the Lending Pool ID hasn't been added to the configuration yet.

---

## Method 1: Sui Explorer (Easiest) ⭐

### Step 1: Visit Your Account
Go to: https://suiscan.xyz/testnet/account/0x1b5f1da225b2ead0d8ed23c70bcbe78f872756953870a3429c7f347a239c1160

### Step 2: Find Recent Transactions
Look for transactions from **May 20, 2026** (today)

### Step 3: Identify the Lending Pool
Look for a transaction that created a **shared object** with type:
```
0x2388af4607e9a5462058b146fe8cbb1e1d2b602862f8205d7a7844fcb4b568e5::lending_pool::LendingPool
```

The object should have these fields:
- `interest_rate`: 500
- `apy`: 500
- `total_liquidity`: 0 (initially)

### Step 4: Copy the Object ID
Copy the full 66-character object ID (starts with `0x`)

### Step 5: Update Configuration
Edit `src/config/sui.js` and replace this line:
```javascript
export const LENDING_POOL_OBJECT_ID = '';
```

With:
```javascript
export const LENDING_POOL_OBJECT_ID = '0xYOUR_LENDING_POOL_ID_HERE';
```

### Step 6: Restart Dev Server
```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

---

## Method 2: Check Package Objects

### Visit Package Page
Go to: https://suiscan.xyz/testnet/object/0x2388af4607e9a5462058b146fe8cbb1e1d2b602862f8205d7a7844fcb4b568e5

### Find Created Objects
Look for objects of type `LendingPool` created by this package

---

## Method 3: CLI Query

### List All Objects
```bash
sui client objects
```

### Check Each Object
For each object ID, run:
```bash
sui client object <OBJECT_ID>
```

Look for an object with:
- Type: `...::lending_pool::LendingPool`
- Fields: `interest_rate: 500`, `apy: 500`

---

## What You're Looking For

The Lending Pool object will look like this:

```json
{
  "objectId": "0x...",
  "version": "...",
  "digest": "...",
  "type": "0x2388af4607e9a5462058b146fe8cbb1e1d2b602862f8205d7a7844fcb4b568e5::lending_pool::LendingPool",
  "owner": {
    "Shared": {
      "initial_shared_version": ...
    }
  },
  "content": {
    "fields": {
      "apy": "500",
      "balance": "0",
      "interest_rate": "500",
      "last_index_update": "0",
      "total_borrowed": "0",
      "total_deposited": "0",
      "total_liquidity": "0",
      "yield_index": "1000000000000000000"
    }
  }
}
```

---

## After Finding the ID

1. Update `src/config/sui.js`
2. Restart your dev server
3. The lending features will work!

---

## Features That Need This ID

Once you add the Lending Pool ID, these features will work:
- ✅ Deposit SUI to earn yield
- ✅ Withdraw SUI from pool
- ✅ Borrow against collateral
- ✅ Repay loans
- ✅ Claim yield
- ✅ Compound yield

---

## Current Working Features

While you extract the ID, these features work:
- ✅ Risk Pool Level 2 (Medium Risk)
- ✅ Risk Pool Level 3 (High Risk)
- ✅ Mudarabah Pool
- ✅ DePIN Projects (4 active)
- ✅ Credit Profile Creation

---

## Need Help?

If you can't find the ID:
1. Check the initialization script output (it was created successfully)
2. Look at your recent transactions on Sui Explorer
3. The object definitely exists - it just needs to be found!

The Lending Pool was created in the **first transaction** when you ran `scripts/initialize-all-objects.ps1`.
