# DePIN Project Creation Scripts

This directory contains scripts to create and manage DePIN (Decentralized Physical Infrastructure Network) projects on Sui blockchain.

## Available Scripts

### 1. Create Multiple DePIN Projects

Creates multiple DePIN projects in one batch operation.

**Linux/Mac:**
```bash
chmod +x scripts/create-multiple-depin-projects.sh
./scripts/create-multiple-depin-projects.sh
```

**Windows (PowerShell):**
```powershell
.\scripts\create-multiple-depin-projects.ps1
```

### 2. Create Single DePIN Project

Creates a single DePIN project (legacy script).

**Linux/Mac:**
```bash
chmod +x scripts/create-depin-project.sh
./scripts/create-depin-project.sh
```

**Windows (PowerShell):**
```powershell
.\scripts\create-depin-project.ps1
```

## Prerequisites

1. **Sui CLI installed**
   ```bash
   # Check if Sui CLI is installed
   sui --version
   ```

2. **Active Sui wallet with testnet SUI**
   ```bash
   # Check your active address
   sui client active-address
   
   # Get testnet SUI from faucet
   sui client faucet
   ```

3. **Correct Package ID**
   - Update the `PACKAGE_ID` variable in the scripts with your deployed package ID
   - Current package: `0x1a464477cbda05cedfe2bffefdf05a23203c0bde47d98efdcd487f8a721c4dbf`

## Project Types

The scripts create the following DePIN project types:

| Category | Name | Description | Target | APY |
|----------|------|-------------|--------|-----|
| Solar | Solar Farm Network | Decentralized solar energy infrastructure | 100,000 SUI | 8% |
| IoT | Smart City Sensors | Urban environmental monitoring network | 50,000 SUI | 12% |
| Wireless | 5G Hotspot Network | Community-owned 5G infrastructure | 75,000 SUI | 9.5% |
| Storage | Distributed Storage Grid | Decentralized data storage network | 60,000 SUI | 8.5% |
| EV | EV Charging Stations | Electric vehicle charging infrastructure | 80,000 SUI | 11% |

## After Running Scripts

1. **Copy the generated object IDs** from the script output

2. **Update `src/config/sui.js`** with the new project IDs:
   ```javascript
   export const DEPIN_PROJECTS = [
     { 
       id: '0x...', 
       category: 'Solar', 
       name: 'Solar Farm Network',
       description: 'Decentralized solar energy infrastructure across Southeast Asia'
     },
     { 
       id: '0x...', 
       category: 'IoT', 
       name: 'Smart City Sensors',
       description: 'IoT sensor network for urban environmental monitoring'
     },
     // ... more projects
   ];
   ```

3. **Verify on Sui Explorer**
   - Visit: https://suiscan.xyz/testnet
   - Search for the transaction digest or object ID
   - Confirm the project was created successfully

## Customizing Projects

To create projects with different parameters, edit the `PROJECTS` array in the script:

**Bash:**
```bash
declare -a PROJECTS=(
  "Category|Project Name|Description|Target in MIST|APY in basis points"
)
```

**PowerShell:**
```powershell
$PROJECTS = @(
    @{
        Category = "Category"
        Name = "Project Name"
        Description = "Description"
        Target = "Amount in MIST"
        APY = "APY in basis points"
    }
)
```

### Conversion Reference

- **SUI to MIST**: 1 SUI = 1,000,000,000 MIST
  - Example: 100,000 SUI = 100000000000000 MIST

- **APY to Basis Points**: 1% = 100 basis points
  - Example: 8% = 800 basis points
  - Example: 12.5% = 1250 basis points

## Troubleshooting

### Error: "Package not found"
- Verify the `PACKAGE_ID` is correct
- Ensure you're on the correct network (testnet)

### Error: "Insufficient gas"
- Get more testnet SUI: `sui client faucet`
- Increase `--gas-budget` in the script

### Error: "Function not found"
- Verify the Move module has the `create_project` function
- Check the function signature matches the arguments

### Script doesn't execute (Linux/Mac)
```bash
# Make script executable
chmod +x scripts/create-multiple-depin-projects.sh
```

### PowerShell execution policy error (Windows)
```powershell
# Allow script execution (run as Administrator)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Testing Projects

After creating projects, test them in the UI:

1. Navigate to **Advanced DeFi** → **DePIN Revenue** tab
2. Select a project from the dropdown
3. Try contributing a small amount (0.01 SUI minimum)
4. Verify the transaction succeeds and NFT is minted

## Support

For issues or questions:
- Check the Sui documentation: https://docs.sui.io
- Review the Move contract: `contracts/sources/depin.move`
- Check transaction on explorer: https://suiscan.xyz/testnet
