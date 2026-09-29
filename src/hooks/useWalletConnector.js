import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { AKN_CHAIN_ID } from "../config/aknRuntime";
import { shortAddress } from "../utils/formatters";

const CONNECT_TIMEOUT_MS = 30_000;
const CONNECT_SETTLE_MS = 6_000;
const RECONNECT_VISIBLE_MS = 4_500;
const SWITCH_TIMEOUT_MS = 12_000;

function createNoProviderError() {
  const error = new Error("暂无可用钱包连接方式");
  error.code = "NO_PROVIDER";
  return error;
}

function createWalletTimeoutError(message) {
  const error = new Error(message);
  error.code = "WALLET_TIMEOUT";
  return error;
}

function withTimeout(promise, timeoutMs, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = window.setTimeout(() => reject(createWalletTimeoutError(message)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timer));
}

function getConnectedAccount(result) {
  const connectedAccount = result?.accounts?.[0];
  if (typeof connectedAccount === "string") return connectedAccount;
  if (connectedAccount?.address) return connectedAccount.address;
  return "";
}

function isUserRejectedError(error) {
  const text = `${error?.code || ""} ${error?.message || ""} ${error?.shortMessage || ""}`.toLowerCase();
  return text.includes("4001") || text.includes("user rejected") || text.includes("user denied") || text.includes("request rejected");
}

function isInjectedConnector(connector) {
  const key = `${connector?.id || ""} ${connector?.type || ""} ${connector?.name || ""}`.toLowerCase();
  return key.includes("injected") || key.includes("metamask") || key.includes("tokenpocket") || key.includes("browser wallet");
}

function getBrowserProviders() {
  if (typeof window === "undefined") return [];
  const ethereum = window.ethereum;
  return [
    window.tokenpocket?.ethereum,
    window.tp?.ethereum,
    ethereum,
    ...(Array.isArray(ethereum?.providers) ? ethereum.providers : []),
  ].filter((provider, index, list) => provider && typeof provider.request === "function" && list.indexOf(provider) === index);
}

async function getConnectorProvider(connector) {
  if (typeof connector?.getProvider !== "function") return getBrowserProviders()[0];
  return Promise.resolve(connector.getProvider()).catch(() => getBrowserProviders()[0]);
}

async function requestInjectedAccount(connector) {
  const provider = await getConnectorProvider(connector);
  if (!provider) throw createNoProviderError();
  const accounts = await withTimeout(
    provider.request({ method: "eth_requestAccounts" }),
    CONNECT_TIMEOUT_MS,
    "Wallet connection timeout",
  );
  return Array.isArray(accounts) && accounts[0] ? accounts[0] : "";
}

export function useWalletConnector() {
  const account = useAccount();
  const {
    connectors,
    connectAsync,
    isPending: connectPending,
    variables: connectVariables,
    reset: resetConnect,
  } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const { switchChainAsync, isPending: switchPending, reset: resetSwitchChain } = useSwitchChain();
  const latestAddressRef = useRef(account.address || "");
  const [connectTimedOut, setConnectTimedOut] = useState(false);
  const [reconnectTimedOut, setReconnectTimedOut] = useState(false);
  const [switchTimedOut, setSwitchTimedOut] = useState(false);

  const currentAddress = account.address || "";
  const isConnected = account.isConnected && Boolean(currentAddress);
  const isWrongChain = isConnected && account.chainId !== AKN_CHAIN_ID;
  const connectBusy = connectPending || account.status === "connecting";
  const reconnectBusy = account.status === "reconnecting";
  const isConnecting = (connectBusy && !connectTimedOut) || (reconnectBusy && !reconnectTimedOut);
  const isSwitching = switchPending && !switchTimedOut;

  useEffect(() => {
    if (!connectBusy) {
      setConnectTimedOut(false);
      return undefined;
    }
    const timer = window.setTimeout(() => {
      setConnectTimedOut(true);
      resetConnect?.();
    }, CONNECT_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [connectBusy, resetConnect]);

  useEffect(() => {
    if (!reconnectBusy) {
      setReconnectTimedOut(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setReconnectTimedOut(true), RECONNECT_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [reconnectBusy]);

  useEffect(() => {
    if (!switchPending) {
      setSwitchTimedOut(false);
      return undefined;
    }
    const timer = window.setTimeout(() => {
      setSwitchTimedOut(true);
      resetSwitchChain?.();
    }, SWITCH_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [resetSwitchChain, switchPending]);

  useEffect(() => {
    latestAddressRef.current = currentAddress;
  }, [currentAddress]);

  const waitForConnectedAddress = useCallback(async (timeoutMs = 20_000) => {
    if (typeof window === "undefined") return "";
    if (latestAddressRef.current) return latestAddressRef.current;
    return new Promise((resolve) => {
      const startedAt = Date.now();
      const timer = window.setInterval(() => {
        const current = latestAddressRef.current;
        if (current) {
          window.clearInterval(timer);
          resolve(current);
          return;
        }
        if (Date.now() - startedAt >= timeoutMs) {
          window.clearInterval(timer);
          resolve("");
        }
      }, 200);
    });
  }, []);

  async function connectWithWagmi(targetConnector) {
    const result = await withTimeout(
      connectAsync({ connector: targetConnector, chainId: AKN_CHAIN_ID }),
      CONNECT_TIMEOUT_MS,
      "Wallet connection timeout",
    ).catch((error) => {
      if (error?.code === "WALLET_TIMEOUT") resetConnect?.();
      throw error;
    });
    return getConnectedAccount(result);
  }

  async function connectWallet(connector) {
    if (isConnected && currentAddress) return currentAddress;
    const targetConnector = connector || connectors[0];
    if (!targetConnector) throw createNoProviderError();

    setConnectTimedOut(false);
    try {
      const connectedAccount = await connectWithWagmi(targetConnector);
      if (connectedAccount) return connectedAccount;
    } catch (error) {
      if (isUserRejectedError(error) || !isInjectedConnector(targetConnector)) throw error;
      await requestInjectedAccount(targetConnector);
      const syncedAccount = await waitForConnectedAddress(CONNECT_SETTLE_MS);
      if (syncedAccount) return syncedAccount;
      const connectedAccount = await connectWithWagmi(targetConnector);
      if (connectedAccount) return connectedAccount;
      throw error;
    }

    const settledAccount = await waitForConnectedAddress(CONNECT_SETTLE_MS);
    if (settledAccount) return settledAccount;
    throw createWalletTimeoutError("Wallet connection timeout");
  }

  async function ensureCorrectChain() {
    if (isConnected && account.chainId !== AKN_CHAIN_ID) {
      setSwitchTimedOut(false);
      await withTimeout(
        switchChainAsync({ chainId: AKN_CHAIN_ID }),
        SWITCH_TIMEOUT_MS,
        "Wallet switch chain timeout",
      ).catch((error) => {
        if (error?.code === "WALLET_TIMEOUT") resetSwitchChain?.();
        throw error;
      });
    }
  }

  async function disconnectWallet() {
    try {
      await disconnectAsync(account.connector ? { connector: account.connector } : undefined);
      latestAddressRef.current = "";
    } catch (error) {
      latestAddressRef.current = account.address || "";
      throw error;
    }
  }

  return {
    currentAddress,
    shortAddress: shortAddress(currentAddress),
    isConnected,
    isWrongChain,
    isConnecting,
    isSwitching,
    connectors,
    connectingConnectorUid: connectVariables?.connector?.uid || "",
    connectWallet,
    disconnectWallet,
    ensureCorrectChain,
    connectorName: account.connector?.name || "",
    chainId: account.chainId,
  };
}
