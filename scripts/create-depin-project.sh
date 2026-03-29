#!/bin/bash

# Bash script to create a DePIN project on Sui testnet

echo -e "\033[0;36mCreating DePIN Project on Sui Testnet...\033[0m"

# Package ID
PACKAGE_ID="0xb059616029897f6436640d7c254bcc6130f157c3677bda4eaaccf9f60014fe03"

# Project details
PROJECT_NAME="Solar Farm"
PROJECT_DESCRIPTION="Decentralized solar energy infrastructure project"
TARGET_AMOUNT=100000000000000  # 100,000 SUI in MIST (100000 * 1_000_000_000)
APY=800  # 8% in basis points

echo -e "\033[0;33mProject Details:\033[0m"
echo "  Name: $PROJECT_NAME"
echo "  Description: $PROJECT_DESCRIPTION"
echo "  Target: 100,000 SUI"
echo "  APY: 8%"
echo ""

# Create the project
echo -e "\033[0;32mExecuting transaction...\033[0m"
result=$(sui client call \
  --package "$PACKAGE_ID" \
  --module depin \
  --function create_project \
  --args "$PROJECT_NAME" "$PROJECT_DESCRIPTION" "$TARGET_AMOUNT" "$APY" \
  --gas-budget 100000000 \
  --json)

if [ $? -eq 0 ]; then
    echo -e "\033[0;32m✓ Transaction successful!\033[0m"
    
    # Extract the created DePIN project object ID
    project_id=$(echo "$result" | jq -r '.objectChanges[] | select(.type == "created" and (.objectType | contains("DepinProject"))) | .objectId')
    
    if [ -n "$project_id" ]; then
        echo ""
        echo -e "\033[0;32mDePIN Project Created!\033[0m"
        echo -e "\033[0;36mProject Object ID: $project_id\033[0m"
        echo ""
        echo -e "\033[0;33mUpdate your src/config/sui.js with:\033[0m"
        echo -e "\033[0;37mexport const DEPIN_FINANCE_OBJECT_ID = '$project_id';\033[0m"
    else
        echo -e "\033[0;33mCreated objects:\033[0m"
        echo "$result" | jq -r '.objectChanges[] | select(.type == "created") | "  - \(.objectId) (\(.objectType))"'
    fi
    
    # Show transaction digest
    digest=$(echo "$result" | jq -r '.digest')
    echo ""
    echo -e "\033[0;36mTransaction Digest: $digest\033[0m"
    echo -e "\033[0;34mView on Explorer: https://suiscan.xyz/testnet/tx/$digest\033[0m"
else
    echo -e "\033[0;31m✗ Transaction failed!\033[0m"
    echo "$result"
fi
