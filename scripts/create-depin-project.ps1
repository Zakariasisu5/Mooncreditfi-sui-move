# PowerShell script to create a DePIN project on Sui testnet

Write-Host "Creating DePIN Project on Sui Testnet..." -ForegroundColor Cyan

# Package ID
$PACKAGE_ID = "0xb059616029897f6436640d7c254bcc6130f157c3677bda4eaaccf9f60014fe03"

# Project details
$PROJECT_NAME = "Solar Farm"
$PROJECT_DESCRIPTION = "Decentralized solar energy infrastructure project"
$TARGET_AMOUNT = 100000000000000  # 100,000 SUI in MIST (100000 * 1_000_000_000)
$APY = 800  # 8% in basis points

Write-Host "Project Details:" -ForegroundColor Yellow
Write-Host "  Name: $PROJECT_NAME"
Write-Host "  Description: $PROJECT_DESCRIPTION"
Write-Host "  Target: 100,000 SUI"
Write-Host "  APY: 8%"
Write-Host ""

# Create the project
Write-Host "Executing transaction..." -ForegroundColor Green
$result = sui client call `
  --package $PACKAGE_ID `
  --module depin `
  --function create_project `
  --args "$PROJECT_NAME" "$PROJECT_DESCRIPTION" $TARGET_AMOUNT $APY `
  --gas-budget 100000000 `
  --json

if ($LASTEXITCODE -eq 0) {
    Write-Host "Transaction successful!" -ForegroundColor Green
    
    # Parse the result to get the created object ID
    $jsonResult = $result | ConvertFrom-Json
    
    # Extract the created object (the shared DePIN project)
    $createdObjects = $jsonResult.objectChanges | Where-Object { $_.type -eq "created" -and $_.objectType -like "*DepinProject*" }
    
    if ($createdObjects) {
        $projectId = $createdObjects[0].objectId
        Write-Host ""
        Write-Host "DePIN Project Created!" -ForegroundColor Green
        Write-Host "Project Object ID: $projectId" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Update your src/config/sui.js with:" -ForegroundColor Yellow
        Write-Host "export const DEPIN_FINANCE_OBJECT_ID = '$projectId';" -ForegroundColor White
    } else {
        Write-Host "Created objects:" -ForegroundColor Yellow
        $jsonResult.objectChanges | Where-Object { $_.type -eq "created" } | ForEach-Object {
            Write-Host "  - $($_.objectId) ($($_.objectType))" -ForegroundColor White
        }
    }
    
    # Show transaction digest
    $digest = $jsonResult.digest
    Write-Host ""
    Write-Host "Transaction Digest: $digest" -ForegroundColor Cyan
    Write-Host "View on Explorer: https://suiscan.xyz/testnet/tx/$digest" -ForegroundColor Blue
} else {
    Write-Host "Transaction failed!" -ForegroundColor Red
    Write-Host $result
}
