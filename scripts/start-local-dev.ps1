<#
Start-local-dev.ps1
- Starts Redis (via docker-compose or docker) and Firebase emulators (requires firebase-tools in project devDependencies)
- Usage: From repo root: `.	ools\start-local-dev.ps1` or `pwsh .\scripts\start-local-dev.ps1`
#>

param(
  [switch]$UseDockerCompose
)

function Ensure-CommandExists {
  param($name)
  $exists = Get-Command $name -ErrorAction SilentlyContinue
  if (-not $exists) {
    Write-Error "Required command '$name' not found in PATH. Please install it and retry."
    exit 1
  }
}

# Check pre-reqs
Ensure-CommandExists -name 'docker'
Ensure-CommandExists -name 'curl'

# Start Redis
if ($UseDockerCompose) {
  if (-not (Test-Path 'docker-compose.yml')) {
    Write-Error "docker-compose.yml not found in repo root."
    exit 1
  }
  Write-Output "Starting services with docker-compose..."
  docker-compose up -d redis
} else {
  Write-Output "Starting redis container..."
  docker run -d --name blinking-redis -p 6379:6379 --health-cmd "redis-cli ping" --health-interval 10s --health-timeout 5s --health-retries 5 redis:7 | Out-Null
}

# Wait for Redis to become healthy
Write-Output "Waiting for Redis to be ready on localhost:6379..."
$max = 30
for ($i=0; $i -lt $max; $i++) {
  try {
    $resp = docker exec blinking-redis redis-cli ping 2>$null
    if ($resp -eq 'PONG') { Write-Output 'Redis ready'; break }
  } catch {
    # maybe container not running yet
  }
  Start-Sleep -Seconds 1
}

# Start Firebase emulators using local firebase-tools installed by npm
$fireCmd = "$PWD\node_modules\.bin\firebase.cmd"
if (-not (Test-Path $fireCmd)) {
  Write-Error "firebase CLI not found at $fireCmd. Install devDependencies with 'npm ci' first."
  exit 1
}

Write-Output "Starting Firebase emulators (firestore, storage) in background..."
Start-Process -FilePath $fireCmd -ArgumentList "emulators:start --project=demo-project --only firestore,storage --host 127.0.0.1" -NoNewWindow -WindowStyle Hidden

# Wait for Firestore emulator
Write-Output "Waiting for Firestore emulator on http://127.0.0.1:8080"
$ready = $false
for ($i=0; $i -lt 60; $i++) {
  try {
    $r = curl.exe -sS http://127.0.0.1:8080/
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
  } catch { }
  Start-Sleep -Seconds 1
}
if (-not $ready) { Write-Warning "Firestore emulator did not respond within 60s. Check emulators.log in repo root." }
else { Write-Output "Firestore emulator ready" }

Write-Output "Local dev environment started. Run tests with: npm run test:integration or npm run test:rules"