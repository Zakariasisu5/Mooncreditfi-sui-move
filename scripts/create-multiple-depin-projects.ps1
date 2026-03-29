# PowerShell script to create multiple DePIN projects on Sui testnet

Write-Host "Creating Multiple DePIN Projects on Sui Testnet..." -ForegroundColor Cyan
Write-Host ""

# Package ID
$PACKAGE_ID = "0xb059616029897f6436640d7c254bcc6130f157c3677bda4eaaccf9f60014fe03"

# Define multiple DePIN projects
$projects = @(
    @{
        Name = "5G Network Infrastructure"
        Description = "Decentralized 5G network deployment for urban connectivity"
        Target = 250000000000000  # 250,000 SUI
        APY = 1200  # 12%
        Category = "Telecom"
    },
    @{
        Name = "IoT Sensor Network"
        Description = "Global IoT sensor network for environmental monitoring"
        Target = 150000000000000  # 150,000 SUI
        APY = 950  # 9.5%
        Category = "IoT"
    },
    @{
        Name = "EV Charging Stations"
        Description = "Electric vehicle charging infrastructure network"
        Target = 500000000000000  # 500,000 SUI
        APY = 850  # 8.5%
        Category = "Mobility"
    },
    @{
        Name = "Community WiFi Hotspots"
        Description = "Decentralized WiFi hotspot network for public internet access"
        Target = 80000000000000  # 80,000 SUI
        APY = 1100  # 11%
        Category = "WiFi"
    },
    @{
        Name = "Battery Storage Grid"
        Description = "Distributed energy storage system for renewable power"
        Target = 300000000000000  # 300,000 SUI
        APY = 900  # 9%
        Category = "Energy Storage"
    }
)

$createdProjects = @()

foreach ($project in $projects) {
    Write-Host "Creating: $($project.Name)" -ForegroundColor Yellow
    Write-Host "  Category: $($project.Category)"
    Write-Host "  Target: $([math]::Round($project.Target / 1000000000, 0)) SUI"
    Write-Host "  APY: $($project.APY / 100)%"
    Write-Host ""
    
    try {
        $result = sui client call `
            --package $PACKAGE_ID `
            --module depin `
            --function create_project `
            --args "$($project.Name)" "$($project.Description)" $($project.Target) $($project.APY) `
            --gas-budget 100000000 `
            --json 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            $jsonResult = $result | ConvertFrom-Json
            $projectId = ($jsonResult.objectChanges | Where-Object { $_.type -eq "created" -and $_.objectType -like "*DepinProject*" }).objectId
            
            if ($projectId) {
                Write-Host "  Success! Project ID: $projectId" -ForegroundColor Green
                $createdProjects += @{
                    Name = $project.Name
                    Category = $project.Category
                    ObjectId = $projectId
                    Digest = $jsonResult.digest
                }
            } else {
                Write-Host "  Warning: Could not extract project ID" -ForegroundColor Yellow
            }
        } else {
            Write-Host "  Failed to create project" -ForegroundColor Red
        }
    } catch {
        Write-Host "  Error: $_" -ForegroundColor Red
    }
    
    Write-Host ""
    Start-Sleep -Seconds 2
}

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Summary: Created $($createdProjects.Count) DePIN Projects" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

foreach ($proj in $createdProjects) {
    Write-Host "$($proj.Name) ($($proj.Category))" -ForegroundColor White
    Write-Host "  Object ID: $($proj.ObjectId)" -ForegroundColor Cyan
    Write-Host "  Explorer: https://suiscan.xyz/testnet/object/$($proj.ObjectId)" -ForegroundColor Blue
    Write-Host ""
}

# Generate config update
if ($createdProjects.Count -gt 0) {
    Write-Host "Update your src/config/sui.js with these project IDs:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "export const DEPIN_PROJECTS = [" -ForegroundColor White
    foreach ($proj in $createdProjects) {
        Write-Host "  { id: '$($proj.ObjectId)', category: '$($proj.Category)' }," -ForegroundColor White
    }
    Write-Host "];" -ForegroundColor White
}
