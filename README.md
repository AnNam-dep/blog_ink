# blog_ink

## Project Description

**blog_ink** is a Soroban smart contract and Stellar Testnet dApp that powers a paid blog-tipping workflow for writers and readers.

Authors can publish blog posts by registering a post ID, title, and content hash on-chain. Readers can tip the posts they enjoy, and the contract keeps a transparent per-article tipping ledger.

The MVP focuses on one core creator-economy action: helping readers support writers through a verifiable Stellar transaction.

## Project Vision

The long-term goal of **blog_ink** is to give independent writers a fair, transparent, and permissionless monetization rail on Stellar.

By storing post metadata and tipping ledgers on-chain, authors can track their earnings without relying on a centralized platform. Readers can also verify that their support was recorded transparently.

Future versions can expand into:

* Paid comments
* Recurring reader support
* Co-author royalty splits
* Token-based creator memberships
* Stablecoin-based real tipping flows

## Built With

* Stellar Testnet
* Soroban smart contracts
* Rust
* Stellar CLI
* React
* Vite
* TypeScript
* StellarWalletsKit
* Stellar JavaScript SDK

## Level 2 Requirements Covered

| Requirement                                | Status                             |
| ------------------------------------------ | ---------------------------------- |
| Multi-wallet integration                   | Implemented with StellarWalletsKit |
| Smart contract deployed on Stellar Testnet | Completed                          |
| Contract called successfully               | Completed                          |
| Transaction status visible                 | Implemented in frontend            |
| 3 error types handled                      | Implemented in frontend            |
| Minimum 2 meaningful commits               | Completed                          |
| README with setup instructions             | Completed                          |
| Deployed Contract ID included              | Completed                          |
| Stellar Expert transaction link included   | Completed                          |

## Network

```txt
Stellar Testnet
```

## Deployed Contract

Contract ID:

```txt
CAXATGRIGAE7MB247G7PKNU2ISNYMMSHJMLYGTEXFFFFXNQ35EDQ7UIW
```

Stellar Expert Contract Link:

```txt
https://stellar.expert/explorer/testnet/contract/CAXATGRIGAE7MB247G7PKNU2ISNYMMSHJMLYGTEXFFFFXNQ35EDQ7UIW
```

## Successful Contract Call

The contract was successfully called on Stellar Testnet using the `publish_post` function.

Transaction Hash:

```txt
bdcf457131617f31c75a595c73ac3f3364f06345a8be67b14e8d049c67e3011a
```

Stellar Expert Transaction Link:

```txt
https://stellar.expert/explorer/testnet/tx/bdcf457131617f31c75a595c73ac3f3364f06345a8be67b14e8d049c67e3011a
```

## Smart Contract Features

The Soroban smart contract supports the following functions:

### `publish_post`

Registers a new blog post on-chain.

Stored data:

* Author address
* Post ID
* Title
* Content hash
* Total tips
* Tip count
* Created timestamp
* Updated timestamp

### `tip_post`

Records a reader tip for a post.

Updated data:

* Post total tips
* Post tip count
* Reader tip amount
* Author earnings
* Global total tips

### `get_post`

Reads post metadata and tipping data from the contract.

### `get_reader_tip`

Reads how much a specific reader tipped a specific post.

### `get_author_earnings`

Reads total earnings for a specific author.

### `get_total_posts`

Reads the total number of posts registered in the contract.

### `get_total_tips`

Reads the total amount of tips recorded by the contract.

## Contract Events

The contract publishes event-style records for important actions:

* `PostPublished`
* `TipSent`

These events make the app easier to track and can support a frontend activity feed.

## Frontend Features

The frontend includes:

* Stellar Testnet dashboard UI
* Wallet connect and disconnect flow
* Multi-wallet integration through StellarWalletsKit
* Contract ID display
* Publish post panel
* Tip post panel
* Read contract state panel
* Transaction monitor
* Transaction hash display
* Stellar Expert transaction link
* Activity feed
* Handled error panel

## Handled Errors

The frontend handles at least 3 Level 2 error types:

1. Wallet not found
2. User rejected transaction
3. Transaction failed / insufficient balance

## Project Structure

```txt
blog_ink
├── contracts
│   └── blog_ink
│       ├── src
│       │   ├── lib.rs
│       │   └── test.rs
│       └── Cargo.toml
├── frontend
│   ├── src
│   │   ├── App.tsx
│   │   ├── App.css
│   │   ├── contractConfig.ts
│   │   └── main.tsx
│   ├── package.json
│   ├── index.html
│   ├── tsconfig.json
│   └── vite.config.ts
├── scripts
│   ├── deploy-and-save.ps1
│   └── setup-frontend.ps1
├── CONTRACT_ID.txt
├── README.md
└── .gitignore
```

## How to Run Locally

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/blog_ink.git
cd blog_ink
```

### 2. Build and test the smart contract

```bash
cargo test
stellar contract build
```

### 3. Deploy the contract to Stellar Testnet

On Windows PowerShell:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\scripts\deploy-and-save.ps1
```

The deploy script will:

* Run contract tests
* Build the WASM contract
* Check or create the Stellar Testnet identity
* Deploy the contract
* Save the Contract ID to `CONTRACT_ID.txt`
* Save frontend config to `frontend/src/contractConfig.ts`

### 4. Run the frontend

```bash
cd frontend
npm install
npm run build
npm run dev
```

Open the local Vite URL in the browser:

```txt
http://localhost:5173
```

## How to Use the App

1. Open the frontend.
2. Connect a Stellar wallet on Testnet.
3. Publish a post using:

   * Post ID
   * Title
   * Content hash
4. Tip a post using:

   * Post ID
   * Tip amount
5. Read post data from the contract.
6. Check transaction status and transaction hash in the transaction monitor.
7. Open the Stellar Expert transaction link to verify the contract call.

## Example Contract Call

This successful Testnet call registered a blog post through the `publish_post` function:

```bash
stellar contract invoke --id CAXATGRIGAE7MB247G7PKNU2ISNYMMSHJMLYGTEXFFFFXNQ35EDQ7UIW --source-account blog_ink_admin --network testnet -- publish_post --author <AUTHOR_ADDRESS> --post_id postcli1 --title "CLI Test Post" --content_hash "ipfs://cli-test"
```

Verified transaction:

```txt
https://stellar.expert/explorer/testnet/tx/bdcf457131617f31c75a595c73ac3f3364f06345a8be67b14e8d049c67e3011a
```

## Submission Proof

For the Level 2 submission, the key proof items are:

Contract ID:

```txt
CAXATGRIGAE7MB247G7PKNU2ISNYMMSHJMLYGTEXFFFFXNQ35EDQ7UIW
```

Successful contract call:

```txt
https://stellar.expert/explorer/testnet/tx/bdcf457131617f31c75a595c73ac3f3364f06345a8be67b14e8d049c67e3011a
```

## Notes

This MVP records tipping amounts as on-chain ledger values called `ink credits`.

The current version focuses on proving the Level 2 requirements:

* Contract deployment
* Contract write/read logic
* Wallet-based frontend flow
* Transaction status tracking
* Error handling
* Verifiable Stellar Testnet transaction

A future production version can integrate real stablecoin transfers such as USDC on Stellar.
