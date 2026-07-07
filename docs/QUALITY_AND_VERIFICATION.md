# Quality and Verification

## Local Verification

Run:

powershell -ExecutionPolicy Bypass -File scripts/verify-level3.ps1

The verification script checks:

- required project files
- conflict markers
- contract formatting
- contract tests
- contract WASM build
- frontend dependency install
- frontend type checking
- frontend tests
- frontend production build

## Contract Quality

The smart contract includes:

- post publishing
- reader tipping
- post reader
- reader tip reader
- author earnings reader
- total posts reader
- total tips reader
- custom error handling
- persistent storage
- contract events

Contract commands:

cargo fmt --all
cargo test --workspace
cargo build --workspace --target wasm32v1-none --release

## Frontend Quality

The frontend includes:

- wallet connection
- wallet disconnect
- address display
- contract call mapping
- transaction signing
- transaction hash display
- loading states
- handled error states
- activity feed
- responsive dashboard layout

Frontend commands:

cd frontend
npm ci
npm run type-check
npm test
npm run build

## CI/CD

GitHub Actions workflow:

.github/workflows/ci.yml

The CI pipeline checks:

- smart contract formatting
- smart contract tests
- smart contract WASM build
- frontend type check
- frontend tests
- frontend production build
- required Level 3 files