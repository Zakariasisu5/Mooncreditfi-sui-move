# MoonCreditFi Object Initialization Script (PowerShell)
$ErrorActionPreference = "Stop"

$PACKAGE_ID = "0x317ea964960bd871b9a7b8b13a84080f64571966ac25517956fe9e2f2beab6b3"
$PROFILE_REGISTRY_ID = "0x50b5c51c42dd7460ac532d67faac95945f8fb0b163397a1ab2d65f106019ec08"
$DEPLOYER_ADDRESS = "0x1b5f1da225b2ead0d8ed23c70bcbe78f872756953870a3429c7f347a239c1160"

Write-Host "MoonCreditFi Object Initialization"
Write-Host "======================================"
Write-Host ""
Write-Host "Package ID: $PACKAGE_ID"
Write-Host "Profile Registry ID: $PROFILE_REGISTRY_ID"
Write-Host "Network: Sui Testnet"
Write-Host ""

# Check if sui CLI is installed
try {
    $null = Get-Command sui -ErrorAction Stop
    Write-Host "Sui CLI found"
} catch {
    Write-Host "Error: Sui CLI not found. Please install it first."
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
Write-Host "Interest Rate: 5% (500 basis points)"
Write-Host "APY: 8% (800 basis points)"
Write-Host ""

try {
    $poolOutput = sui client call --package $PACKAGE_ID --module lending_pool --function create_pool --args 500 800 --gas-budget 50000000 --json 2>&1 | ConvertFrom-Json
    
    re-Object { $_.type -eq "created" -and $_.objectType -like "*lending_pool::LendingPool" } | Select-Object -First 1).objectId
    
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
    $$PACKAGE_ID --module credit_profile --function create_profile --args $PROFILE_REGISTRY_ID --gas-budget 50000000 --json 2>&1 | ConvertFrom-Json
    
    $profileId = ($profileOutput.objectChanges | Where-Object { $_.type -eq "created" -and $_.objectType -like "*credit_profile::CreditProfile" } | Select-Object -First 1).objectId
    
    Write-Host "Credit Profile created!"
    Write-Host "Object ID: $profileId"
    Write-Host ""
} catch {
    Write-Host "Failed to create credit profile"
    Write-Host $_.Exception.Message
    exit 1
}

# Step 3: Create DePIN Projects
Write-Host "Step 3: Creating DePIN Projects..."
Write-Host ""

$depinProjects = @()

# Project 1: Solar Farm Network
Write-Host "Creating: Solar Farm Network..."
try {
    $depin1Output = sui client call --package $PACKAGE_ID --module depin --function create_project --args "Solar Farm Network" "Decentralized solar energy infrastructure" 1000000000000 800 "0x6" --gas-budget 50000000 --json 2>&1 | ConvertFrom-Json
    
    bjectChanges | Where-Object { $_.type -eq "created" -and $_.objectType -like "*depin::DepinProject" } | Select-Object -First 1).objectId
    
    $depinProjects += @{ name = "Solar Farm Network"; id = $depin1Id; category = "Solar" }
    Write-Host "Solar Farm Network created: $depin1Id"
} catch {
    Write-Host "Failed to create Solar Farm Network"
    Write-Host $_.Exception.Message
}

# Project 2: 5G Network Infrastructure
Write-Host "Creating: 5G Network Infrastructure..."
try {
    $lient call --package $PACKAGE_ID --module depin --function create_project --args "5G Network Infrastructure" "Next-generation mobile network deployment" 2000000000000 750 "0x6" --gas-budget 50000000 --json 2>&1 | ConvertFrom-Json
    
    $depin2Id = ($depin2Output.objectChanges | Where-Object { $_.type -eq "created" -and $_.objectType -like "*depin::DepinProject" } | Select-Object -First 1).objectId
    
    $depinProjects += @{ name = "5G Network Infrastructure"; id = $depin2Id; category = "Telecom" }
    Write-Host "5G Network Infrastructure created: $depin2Id"
} catch {
    Write-Host "Failed to create 5G Network Infrastructure"
    Write-Host $_.Exception.Message
}

# Project 3: IoT Sensor Network
Write-Host "Creating: IoT Sensor Network..."
try {
    $depin3Output = sui client call --package $PACKAGE_ID --module depin --function create_project --args "IoT Sensor Network" "Distributed IoT sensor infrastructure" 500000000000 900 "0x6" --gas-budget 50000000 --json 2>&1 | ConvertFrom-Json
    
    depin3Output.objectChanges | Where-Object { $_.type -eq "created" -and $_.objectType -like "*depin::DepinProject" } | Select-Object -First 1).objectId
    
    $depinProjects += @{ name = "IoT Sensor Network"; id = $depin3Id; category = "IoT" }
    Write-Host "IoT Sensor Network created: $depin3Id"
} catch {
    Write-Host "Failed to create IoT Sensor Network"
    Write-Host $_.Exception.Message
}

Write-Host ""

# Summary
Write-Host "======================================"
Write-Host "Initialization Complete!"
Write-Host "======================================"
Write-Host ""
Write-Host "LENDING_POOL_OBJECT_ID: $poolId"
Write-Host "CREDIT_PROFILE_OBJECT_ID: $profileId"
Write-Host ""
Write-Host "DEPIN_PROJECTS:"
foreach ($project in $depinProjects) {
    Write-Host "  $($project.category): $($project.id)"
}
Write-Host ""
