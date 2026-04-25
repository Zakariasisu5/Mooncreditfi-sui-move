# PowerShell script to initialize Advanced DeFi features (Risk Pools & Mudarabah)
# Run this after deploying the contracts

$PACKAGE_ID = "0x1a464477cbda05cedfe2bffefdf05a23203c0bde47d98efdcd487f8a721c4dbf"

Write-Host "=== Initializing Advanced DeFi Features ===" -ForegroundColor Cyan
Write-Host ""

# Create Risk Pool Level 1 (Low Risk)
Write-Host "Creating Risk Pool - Level 1 (Low Risk)..." -ForegroundColor Yellow
$riskPool1 = sui client call --package $PACKAGE_ID --module risk_pool --function create_risk_pool --args 1 --gas-budget 100000000 2>&1 | Out-String

if ($LASTEXITCODE -eq 0) {
    Write-Host "Success: Risk Pool Level 1 created" -ForegroundColor Green
    $riskPool1Id = [regex]::Match($riskPool1, '0x[a-f0-9]{64}').Value
    Write-Host "  Object ID: $riskPool1Id" -ForegroundColor Cyan
} else {
    Write-Host "Failed to create Risk Pool Level 1" -ForegroundColor Red
    $riskPool1Id = ""
}

Write-Host ""

# Create Risk Pool Level 2 (Medium Risk)
Write-Host "Creating Risk Pool - Level 2 (Medium Risk)..." -ForegroundColor Yellow
$riskPool2 = sui client call --package $PACKAGE_ID --module risk_pool --function create_risk_pool --args 2 --gas-budget 100000000 2>&1 | Out-String

if ($LASTEXITCODE -eq 0) {
    Write-Host "Success: Risk Pool Level 2 created" -ForegroundColor Green
    $riskPool2Id = [regex]::Match($riskPool2, '0x[a-f0-9]{64}').Value
    Write-Host "  Object ID: $riskPool2Id" -ForegroundColor Cyan
} else {
    Write-Host "Failed to create Risk Pool Level 2" -ForegroundColor Red
    $riskPool2Id = ""
}

Write-Host ""

# Create Risk Pool Level 3 (High Risk)
Write-Host "Creating Risk Pool - Level 3 (High Risk)..." -ForegroundColor Yellow
$riskPool3 = sui client call --package $PACKAGE_ID --module risk_pool --function create_risk_pool --args 3 --gas-budget 100000000 2>&1 | Out-String

if ($LASTEXITCODE -eq 0) {
    Write-Host "Success: Risk Pool Level 3 created" -ForegroundColor Green
    $riskPool3Id = [regex]::Match($riskPool3, '0x[a-f0-9]{64}').Value
    Write-Host "  Object ID: $riskPool3Id" -ForegroundColor Cyan
} else {
    Write-Host "Failed to create Risk Pool Level 3" -ForegroundColor Red
    $riskPool3Id = ""
}

Write-Host ""
Write-Host "=== Creating Mudarabah Pool ===" -ForegroundColor Cyan
Write-Host "Note: Requires splitting a coin for initial capital" -ForegroundColor Yellow
Write-Host ""

# Split a coin for initial capital (1000 MIST)
Write-Host "Splitting coin for initial capital..." -ForegroundColor Yellow
$splitResult = sui client split-coin --coin-id gas --amounts 1000 --gas-budget 100000000 2>&1 | Out-String

if ($LASTEXITCODE -eq 0) {
    Write-Host "Success: Coin split" -ForegroundColor Green
    $initialCapitalCoin = [regex]::Match($splitResult, '0x[a-f0-9]{64}').Value
    Write-Host "  Initial Capital Coin ID: $initialCapitalCoin" -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "Creating Mudarabah Pool (70/30 profit split)..." -ForegroundColor Yellow
    $mudarabahPool = sui client call --package $PACKAGE_ID --module mudarabah --function create_mudarabah_pool --args $initialCapitalCoin 7000 --gas-budget 100000000 2>&1 | Out-String
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Success: Mudarabah Pool created" -ForegroundColor Green
        $mudarabahPoolId = [regex]::Match($mudarabahPool, '0x[a-f0-9]{64}').Value
        Write-Host "  Object ID: $mudarabahPoolId" -ForegroundColor Cyan
        Write-Host "  Profit Ratio: 70% investor / 30% manager" -ForegroundColor Cyan
    } else {
        Write-Host "Failed to create Mudarabah Pool" -ForegroundColor Red
        $mudarabahPoolId = ""
    }
} else {
    Write-Host "Failed to split coin for initial capital" -ForegroundColor Red
    $mudarabahPoolId = ""
}

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "Update src/config/sui.js with these object IDs:" -ForegroundColor Yellow
Write-Host ""
Write-Host "export const RISK_POOL_LOW = '$riskPool1Id';" -ForegroundColor White
Write-Host "export const RISK_POOL_MEDIUM = '$riskPool2Id';" -ForegroundColor White
Write-Host "export const RISK_POOL_HIGH = '$riskPool3Id';" -ForegroundColor White
Write-Host "export const MUDARABAH_POOL = '$mudarabahPoolId';" -ForegroundColor White
Write-Host ""
Write-Host "=== Initialization Complete ===" -ForegroundColor Green
