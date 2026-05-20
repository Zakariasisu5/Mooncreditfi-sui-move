#!/bin/bash

# Create Multiple DePIN Projects on Sui Testnet
# This script creates various infrastructure funding projects

echo "========================================"
echo "Creating Multiple DePIN Projects"
echo "========================================"
echo ""

PACKAGE_ID="0x2388af4607e9a5462058b146fe8cbb1e1d2b602862f8205d7a7844fcb4b568e5"
CLOCK="0x0000000000000000000000000000000000000000000000000000000000000006"

echo "Package ID: $PACKAGE_ID"
echo ""

# Project 1: Wind Energy Network
echo "[1/5] Creating Wind Energy Network..."
echo "Target: 150 SUI, APY: 10%"

sui client call \
    --package $PACKAGE_ID \
    --module depin \
    --function create_project \
    --args '"Wind Energy Network"' '"Decentralized wind turbine infrastructure across coastal regions"' 150000000000 1000 $CLOCK \
    --gas-budget 10000000

if [ $? -eq 0 ]; then
    echo "SUCCESS: Wind Energy Network created!"
else
    echo "FAILED: Could not create Wind Energy Network"
fi

echo ""

# Project 2: 5G Network Infrastructure
echo "[2/5] Creating 5G Network Infrastructure..."
echo "Target: 200 SUI, APY: 15%"

sui client call \
    --package $PACKAGE_ID \
    --module depin \
    --function create_project \
    --args '"5G Network Infrastructure"' '"Decentralized 5G base stations and edge computing nodes"' 200000000000 1500 $CLOCK \
    --gas-budget 10000000

if [ $? -eq 0 ]; then
    echo "SUCCESS: 5G Network Infrastructure created!"
else
    echo "FAILED: Could not create 5G Network Infrastructure"
fi

echo ""

# Project 3: EV Charging Stations
echo "[3/5] Creating EV Charging Network..."
echo "Target: 120 SUI, APY: 11%"

sui client call \
    --package $PACKAGE_ID \
    --module depin \
    --function create_project \
    --args '"EV Charging Network"' '"Decentralized electric vehicle charging stations powered by renewable energy"' 120000000000 1100 $CLOCK \
    --gas-budget 10000000

if [ $? -eq 0 ]; then
    echo "SUCCESS: EV Charging Network created!"
else
    echo "FAILED: Could not create EV Charging Network"
fi

echo ""

# Project 4: IoT Sensor Network
echo "[4/5] Creating IoT Sensor Network..."
echo "Target: 80 SUI, APY: 13%"

sui client call \
    --package $PACKAGE_ID \
    --module depin \
    --function create_project \
    --args '"IoT Sensor Network"' '"Decentralized environmental monitoring sensors for air quality and climate data"' 80000000000 1300 $CLOCK \
    --gas-budget 10000000

if [ $? -eq 0 ]; then
    echo "SUCCESS: IoT Sensor Network created!"
else
    echo "FAILED: Could not create IoT Sensor Network"
fi

echo ""

# Project 5: Satellite Internet Network
echo "[5/5] Creating Satellite Internet Network..."
echo "Target: 300 SUI, APY: 18%"

sui client call \
    --package $PACKAGE_ID \
    --module depin \
    --function create_project \
    --args '"Satellite Internet Network"' '"Decentralized low-earth orbit satellite constellation for global internet coverage"' 300000000000 1800 $CLOCK \
    --gas-budget 10000000

if [ $? -eq 0 ]; then
    echo "SUCCESS: Satellite Internet Network created!"
else
    echo "FAILED: Could not create Satellite Internet Network"
fi

echo ""
echo "========================================"
echo "Project Creation Complete!"
echo "========================================"
echo ""
echo "Next Steps:"
echo "1. Copy the object IDs from the output above"
echo "2. Update src/config/sui.js with the new project IDs"
echo "3. Restart your dev server to see the new projects"
echo ""
echo "Total Projects: 6 (1 existing + 5 new)"
echo "Total Target Funding: 950 SUI"
echo ""
