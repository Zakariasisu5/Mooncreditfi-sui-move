# PowerShell script to create multiple DePIN projects on Sui testnet

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Creating Multiple DePIN Projects" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Package ID - Update this with your deployed package ID
$PACKAGE_ID = "0x1a464477cbda05cedfe2bffefdf05a23203c0bde47d98efdcd487f8a721c4dbf"

# Array of projects to create
$PROJECTS = @(
    @{
        Category = "IoT"
        Name = "Smart City Sensors"
        Description = "IoT sensor network for urban environmental monitoring"
        Target = "50000000000000"
        APY = "1200"
    },
    @{
        Category = "Wireless"
        Name = "5G Hotspot Network"
        Description = "Community-owned 5G wireless infrastructure deployment"
        Target = "75000000000000"
        APY = "950"
    },
    @{
        Category = "Storage"
        Name = "Distributed Storage Grid"
        Description = "Decentralized data storage infrastructure network"
        Target = "60000000000000"
        APY = "850"
    },
    @{
        Category = "EV"
        Name = "EV Charging Stations"
        Description = "Electric vehicle charging infrastructure network"
        Target = "80000000000000"
        APY = "1100"
    }
)

# Store created project IDs
$PROJECT_IDS = @()

# Create each project
foreach ($project in $PROJECTS) {
    Write-Host "----------------------------------------" -ForegroundColor Yellow
    Write-Host "Creating: $($project.Name)" -ForegroundColor Yellow
    Write-Host "----------------------------------------" -ForegroundColor Yellow
    Write-Host "  Category: $($project.Category)"
    Write-Host "  Description: $($project.Description)"
    $targetSui = [math]::Round([decimal]$project.Target / 1000000000, 2)
    $apyPercent = [math]::Round([decimal]$project.APY / 100, 2)
    Write-Host "  Target: $targetSui SUI"
    Write-Host "  APY: $apyPercent%"
    Write-Host ""
    
    # Create the project
    Write-Host "Executing transaction..." -ForegroundColor Green
    
    try {
        $result = sui client call `
            --package $PACKAGE_ID `
            --module depin `
            --function create_project `
            --args $project.Name $project.Description $project.Target $project.APY "0x6" `
            --gas-budget 100000000 `
            --json 2>&1 | ConvertFrom-Json
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Transaction successful!" -ForegroundColor Green
            
            # Extract the created DePIN project object ID
            $projectObj = $result.objectChanges | Where-Object { 
                $_.type -eq "created" -and $_.objectType -like "*DepinProject*" 
            }
            
            if ($projectObj) {
                $projectId = $projectObj.objectId
                $PROJECT_IDS += @{
                    Id = $projectId
                    Category = $project.Category
                    Name = $project.Name
                    Description = $project.Description
                }
                Write-Host "Project Object ID: $projectId" -ForegroundColor Cyan
                
                # Show transaction digest
                $digest = $result.digest
                Write-Host "View on Explorer: https://suiscan.xyz/testnet/tx/$digest" -ForegroundColor Blue
            } else {
                Write-Host "Warning: Could not extract project ID" -ForegroundColor Yellow
            }
        } else {
            Write-Host "Transaction failed!" -ForegroundColor Red
            Write-Host $result
        }
    } catch {
        Write-Host "Error: $_" -ForegroundColor Red
    }
    
    Write-Host ""
    Start-Sleep -Seconds 2  # Wait between transactions
}

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Created $($PROJECT_IDS.Count) DePIN projects:" -ForegroundColor Green
Write-Host ""

foreach ($projectInfo in $PROJECT_IDS) {
    Write-Host "  $($projectInfo.Category) - $($projectInfo.Name)" -ForegroundColor Yellow
    Write-Host "    $($projectInfo.Id)" -ForegroundColor Cyan
}

# Generate config code
Write-Host ""
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "Update your src/config/sui.js with:" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""
Write-Host 'export const DEPIN_PROJECTS = ['

# Add the existing Solar Farm project first
Write-Host '  {'
Write-Host "    id: '0x63289bc0eb8e219e9207832d8cc9668f432386cd87d604a6cbbe0de3055629ea',"
Write-Host "    category: 'Solar',"
Write-Host "    name: 'Solar Farm Network',"
Write-Host "    description: 'Decentralized solar energy infrastructure across Southeast Asia'"
Write-Host '  },'

# Add newly created projects
foreach ($projectInfo in $PROJECT_IDS) {
    Write-Host '  {'
    Write-Host "    id: '$($projectInfo.Id)',"
    Write-Host "    category: '$($projectInfo.Category)',"
    Write-Host "    name: '$($projectInfo.Name)',"
    Write-Host "    description: '$($projectInfo.Description)'"
    Write-Host '  },'
}

Write-Host '];'
Write-Host ""
Write-Host "Done!" -ForegroundColor Green
