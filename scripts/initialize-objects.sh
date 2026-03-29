#!/bin/bash

# MoonCreditFi Object Initialization Script
# This script helps you create and initialize the required shared objects

set -e

PACKAGE_ID="0xe5562b70f5e2618a78a4e2ce8494af09098518461ba50f1004071209277f5bce"
DEPLOYER_ADDRESS="0x0efea5713bf6a94382d3b7acc0c1a1438a54a41439b5db5c0c66a63b5f3d0fe0"

echo "🚀 MoonCreditFi Object Initialization"
echo "======================================"
echo ""
echo "Package ID: $PACKAGE_ID"
echo "Network: Sui Testnet"
echo ""

# Check if sui CLI is installed
if ! command -v sui &> /dev/null; then
    echo "❌ Error: Sui CLI not found. Please install it first."
    echo "   Run: cargo install --locked --git https://github.com/MystenLabs/sui.git --branch testnet sui"
    exit 1
fi

# Check if connected to testnet
CURRENT_ENV=$(sui client active-env 2>/dev/null || echo "none")
if [ "$CURRENT_ENV" != "testnet" ]; then
    echo "⚠️  Warning: Not connected to testnet. Current environment: $CURRENT_ENV"
    echo "   Switching to testnet..."
    sui client switch --env testnet
fi

echo "✅ Connected to testnet"
echo ""

# Function to extract object ID from transaction output
extract_object_id() {
    local output="$1"
    echo "$output" | grep -oP '(?<=objectId": ")[^"]+' | head -1
}

# Step 1: Create Lending Pool
echo "📦 Step 1: Creating Lending Pool..."
echo "   Interest Rate: 5% (500 basis points)"
echo ""

POOL_OUTPUT=$(sui client call \
    --package "$PACKAGE_ID" \
    --module lending_pool \
    --function new \
    --args 500 \
    --gas-budget 10000000 \
    --json 2>&1)

if [ $? -eq 0 ]; then
    POOL_ID=$(echo "$POOL_OUTPUT" | jq -r '.objectChanges[] | select(.type == "created") | .objectId' | head -1)
    echo "✅ Lending Pool created!"
    echo "   Object ID: $POOL_ID"
    echo ""
else
    echo "❌ Failed to create lending pool"
    echo "$POOL_OUTPUT"
    exit 1
fi

# Step 2: Create Credit Profile
echo "📦 Step 2: Creating Credit Profile..."
echo "   Owner: $DEPLOYER_ADDRESS"
echo ""

PROFILE_OUTPUT=$(sui client call \
    --package "$PACKAGE_ID" \
    --module credit_profile \
    --function new \
    --args "$DEPLOYER_ADDRESS" \
    --gas-budget 10000000 \
    --json 2>&1)

if [ $? -eq 0 ]; then
    PROFILE_ID=$(echo "$PROFILE_OUTPUT" | jq -r '.objectChanges[] | select(.type == "created") | .objectId' | head -1)
    echo "✅ Credit Profile created!"
    echo "   Object ID: $PROFILE_ID"
    echo ""
else
    echo "❌ Failed to create credit profile"
    echo "$PROFILE_OUTPUT"
    exit 1
fi

# Step 3: Create DePIN Project
echo "📦 Step 3: Creating DePIN Project..."
echo "   Name: Solar Farm Network"
echo "   Target: 1000 SUI"
echo "   APY: 8%"
echo ""

DEPIN_OUTPUT=$(sui client call \
    --package "$PACKAGE_ID" \
    --module depin \
    --function create_project \
    --args \
        "Solar Farm Network" \
        "Decentralized solar energy infrastructure" \
        1000000000000 \
        800 \
    --gas-budget 10000000 \
    --json 2>&1)

if [ $? -eq 0 ]; then
    DEPIN_ID=$(echo "$DEPIN_OUTPUT" | jq -r '.objectChanges[] | select(.type == "created") | .objectId' | head -1)
    echo "✅ DePIN Project created!"
    echo "   Object ID: $DEPIN_ID"
    echo ""
else
    echo "❌ Failed to create DePIN project"
    echo "$DEPIN_OUTPUT"
    exit 1
fi

# Summary
echo "======================================"
echo "🎉 Initialization Complete!"
echo "======================================"
echo ""
echo "Copy these values to src/config/sui.js:"
echo ""
echo "export const SUI_PACKAGE_ID = '$PACKAGE_ID';"
echo "export const LENDING_POOL_OBJECT_ID = '$POOL_ID';"
echo "export const CREDIT_PROFILE_OBJECT_ID = '$PROFILE_ID';"
echo "export const DEPIN_FINANCE_OBJECT_ID = '$DEPIN_ID';"
echo ""
echo "View on Explorer:"
echo "- Package: https://suiscan.xyz/testnet/object/$PACKAGE_ID"
echo "- Lending Pool: https://suiscan.xyz/testnet/object/$POOL_ID"
echo "- Credit Profile: https://suiscan.xyz/testnet/object/$PROFILE_ID"
echo "- DePIN Project: https://suiscan.xyz/testnet/object/$DEPIN_ID"
echo ""
echo "Next steps:"
echo "1. Update src/config/sui.js with the object IDs above"
echo "2. Run: npm run dev"
echo "3. Open: http://localhost:5173"
echo ""
