param(
  [string]$SourceAccount = "deployer",
  [string]$Network = "testnet"
)

$ErrorActionPreference = "Stop"

function Step {
  param([string]$Message)

  Write-Host ""
  Write-Host "=== $Message ==="
}

function Get-FirstMatch {
  param(
    [string]$Text,
    [string]$Pattern
  )

  $Match = [regex]::Match($Text, $Pattern)

  if ($Match.Success) {
    return $Match.Value
  }

  return ""
}

$RepoRoot = Split-Path -Parent $PSScriptRoot

Set-Location $RepoRoot

$WasmPath = Join-Path $RepoRoot "target\wasm32v1-none\release\blog_ink.wasm"

$TmpLog = Join-Path $RepoRoot "deploy-stdout.tmp"

$DeployLog = Join-Path $RepoRoot "deploy-output.txt"


Step "Check environment"

stellar --version

cargo --version

node -v

npm -v


Step "Use Stellar Testnet"

cmd.exe /d /s /c "stellar network use $Network > `"$TmpLog`" 2>&1"

Get-Content $TmpLog -Raw | Write-Host


Step "Ensure deployer identity exists and is funded"

cmd.exe /d /s /c "stellar keys address $SourceAccount > `"$TmpLog`" 2>&1"

if ($LASTEXITCODE -ne 0) {
  Write-Host "Creating and funding deployer identity..."

  cmd.exe /d /s /c "stellar keys generate --fund $SourceAccount --network $Network > `"$TmpLog`" 2>&1"

  Get-Content $TmpLog -Raw | Write-Host
} else {
  Get-Content $TmpLog -Raw | Write-Host
}

cmd.exe /d /s /c "stellar keys fund $SourceAccount --network $Network > `"$TmpLog`" 2>&1"

Get-Content $TmpLog -Raw | Write-Host

cmd.exe /d /s /c "stellar keys address $SourceAccount > `"$TmpLog`" 2>&1"

$AddressOutput = Get-Content $TmpLog -Raw

Write-Host $AddressOutput

$DeployerAddress = Get-FirstMatch $AddressOutput "G[A-Z2-7]{55}"

if (-not $DeployerAddress) {
  cmd.exe /d /s /c "stellar keys public-key $SourceAccount > `"$TmpLog`" 2>&1"

  $AddressOutput = Get-Content $TmpLog -Raw

  Write-Host $AddressOutput

  $DeployerAddress = Get-FirstMatch $AddressOutput "G[A-Z2-7]{55}"
}

if (-not $DeployerAddress) {
  throw "Could not detect deployer public key."
}

Write-Host "Deployer address: $DeployerAddress"


Step "Format, test, and build contract"

cargo fmt --all

cargo test --workspace

cargo build --workspace --target wasm32v1-none --release

if (-not (Test-Path $WasmPath)) {
  throw "WASM file not found at $WasmPath"
}


Step "Deploy contract"

$DeployCommand = "stellar contract deploy --wasm `"$WasmPath`" --source-account $SourceAccount --network $Network --alias blog_ink"

cmd.exe /d /s /c "$DeployCommand > `"$TmpLog`" 2>&1"

$DeployOutput = Get-Content $TmpLog -Raw

Write-Host $DeployOutput

if ($LASTEXITCODE -ne 0) {
  Write-Host "Direct deploy failed. Trying upload then deploy with wasm hash..."

  $UploadCommand = "stellar contract upload --source-account $SourceAccount --network $Network --wasm `"$WasmPath`""

  cmd.exe /d /s /c "$UploadCommand > `"$TmpLog`" 2>&1"

  $UploadOutput = Get-Content $TmpLog -Raw

  Write-Host $UploadOutput

  if ($LASTEXITCODE -ne 0) {
    throw "WASM upload failed."
  }

  $WasmHash = Get-FirstMatch $UploadOutput "[a-fA-F0-9]{64}"

  if (-not $WasmHash) {
    throw "Could not detect wasm hash after upload."
  }

  $DeployHashCommand = "stellar contract deploy --source-account $SourceAccount --network $Network --wasm-hash $WasmHash --alias blog_ink"

  cmd.exe /d /s /c "$DeployHashCommand > `"$TmpLog`" 2>&1"

  $DeployOutput = Get-Content $TmpLog -Raw

  Write-Host $DeployOutput

  if ($LASTEXITCODE -ne 0) {
    throw "Contract deploy from wasm hash failed."
  }
}

$ContractId = Get-FirstMatch $DeployOutput "C[A-Z2-7]{55}"

if (-not $ContractId) {
  throw "Could not detect contract ID from deploy output."
}

Write-Host "Contract ID: $ContractId"


Step "Save contract id and update frontend config"

[System.IO.File]::WriteAllText(
  (Join-Path $RepoRoot "CONTRACT_ID.txt"),
  $ContractId,
  [System.Text.UTF8Encoding]::new($false)
)

$ConfigPath = Join-Path $RepoRoot "frontend\src\contractConfig.ts"

$ConfigContent = Get-Content $ConfigPath -Raw

$ConfigContent = $ConfigContent -replace 'contractId: ".*"', "contractId: `"$ContractId`""

[System.IO.File]::WriteAllText(
  $ConfigPath,
  $ConfigContent,
  [System.Text.UTF8Encoding]::new($false)
)


Step "Create sample blog post transaction"

$PostId = "demo_post_101"

$Title = "Blog Ink Demo Post"

$ContentHash = "ipfs://blog-ink-demo-post"

$PublishCommand = "stellar contract invoke --id $ContractId --source-account $SourceAccount --network $Network -- publish_post --author $DeployerAddress --post_id $PostId --title `"$Title`" --content_hash `"$ContentHash`""

cmd.exe /d /s /c "$PublishCommand > `"$TmpLog`" 2>&1"

$PublishOutput = Get-Content $TmpLog -Raw

Write-Host $PublishOutput

if ($LASTEXITCODE -ne 0) {
  throw "publish_post invocation failed."
}


Step "Create sample tip transaction"

$TipAmount = 25

$TipCommand = "stellar contract invoke --id $ContractId --source-account $SourceAccount --network $Network -- tip_post --reader $DeployerAddress --post_id $PostId --amount $TipAmount"

cmd.exe /d /s /c "$TipCommand > `"$TmpLog`" 2>&1"

$TipOutput = Get-Content $TmpLog -Raw

Write-Host $TipOutput

if ($LASTEXITCODE -ne 0) {
  throw "tip_post invocation failed."
}

$TxHash = Get-FirstMatch $TipOutput "[a-fA-F0-9]{64}"

if (-not $TxHash) {
  $TxHash = Get-FirstMatch $PublishOutput "[a-fA-F0-9]{64}"
}

if ($TxHash) {
  [System.IO.File]::WriteAllText(
    (Join-Path $RepoRoot "TX_HASH.txt"),
    $TxHash,
    [System.Text.UTF8Encoding]::new($false)
  )

  [System.IO.File]::WriteAllText(
    (Join-Path $RepoRoot "SUCCESSFUL_TX.txt"),
    $TxHash,
    [System.Text.UTF8Encoding]::new($false)
  )
}


Step "Write deployment evidence"

$DeploymentLines = @(
  "# blog_ink Deployment Evidence",
  "",
  "Network: Stellar Testnet",
  "",
  "Contract ID: $ContractId",
  "",
  "Deployer address: $DeployerAddress",
  "",
  "Sample post ID: $PostId",
  "",
  "Sample title: $Title",
  "",
  "Sample content hash: $ContentHash",
  "",
  "Sample tip amount: $TipAmount",
  "",
  "Contract explorer:",
  "https://stellar.expert/explorer/testnet/contract/$ContractId",
  "",
  "Transaction hash:",
  "$TxHash",
  "",
  "Transaction explorer:",
  "https://stellar.expert/explorer/testnet/tx/$TxHash",
  "",
  "Publish output:",
  "",
  $PublishOutput,
  "",
  "Tip output:",
  "",
  $TipOutput
)

[System.IO.File]::WriteAllLines(
  (Join-Path $RepoRoot "DEPLOYMENT.md"),
  $DeploymentLines,
  [System.Text.UTF8Encoding]::new($false)
)

$FullLog = @(
  "Contract ID: $ContractId",
  "",
  "Deployer address: $DeployerAddress",
  "",
  "Transaction hash: $TxHash",
  "",
  "Publish output:",
  $PublishOutput,
  "",
  "Tip output:",
  $TipOutput
) -join "`r`n"

[System.IO.File]::WriteAllText(
  $DeployLog,
  $FullLog,
  [System.Text.UTF8Encoding]::new($false)
)


Step "Verify frontend with deployed contract"

Set-Location (Join-Path $RepoRoot "frontend")

npm install

npm run type-check

npm test

npm run build

Set-Location $RepoRoot


Step "Deployment complete"

Write-Host "Contract ID: $ContractId"

if ($TxHash) {
  Write-Host "Transaction hash: $TxHash"
} else {
  Write-Host "No tx hash detected. Check DEPLOYMENT.md and deploy-output.txt."
}

git status