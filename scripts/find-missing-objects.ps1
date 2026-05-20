# Find Missing Object IDs from Sui Explorer
# This script helps you find the Lending Pool and Risk Pool Level 1 IDs

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Finding Missing Object IDs" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$PACKAGE_ID = "0x2388af4607e9a5462058b146fe8cbb1e1d2b602862f8205d7a7844fcb4b568e5"
$ACCOUNT = "0x1b5f1da225b2ead0d8ed23c70bcbe78f872756953870a3429c7f347a239c1160"

Write-Host "Package ID: $PACKAGE_ID" -ForegroundColor Green
Write-Host "Your Account: $ACCOUNT" -ForegroundColor Green
Write-Host ""

Write-Host "Method 1: Check Sui Explorer (Recommended)" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Visit your account page:" -ForegroundColor White
Write-Host "   https://suiscan.xyz/testnet/account/$ACCOUNT" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Look for recent transactions that created shared objects" -ForegroundColor White
Write-Host ""
Write-Host "3. Find these objects:" -ForegroundColor White
Write-Host "   - LendingPool (interest_rate: 500, apy: 500)" -ForegroundColor Cyan
Write-Host "   - RiskPool with risk_level: 1" -ForegroundColor Cyan
Write-Host ""

Write-Host "Method 2: Query via CLI" -ForegroundColor Yellow
Write-Host "======================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Run these commands to check each object:" -ForegroundColor White
Write-Host ""

# Get all objects
Write-Host "Getting your objects..." -ForegroundColor Gray
$objects = sui client objects --json 2>$null | ConvertFrom-Json

if ($objects) {
    Write-Host "Found $($objects.Count) objects. Checking each one..." -ForegroundColor Green
    Write-Host ""
    
    $foundLendingPool = $false
    $foundRiskPool1 = $false
    
    foreach ($obj in $objects) {
        $objId = $obj.data.objectId
        
        # Check object details
        $details = sui client object $objId --json 2>$null | ConvertFrom-Json
        
        if ($details.content.type) {
            $type = $details.content.type
            
            # Check for LendingPool
            if ($type -like "*LendingPool*") {
                Write-Host "FOUND LENDING POOL!" -ForegroundColor Green
                Write-Host "  Object ID: $objId" -ForegroundColor Cyan
                Write-Host "  Type: $type" -ForegroundColor Gray
                if ($details.content.fields) {
                    Write-Host "  Interest Rate: $($details.content.fields.interest_rate)" -ForegroundColor Gray
                    Write-Host "  APY: $($details.content.fields.apy)" -ForegroundColor Gray
                }
                Write-Host ""
                $foundLendingPool = $true
            }
            
            # Check for RiskPool Level 1
            if ($type -like "*RiskPool*") {
                if ($details.content.fields.risk_level -eq 1) {
                    Write-Host "FOUND RISK POOL LEVEL 1!" -ForegroundColor Green
                    Write-Host "  Object ID: $objId" -ForegroundColor Cyan
                    Write-Host "  Type: $type" -ForegroundColor Gray
                    Write-Host "  Risk Level: $($details.content.fields.risk_level)" -ForegroundColor Gray
                    Write-Host "  Total Liquidity: $($details.content.fields.total_liquidity)" -ForegroundColor Gray
                    Write-Host ""
                    $foundRiskPool1 = $true
                }
            }
        }
    }
    
    if (-not $foundLendingPool) {
        Write-Host "Lending Pool not found in your objects" -ForegroundColor Yellow
        Write-Host "It might be a shared object. Check Sui Explorer." -ForegroundColor Yellow
        Write-Host ""
    }
    
    if (-not $foundRiskPool1) {
        Write-Host "Risk Pool Level 1 not found in your objects" -ForegroundColor Yellow
        Write-Host "It might be a shared object. Check Sui Explorer." -ForegroundColor Yellow
        Write-Host ""
    }
    
} else {
    Write-Host "Could not fetch objects via CLI" -ForegroundColor Red
    Write-Host "Please use Sui Explorer instead" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Next Steps" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Once you find the IDs:" -ForegroundColor Yellow
Write-Host "1. Update src/config/sui.js" -ForegroundColor White
Write-Host "2. Replace these lines:" -ForegroundColor White
Write-Host ""
Write-Host "   export const LENDING_POOL_OBJECT_ID = '0xYOUR_ID_HERE';" -ForegroundColor Cyan
Write-Host "   export const RISK_POOL_LOW = '0xYOUR_ID_HERE';" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Uncomment the Low Risk Pool in:" -ForegroundColor White
Write-Host "   src/components/RiskPoolSelector.jsx" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Restart your dev server" -ForegroundColor White
Write-Host ""
