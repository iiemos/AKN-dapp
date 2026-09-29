import { createConfig, http } from "wagmi";
import { bsc, bscTestnet } from "wagmi/chains";
import { coinbaseWallet, injected, walletConnect } from "wagmi/connectors";
import { AKN_CHAIN } from "../config/aknRuntime";

const chains = AKN_CHAIN.id === bsc.id ? [bsc, bscTestnet] : [bscTestnet, bsc];
const bscRpcUrl = import.meta.env.VITE_BSC_RPC_URL || "https://bsc-dataseed.binance.org";
const bscTestnetRpcUrl = import.meta.env.VITE_BSC_TESTNET_RPC_URL || "https://bsc-testnet.publicnode.com";
const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
const appName = "AKN";
const rpcBatchWait = 16;
const rpcRetryCount = 1;
const appUrl = typeof window === "undefined" ? "https://akn.io" : window.location.origin;
const metadata = {
  name: appName,
  description: "AKN 源律",
  url: appUrl,
  icons: [`${appUrl}/favicon.png`],
};
const asyncInjectTimeout = 2_000;

function getInjectedProviders(windowObject) {
  const ethereum = windowObject?.ethereum;
  return [
    windowObject?.tokenpocket?.ethereum,
    windowObject?.tp?.ethereum,
    ethereum,
    ...(Array.isArray(ethereum?.providers) ? ethereum.providers : []),
  ].filter((provider, index, list) => provider && typeof provider.request === "function" && list.indexOf(provider) === index);
}

function isTokenPocketRuntime() {
  if (typeof window === "undefined") return false;

  const userAgent = window.navigator?.userAgent?.toLowerCase() || "";
  const providers = getInjectedProviders(window);

  return userAgent.includes("tokenpocket")
    || Boolean(window.tokenpocket || window.tp)
    || providers.some((provider) => provider.isTokenPocket || provider.isTokenPocketEthereum || provider.isTp);
}

function getTokenPocketProvider(windowObject) {
  const providers = getInjectedProviders(windowObject);
  return providers.find((provider) => provider.isTokenPocket || provider.isTokenPocketEthereum || provider.isTp) || providers[0];
}

const injectedConnectors = isTokenPocketRuntime()
  ? [
      injected({
        target: {
          id: "tokenPocket",
          name: "TokenPocket",
          provider: getTokenPocketProvider,
        },
        shimDisconnect: true,
        unstable_shimAsyncInject: asyncInjectTimeout,
      }),
    ]
  : [
      injected({ target: "metaMask", shimDisconnect: true, unstable_shimAsyncInject: asyncInjectTimeout }),
      injected({ shimDisconnect: true, unstable_shimAsyncInject: asyncInjectTimeout }),
    ];

const connectors = [
  ...injectedConnectors,
  coinbaseWallet({ appName }),
  ...(walletConnectProjectId
    ? [walletConnect({ projectId: walletConnectProjectId, metadata, showQrModal: true })]
    : []),
];

export const wagmiConfig = createConfig({
  chains,
  connectors,
  batch: {
    [bsc.id]: { multicall: { wait: rpcBatchWait } },
    [bscTestnet.id]: { multicall: { wait: rpcBatchWait } },
  },
  transports: {
    [bsc.id]: http(bscRpcUrl, { batch: { wait: rpcBatchWait }, retryCount: rpcRetryCount }),
    [bscTestnet.id]: http(bscTestnetRpcUrl, { batch: { wait: rpcBatchWait }, retryCount: rpcRetryCount }),
  },
});
