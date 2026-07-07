import { useState } from "react";
import { CONTRACT_CONFIG, getContractExplorerUrl, getTransactionExplorerUrl } from "./contractConfig";
import {
  createPostId,
  getAuthorEarnings,
  getPost,
  getReaderTip,
  getStats,
  publishPost,
  tipPost,
  validatePostId,
  type BlogInkStats,
  type BlogPost,
  type ContractResult
} from "./services/contract";
import { connectFreighterWallet } from "./services/wallet";

type ActivityItem = {
  title: string;
  detail: string;
  status: "success" | "pending" | "error" | "info";
  hash?: string;
};

const emptyStats: BlogInkStats = {
  totalPosts: 0,
  totalTips: 0
};

function shorten(value: string): string {
  if (!value) {
    return "Not connected";
  }

  if (value.length <= 16) {
    return value;
  }

  return `${value.slice(0, 8)}...${value.slice(-8)}`;
}

function stringifyValue(value: unknown): string {
  if (value === undefined || value === null) {
    return "No return value";
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function toDisplayNumber(value: unknown): string {
  if (value === undefined || value === null) {
    return "0";
  }

  return String(value);
}

function App() {
  const [walletAddress, setWalletAddress] = useState("");
  const [walletError, setWalletError] = useState("");
  const [loading, setLoading] = useState("");
  const [postTitle, setPostTitle] = useState("My first on-chain blog");
  const [postId, setPostId] = useState(createPostId("My first on-chain blog"));
  const [contentHash, setContentHash] = useState("ipfs://blog-ink-post-demo");
  const [tipAmount, setTipAmount] = useState("25");
  const [readPostId, setReadPostId] = useState(postId);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [readerTip, setReaderTip] = useState(0);
  const [authorEarnings, setAuthorEarnings] = useState(0);
  const [stats, setStats] = useState<BlogInkStats>(emptyStats);
  const [lastHash, setLastHash] = useState("");
  const [lastResult, setLastResult] = useState("No contract action has been submitted in this session.");
  const [activity, setActivity] = useState<ActivityItem[]>([
    {
      title: "Dashboard ready",
      detail: "Connect Freighter on Stellar Testnet to publish a post, tip a post, and read the blog ledger.",
      status: "info"
    }
  ]);

  const connected = Boolean(walletAddress);

  function pushActivity(item: ActivityItem) {
    setActivity((current) => [item, ...current].slice(0, 8));
  }

  function requireWallet(): string {
    if (!walletAddress) {
      throw new Error("Connect Freighter wallet first.");
    }

    return walletAddress;
  }

  function handleTxResult(title: string, result: ContractResult) {
    setLastHash(result.hash);
    setLastResult(stringifyValue(result.result));

    pushActivity({
      title,
      detail: `Status: ${result.status}`,
      status: result.status === "SUCCESS" ? "success" : "pending",
      hash: result.hash
    });
  }

  async function connectWallet() {
    setWalletError("");
    setLoading("Connecting wallet");

    try {
      const result = await connectFreighterWallet();

      if (!result.connected) {
        setWalletError(result.error);
        pushActivity({
          title: "Wallet connection failed",
          detail: result.error,
          status: "error"
        });
        return;
      }

      setWalletAddress(result.address);

      pushActivity({
        title: "Wallet connected",
        detail: result.address,
        status: "success"
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Wallet connection failed.";
      setWalletError(message);
      pushActivity({
        title: "Wallet error",
        detail: message,
        status: "error"
      });
    } finally {
      setLoading("");
    }
  }

  function disconnectWallet() {
    setWalletAddress("");
    setWalletError("");
    setLastHash("");
    setSelectedPost(null);
    setReaderTip(0);
    setAuthorEarnings(0);
    setLastResult("Wallet disconnected.");

    pushActivity({
      title: "Wallet disconnected",
      detail: "Local wallet session cleared from the dashboard.",
      status: "info"
    });
  }

  function generateNewPostId() {
    const nextPostId = createPostId(postTitle);
    setPostId(nextPostId);
    setReadPostId(nextPostId);
  }

  async function handlePublishPost() {
    setLoading("Publishing post");

    try {
      const author = requireWallet();
      const cleanPostId = validatePostId(postId);

      if (!postTitle.trim()) {
        throw new Error("Post title is required.");
      }

      if (!contentHash.trim()) {
        throw new Error("Content hash is required.");
      }

      const result = await publishPost({
        author,
        postId: cleanPostId,
        title: postTitle.trim(),
        contentHash: contentHash.trim()
      });

      handleTxResult("Post published", result);
      setReadPostId(cleanPostId);
      await handleLoadPost(cleanPostId, false);
      await handleLoadStats(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Publish post failed.";
      pushActivity({
        title: "Publish post failed",
        detail: message,
        status: "error"
      });
    } finally {
      setLoading("");
    }
  }

  async function handleTipPost() {
    setLoading("Sending tip");

    try {
      const reader = requireWallet();
      const cleanPostId = validatePostId(readPostId || postId);
      const amount = Number(tipAmount);

      const result = await tipPost({
        reader,
        postId: cleanPostId,
        amount
      });

      handleTxResult("Tip sent", result);
      await handleLoadPost(cleanPostId, false);
      await handleLoadStats(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Tip post failed.";
      pushActivity({
        title: "Tip post failed",
        detail: message,
        status: "error"
      });
    } finally {
      setLoading("");
    }
  }

  async function handleLoadPost(targetPostId = readPostId, showLoading = true) {
    if (showLoading) {
      setLoading("Loading post");
    }

    try {
      const sourceAddress = requireWallet();
      const cleanPostId = validatePostId(targetPostId);
      const post = await getPost(sourceAddress, cleanPostId);

      setReadPostId(cleanPostId);
      setSelectedPost(post);
      setLastResult(stringifyValue(post));

      if (post?.author) {
        const earnings = await getAuthorEarnings(sourceAddress, String(post.author));
        setAuthorEarnings(earnings);
      }

      const tip = await getReaderTip(sourceAddress, cleanPostId, sourceAddress);
      setReaderTip(tip);

      pushActivity({
        title: "Post data loaded",
        detail: post ? `${cleanPostId} loaded from contract storage.` : `${cleanPostId} was not found.`,
        status: post ? "success" : "pending"
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Load post failed.";
      pushActivity({
        title: "Load post failed",
        detail: message,
        status: "error"
      });
    } finally {
      if (showLoading) {
        setLoading("");
      }
    }
  }

  async function handleLoadStats(showLoading = true) {
    if (showLoading) {
      setLoading("Loading stats");
    }

    try {
      const sourceAddress = requireWallet();
      const nextStats = await getStats(sourceAddress);

      setStats(nextStats);

      pushActivity({
        title: "Stats refreshed",
        detail: "Total posts and total tips loaded through RPC simulation.",
        status: "success"
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Load stats failed.";
      pushActivity({
        title: "Load stats failed",
        detail: message,
        status: "error"
      });
    } finally {
      if (showLoading) {
        setLoading("");
      }
    }
  }

  return (
    <main className="app-shell">
      <nav className="topbar">
        <div>
          <p className="eyebrow">Stellar Testnet Creator Ledger</p>
          <h1>blog_ink</h1>
        </div>

        <div className="wallet-card">
          <span>{shorten(walletAddress)}</span>

          {connected ? (
            <button className="secondary-button" onClick={disconnectWallet}>
              Disconnect
            </button>
          ) : (
            <button className="primary-button" onClick={connectWallet}>
              Connect Freighter
            </button>
          )}
        </div>
      </nav>

      <section className="hero-grid">
        <div className="hero-panel">
          <p className="eyebrow">Production-style Level 3 dApp</p>
          <h2>Publish blog metadata and track reader tips on Stellar.</h2>
          <p>
            Authors register a post ID, title, and content hash. Readers tip a post through a
            signed Freighter transaction. The contract keeps transparent totals for posts, tips,
            reader contributions, and author earnings.
          </p>

          <div className="hero-actions">
            <button className="primary-button" onClick={() => void handleLoadStats()} disabled={!connected}>
              Refresh contract stats
            </button>

            {lastHash && (
              <a href={getTransactionExplorerUrl(lastHash)} target="_blank" rel="noreferrer">
                View latest transaction
              </a>
            )}
          </div>
        </div>

        <div className="runtime-card">
          <p className="eyebrow">Runtime</p>
          <div className="runtime-row">
            <span>Network</span>
            <strong>Testnet</strong>
          </div>
          <div className="runtime-row">
            <span>Contract</span>
            <strong>{shorten(CONTRACT_CONFIG.contractId)}</strong>
          </div>
          <div className="runtime-row">
            <span>RPC</span>
            <strong>{CONTRACT_CONFIG.rpcUrl.replace("https://", "")}</strong>
          </div>

          <a href={getContractExplorerUrl()} target="_blank" rel="noreferrer">
            Open contract explorer
          </a>
        </div>
      </section>

      {walletError && (
        <section className="alert error">
          <strong>Wallet error</strong>
          <span>{walletError}</span>
        </section>
      )}

      {loading && (
        <section className="alert pending">
          <strong>{loading}</strong>
          <span>Please approve the wallet action if Freighter opens.</span>
        </section>
      )}

      <section className="metrics-grid">
        <article>
          <span>Total posts</span>
          <strong>{stats.totalPosts}</strong>
        </article>
        <article>
          <span>Total tips</span>
          <strong>{stats.totalTips}</strong>
        </article>
        <article>
          <span>Your reader tip</span>
          <strong>{readerTip}</strong>
        </article>
        <article>
          <span>Author earnings</span>
          <strong>{authorEarnings}</strong>
        </article>
      </section>

      <section className="workspace-grid">
        <article className="panel">
          <p className="eyebrow">Author action</p>
          <h3>Publish post metadata</h3>

          <label>
            Post title
            <input value={postTitle} onChange={(event) => setPostTitle(event.target.value)} />
          </label>

          <label>
            Post ID
            <input value={postId} onChange={(event) => setPostId(event.target.value)} />
          </label>

          <label>
            Content hash
            <input value={contentHash} onChange={(event) => setContentHash(event.target.value)} />
          </label>

          <div className="button-row two">
            <button onClick={generateNewPostId}>New post ID</button>
            <button onClick={() => setReadPostId(postId)}>Use for read</button>
          </div>

          <button className="primary-button full" onClick={() => void handlePublishPost()} disabled={!connected || !postId}>
            Sign and publish post
          </button>
        </article>

        <article className="panel">
          <p className="eyebrow">Reader action</p>
          <h3>Tip and inspect a post</h3>

          <label>
            Post ID
            <input value={readPostId} onChange={(event) => setReadPostId(event.target.value)} />
          </label>

          <label>
            Tip amount
            <input value={tipAmount} onChange={(event) => setTipAmount(event.target.value)} />
          </label>

          <div className="button-row two">
            <button onClick={() => void handleLoadPost()} disabled={!connected}>
              Load post
            </button>
            <button onClick={() => void handleTipPost()} disabled={!connected}>
              Tip post
            </button>
          </div>

          {selectedPost && (
            <div className="post-preview">
              <strong>Selected post</strong>
              <span>Title: {String(selectedPost.title)}</span>
              <span>Author: {shorten(String(selectedPost.author))}</span>
              <span>Hash: {String(selectedPost.content_hash)}</span>
              <span>Total tips: {toDisplayNumber(selectedPost.total_tips)}</span>
              <span>Tip count: {toDisplayNumber(selectedPost.tip_count)}</span>
            </div>
          )}
        </article>

        <article className="panel">
          <p className="eyebrow">Transaction monitor</p>
          <h3>Latest result</h3>

          {lastHash ? (
            <>
              <code>{lastHash}</code>
              <a href={getTransactionExplorerUrl(lastHash)} target="_blank" rel="noreferrer">
                Verify on Stellar Expert
              </a>
            </>
          ) : (
            <p>No transaction submitted in this browser session yet.</p>
          )}

          <pre>{lastResult}</pre>

          <div className="handled-errors">
            <strong>Handled states</strong>
            <span>Wallet missing</span>
            <span>User rejected signing</span>
            <span>Duplicate post ID</span>
            <span>Missing post</span>
            <span>Invalid tip amount</span>
            <span>Transaction failed or pending</span>
          </div>
        </article>
      </section>

      <section className="activity-panel">
        <div>
          <p className="eyebrow">Activity feed</p>
          <h3>Recent actions</h3>
        </div>

        <div className="activity-list">
          {activity.map((item, index) => (
            <article className={`activity-item ${item.status}`} key={`${item.title}-${index}`}>
              <strong>{item.title}</strong>
              <span>{item.detail}</span>
              {item.hash && (
                <a href={getTransactionExplorerUrl(item.hash)} target="_blank" rel="noreferrer">
                  tx: {shorten(item.hash)}
                </a>
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default App;