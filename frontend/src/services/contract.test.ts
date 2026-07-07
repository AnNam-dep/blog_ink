import { describe, expect, it } from "vitest";
import { CONTRACT_CONFIG, getContractExplorerUrl, getTransactionExplorerUrl } from "../contractConfig";
import { createPostId, validatePostId } from "./contract";

describe("blog_ink frontend configuration", () => {
  it("uses Stellar Testnet", () => {
    expect(CONTRACT_CONFIG.network).toBe("testnet");
    expect(CONTRACT_CONFIG.networkPassphrase).toContain("Test SDF Network");
    expect(CONTRACT_CONFIG.rpcUrl).toContain("soroban-testnet");
  });

  it("has a deployed contract id configured", () => {
    expect(CONTRACT_CONFIG.contractId).toMatch(/^C[A-Z2-7]{55}$/);
  });

  it("builds explorer links", () => {
    expect(getContractExplorerUrl()).toContain(CONTRACT_CONFIG.contractId);
    expect(getTransactionExplorerUrl("abc123")).toContain("abc123");
  });

  it("generates safe post ids", () => {
    const postId = createPostId("My First On Chain Blog!");

    expect(postId).toMatch(/^[a-z0-9_]+$/);
    expect(postId.length).toBeLessThanOrEqual(32);
  });

  it("validates post id format", () => {
    expect(validatePostId("post_123")).toBe("post_123");
    expect(() => validatePostId("bad post id")).toThrow();
  });
});