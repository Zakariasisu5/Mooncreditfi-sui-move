# Initialize objects for the Credit-Based Lending System
# Package ID: 0xf434eed382320933b03c5280ab1694807239297c16bbf3265acc57768a18adaa

$PACKAGE_ID = "0xf434eed382320933b03c5280ab1694807239297c16bbf3265acc57768a18adaa"

Write-Host "=== Initializing Credit-Based Lending Deployment ===" -ForegroundColor Cyan
Write-Host "Package ID: $PACKAGE_ID" -ForegroundColor Yellow
Write-Host ""

# Step 1: Create Lending Pool
Write-Host "Step 1: Creating Lending Pool..." -ForegroundColor Green
Write-Host "Command: sui client call --package $PACKAGE_ID --module lending_pool --function create_pool --args 500 500 --gas-budget 100000000" -ForegroundColor Gray

$poolResult = sui client call --package $PACKAGE_ID --module lending_pool --function create_pool --args 500 500 --gas-budget 100000000 2>&1 | Out-String

if ($LASTEXITCODE -eq 0) {
    Write-Host "Lending Pool created successfully!" -ForegroundColor Green
    
    # Extract the pool object ID from the output
    if ($poolResult -match "ObjectID:\s*(0x[a-fA-F0-9]+)") {
        $poolId = $matches[1]
        Write-Host "Pool Object ID: $poolId" -ForegroundColor Yellow
        Write-Host ""
    }
} else {
    Write-Host "Failed to create Lending Pool" -ForegroundColor Red
    Write-Host $poolResult
    exit 1
}

# Step 2: Create DePIN Project
Write-Host "Step 2: Creating DePIN Project (Solar Farm Network)..." -ForegroundColor Green
Write-Host "Command: sui client call --package $PACKAGE_ID --module depin --function create_project --args 'Solar Farm Network' 'Decentralized solar energy infrastructure' 100000000000000 1200 0x6 --gas-budget 100000000" -ForegroundColor Gray

$depinResult = sui client call --package $PACKAGE_ID --module depin --function create_project --args "Solar Farm Network" "Decentralized solar energy infrastructure" 100000000000000 1200 0x6 --gas-budget 100000000 2>&1 | Out-String

if ($LASTEXITCODE -eq 0) {
    Write-Host "DePIN Project created successfully!" -ForegroundColor Green
    
    # Extract the project object ID from the output
    if ($depinResult -match "ObjectID:\s*(0x[a-fA-F0-9]+)") {
        $projectId = $matches[1]
        Write-Host "Project Object ID: $projectId" -ForegroundColor Yellow
        Write-Host ""
    }
} else {
    Write-Host "Failed to create DePIN Project" -ForegroundColor Red
    Write-Host $depinResult
    exit 1
}

# Step 3: Summary
Write-Host "=== Deployment Summary ===" -ForegroundColor Cyan
Write-Host "Package ID: $PACKAGE_ID" -ForegroundColor Yellow
Write-Host "Profile Registry: 0xb7396f2a2ca9d900e31f1fee79669ef856256f9b60cde2f04b8bfdae497c90aa" -ForegroundColor Yellow
Write-Host "Upgrade Cap: 0x1d68e4ebac387947d83a942bc957793fb8fd34abe860c028d7c68cd73cf54fc3" -ForegroundColor Yellow

if ($poolId) {
    Write-Host "Lending Pool: $poolId" -ForegroundColor Yellow
}

if ($projectId) {
    Write-Host "DePIN Project: $projectId" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Update src/config/sui.js with the new object IDs above" -ForegroundColor White
Write-Host "2. Update LENDING_POOL_OBJECT_ID with: $poolId" -ForegroundColor White
Write-Host "3. Update DEPIN_PROJECTS[0].id with: $projectId" -ForegroundColor White
Write-Host ""
Write-Host "Done!" -ForegroundColor Green
