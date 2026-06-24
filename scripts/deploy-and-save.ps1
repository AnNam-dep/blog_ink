$ErrorActionPreference = "Stop"

$ProjectName = "blog_ink"
$SourceAccount = "blog_ink_admin"
$Network = "testnet"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

Write-Host ""
Write-Host "==============================="
Write-Host " blog_ink deploy script"
Write-Host "==============================="
Write-Host ""

Write-Host "Step 1: Running cargo fmt..."
cargo fmt

Write-Host ""
Write-Host "Step 2: Running cargo test..."
cargo test

Write-Host ""
Write-Host "Step 3: Building Soroban contract..."
stellar contract build

$WasmCandidates = @(
  ".\target\wasm32v1-none\release\blog_ink.wasm",
  ".\target\wasm32-unknown-unknown\release\blog_ink.wasm"
)

$WasmPath = $null

foreach ($Candidate in $WasmCandidates) {
  if (Test-Path $Candidate) {
    $WasmPath = (Resolve-Path $Candidate).Path
    break
  }
}

if (-not $WasmPath) {
  throw "Cannot find blog_ink.wasm. Please check whether stellar contract build succeeded."
}

Write-Host ""
Write-Host "WASM found at: $WasmPath"

Write-Host ""
Write-Host "Step 4: Checking Stellar identity..."

$ExistingAddress = $null

try {
  $ExistingAddress = stellar keys address $SourceAccount 2>$null
} catch {
  $ExistingAddress = $null
}

if (-not $ExistingAddress) {
  Write-Host "Identity not found. Creating and funding testnet identity: $SourceAccount"
  stellar keys generate $SourceAccount --network $Network --fund
} else {
  Write-Host "Identity already exists: $SourceAccount"
  Write-Host "Address: $ExistingAddress"
}

Write-Host ""
Write-Host "Step 5: Deploying contract to Stellar Testnet..."

$DeployStdout = ".\deploy-stdout.tmp"
$DeployStderr = ".\deploy-stderr.tmp"
$DeployOutput = ".\deploy-output.txt"

Remove-Item $DeployStdout -Force -ErrorAction SilentlyContinue
Remove-Item $DeployStderr -Force -ErrorAction SilentlyContinue
Remove-Item $DeployOutput -Force -ErrorAction SilentlyContinue

$DeployCommand = "stellar contract deploy --wasm `"$WasmPath`" --source-account $SourceAccount --network $Network --alias $ProjectName"

Write-Host ""
Write-Host "Running:"
Write-Host $DeployCommand
Write-Host ""

$Process = Start-Process `
  -FilePath "cmd.exe" `
  -ArgumentList "/d", "/c", $DeployCommand `
  -NoNewWindow `
  -Wait `
  -PassThru `
  -RedirectStandardOutput $DeployStdout `
  -RedirectStandardError $DeployStderr

$CombinedOutput = @()

if (Test-Path $DeployStdout) {
  $CombinedOutput += Get-Content $DeployStdout
}

if (Test-Path $DeployStderr) {
  $CombinedOutput += Get-Content $DeployStderr
}

$CombinedOutput | Tee-Object -FilePath $DeployOutput

Remove-Item $DeployStdout -Force -ErrorAction SilentlyContinue
Remove-Item $DeployStderr -Force -ErrorAction SilentlyContinue

if ($Process.ExitCode -ne 0) {
  Write-Host ""
  Write-Host "Deploy failed. Please check deploy-output.txt"
  throw "stellar contract deploy failed with exit code $($Process.ExitCode)"
}

$ContractId = Select-String -Path $DeployOutput -Pattern "C[A-Z0-9]{55}" -AllMatches |
  ForEach-Object { $_.Matches.Value } |
  Select-Object -First 1

if (-not $ContractId) {
  Write-Host ""
  Write-Host "Deploy output:"
  Get-Content $DeployOutput
  throw "Cannot parse Contract ID from deploy-output.txt. Open deploy-output.txt and check the deploy output."
}

Write-Host ""
Write-Host "Contract deployed successfully!"
Write-Host "Contract ID: $ContractId"

$ContractId | Set-Content ".\CONTRACT_ID.txt" -Encoding UTF8

$FrontendSrc = ".\frontend\src"
New-Item -ItemType Directory -Force $FrontendSrc | Out-Null

$ContractConfig = @"
export const CONTRACT_ID = "$ContractId";

export const NETWORK = "testnet";

export const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

export const RPC_URL = "https://soroban-testnet.stellar.org";

export const STELLAR_EXPERT_CONTRACT_URL =
  "https://stellar.expert/explorer/testnet/contract/" + CONTRACT_ID;
"@

$ContractConfig | Set-Content ".\frontend\src\contractConfig.ts" -Encoding UTF8

Write-Host ""
Write-Host "Saved Contract ID to:"
Write-Host "- CONTRACT_ID.txt"
Write-Host "- frontend/src/contractConfig.ts"

Write-Host ""
Write-Host "Stellar Expert Contract URL:"
Write-Host "https://stellar.expert/explorer/testnet/contract/$ContractId"

Write-Host ""
Write-Host "Next evidence screenshot needed:"
Write-Host "Take screenshot of this terminal as evidence/contract-deployed.png"