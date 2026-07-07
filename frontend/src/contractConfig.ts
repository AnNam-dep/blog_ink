export const CONTRACT_CONFIG = {
  network: "testnet",
  networkPassphrase: "Test SDF Network ; September 2015",
  rpcUrl: "https://soroban-testnet.stellar.org",
  explorerBaseUrl: "https://stellar.expert/explorer/testnet",
  contractId: "CDS5RL6EQA7LY37GLRDX3EUKO2KPNXMXKFLKTT4VZM3MF5QYK5QINCJB"
};

export function getContractExplorerUrl(contractId = CONTRACT_CONFIG.contractId): string {
  return CONTRACT_CONFIG.explorerBaseUrl + "/contract/" + contractId;
}

export function getTransactionExplorerUrl(hash: string): string {
  return CONTRACT_CONFIG.explorerBaseUrl + "/tx/" + hash;
}