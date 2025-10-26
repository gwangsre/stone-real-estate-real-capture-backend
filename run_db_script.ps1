# Database Setup Script for WMHSL Real Estate Backend
# This script helps set up and manage the Firestore database
# Author: Generated for easy setup
# Usage: Right-click and "Run with PowerShell" or run in PowerShell terminal

# Color functions for better output
function Write-ColorOutput([String] $ForegroundColor, [String] $Message) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    Write-Output $Message
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Success([String] $Message) {
    Write-ColorOutput "Green" "✅ $Message"
}

function Write-Error([String] $Message) {
    Write-ColorOutput "Red" "❌ $Message"
}

function Write-Warning([String] $Message) {
    Write-ColorOutput "Yellow" "⚠️  $Message"
}

function Write-Info([String] $Message) {
    Write-ColorOutput "Cyan" "ℹ️  $Message"
}

# Main script
Clear-Host
Write-ColorOutput "Magenta" "=================================================="
Write-ColorOutput "Magenta" "   WMHSL Real Estate Backend - Database Setup    "
Write-ColorOutput "Magenta" "=================================================="
Write-Output ""

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Error "package.json not found. Please run this script from the project root directory."
    Write-Info "Navigate to the wmhsl-real-estate-backend folder and try again."
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Success "Node.js found: $nodeVersion"
} catch {
    Write-Error "Node.js is not installed or not in PATH."
    Write-Info "Please install Node.js 22.x from https://nodejs.org"
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if dependencies are installed
if (-not (Test-Path "node_modules")) {
    Write-Warning "Dependencies not found. Installing..."
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install dependencies."
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Success "Dependencies installed successfully."
}

# Check for Firebase service account file
$firebaseFiles = Get-ChildItem -Name "*firebase-adminsdk*.json"
if ($firebaseFiles.Count -eq 0) {
    Write-Error "Firebase service account JSON file not found."
    Write-Info "Please add your Firebase service account file to the project root."
    Write-Info "The file should be named something like: stone-real-estate-leads-firebase-adminsdk-*.json"
    Read-Host "Press Enter to exit"
    exit 1
} else {
    Write-Success "Firebase service account file found: $($firebaseFiles[0])"
}

# Check for environment file
if (-not (Test-Path ".env.local")) {
    Write-Warning "Environment file (.env.local) not found."
    Write-Info "Creating a basic .env.local file..."
    
    $envContent = @"
# Firebase (uses the JSON file automatically)
# No additional Firebase config needed

# CORS Settings
CORS_ORIGIN=http://localhost:3000,http://localhost:5173

# JWT Secret (change this in production)
JWT_SECRET=dev-secret-change-me-in-production

# Admin Registration (set to 'false' in production)
ALLOW_ADMIN_REGISTER=true

# Development Settings
NODE_ENV=development
AUTH_DISABLED=false

# Email Configuration (optional - for notifications)
# SMTP_HOST=smtp.resend.com
# SMTP_PORT=587
# SMTP_USER=resend
# SMTP_PASS=your-resend-api-key
# FROM_EMAIL=noreply@yourdomain.com
# FROM_NAME=WMHSL Real Estate
"@
    
    $envContent | Out-File -FilePath ".env.local" -Encoding UTF8
    Write-Success "Basic .env.local file created. Please review and update as needed."
}

Write-Output ""
Write-ColorOutput "Yellow" "🗄️  Database Setup Options:"
Write-Output "1. Seed sample leads data"
Write-Output "2. Seed admin users and messages"
Write-Output "3. Set admin password"
Write-Output "4. Dump database (backup)"
Write-Output "5. Run all setup tasks (recommended for first-time setup)"
Write-Output "6. Test server connection"
Write-Output "0. Exit"
Write-Output ""

do {
    $choice = Read-Host "Select an option (0-6)"
    
    switch ($choice) {
        "1" {
            Write-Info "Seeding sample leads data..."
            npm run seed-sample
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Sample leads data seeded successfully."
            } else {
                Write-Error "Failed to seed sample data."
            }
        }
        "2" {
            Write-Info "Seeding admin users and messages..."
            npm run seed-admins-messages
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Admin users and messages seeded successfully."
            } else {
                Write-Error "Failed to seed admin data."
            }
        }
        "3" {
            Write-Info "Setting admin password..."
            npm run set-admin-password
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Admin password set successfully."
            } else {
                Write-Error "Failed to set admin password."
            }
        }
        "4" {
            Write-Info "Dumping database..."
            npm run dump-db
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Database dumped successfully."
            } else {
                Write-Error "Failed to dump database."
            }
        }
        "5" {
            Write-Info "Running full setup (this may take a few minutes)..."
            Write-Output ""
            
            Write-Info "Step 1/3: Seeding admin users and messages..."
            npm run seed-admins-messages
            if ($LASTEXITCODE -ne 0) {
                Write-Error "Failed at step 1. Stopping setup."
                break
            }
            
            Write-Info "Step 2/3: Setting admin password..."
            npm run set-admin-password
            if ($LASTEXITCODE -ne 0) {
                Write-Error "Failed at step 2. Stopping setup."
                break
            }
            
            Write-Info "Step 3/3: Seeding sample data..."
            npm run seed-sample
            if ($LASTEXITCODE -ne 0) {
                Write-Error "Failed at step 3. Stopping setup."
                break
            }
            
            Write-Success "Full database setup completed successfully!"
            Write-Output ""
            Write-ColorOutput "Green" "🎉 Your backend is ready to use!"
            Write-Info "You can now run 'npm run dev' to start the development server."
        }
        "6" {
            Write-Info "Testing server connection..."
            Write-Info "Starting server for 10 seconds..."
            
            # Start the server in background
            $job = Start-Job -ScriptBlock { 
                Set-Location $using:PWD
                npm start 
            }
            
            Start-Sleep -Seconds 3
            
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:3000/healthz" -TimeoutSec 5
                if ($response.StatusCode -eq 200) {
                    Write-Success "Server is responding correctly!"
                    Write-Info "Health check passed: $($response.Content)"
                } else {
                    Write-Warning "Server responded but with status: $($response.StatusCode)"
                }
            } catch {
                Write-Error "Failed to connect to server: $($_.Exception.Message)"
                Write-Info "Make sure port 3000 is available and Firebase is configured correctly."
            }
            
            # Stop the background job
            Stop-Job $job
            Remove-Job $job
            Write-Info "Server test completed."
        }
        "0" {
            Write-Info "Exiting script."
            break
        }
        default {
            Write-Warning "Invalid option. Please select 0-6."
        }
    }
    
    if ($choice -ne "0") {
        Write-Output ""
        Write-Output "Press Enter to return to menu..."
        Read-Host
        Write-Output ""
    }
    
} while ($choice -ne "0")

Write-Output ""
Write-ColorOutput "Magenta" "=================================================="
Write-ColorOutput "Green" "Thank you for using WMHSL Real Estate Backend!"
Write-ColorOutput "Magenta" "=================================================="
Write-Output ""

# Keep window open if double-clicked
if ($Host.Name -eq "ConsoleHost") {
    Write-Output "Script completed. You can close this window."
    Read-Host "Press Enter to exit"
}