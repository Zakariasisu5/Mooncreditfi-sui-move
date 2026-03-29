# MoonCreditFi Object Initialization Script (PowerShell)
$ErrorActionPreference = "Stop"

$PACKAGE_ID = "0xe5562b70f5e2618a78a4e2ce8494af09098518461ba50f1004071209277f5bce"
$DEPLOYER_ADDRESS = "0x0efea5713bf6a94382d3b7acc0c1a1438a54a41439b5db5c0c66a63b5f3d0fe0"

Write-Host "MoonCreditFi Object Initialization"
Write-Host "======================================"
Write-Host ""
Write-Host "Package ID: $PACKAGE_ID"
Write-Host "Network: Sui Testnet"
Write-Host ""

# Check if sui CLI is installed
try {
    $null = Get-Command sui -ErrorAction Stop
    Write-Host "Sui CLI found"
} catch {
    Write-Host "Error: Sui CLI not found. Please install it first."
    Write-Host "Run: cargo install --locked --git https://github.com/MystenLabs/sui.git --branch testnet sui"
    exit 1
}

# Check if connected to testnet
$currentEnv = sui client active-env 2>$null
if ($currentEnv -ne "testnet") {
    Write-Host "Warning: Not connected to testnet. Current environment: $currentEnv"
    Write-Host "Switching to testnet..."
    sui client switch --env testnet
}

Write-Host "Connected to testnet"
Write-Host ""

# Step 1: Create Lending Pool
Write-Host "Step 1: Creating Lending Pool..."
Write-Host "Interest Rate: 5 percent (500 basis points)"
Write-Host ""

try {
    $poolOutput = sui client call --package $PACKAGE_ID --module lending_pool --function new --args 500 --gas-budget 10000000 --json 2>&1 | ConvertFrom-Json
    
    $poolId = ($poolOutput.objectChanges | Where-Object { $_.type -eq "created" } | Select-Object -First 1).objectId
    
    Write-Host "Lending Pool created!"
    Write-Host "Object ID: $poolId"
    Write-Host ""
} catch {
    Write-Host "Failed to create lending pool"
    Write-Host $_.Exception.Message
    exit 1
}

# Step 2: Create Credit Profile
Write-Host "Step 2: Creating Credit Profile..."
Write-Host "Owner: $DEPLOYER_ADDRESS"
Write-Host ""

try {
    $profileOutput = sui client call --package $PACKAGE_ID --module credit_profile --function new --args $DEPLOYER_ADDRESS --gas-budget 10000000 --json 2>&1 | ConvertFrom-Json
    
    $profileId = ($profileOutput.objectChanges | Where-Object { $_.type -eq "created" } | Select-Object -First 1).objectId
    
    Write-Host "Credit Profile created!"
    Write-Host "Object ID: $profileId"
    Write-Host ""
} catch {
    Write-Host "Failed to create credit profile"
    Write-Host $_.Exception.Message
    exit 1
}

# Step 3: Create DePIN Project
Write-Host "Step 3: Creating DePIN Project..."
Write-Host "Name: Solar Farm Network"
Write-Host "Target: 1000 SUI"
Write-Host "APY: 8 percent"
Write-Host ""

try {
    $depinOutput = sui client call --package $PACKAGE_ID --module depin --function create_project --args "Solar Farm Network" "Decentralized solar energy infrastructure" 1000000000000 800 --gas-budget 10000000 --json 2>&1 | ConvertFrom-Json
    
    $depinId = ($depinOutput.objectChanges | Where-Object { $_.type -eq "created" } | Select-Object -First 1).objectId
    
    Write-Host "DePIN Project created!"
    Write-Host "Object ID: $depinId"
    Write-Host ""
} catch {
    Write-Host "Failed to create DePIN project"
    Write-Host $_.Exception.Message
    exit 1
}

# Summary
Write-Host "======================================"
Write-Host "Initialization Complete!"
Write-Host "======================================"
Write-Host ""
Write-Host "Copy these values to src/config/sui.js:"
Write-Host ""
Write-Host "export const SUI_PACKAGE_ID = '$PACKAGE_ID';"
Write-Host "export const LENDING_POOL_OBJECT_ID = '$poolId';"
Write-Host "export const CREDIT_PROFILE_OBJECT_ID = '$profileId';"
Write-Host "export const DEPIN_FINANCE_OBJECT_ID = '$depinId';"
Write-Host ""
Write-Host "View on Explorer:"
Write-Host "- Package: https://suiscan.xyz/testnet/object/$PACKAGE_ID"
Write-Host "- Lending Pool: https://suiscan.xyz/testnet/object/$poolId"
Write-Host "- Credit Profile: https://suiscan.xyz/testnet/object/$profileId"
Write-Host "- DePIN Project: https://suiscan.xyz/testnet/object/$depinId"
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Update src/config/sui.js with the object IDs above"
Write-Host "2. Run: npm run dev"
Write-Host "3. Open: http://localhost:5173"
Write-Host ""
