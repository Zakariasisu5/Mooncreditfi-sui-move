# Find the Lending Pool Object ID
# Query recent transactions to find the lending pool

Write-Host "Searching for Lending Pool object..." -ForegroundColor Yellow

# Get recent transactions
$txs = sui client transactions --limit 10 --json | ConvertFrom-Json

foreach ($tx in $txs) {
    $digest = $tx.digest
    Write-Host "Checking transaction: $digest" -ForegroundColor Gray
    
    # Get transaction details
    $txDetails = sui client transaction $digest --json 2>$null | ConvertFrom-Json
    
    if ($txDetails.effects.created) {
        foreach ($obj in $txDetails.effects.created) {
            $objId = $obj.reference.objectId
            
            # Check if it's a LendingPool
            $objDetails = sui client object $objId --json 2>$null | ConvertFrom-Json
            
            if ($objDetails.content.type -like "*LendingPool*") {
                Write-Host ""
                Write-Host "FOUND LENDING POOL!" -ForegroundColor Green
                Write-Host "Object ID: $objId" -ForegroundColor Cyan
                Write-Host "Transaction: $digest" -ForegroundColor Cyan
                Write-Host ""
                Write-Host "Details:" -ForegroundColor Yellow
                Write-Host "  Total Liquidity: $($objDetails.content.fields.total_liquidity)" -ForegroundColor White
                Write-Host "  Interest Rate: $($objDetails.content.fields.interest_rate)" -ForegroundColor White
                Write-Host "  APY: $($objDetails.content.fields.apy)" -ForegroundColor White
                exit 0
            }
        }
    }
}

Write-Host "Lending Pool not found in recent transactions" -ForegroundColor Red
