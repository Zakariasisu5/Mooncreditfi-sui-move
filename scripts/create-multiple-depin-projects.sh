#!/bin/bash

# Bash script to create multiple DePIN projects on Sui testnet

echo -e "\033[0;36mCreating Multiple DePIN Projects on Sui Testnet...\033[0m"
echo ""

# Package ID
PACKAGE_ID="0xb059616029897f6436640d7c254bcc6130f157c3677bda4eaaccf9f60014fe03"

# Arrays to store created projects
declare -a project_names
declare -a project_categories
declare -a project_ids
declare -a project_digests

# Function to create a project
create_project() {
    local name="$1"
    local description="$2"
    local target="$3"
    local apy="$4"
    local category="$5"
    
    echo -e "\033[0;33mCreating: $name\033[0m"
    echo "  Category: $category"
    echo "  Target: $((target / 1000000000)) SUI"
    echo "  APY: $((apy / 100))%"
    echo ""
    
    result=$(sui client call \
        --package "$PACKAGE_ID" \
        --module depin \
        --function create_project \
        --args "$name" "$description" "$target" "$apy" \
        --gas-budget 100000000 \
        --json 2>&1)
    
    if [ $? -eq 0 ]; then
        project_id=$(echo "$result" | jq -r '.objectChanges[] | select(.type == "created" and (.objectType | contains("DepinProject"))) | .objectId')
        digest=$(echo "$result" | jq -r '.digest')
        
        if [ -n "$project_id" ]; then
            echo -e "  \033[0;32mSuccess! Project ID: $project_id\033[0m"
            project_names+=("$name")
            project_categories+=("$category")
            project_ids+=("$project_id")
            project_digests+=("$digest")
        else
            echo -e "  \033[0;33mWarning: Could not extract project ID\033[0m"
        fi
    else
        echo -e "  \033[0;31mFailed to create project\033[0m"
    fi
    
    echo ""
    sleep 2
}

# Create multiple DePIN projects
create_project \
    "5G Network Infrastructure" \
    "Decentralized 5G network deployment for urban connectivity" \
    250000000000000 \
    1200 \
    "Telecom"

create_project \
    "IoT Sensor Network" \
    "Global IoT sensor network for environmental monitoring" \
    150000000000000 \
    950 \
    "IoT"

create_project \
    "EV Charging Stations" \
    "Electric vehicle charging infrastructure network" \
    500000000000000 \
    850 \
    "Mobility"

create_project \
    "Community WiFi Hotspots" \
    "Decentralized WiFi hotspot network for public internet access" \
    80000000000000 \
    1100 \
    "WiFi"

create_project \
    "Battery Storage Grid" \
    "Distributed energy storage system for renewable power" \
    300000000000000 \
    900 \
    "Energy Storage"

# Summary
echo -e "\033[0;36m========================================\033[0m"
echo -e "\033[0;32mSummary: Created ${#project_ids[@]} DePIN Projects\033[0m"
echo -e "\033[0;36m========================================\033[0m"
echo ""

for i in "${!project_ids[@]}"; do
    echo -e "\033[0;37m${project_names[$i]} (${project_categories[$i]})\033[0m"
    echo -e "  \033[0;36mObject ID: ${project_ids[$i]}\033[0m"
    echo -e "  \033[0;34mExplorer: https://suiscan.xyz/testnet/object/${project_ids[$i]}\033[0m"
    echo ""
done

# Generate config update
if [ ${#project_ids[@]} -gt 0 ]; then
    echo -e "\033[0;33mUpdate your src/config/sui.js with these project IDs:\033[0m"
    echo ""
    echo -e "\033[0;37mexport const DEPIN_PROJECTS = [\033[0m"
    for i in "${!project_ids[@]}"; do
        echo -e "\033[0;37m  { id: '${project_ids[$i]}', category: '${project_categories[$i]}' },\033[0m"
    done
    echo -e "\033[0;37m];\033[0m"
fi
