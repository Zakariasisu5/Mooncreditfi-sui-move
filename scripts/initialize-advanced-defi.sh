#!/bin/bash
# Bash script to initialize Advanced DeFi features (Risk Pools & Mudarabah)
# Run this after deploying the contracts

PACKAGE_ID="0x1a464477cbda05cedfe2bffefdf05a23203c0bde47d98efdcd487f8a721c4dbf"
DEPLOYER="0x091e5ad94a5b3c997e5c9c0d6e62aba9c0e2e0e0e0e0e0e0e0e0e0e0e0e0e0e0"  # Replace with your wallet address

echo "=== Initializing Advanced DeFi Features ==="
echo ""

# Create Risk Pools (3 levels: Low, Medium, High)
echo "Creating Risk Pool - Level 1 (Low Risk)..."
RISK_POOL_1=$(sui client call \
    --package $PACKAGE_ID \
    --module risk_pool \
    --function create_risk_pool \
    --args 1 \
    --gas-budget 100000000 2>&1)

if [ $? -eq 0 ]; then
    echo "✓ Risk Pool Level 1 created successfully"
    RISK_POOL_1_ID=$(echo "$RISK_POOL_1" | grep -oP '0x[a-f0-9]{64}' | head -1)
    echo "  Object ID: $RISK_POOL_1_ID"
else
    echo "✗ Failed to create Risk Pool Level 1"
fi

echo ""
echo "Creating Risk Pool - Level 2 (Medium Risk)..."
RISK_POOL_2=$(sui client call \
    --package $PACKAGE_ID \
    --module risk_pool \
    --function create_risk_pool \
    --args 2 \
    --gas-budget 100000000 2>&1)

if [ $? -eq 0 ]; then
    echo "✓ Risk Pool Level 2 created successfully"
    RISK_POOL_2_ID=$(echo "$RISK_POOL_2" | grep -oP '0x[a-f0-9]{64}' | head -1)
    echo "  Object ID: $RISK_POOL_2_ID"
else
    echo "✗ Failed to create Risk Pool Level 2"
fi

echo ""
echo "Creating Risk Pool - Level 3 (High Risk)..."
RISK_POOL_3=$(sui client call \
    --package $PACKAGE_ID \
    --module risk_pool \
    --function create_risk_pool \
    --args 3 \
    --gas-budget 100000000 2>&1)

if [ $? -eq 0 ]; then
    echo "✓ Risk Pool Level 3 created successfully"
    RISK_POOL_3_ID=$(echo "$RISK_POOL_3" | grep -oP '0x[a-f0-9]{64}' | head -1)
    echo "  Object ID: $RISK_POOL_3_ID"
else
    echo "✗ Failed to create Risk Pool Level 3"
fi

echo ""
echo "=== Creating Mudarabah Pool ==="
echo "Note: This requires splitting a coin for initial capital (1000 MIST = 0.000001 SUI)"
echo ""

# Split a coin for initial capital (1000 MIST)
echo "Splitting coin for initial capital..."
SPLIT_RESULT=$(sui client split-coin --coin-id gas --amounts 1000 --gas-budget 100000000 2>&1)

if [ $? -eq 0 ]; then
    echo "✓ Coin split successfully"
    INITIAL_CAPITAL_COIN=$(echo "$SPLIT_RESULT" | grep -oP '0x[a-f0-9]{64}' | head -1)
    echo "  Initial Capital Coin ID: $INITIAL_CAPITAL_COIN"
    
    echo ""
    echo "Creating Mudarabah Pool (70/30 profit split)..."
    MUDARABAH_POOL=$(sui client call \
        --package $PACKAGE_ID \
        --module mudarabah \
        --function create_mudarabah_pool \
        --args $INITIAL_CAPITAL_COIN 7000 \
        --gas-budget 100000000 2>&1)
    
    if [ $? -eq 0 ]; then
        echo "✓ Mudarabah Pool created successfully"
        MUDARABAH_POOL_ID=$(echo "$MUDARABAH_POOL" | grep -oP '0x[a-f0-9]{64}' | head -1)
        echo "  Object ID: $MUDARABAH_POOL_ID"
        echo "  Profit Ratio: 70% investor / 30% manager"
    else
        echo "✗ Failed to create Mudarabah Pool"
    fi
else
    echo "✗ Failed to split coin for initial capital"
fi

echo ""
echo "=== Summary ==="
echo "Update src/config/sui.js with these object IDs:"
echo ""
echo "export const RISK_POOL_LOW = '$RISK_POOL_1_ID';"
echo "export const RISK_POOL_MEDIUM = '$RISK_POOL_2_ID';"
echo "export const RISK_POOL_HIGH = '$RISK_POOL_3_ID';"
echo "export const MUDARABAH_POOL = '$MUDARABAH_POOL_ID';"
echo ""
echo "=== Initialization Complete ==="
