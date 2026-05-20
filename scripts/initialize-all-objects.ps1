# Initialize All DeFi Objects on Sui Testnet
# This script creates all required shared objects after package deployment

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "MoonCredit DeFi - Object Initialization" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Package ID from deployment
$PACKAGE_ID = "0x2388af4607e9a5462058b146fe8cbb1e1d2b602862f8205d7a7844fcb4b568e5"

Write-Host "Package ID: $PACKAGE_ID" -ForegroundColor Green
Write-Host ""

# Step 1: Create Lending Pool
Write-Host "[1/6] Creating Lending Pool..." -ForegroundColor Yellow
Write-Host "Parameters: interest_rate=500, apy=500" -ForegroundColor Gray

sui client call --package $PACKAGE_ID --module lending_pool --function create_pool --args 500 500 --gas-budget 10000000

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS: Lending Pool created!" -ForegroundColor Green
} else {
    Write-Host "FAILED: Could not create Lending Pool" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 2: Create Risk Pool - Level 1
Write-Host "[2/6] Creating Risk Pool - Level 1..." -ForegroundColor Yellow
Write-Host "Parameters: risk_level=1" -ForegroundColor Gray

sui client call --package $PACKAGE_ID --module risk_pool --function create_risk_pool --args 1 --gas-budget 10000000

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS: Risk Pool Level 1 created!" -ForegroundColor Green
} else {
    Write-Host "FAILED: Could not create Risk Pool Level 1" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 3: Create Risk Pool - Level 2
Write-Host "[3/6] Creating Risk Pool - Level 2..." -ForegroundColor Yellow
Write-Host "Parameters: risk_level=2" -ForegroundColor Gray

sui client call --package $PACKAGE_ID --module risk_pool --function create_risk_pool --args 2 --gas-budget 10000000

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS: Risk Pool Level 2 created!" -ForegroundColor Green
} else {
    Write-Host "FAILED: Could not create Risk Pool Level 2" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 4: Create Risk Pool - Level 3
Write-Host "[4/6] Creating Risk Pool - Level 3..." -ForegroundColor Yellow
Write-Host "Parameters: risk_level=3" -ForegroundColor Gray

sui client call --package $PACKAGE_ID --module risk_pool --function create_risk_pool --args 3 --gas-budget 10000000

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS: Risk Pool Level 3 created!" -ForegroundColor Green
} else {
    Write-Host "FAILED: Could not create Risk Pool Level 3" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 5: Create Mudarabah Pool
Write-Host "[5/6] Creating Mudarabah Pool..." -ForegroundColor Yellow
Write-Host "Getting gas coin for initial capital..." -ForegroundColor Gray

$gasJson = sui client gas --json | ConvertFrom-Json
$gasCoin = $gasJson[0].gasCoinId

Write-Host "Using coin: $gasCoin" -ForegroundColor Gray
Write-Host "Parameters: profit_ratio=7000" -ForegroundColor Gray

sui client call --package $PACKAGE_ID --module mudarabah --function create_mudarabah_pool --args $gasCoin 7000 --gas-budget 10000000

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS: Mudarabah Pool created!" -ForegroundColor Green
} else {
    Write-Host "FAILED: Could not create Mudarabah Pool" -ForegroundColor Red
}

Write-Host ""

# Step 6: Create Sample DePIN Project
Write-Host "[6/6] Creating Sample DePIN Project..." -ForegroundColor Yellow
Write-Host "Parameters: Solar Farm Network, target=100 SUI, apy=1200" -ForegroundColor Gray

$CLOCK = "0x0000000000000000000000000000000000000000000000000000000000000006"

sui client call --package $PACKAGE_ID --module depin --function create_project --args '"Solar Farm Network"' '"Decentralized solar energy infrastructure"' 100000000000 1200 $CLOCK --gas-budget 10000000

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS: DePIN Project created!" -ForegroundColor Green
} else {
    Write-Host "FAILED: Could not create DePIN Project" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Initialization Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Check the output above for object IDs" -ForegroundColor White
Write-Host "2. Update src/config/sui.js with the new IDs" -ForegroundColor White
Write-Host "3. Test the frontend with real transactions" -ForegroundColor White
Write-Host ""
Write-Host "Explorer:" -ForegroundColor Yellow
Write-Host "https://suiscan.xyz/testnet/object/$PACKAGE_ID" -ForegroundColor Cyan
