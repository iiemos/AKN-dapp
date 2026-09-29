import { bsc, bscTestnet } from "wagmi/chains";

const SUPPORTED_CHAINS = {
  [bsc.id]: bsc,
  [bscTestnet.id]: bscTestnet,
};

const TESTNET_CONTRACTS = {
  presale: "0x5A7ED057471D1e7199CE735a29f3024578032495",
  network: "0xa68C319b4F40Df12816575D8c497c92F852719FE",
  usdt: "0x4E565d40631B21F38D1178953DA11cfBE0B770E3",
};

function normalizeAddress(value) {
  if (!value || typeof value !== "string") return "";
  return value.trim();
}

function resolveAddress(envValue, documentedAddress) {
  return normalizeAddress(envValue) || documentedAddress;
}

const configuredChainId = Number(import.meta.env.VITE_AKN_CHAIN_ID || bscTestnet.id);

export const AKN_CHAIN = SUPPORTED_CHAINS[configuredChainId] ?? bscTestnet;
export const AKN_CHAIN_ID = AKN_CHAIN.id;

// Presale.USDT() is the token used for allowance and balance. This address is the documented testnet token.
export const AKN_CONTRACTS = {
  presale: resolveAddress(import.meta.env.VITE_AKN_PRESALE_ADDRESS, TESTNET_CONTRACTS.presale),
  network: resolveAddress(import.meta.env.VITE_AKN_NETWORK_ADDRESS, TESTNET_CONTRACTS.network),
  usdt: resolveAddress(import.meta.env.VITE_AKN_USDT_ADDRESS, TESTNET_CONTRACTS.usdt),
};

const CONTRACT_ENV_KEYS = {
  presale: "VITE_AKN_PRESALE_ADDRESS",
  network: "VITE_AKN_NETWORK_ADDRESS",
  usdt: "VITE_AKN_USDT_ADDRESS",
};

export function getContractAddress(name) {
  return AKN_CONTRACTS[name] || "";
}

export function assertContractAddress(name) {
  const address = getContractAddress(name);
  if (!address) {
    const envKey = CONTRACT_ENV_KEYS[name] || name;
    throw new Error(`缺少合约地址：${name}，请配置 ${envKey}`);
  }
  return address;
}

export function isContractConfigReady(names) {
  return names.every((name) => Boolean(AKN_CONTRACTS[name]));
}

export function getContractConfigMissingKeys(names) {
  return names
    .filter((name) => !AKN_CONTRACTS[name])
    .map((name) => CONTRACT_ENV_KEYS[name] || name);
}
