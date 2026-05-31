#!/bin/bash

# Script to create Low Risk Pool (Level 1)
# Risk Level 1 = Low Risk (requires 600+ reputation)

echo "🔧 Creating Low Risk Pool (Level 1)..."
echo "📦 Package ID: 0x2388af4607e9a5462058b146fe8cbb1e1d2b602862f8205d7a7844fcb4b568e5"
echo "⚙️  Risk Level: 1 (Low Risk - 600+ reputation required)"
echo ""

# Create the risk pool
sui client call \
  --package 0x2388af4607e9a5462058b146fe8cbb1e1d2b602862f8205d7a7844fcb4b568e5 \
  --module risk_pool \
  --function create_risk_pool \
  --args 1 \
  --gas-budget 100000000

echo ""
echo "✅ Low Risk Pool created!"
echo ""
echo "📋 Next steps:"
echo "1. Copy the 'Created Objects' object ID from the output above"
echo "2. Look for the object with type ending in '::risk_pool::RiskPool'"
echo "3. Update RISK_POOL_LOW in src/config/sui.js with this ID"
echo ""
echo "Example output to look for:"
echo "  Created Objects:"
echo "    - ID: 0xABC123... (this is your RISK_POOL_LOW ID)"
echo "      Type: 0x2388af...::risk_pool::RiskPool"
