# Fix: Object 0x0000... Does Not Exist

## Problem
You're seeing: `Object 0x0000000000000000000000000000000000000000000000000000000000000000 does not exist`

## Root Cause
The Lending Pool ID is not configured in `src/config/sui.js`. When the empty string is used in transactions, it becomes `0x0000...` which doesn't exist.

## ✅ Quick Fix (2 minutes)

### Step 1: Find Your Lending Pool ID
Visit: https://suiscan.xyz/testnet/account/0x1b5f1da225b2ead0d8ed23c70bcbe78f872756953870a3429c7f347a239c1160

Look for a transaction from today that created a `LendingPool` object with:
- `interest_rate`: 500
- `apy`: 500

Copy the object ID (66 characters starting with `0x`)

### Step 2: Update Configuration
Edit `src/config/sui.js` line 58:
```javascript
// Change this:
export const LENDING_POOL_OBJECT_ID = '';

// To this:
export const LENDING_POOL_OBJECT_ID = '0xYOUR_ID_HERE';
```

### Step 3: Restart Dev Server
```bash
# Stop (Ctrl+C) and restart:
npm run dev
```

**Done!** The error will be gone.

---

## Detailed Instructions

See `FIND_LENDING_POOL_ID.md` for step-by-step instructions with screenshots.

---

## What's Working Now

While you extract the Lending Pool ID, these features work:
- ✅ **Risk Pool Level 2** (Medium Risk) - Borrow/Deposit
- ✅ **Risk Pool Level 3** (High Risk) - Borrow/Deposit  
- ✅ **Mudarabah Pool** - Islamic finance profit sharing
- ✅ **DePIN Projects** - Fund 4 infrastructure projects
- ✅ **Credit Profile** - Create and manage profiles

---

## What Needs the Lending Pool ID

These features require the Lending Pool ID:
- ⏳ Main lending pool deposits
- ⏳ Main lending pool withdrawals
- ⏳ Yield claiming
- ⏳ Yield compounding

---

## Why This Happened

The Lending Pool was created successfully in the first transaction, but its ID was truncated in the console output. The object exists on the blockchain - you just need to find its ID and add it to the config.

---

## Alternative: Use Risk Pools Instead

If you want to test the platform immediately without finding the Lending Pool ID, you can use the Risk Pools which are already configured and working!
