import * as StellarSdk from "@stellar/stellar-sdk";
import { CONTRACT_CONFIG } from "../contractConfig";
import { signWithFreighter } from "./wallet";

const SDK = StellarSdk as any;

const RpcServer = SDK.rpc?.Server ?? SDK.SorobanRpc?.Server;
const Contract = SDK.Contract;
const TransactionBuilder = SDK.TransactionBuilder;
const Address = SDK.Address;
const nativeToScVal = SDK.nativeToScVal;
const scValToNative = SDK.scValToNative;

export type BlogPost = {
  author: string;
  post_id: string;
  title: string;
  content_hash: string;
  total_tips: number | string | bigint;
  tip_count: number | string;
  created_at: number | string;
  updated_at: number | string;
};

export type BlogInkStats = {
  totalPosts: number;
  totalTips: number;
};

export type ContractResult<T = unknown> = {
  hash: string;
  status: string;
  result?: T;
};

function ensureContractReady(): void {
  if (!RpcServer || !Contract || !TransactionBuilder) {
    throw new Error("Stellar SDK RPC components are not available.");
  }

  if (!CONTRACT_CONFIG.contractId || CONTRACT_CONFIG.contractId === "REPLACE_AFTER_DEPLOY") {
    throw new Error("Contract ID is not configured yet.");
  }
}

function getServer(): any {
  ensureContractReady();

  return new RpcServer(CONTRACT_CONFIG.rpcUrl, {
    allowHttp: CONTRACT_CONFIG.rpcUrl.startsWith("http://")
  });
}

function getContract(): any {
  ensureContractReady();

  return new Contract(CONTRACT_CONFIG.contractId);
}

function toAddressScVal(address: string): any {
  return new Address(address).toScVal();
}

function toStringScVal(value: string): any {
  return nativeToScVal(value, { type: "string" });
}

function toSymbolScVal(value: string): any {
  return nativeToScVal(value, { type: "symbol" });
}

function toI128ScVal(value: number): any {
  return nativeToScVal(BigInt(Math.floor(value)), { type: "i128" });
}

function normalizeStatus(status: unknown): string {
  return String(status || "UNKNOWN");
}

function normalizeNative(value: any): any {
  if (value === undefined || value === null) {
    return undefined;
  }

  try {
    return scValToNative(value);
  } catch {
    return value;
  }
}

function getSimulationReturnValue(simulation: any): any {
  return (
    simulation?.result?.retval ??
    simulation?.result?.returnValue ??
    simulation?.retval ??
    simulation?.returnValue
  );
}

function getTransactionReturnValue(response: any): any {
  const direct = response?.returnValue ?? response?.result?.returnValue ?? response?.result?.retval;

  if (direct) {
    return direct;
  }

  try {
    const resultXdr = response?.resultXdr;

    if (resultXdr?.result) {
      const results = resultXdr.result().results();

      if (results?.length > 0) {
        return results[0].tr().invokeHostFunctionResult().success().returnValue();
      }
    }
  } catch {
    return undefined;
  }

  return undefined;
}

async function buildContractTransaction(sourceAddress: string, functionName: string, args: any[]): Promise<any> {
  const server = getServer();
  const contract = getContract();

  const sourceAccount = await server.getAccount(sourceAddress);

  const transaction = new TransactionBuilder(sourceAccount, {
    fee: SDK.BASE_FEE,
    networkPassphrase: CONTRACT_CONFIG.networkPassphrase
  })
    .addOperation(contract.call(functionName, ...args))
    .setTimeout(60)
    .build();

  return server.prepareTransaction(transaction);
}

async function submitSignedTransaction<T = unknown>(
  preparedTransaction: any,
  signerAddress: string
): Promise<ContractResult<T>> {
  const server = getServer();

  const signedXdr = await signWithFreighter(
    preparedTransaction.toXDR(),
    signerAddress,
    CONTRACT_CONFIG.networkPassphrase
  );

  const signedTransaction = TransactionBuilder.fromXDR(
    signedXdr,
    CONTRACT_CONFIG.networkPassphrase
  );

  const sendResponse = await server.sendTransaction(signedTransaction);
  const hash = String(sendResponse.hash || "");

  if (!hash) {
    throw new Error("Transaction was submitted, but no hash was returned.");
  }

  for (let attempt = 0; attempt < 18; attempt += 1) {
    const response = await server.getTransaction(hash);
    const status = normalizeStatus(response.status);

    if (status === "SUCCESS") {
      return {
        hash,
        status,
        result: normalizeNative(getTransactionReturnValue(response)) as T
      };
    }

    if (status === "FAILED" || status === "ERROR") {
      throw new Error(`Transaction failed with status ${status}.`);
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  return {
    hash,
    status: "PENDING"
  };
}

async function invokeWrite<T = unknown>(
  sourceAddress: string,
  functionName: string,
  args: any[]
): Promise<ContractResult<T>> {
  const preparedTransaction = await buildContractTransaction(sourceAddress, functionName, args);

  return submitSignedTransaction<T>(preparedTransaction, sourceAddress);
}

async function invokeRead<T>(
  sourceAddress: string,
  functionName: string,
  args: any[]
): Promise<T> {
  const server = getServer();
  const contract = getContract();

  const sourceAccount = await server.getAccount(sourceAddress);

  const transaction = new TransactionBuilder(sourceAccount, {
    fee: SDK.BASE_FEE,
    networkPassphrase: CONTRACT_CONFIG.networkPassphrase
  })
    .addOperation(contract.call(functionName, ...args))
    .setTimeout(60)
    .build();

  const simulation = await server.simulateTransaction(transaction);
  const value = normalizeNative(getSimulationReturnValue(simulation));

  return value as T;
}

export function createPostId(title: string): string {
  const cleanTitle = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 18);

  const suffix = Date.now().toString().slice(-6);

  return `${cleanTitle || "post"}_${suffix}`;
}

export function validatePostId(value: string): string {
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
}

export async function publishPost(params: {
  author: string;
  postId: string;
  title: string;
  contentHash: string;
}): Promise<ContractResult<BlogPost>> {
  const cleanPostId = validatePostId(params.postId);

  return invokeWrite<BlogPost>(params.author, "publish_post", [
    toAddressScVal(params.author),
    toSymbolScVal(cleanPostId),
    toStringScVal(params.title),
    toStringScVal(params.contentHash)
  ]);
}

export async function tipPost(params: {
  reader: string;
  postId: string;
  amount: number;
}): Promise<ContractResult<BlogPost>> {
  const cleanPostId = validatePostId(params.postId);

  if (!Number.isFinite(params.amount) || params.amount <= 0) {
    throw new Error("Tip amount must be a positive number.");
  }

  return invokeWrite<BlogPost>(params.reader, "tip_post", [
    toAddressScVal(params.reader),
    toSymbolScVal(cleanPostId),
    toI128ScVal(params.amount)
  ]);
}

export async function getPost(sourceAddress: string, postId: string): Promise<BlogPost | null> {
  const cleanPostId = validatePostId(postId);

  const post = await invokeRead<BlogPost | null | undefined>(sourceAddress, "get_post", [
    toSymbolScVal(cleanPostId)
  ]);

  return post ?? null;
}

export async function getReaderTip(sourceAddress: string, postId: string, reader: string): Promise<number> {
  const cleanPostId = validatePostId(postId);

  const value = await invokeRead<number | string | bigint>(sourceAddress, "get_reader_tip", [
    toSymbolScVal(cleanPostId),
    toAddressScVal(reader)
  ]);

  return Number(value ?? 0);
}

export async function getAuthorEarnings(sourceAddress: string, author: string): Promise<number> {
  const value = await invokeRead<number | string | bigint>(sourceAddress, "get_author_earnings", [
    toAddressScVal(author)
  ]);

  return Number(value ?? 0);
}

export async function getTotalPosts(sourceAddress: string): Promise<number> {
  const value = await invokeRead<number | string | bigint>(sourceAddress, "get_total_posts", []);

  return Number(value ?? 0);
}

export async function getTotalTips(sourceAddress: string): Promise<number> {
  const value = await invokeRead<number | string | bigint>(sourceAddress, "get_total_tips", []);

  return Number(value ?? 0);
}

export async function getStats(sourceAddress: string): Promise<BlogInkStats> {
  const [totalPosts, totalTips] = await Promise.all([
    getTotalPosts(sourceAddress),
    getTotalTips(sourceAddress)
  ]);

  return {
    totalPosts,
    totalTips
  };
}