# Create Multiple DePIN Projects on Sui Testnet
# This script creates various infrastructure funding projects

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Creating Multiple DePIN Projects" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$PACKAGE_ID = "0x2388af4607e9a5462058b146fe8cbb1e1d2b602862f8205d7a7844fcb4b568e5"
$CLOCK = "0x0000000000000000000000000000000000000000000000000000000000000006"

Write-Host "Package ID: $PACKAGE_ID" -ForegroundColor Green
Write-Host ""

# Project 1: Wind Energy Network
Write-Host "[1/5] Creating Wind Energy Network..." -ForegroundColor Yellow
Write-Host "Target: 150 SUI, APY: 10%" -ForegroundColor Gray

sui client call `
    --package $PACKAGE_ID `
    --module depin `
    --function create_project `
    --args '"Wind Energy Network"' '"Decentralized wind turbine infrastructure across coastal regions"' 150000000000 1000 $CLOCK `
    --gas-budget 10000000

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS: Wind Energy Network created!" -ForegroundColor Green
} else {
    Write-Host "FAILED: Could not create Wind Energy Network" -ForegroundColor Red
}

Write-Host ""

# Project 2: 5G Network Infrastructure
Write-Host "[2/5] Creating 5G Network Infrastructure..." -ForegroundColor Yellow
Write-Host "Target: 200 SUI, APY: 15%" -ForegroundColor Gray

sui client call `
    --package $PACKAGE_ID `
    --module depin `
    --function create_project `
    --args '"5G Network Infrastructure"' '"Decentralized 5G base stations and edge computing nodes"' 200000000000 1500 $CLOCK `
    --gas-budget 10000000

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS: 5G Network Infrastructure created!" -ForegroundColor Green
} else {
    Write-Host "FAILED: Could not create 5G Network Infrastructure" -ForegroundColor Red
}

Write-Host ""

# Project 3: EV Charging Stations
Write-Host "[3/5] Creating EV Charging Network..." -ForegroundColor Yellow
Write-Host "Target: 120 SUI, APY: 11%" -ForegroundColor Gray

sui client call `
    --package $PACKAGE_ID `
    --module depin `
    --function create_project `
    --args '"EV Charging Network"' '"Decentralized electric vehicle charging stations powered by renewable energy"' 120000000000 1100 $CLOCK `
    --gas-budget 10000000

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS: EV Charging Network created!" -ForegroundColor Green
} else {
    Write-Host "FAILED: Could not create EV Charging Network" -ForegroundColor Red
}

Write-Host ""

# Project 4: IoT Sensor Network
Write-Host "[4/5] Creating IoT Sensor Network..." -ForegroundColor Yellow
Write-Host "Target: 80 SUI, APY: 13%" -ForegroundColor Gray

sui client call `
    --package $PACKAGE_ID `
    --module depin `
    --function create_project `
    --args '"IoT Sensor Network"' '"Decentralized environmental monitoring sensors for air quality and climate data"' 80000000000 1300 $CLOCK `
    --gas-budget 10000000

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS: IoT Sensor Network created!" -ForegroundColor Green
} else {
    Write-Host "FAILED: Could not create IoT Sensor Network" -ForegroundColor Red
}

Write-Host ""

# Project 5: Satellite Internet Network
Write-Host "[5/5] Creating Satellite Internet Network..." -ForegroundColor Yellow
Write-Host "Target: 300 SUI, APY: 18%" -ForegroundColor Gray

sui client call `
    --package $PACKAGE_ID `
    --module depin `
    --function create_project `
    --args '"Satellite Internet Network"' '"Decentralized low-earth orbit satellite constellation for global internet coverage"' 300000000000 1800 $CLOCK `
    --gas-budget 10000000

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS: Satellite Internet Network created!" -ForegroundColor Green
} else {
    Write-Host "FAILED: Could not create Satellite Internet Network" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Project Creation Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Copy the object IDs from the output above" -ForegroundColor White
Write-Host "2. Update src/config/sui.js with the new project IDs" -ForegroundColor White
Write-Host "3. Restart your dev server to see the new projects" -ForegroundColor White
Write-Host ""
Write-Host "Total Projects: 6 (1 existing + 5 new)" -ForegroundColor Cyan
Write-Host "Total Target Funding: 950 SUI" -ForegroundColor Cyan
Write-Host ""
