#!/bin/bash

# Initialize All DeFi Objects on Sui Testnet
# This script creates all required shared objects after package deployment

echo "========================================"
echo "MoonCredit DeFi - Object Initialization"
echo "========================================"
echo ""

# Package ID from deployment
PACKAGE_ID="0x2388af4607e9a5462058b146fe8cbb1e1d2b602862f8205d7a7844fcb4b568e5"

echo "Package ID: $PACKAGE_ID"
echo ""

# Step 1: Create Lending Pool
echo "[1/6] Creating Lending Pool..."
echo "Parameters: interest_rate=500 (5%), apy=500 (5%)"

LENDING_POOL_OUTPUT=$(sui client call \
    --package $PACKAGE_ID \
    --module lending_pool \
    --function create_pool \
    --args 500 500 \
    --gas-budget 10000000 2>&1)

if [ $? -eq 0 ]; then
    echo "✓ Lending Pool created successfully!"
    LENDING_POOL_ID=$(echo "$LENDING_POOL_OUTPUT" | grep -oP '0x[a-f0-9]{64}' | head -1)
    if [ ! -z "$LENDING_POOL_ID" ]; then
        echo "  Lending Pool ID: $LENDING_POOL_ID"
    fi
else
    echo "✗ Failed to create Lending Pool"
    exit 1
fi

echo ""

# Step 2: Create Risk Pool - Level 1 (Low Risk)
echo "[2/6] Creating Risk Pool - Level 1 (Low Risk)..."
echo "Parameters: risk_level=1 (600+ reputation required)"

RISK_POOL_1_OUTPUT=$(sui client call \
    --package $PACKAGE_ID \
    --module risk_pool \
    --function create_risk_pool \
    --args 1 \
    --gas-budget 10000000 2>&1)

if [ $? -eq 0 ]; then
    echo "✓ Risk Pool Level 1 created successfully!"
    RISK_POOL_1_ID=$(echo "$RISK_POOL_1_OUTPUT" | grep -oP '0x[a-f0-9]{64}' | head -1)
    if [ ! -z "$RISK_POOL_1_ID" ]; then
        echo "  Risk Pool 1 ID: $RISK_POOL_1_ID"
    fi
else
    echo "✗ Failed to create Risk Pool Level 1"
    exit 1
fi

echo ""

# Step 3: Create Risk Pool - Level 2 (Medium Risk)
echo "[3/6] Creating Risk Pool - Level 2 (Medium Risk)..."
echo "Parameters: risk_level=2 (400+ reputation required)"

RISK_POOL_2_OUTPUT=$(sui client call \
    --package $PACKAGE_ID \
    --module risk_pool \
    --function create_risk_pool \
    --args 2 \
    --gas-budget 10000000 2>&1)

if [ $? -eq 0 ]; then
    echo "✓ Risk Pool Level 2 created successfully!"
    RISK_POOL_2_ID=$(echo "$RISK_POOL_2_OUTPUT" | grep -oP '0x[a-f0-9]{64}' | head -1)
    if [ ! -z "$RISK_POOL_2_ID" ]; then
        echo "  Risk Pool 2 ID: $RISK_POOL_2_ID"
    fi
else
    echo "✗ Failed to create Risk Pool Level 2"
    exit 1
fi

echo ""

# Step 4: Create Risk Pool - Level 3 (High Risk)
echo "[4/6] Creating Risk Pool - Level 3 (High Risk)..."
echo "Parameters: risk_level=3 (No minimum reputation)"

RISK_POOL_3_OUTPUT=$(sui client call \
    --package $PACKAGE_ID \
    --module risk_pool \
    --function create_risk_pool \
    --args 3 \
    --gas-budget 10000000 2>&1)

if [ $? -eq 0 ]; then
    echo "✓ Risk Pool Level 3 created successfully!"
    RISK_POOL_3_ID=$(echo "$RISK_POOL_3_OUTPUT" | grep -oP '0x[a-f0-9]{64}' | head -1)
    if [ ! -z "$RISK_POOL_3_ID" ]; then
        echo "  Risk Pool 3 ID: $RISK_POOL_3_ID"
    fi
else
    echo "✗ Failed to create Risk Pool Level 3"
    exit 1
fi

echo ""

# Step 5: Create Mudarabah Pool (Islamic Finance)
echo "[5/6] Creating Mudarabah Pool..."
echo "Parameters: initial_capital=1000000000 MIST (1 SUI), profit_ratio=7000 (70% investor, 30% manager)"

# Get a gas coin for initial capital
echo "  Getting gas coin for initial capital..."
GAS_COIN=$(sui client gas --json | jq -r '.[0].gasCoinId')

MUDARABAH_OUTPUT=$(sui client call \
    --package $PACKAGE_ID \
    --module mudarabah \
    --function create_mudarabah_pool \
    --args $GAS_COIN 7000 \
    --gas-budget 10000000 2>&1)

if [ $? -eq 0 ]; then
    echo "✓ Mudarabah Pool created successfully!"
    MUDARABAH_POOL_ID=$(echo "$MUDARABAH_OUTPUT" | grep -oP '0x[a-f0-9]{64}' | head -1)
    if [ ! -z "$MUDARABAH_POOL_ID" ]; then
        echo "  Mudarabah Pool ID: $MUDARABAH_POOL_ID"
    fi
else
    echo "✗ Failed to create Mudarabah Pool"
    echo "  Note: This requires a SUI coin as initial capital"
fi

echo ""

# Step 6: Create Sample DePIN Project
echo "[6/6] Creating Sample DePIN Project..."
echo "Parameters: Solar Farm Network, target=100 SUI, apy=1200 (12%)"

# Clock object
CLOCK="0x0000000000000000000000000000000000000000000000000000000000000006"

DEPIN_OUTPUT=$(sui client call \
    --package $PACKAGE_ID \
    --module depin \
    --function create_project \
    --args '"Solar Farm Network"' '"Decentralized solar energy infrastructure project"' 100000000000 1200 $CLOCK \
    --gas-budget 10000000 2>&1)

if [ $? -eq 0 ]; then
    echo "✓ DePIN Project created successfully!"
    DEPIN_PROJECT_ID=$(echo "$DEPIN_OUTPUT" | grep -oP '0x[a-f0-9]{64}' | head -1)
    if [ ! -z "$DEPIN_PROJECT_ID" ]; then
        echo "  DePIN Project ID: $DEPIN_PROJECT_ID"
    fi
else
    echo "✗ Failed to create DePIN Project"
fi

echo ""
echo "========================================"
echo "Initialization Complete!"
echo "========================================"
echo ""
echo "Next Steps:"
echo "1. Copy the object IDs above"
echo "2. Update src/config/sui.js with the new IDs"
echo "3. Test the frontend with real transactions"
echo ""
echo "Explorer Links:"
echo "Package: https://suiscan.xyz/testnet/object/$PACKAGE_ID"
