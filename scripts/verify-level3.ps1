$ErrorActionPreference = "Stop"

function Step {
  param([string]$Message)

  Write-Host ""
  Write-Host "=== $Message ==="
}

$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

Step "Check required files"

$RequiredFiles = @(
  "README.md",
  "Cargo.toml",
  "Cargo.lock",
  "contracts/blog_ink/Cargo.toml",
  "contracts/blog_ink/src/lib.rs",
  "contracts/blog_ink/src/test.rs",
  "frontend/package.json",
  "frontend/package-lock.json",
  "frontend/src/App.tsx",
  "frontend/src/App.css",
  "frontend/src/main.tsx",
  "frontend/src/contractConfig.ts",
  "frontend/src/services/wallet.ts",
  "frontend/src/services/contract.ts",
  "frontend/src/services/contract.test.ts",
  "frontend/src/vite-env.d.ts",
  ".github/workflows/ci.yml"
)

foreach ($File in $RequiredFiles) {
  if (-not (Test-Path $File)) {
    throw "Missing required file: $File"
  }

  Write-Host "OK: $File"
}

Step "Check conflict markers"

$FilesToScan = Get-ChildItem -Recurse -File -Force |
  Where-Object {
    $_.FullName -notmatch "\\.git\\" -and
    $_.FullName -notmatch "\\target\\" -and
    $_.FullName -notmatch "\\node_modules\\" -and
    $_.Extension -in @(".md", ".toml", ".rs", ".json", ".ts", ".tsx", ".js", ".css", ".yml", ".yaml")
  }

$ConflictMatches = $FilesToScan | Select-String -Pattern "<<<<<<<|=======|>>>>>>>" -ErrorAction SilentlyContinue

if ($ConflictMatches) {
  $ConflictMatches
  throw "Conflict markers found."
}

Step "Check public docs do not contain old Level 2-only wording"

$OldLevelPattern = "Level 2 Requirements Covered|Level 2 submission proof"

$DocsToScan = @(
  "README.md"
)

$OldLevelMatches = Select-String -Path $DocsToScan -Pattern $OldLevelPattern -CaseSensitive:$false -ErrorAction SilentlyContinue

if ($OldLevelMatches) {
  Write-Host "Old Level 2 wording detected. This should be replaced before final submission."
  $OldLevelMatches
}

Step "Check contract formatting"

cargo fmt --all -- --check

Step "Run contract tests"

cargo test --workspace

Step "Build contract WASM"

cargo build --workspace --target wasm32v1-none --release

Step "Check frontend"

Set-Location (Join-Path $RepoRoot "frontend")

npm ci
npm run type-check
npm test
npm run build

Set-Location $RepoRoot

Step "Level 3 local verification passed"

git status