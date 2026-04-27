#!/bin/bash

# Bash script to create multiple DePIN projects on Sui testnet

echo -e "\033[0;36m========================================\033[0m"
echo -e "\033[0;36mCreating Multiple DePIN Projects\033[0m"
echo -e "\033[0;36m========================================\033[0m"
echo ""

# Package ID - Update this with your deployed package ID
PACKAGE_ID="0x1a464477cbda05cedfe2bffefdf05a23203c0bde47d98efdcd487f8a721c4dbf"

# Array of projects to create
declare -a PROJECTS=(
  "IoT Sensors|Smart City Sensors|IoT sensor network for urban environmental monitoring|50000000000000|1200"
  "5G Network|5G Hotspot Network|Community-owned 5G wireless infrastructure deployment|75000000000000|950"
  "Storage|Distributed Storage Grid|Decentralized data storage infrastructure network|60000000000000|850"
  "EV Charging|EV Charging Stations|Electric vehicle charging infrastructure network|80000000000000|1100"
)

# Store created project IDs
declare -a PROJECT_IDS=()

# Create each project
for project_data in "${PROJECTS[@]}"; do
  IFS='|' read -r category name description target apy <<< "$project_data"
  
  echo -e "\033[0;33m----------------------------------------\033[0m"
  echo -e "\033[0;33mCreating: $name\033[0m"
  echo -e "\033[0;33m----------------------------------------\033[0m"
  echo "  Category: $category"
  echo "  Description: $description"
  echo "  Target: $(echo "scale=2; $target / 1000000000" | bc) SUI"
  echo "  APY: $(echo "scale=2; $apy / 100" | bc)%"
  echo ""
  
  # Create the project
  echo -e "\033[0;32mExecuting transaction...\033[0m"
  result=$(sui client call \
    --package "$PACKAGE_ID" \
    --module depin \
    --function create_project \
    --args "$name" "$description" "$target" "$apy" "0x6" \
    --gas-budget 100000000 \
    --json 2>&1)
  
  if [ $? -eq 0 ]; then
    echo -e "\033[0;32m✓ Transaction successful!\033[0m"
    
    # Extract the created DePIN project object ID
    project_id=$(echo "$result" | jq -r '.objectChanges[] | select(.type == "created" and (.objectType | contains("DepinProject"))) | .objectId')
    
    if [ -n "$project_id" ]; then
      PROJECT_IDS+=("$project_id|$category|$name")
      echo -e "\033[0;36mProject Object ID: $project_id\033[0m"
      
      # Show transaction digest
      digest=$(echo "$result" | jq -r '.digest')
      echo -e "\033[0;34mView on Explorer: https://suiscan.xyz/testnet/tx/$digest\033[0m"
    else
      echo -e "\033[0;33mWarning: Could not extract project ID\033[0m"
    fi
  else
    echo -e "\033[0;31m✗ Transaction failed!\033[0m"
    echo "$result"
  fi
  
  echo ""
  sleep 2  # Wait between transactions
done

# Summary
echo -e "\033[0;36m========================================\033[0m"
echo -e "\033[0;36mSummary\033[0m"
echo -e "\033[0;36m========================================\033[0m"
echo ""
echo -e "\033[0;32mCreated ${#PROJECT_IDS[@]} DePIN projects:\033[0m"
echo ""

for project_info in "${PROJECT_IDS[@]}"; do
  IFS='|' read -r id category name <<< "$project_info"
  echo -e "  \033[0;33m$category\033[0m - $name"
  echo -e "    \033[0;36m$id\033[0m"
done

# Generate config code
echo ""
echo -e "\033[0;33m========================================\033[0m"
echo -e "\033[0;33mUpdate your src/config/sui.js with:\033[0m"
echo -e "\033[0;33m========================================\033[0m"
echo ""
echo "export const DEPIN_PROJECTS = ["

# Add the existing Solar Farm project first
echo "  { "
echo "    id: '0x63289bc0eb8e219e9207832d8cc9668f432386cd87d604a6cbbe0de3055629ea', "
echo "    category: 'Solar', "
echo "    name: 'Solar Farm Network',"
echo "    description: 'Decentralized solar energy infrastructure across Southeast Asia'"
echo "  },"

# Add newly created projects
for project_info in "${PROJECT_IDS[@]}"; do
  IFS='|' read -r id category name <<< "$project_info"
  echo "  { "
  echo "    id: '$id', "
  echo "    category: '$category', "
  echo "    name: '$name',"
  echo "    description: '...' // Add description"
  echo "  },"
done

echo "];"
echo ""
echo -e "\033[0;32mDone!\033[0m"
