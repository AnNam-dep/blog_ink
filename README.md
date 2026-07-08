# blog_ink

blog_ink is a Stellar Testnet dApp for publishing blog metadata and tracking reader tips through a Soroban smart contract and a Freighter wallet dashboard.

The project demonstrates a complete Stellar Level 3 dApp flow with smart contract logic, contract tests, deployment evidence, frontend wallet signing, Soroban RPC integration, CI/CD, and local verification scripts.

## Problem

Independent writers often publish content on centralized platforms.

This makes it difficult to independently verify:

- who published a post
- which content hash belongs to the post
- how much support a post received
- how much a reader contributed
- how much an author earned

## Solution

blog_ink stores post metadata and reader tip activity on Stellar Testnet.

An author can publish a post with a post ID, title, and content hash.

A reader can tip a post through a signed Freighter transaction.

The smart contract tracks total posts, total tips, author earnings, and reader tip history.

## Repository

GitHub repository:

https://github.com/AnNam-dep/blog_ink

## Stellar Testnet Deployment

Network:

Stellar Testnet

Contract ID:

CDS5RL6EQA7LY37GLRDX3EUKO2KPNXMXKFLKTT4VZM3MF5QYK5QINCJB

Contract explorer:

https://stellar.expert/explorer/testnet/contract/CDS5RL6EQA7LY37GLRDX3EUKO2KPNXMXKFLKTT4VZM3MF5QYK5QINCJB

## Successful Contract Interaction

Transaction hash:

c17756228d621044996ec7e504b8e9486e8825c4f768424e51872a6874981ad6

Transaction explorer:

https://stellar.expert/explorer/testnet/tx/c17756228d621044996ec7e504b8e9486e8825c4f768424e51872a6874981ad6

## Features

- Freighter wallet connect
- Freighter wallet disconnect
- connected wallet address display
- publish post metadata
- tip post
- read post details
- read author earnings
- read reader tip history
- read total posts
- read total tips
- transaction signing
- transaction hash display
- loading states
- handled error states
- activity feed
- responsive dashboard layout
- CI/CD workflow
- local verification script
- deployment automation

## Smart Contract

Contract location:

contracts/blog_ink

The contract includes these public functions:

- publish_post
- tip_post
- get_post
- get_reader_tip
- get_author_earnings
- get_total_posts
- get_total_tips

The contract uses:

- custom post struct
- author earnings storage
- reader tip storage
- persistent storage
- custom errors
- contract events
- authorization checks
- contract tests

## Frontend

Frontend location:

frontend

Important files:

- frontend/src/App.tsx
- frontend/src/App.css
- frontend/src/contractConfig.ts
- frontend/src/services/wallet.ts
- frontend/src/services/contract.ts
- frontend/src/services/contract.test.ts

The frontend contract service uses:

- Soroban RPC
- TransactionBuilder
- Contract.call
- prepareTransaction
- Freighter signTransaction
- sendTransaction
- nativeToScVal
- scValToNative

Frontend functions map to contract functions:

- publishPost -> publish_post
- tipPost -> tip_post
- getPost -> get_post
- getReaderTip -> get_reader_tip
- getAuthorEarnings -> get_author_earnings
- getTotalPosts -> get_total_posts
- getTotalTips -> get_total_tips
- getStats -> get_total_posts + get_total_tips

## Repository Structure

~~~text
blog_ink
├── contracts
│   └── blog_ink
│       ├── Cargo.toml
│       └── src
│           ├── lib.rs
│           └── test.rs
├── frontend
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── src
│       ├── App.css
│       ├── App.tsx
│       ├── contractConfig.ts
│       ├── main.tsx
│       ├── vite-env.d.ts
│       └── services
│           ├── contract.test.ts
│           ├── contract.ts
│           └── wallet.ts
├── scripts
│   ├── deploy-and-save.ps1
│   └── verify-level3.ps1
├── .github
│   └── workflows
│       └── ci.yml
├── docs
│   ├── ARCHITECTURE.md
│   └── QUALITY_AND_VERIFICATION.md
├── CONTRACT_ID.txt
├── TX_HASH.txt
├── SUCCESSFUL_TX.txt
├── DEPLOYMENT.md
├── vercel.json
├── Cargo.toml
├── Cargo.lock
├── README.md
└── .gitignore
~~~

## Local Setup

Clone the repository:

~~~powershell
git clone https://github.com/AnNam-dep/blog_ink.git

cd blog_ink
~~~

Install frontend dependencies:

~~~powershell
cd frontend

npm install
~~~

Run frontend locally:

~~~powershell
npm run dev
~~~

## Contract Commands

From the repository root:

~~~powershell
cargo fmt --all

cargo test --workspace

cargo build --workspace --target wasm32v1-none --release
~~~

## Frontend Commands

From the frontend folder:

~~~powershell
npm run type-check

npm test

npm run build
~~~

## Full Local Verification

From the repository root:

~~~powershell
powershell -ExecutionPolicy Bypass -File scripts/verify-level3.ps1
~~~

## Deployment

From the repository root:

~~~powershell
powershell -ExecutionPolicy Bypass -File scripts/deploy-and-save.ps1
~~~

Deployment evidence is stored in:

- CONTRACT_ID.txt
- TX_HASH.txt
- SUCCESSFUL_TX.txt
- DEPLOYMENT.md
- frontend/src/contractConfig.ts

## CI/CD

GitHub Actions workflow:

.github/workflows/ci.yml

The CI pipeline runs:

- Rust formatting
- contract tests
- contract WASM build
- frontend dependency install
- frontend type-check
- frontend tests
- frontend production build
- project structure checks

## Current Status

Completed:

- Soroban smart contract
- contract tests
- Freighter wallet service
- frontend contract integration
- responsive dashboard
- frontend tests
- deployment automation
- deployment evidence
- verification automation
- GitHub Actions CI configuration
- Vercel deployment configuration
- generated test snapshots removed from git tracking

## Notes

This repository does not include private keys, secret phrases, dependency folders, local build outputs, or local deploy logs.

Generated folders, local logs, and Soroban test snapshots are ignored by git.