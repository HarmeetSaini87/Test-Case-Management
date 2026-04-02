<#
.SYNOPSIS
Host Bankai TCMS on IIS using Reverse Proxy and PM2.

.DESCRIPTION
This script will:
1. Ensure PM2 is installed globally and start the Next.js app on port 4201.
2. Setup the PM2 Windows Startup Service so the app runs after server reboots.
3. Edit the Windows hosts file to map 'bankai.qa' to localhost.
4. Create an IIS Website named "Bankai_Enterprise_TCMS" pointing to the application folder.

**PREREQUISITES**
1. You MUST run this script "As Administrator".
2. You MUST have the "URL Rewrite" and "Application Request Routing (ARR)" IIS modules installed.
#>

$ErrorActionPreference = "Stop"

$SiteName = "Bankai_Enterprise_TCMS"
$HostName = "bankai.qa"
$AppPath = "e:\AI Agent\Bankai\bankai-app"
$Port = 4201

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host " 🚀 HOSTING BANKAI TCMS FOR ENTERPRISE" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# 1. Update Windows HOSTS file
Write-Host "`n[1/4] Configuring Local DNS Host Entry..." -ForegroundColor Yellow
$HostsFile = "C:\Windows\System32\drivers\etc\hosts"
$HostEntry = "127.0.0.1 $HostName"
$HostsContent = Get-Content $HostsFile -Raw

if ($HostsContent -notmatch $HostName) {
    Add-Content -Path $HostsFile -Value "`n$HostEntry"
    Write-Host "  -> Added '$HostName' to hosts file." -ForegroundColor Green
} else {
    Write-Host "  -> Host entry for '$HostName' already exists." -ForegroundColor Gray
}

# 2. PM2 Node.js Process Manager setup
Write-Host "`n[2/4] Setting up PM2 Process Manager for Next.js..." -ForegroundColor Yellow
# Ensure PM2 is installed
if (-not (Get-Command "pm2" -ErrorAction SilentlyContinue)) {
    Write-Host "  -> Installing PM2 globally..."
    npm install -g pm2
}

# Ensure pm2-windows-startup is installed for reboot survival
if (-not (Get-Command "pm2-startup" -ErrorAction SilentlyContinue)) {
    Write-Host "  -> Installing PM2 Windows Startup..."
    npm install -g pm2-windows-startup
    pm2-startup install
}

# Start the application
Set-Location -Path $AppPath
Write-Host "  -> Starting Bankai Next.js server on port $Port..."
pm2 delete bankai-tcms -s 2>$null # Remove if exists
pm2 start npm --name "bankai-tcms" -- run start -- -p $Port
pm2 save
Write-Host "  -> Service 'bankai-tcms' saved successfully." -ForegroundColor Green

# 3. IIS Website Creation
Write-Host "`n[3/4] Creating IIS Website: $SiteName ..." -ForegroundColor Yellow
Import-Module WebAdministration

if (Get-Website -Name $SiteName -ErrorAction SilentlyContinue) {
    Write-Host "  -> Removing existing IIS site '$SiteName'..." -ForegroundColor Yellow
    Remove-Website -Name $SiteName
}

Write-Host "  -> Creating new IIS site..."
New-WebSite -Name $SiteName -HostHeader $HostName -PhysicalPath $AppPath -Port 80 -Force
Write-Host "  -> IIS Site created successfully!" -ForegroundColor Green

# 4. Finish
Write-Host "`n=============================================" -ForegroundColor Cyan
Write-Host " ✅ SETUP COMPLETE!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "1. Ensure 'URL Rewrite' module is installed in IIS."
Write-Host "2. Access your site locally using this URL:"
Write-Host "   -> http://$HostName" -ForegroundColor Yellow
Write-Host "3. For network users, ask them to add your Server IP and $HostName to their local hosts file, or add a DNS record for your network."
Write-Host "=============================================" -ForegroundColor Cyan
