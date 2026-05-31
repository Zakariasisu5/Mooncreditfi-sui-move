# PowerShell script to create Low Risk Pool (Level 1)
# Risk Level 1 = Low Risk (requires 600+ reputation)

Write-Host "🔧 Creating Low Risk Pool (Level 1)..." -ForegroundColor Cyan
Write-Host "📦 Package ID: 0x2388af4607e9a5462058b146fe8cbb1e1d2b602862f8205d7a7844fcb4b568e5" -ForegroundColor Yellow
Write-Host "⚙️  Risk Level: 1 (Low Risk - 600+ reputation required)" -ForegroundColor Yellow
Write-Host ""

# Create the risk pool
sui client call `
  --package 0x2388af4607e9a5462058b146fe8cbb1e1d2b602862f8205d7a7844fcb4b568e5 `
  --module risk_pool `
  --function create_risk_pool `
  --args 1 `
  --gas-budget 100000000

Write-Host ""
Write-Host "✅ Low Risk Pool created!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Copy the 'Created Objects' object ID from the output above"
Write-Host "2. Look for the object with type ending in '::risk_pool::RiskPool'"
Write-Host "3. Update RISK_POOL_LOW in src/config/sui.js with this ID"
Write-Host ""
Write-Host "Example output to look for:" -ForegroundColor Yellow
Write-Host "  Created Objects:"
Write-Host "    - ID: 0xABC123... (this is your RISK_POOL_LOW ID)"
Write-Host "      Type: 0x2388af...::risk_pool::RiskPool"
