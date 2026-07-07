# blog_ink Architecture

blog_ink is a Stellar Testnet dApp for publishing blog metadata and tracking reader tips through a Soroban smart contract.

## Product Problem

Independent writers often publish content on platforms where proof of authorship, post metadata, and reader support are controlled by centralized systems.

This makes it harder to verify which author published a post, how much support a post received, and how much a reader contributed.

## Solution

blog_ink stores blog post metadata and tip activity on Stellar Testnet.

Authors can publish a post with a post ID, title, and content hash.

Readers can tip a post through a signed wallet transaction.

The smart contract tracks total posts, total tips, author earnings, and reader tip history.

## Smart Contract

Contract location:

contracts/blog_ink

The contract includes:

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
- contract tests

## Frontend

Frontend location:

frontend

The frontend includes:

- Freighter wallet connection
- wallet disconnect
- connected address display
- publish post form
- tip post action
- post detail reader
- author earnings reader
- reader tip reader
- contract stats
- transaction monitor
- activity feed
- loading states
- handled error states
- responsive dashboard layout

## Service Layer

Wallet service:

frontend/src/services/wallet.ts

Contract service:

frontend/src/services/contract.ts

The contract service handles:

- Soroban RPC setup
- TransactionBuilder
- Contract.call
- prepareTransaction
- Freighter signing
- sendTransaction
- transaction polling
- nativeToScVal
- scValToNative

## Deployment

Network:

Stellar Testnet

Contract ID:

CDS5RL6EQA7LY37GLRDX3EUKO2KPNXMXKFLKTT4VZM3MF5QYK5QINCJB

Transaction hash:

c17756228d621044996ec7e504b8e9486e8825c4f768424e51872a6874981ad6

Deployment evidence files:

- CONTRACT_ID.txt
- TX_HASH.txt
- SUCCESSFUL_TX.txt
- DEPLOYMENT.md
- frontend/src/contractConfig.ts