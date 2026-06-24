import { useEffect, useMemo, useState } from "react";
import {
  Address,
  BASE_FEE,
  Contract,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  scValToNative,
} from "@stellar/stellar-sdk";
import { StellarWalletsKit } from "@creit-tech/stellar-wallets-kit/sdk";
import { defaultModules } from "@creit-tech/stellar-wallets-kit/modules/utils";
import {
  CONTRACT_ID,
  NETWORK,
  NETWORK_PASSPHRASE,
  RPC_URL,
  STELLAR_EXPERT_CONTRACT_URL,
} from "./contractConfig.js";

type TxStatus = "Idle" | "Pending" | "Success" | "Failed";

type ActivityItem = {
  id: number;
  title: string;
  detail: string;
  time: string;
};

type ReadPost = {
  author?: string;
  post_id?: string;
  title?: string;
  content_hash?: string;
  total_tips?: string | number | bigint;
  tip_count?: string | number;
  created_at?: string | number;
  updated_at?: string | number;
};

const shortAddress = (value: string) => {
  if (!value) return "Not connected";
  return `${value.slice(0, 6)}...${value.slice(-6)}`;
};

const nowTime = () =>
  new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return String(error);
};

const classifyError = (error: unknown) => {
  const message = getErrorMessage(error).toLowerCase();

  if (
    message.includes("not installed") ||
    message.includes("not found") ||
    message.includes("wallet")
  ) {
    return {
      title: "Wallet not found",
      detail:
        "No supported Stellar wallet was detected or selected. Install Freighter or choose another wallet from the modal.",
    };
  }

  if (
    message.includes("reject") ||
    message.includes("denied") ||
    message.includes("cancel")
  ) {
    return {
      title: "User rejected transaction",
      detail:
        "The wallet signature request was rejected or closed before signing.",
    };
  }

  return {
    title: "Transaction failed / insufficient balance",
    detail:
      "The transaction could not be completed. Check Testnet XLM balance, wallet network, and contract inputs.",
  };
};

export default function App() {
  const server = useMemo(() => new rpc.Server(RPC_URL), []);
  const contract = useMemo(() => new Contract(CONTRACT_ID), []);

  const [publicKey, setPublicKey] = useState("");
  const [txStatus, setTxStatus] = useState<TxStatus>("Idle");
  const [txHash, setTxHash] = useState("");
  const [errorTitle, setErrorTitle] = useState("");
  const [errorDetail, setErrorDetail] = useState("");

  const [postId, setPostId] = useState("post1");
  const [postTitle, setPostTitle] = useState("My first on-chain blog");
  const [contentHash, setContentHash] = useState("ipfs://blog-ink-post-1");
  const [tipAmount, setTipAmount] = useState("25");

  const [readPostId, setReadPostId] = useState("post1");
  const [readPost, setReadPost] = useState<ReadPost | null>(null);
  const [readerTip, setReaderTip] = useState("0");
  const [authorEarnings, setAuthorEarnings] = useState("0");
  const [totalPosts, setTotalPosts] = useState("0");
  const [totalTips, setTotalTips] = useState("0");

  const [activity, setActivity] = useState<ActivityItem[]>([
    {
      id: 1,
      title: "blog_ink dashboard ready",
      detail: "Connect a wallet, publish a post, then send a tip.",
      time: nowTime(),
    },
  ]);

  useEffect(() => {
    StellarWalletsKit.init({
      modules: defaultModules(),
    });
  }, []);

  const addActivity = (title: string, detail: string) => {
    setActivity((items) => [
      {
        id: Date.now(),
        title,
        detail,
        time: nowTime(),
      },
      ...items.slice(0, 7),
    ]);
  };

  const setHandledError = (error: unknown) => {
    const handled = classifyError(error);
    setTxStatus("Failed");
    setErrorTitle(handled.title);
    setErrorDetail(handled.detail);
    addActivity(handled.title, handled.detail);
  };

  const clearError = () => {
    setErrorTitle("");
    setErrorDetail("");
  };

  const ensureWallet = () => {
    if (!publicKey) {
      throw new Error("wallet not found");
    }
  };

  const validatePostId = (value: string) => {
    const clean = value.trim();

    if (!clean) {
      throw new Error("Post ID is required.");
    }

    if (clean.length > 32) {
      throw new Error("Post ID must be 32 characters or less.");
    }

    if (!/^[a-zA-Z0-9_]+$/.test(clean)) {
      throw new Error("Post ID can only use letters, numbers, and underscore.");
    }

    return clean;
  };

  const connectWallet = async () => {
    try {
      clearError();
      const result = await StellarWalletsKit.authModal();
      setPublicKey(result.address);
      addActivity("Wallet connected", shortAddress(result.address));
    } catch (error) {
      setHandledError(error);
    }
  };

  const refreshAddress = async () => {
    try {
      clearError();
      const result = await StellarWalletsKit.getAddress();
      setPublicKey(result.address);
      addActivity("Wallet address refreshed", shortAddress(result.address));
    } catch (error) {
      setHandledError(error);
    }
  };

  const disconnectWallet = async () => {
    try {
      await StellarWalletsKit.disconnect();
    } catch {
      // Some wallets do not expose a full disconnect flow. UI disconnect is enough for this MVP.
    }

    setPublicKey("");
    setTxStatus("Idle");
    setTxHash("");
    clearError();
    addActivity("Wallet disconnected", "Local wallet state was cleared.");
  };

  const submitContractTransaction = async (
    functionName: string,
    args: ReturnType<typeof nativeToScVal>[]
  ) => {
    ensureWallet();
    clearError();
    setTxStatus("Pending");
    setTxHash("");

    const sourceAccount = await server.getAccount(publicKey);

    const transaction = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call(functionName, ...args))
      .setTimeout(60)
      .build();

    const preparedTransaction = await server.prepareTransaction(transaction);

    const { signedTxXdr } = await StellarWalletsKit.signTransaction(
      preparedTransaction.toXDR(),
      {
        networkPassphrase: NETWORK_PASSPHRASE,
        address: publicKey,
      }
    );

    const signedTransaction = TransactionBuilder.fromXDR(
      signedTxXdr,
      NETWORK_PASSPHRASE
    );

    const sent = await server.sendTransaction(signedTransaction);

    if (sent.status !== "PENDING") {
      throw new Error(`Transaction was not accepted: ${sent.status}`);
    }

    setTxHash(sent.hash);

    const finalStatus = await server.pollTransaction(sent.hash, {
      attempts: 20,
      sleepStrategy: () => 1000,
    });

    if (finalStatus.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
      throw new Error(`Transaction ended with status: ${finalStatus.status}`);
    }

    setTxStatus("Success");
    return sent.hash;
  };

  const simulateContractCall = async (
    functionName: string,
    args: ReturnType<typeof nativeToScVal>[]
  ) => {
    ensureWallet();

    const sourceAccount = await server.getAccount(publicKey);

    const transaction = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call(functionName, ...args))
      .setTimeout(60)
      .build();

    const simulation = await server.simulateTransaction(transaction);
    const parsed = rpc.parseRawSimulation(simulation);

    if (rpc.Api.isSimulationSuccess(parsed)) {
      return parsed.result?.retval
        ? scValToNative(parsed.result.retval)
        : undefined;
    }

    if (rpc.Api.isSimulationError(parsed)) {
      throw new Error(parsed.error);
    }

    throw new Error("Unexpected simulation response.");
  };

  const publishPost = async () => {
    try {
      const cleanPostId = validatePostId(postId);

      if (!postTitle.trim()) {
        throw new Error("Post title is required.");
      }

      if (!contentHash.trim()) {
        throw new Error("Content hash is required.");
      }

      const hash = await submitContractTransaction("publish_post", [
        new Address(publicKey).toScVal(),
        nativeToScVal(cleanPostId, { type: "symbol" }),
        nativeToScVal(postTitle.trim(), { type: "string" }),
        nativeToScVal(contentHash.trim(), { type: "string" }),
      ]);

      addActivity(
        "Post published",
        `Post ${cleanPostId} was registered on-chain. Tx: ${shortAddress(hash)}`
      );

      await refreshStats();
    } catch (error) {
      setHandledError(error);
    }
  };

  const tipPost = async () => {
    try {
      const cleanPostId = validatePostId(postId);
      const amount = Number(tipAmount);

      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Tip amount must be a positive number.");
      }

      const hash = await submitContractTransaction("tip_post", [
        new Address(publicKey).toScVal(),
        nativeToScVal(cleanPostId, { type: "symbol" }),
        nativeToScVal(BigInt(Math.floor(amount)), { type: "i128" }),
      ]);

      addActivity(
        "Tip sent",
        `Reader tipped ${Math.floor(amount)} ink credits to ${cleanPostId}. Tx: ${shortAddress(hash)}`
      );

      await refreshPostData(cleanPostId);
      await refreshStats();
    } catch (error) {
      setHandledError(error);
    }
  };

  const refreshPostData = async (targetPostId = readPostId) => {
    try {
      const cleanPostId = validatePostId(targetPostId);
      clearError();

      const post = await simulateContractCall("get_post", [
        nativeToScVal(cleanPostId, { type: "symbol" }),
      ]);

      setReadPost(post ?? null);
      setReadPostId(cleanPostId);

      if (post?.author) {
        const earnings = await simulateContractCall("get_author_earnings", [
          new Address(String(post.author)).toScVal(),
        ]);
        setAuthorEarnings(String(earnings ?? "0"));
      }

      if (publicKey) {
        const tip = await simulateContractCall("get_reader_tip", [
          nativeToScVal(cleanPostId, { type: "symbol" }),
          new Address(publicKey).toScVal(),
        ]);
        setReaderTip(String(tip ?? "0"));
      }

      addActivity("Post data refreshed", `Loaded on-chain data for ${cleanPostId}.`);
    } catch (error) {
      setHandledError(error);
    }
  };

  const refreshStats = async () => {
    try {
      if (!publicKey) return;

      const posts = await simulateContractCall("get_total_posts", []);
      const tips = await simulateContractCall("get_total_tips", []);

      setTotalPosts(String(posts ?? "0"));
      setTotalTips(String(tips ?? "0"));
    } catch (error) {
      setHandledError(error);
    }
  };

  const showDemoError = (type: "wallet" | "reject" | "balance") => {
    if (type === "wallet") {
      setHandledError(new Error("wallet not found"));
    }

    if (type === "reject") {
      setHandledError(new Error("user rejected transaction"));
    }

    if (type === "balance") {
      setHandledError(new Error("transaction failed because of insufficient balance"));
    }
  };

  const txExplorerUrl = txHash
    ? `https://stellar.expert/explorer/testnet/tx/${txHash}`
    : "";

  return (
    <main className="app-shell">
      <nav className="topbar">
        <div>
          <p className="eyebrow">Stellar Testnet</p>
          <h1>blog_ink</h1>
        </div>

        <div className="wallet-box">
          <span>{publicKey ? shortAddress(publicKey) : "Wallet not connected"}</span>
          {!publicKey ? (
            <button onClick={connectWallet}>Connect Wallet</button>
          ) : (
            <div className="wallet-actions">
              <button onClick={refreshAddress}>Refresh</button>
              <button className="secondary" onClick={disconnectWallet}>
                Disconnect
              </button>
            </div>
          )}
        </div>
      </nav>

      <section className="hero">
        <div>
          <p className="eyebrow">Paid blog-tipping workflow</p>
          <h2>Tip writers directly on Stellar.</h2>
          <p>
            Authors register a post hash, readers send an on-chain tip record,
            and blog_ink keeps a transparent per-post tipping ledger.
          </p>
        </div>

        <div className="contract-card">
          <span>Contract ID</span>
          <code>{CONTRACT_ID}</code>
          <a href={STELLAR_EXPERT_CONTRACT_URL} target="_blank" rel="noreferrer">
            View contract
          </a>
        </div>
      </section>

      <section className="metrics-grid">
        <div className="metric-card">
          <span>Network</span>
          <strong>{NETWORK}</strong>
        </div>
        <div className="metric-card">
          <span>Total posts</span>
          <strong>{totalPosts}</strong>
        </div>
        <div className="metric-card">
          <span>Total tips</span>
          <strong>{totalTips}</strong>
        </div>
        <div className={`metric-card status-${txStatus.toLowerCase()}`}>
          <span>Tx status</span>
          <strong>{txStatus}</strong>
        </div>
      </section>

      <section className="main-grid">
        <div className="panel">
          <div className="panel-title">
            <span>Author action</span>
            <h3>Publish post</h3>
          </div>

          <label>
            Post ID
            <input value={postId} onChange={(e) => setPostId(e.target.value)} />
          </label>

          <label>
            Title
            <input
              value={postTitle}
              onChange={(e) => setPostTitle(e.target.value)}
            />
          </label>

          <label>
            Content hash
            <input
              value={contentHash}
              onChange={(e) => setContentHash(e.target.value)}
            />
          </label>

          <button className="primary" onClick={publishPost}>
            Publish Post
          </button>
        </div>

        <div className="panel">
          <div className="panel-title">
            <span>Reader action</span>
            <h3>Tip post</h3>
          </div>

          <label>
            Post ID
            <input value={postId} onChange={(e) => setPostId(e.target.value)} />
          </label>

          <label>
            Tip amount
            <input
              value={tipAmount}
              onChange={(e) => setTipAmount(e.target.value)}
            />
          </label>

          <button className="primary" onClick={tipPost}>
            Tip Post
          </button>
        </div>

        <div className="panel">
          <div className="panel-title">
            <span>Read contract state</span>
            <h3>Post ledger</h3>
          </div>

          <label>
            Post ID
            <input
              value={readPostId}
              onChange={(e) => setReadPostId(e.target.value)}
            />
          </label>

          <button onClick={() => refreshPostData()}>Read Post Data</button>

          <div className="data-box">
            <p>
              <span>Author:</span>{" "}
              <code>{readPost?.author ? shortAddress(String(readPost.author)) : "-"}</code>
            </p>
            <p>
              <span>Title:</span> {readPost?.title ?? "-"}
            </p>
            <p>
              <span>Hash:</span> <code>{readPost?.content_hash ?? "-"}</code>
            </p>
            <p>
              <span>Total tips:</span> {String(readPost?.total_tips ?? "0")}
            </p>
            <p>
              <span>Tip count:</span> {String(readPost?.tip_count ?? "0")}
            </p>
            <p>
              <span>Your tip:</span> {readerTip}
            </p>
            <p>
              <span>Author earnings:</span> {authorEarnings}
            </p>
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">
            <span>Transaction monitor</span>
            <h3>Live status</h3>
          </div>

          <div className="tx-monitor">
            <p>
              <span>Status:</span> <strong>{txStatus}</strong>
            </p>
            <p>
              <span>Hash:</span>{" "}
              {txHash ? (
                <code>{txHash}</code>
              ) : (
                <em>No transaction submitted yet.</em>
              )}
            </p>

            {txHash && (
              <a href={txExplorerUrl} target="_blank" rel="noreferrer">
                View transaction on Stellar Expert
              </a>
            )}
          </div>

          <div className="error-panel">
            <h4>Handled errors</h4>

            {errorTitle ? (
              <div className="error-box">
                <strong>{errorTitle}</strong>
                <p>{errorDetail}</p>
              </div>
            ) : (
              <p className="muted">No active error.</p>
            )}

            <div className="demo-buttons">
              <button onClick={() => showDemoError("wallet")}>
                Demo wallet not found
              </button>
              <button onClick={() => showDemoError("reject")}>
                Demo rejected
              </button>
              <button onClick={() => showDemoError("balance")}>
                Demo tx failed
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="activity-panel">
        <div className="panel-title">
          <span>Event-style activity feed</span>
          <h3>Latest actions</h3>
        </div>

        <div className="activity-list">
          {activity.map((item) => (
            <article key={item.id}>
              <div>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
              <span>{item.time}</span>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
