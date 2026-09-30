import { isAddress } from "viem";
import { getBalance, readContract, waitForTransactionReceipt, writeContract } from "wagmi/actions";
import presaleAbi from "../../对接文档/Presale.json";
import networkAbi from "../../对接文档/Network.json";
import usdtAbi from "../../对接文档/MockUSDT.json";
import { AKN_CHAIN_ID, assertContractAddress } from "../config/aknRuntime";
import { wagmiConfig } from "../web3/wagmiConfig";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const PACKAGE_ID_MIN = 1;
const PACKAGE_ID_MAX = 4;

function ensureAccount(account) {
  if (!account) throw new Error("请先连接钱包");
  return account;
}

export function isUsableAddress(value) {
  return isAddress(value) && value.toLowerCase() !== ZERO_ADDRESS;
}

async function read({ address, abi, functionName, args = [], account }) {
  return readContract(wagmiConfig, {
    chainId: AKN_CHAIN_ID,
    address,
    abi,
    functionName,
    args,
    ...(account ? { account } : {}),
  });
}

async function send({ account, address, abi, functionName, args = [] }) {
  const hash = await writeContract(wagmiConfig, {
    chainId: AKN_CHAIN_ID,
    account: ensureAccount(account),
    address,
    abi,
    functionName,
    args,
  });
  const receipt = await waitForTransactionReceipt(wagmiConfig, {
    chainId: AKN_CHAIN_ID,
    hash,
  });
  return { hash, receipt };
}

function normalizeOrder(order) {
  return {
    orderId: order.orderId,
    principal: order.principal,
    packageId: Number(order.packageId),
    receiver: order.receiver,
    createdAt: Number(order.createdAt),
    accruedReward: order.accruedReward,
    nextAccrualAt: Number(order.nextAccrualAt),
  };
}

export async function readNativeBalance(account) {
  return getBalance(wagmiConfig, {
    address: account,
    chainId: AKN_CHAIN_ID,
  });
}

export async function readPresaleStatus() {
  const presale = assertContractAddress("presale");
  const [usdt, startsAt, closed] = await Promise.all([
    read({ address: presale, abi: presaleAbi, functionName: "USDT" }),
    read({ address: presale, abi: presaleAbi, functionName: "startsAt" }),
    read({ address: presale, abi: presaleAbi, functionName: "closed" }),
  ]);
  if (!isUsableAddress(usdt)) throw new Error("预售未绑定 USDT");
  const decimals = Number(await read({ address: usdt, abi: usdtAbi, functionName: "decimals" }));
  return {
    usdt,
    decimals,
    startsAt: Number(startsAt),
    closed: Boolean(closed),
  };
}

export async function readTokenBalance(token, account) {
  return read({ address: token, abi: usdtAbi, functionName: "balanceOf", args: [account] });
}

export async function readUsdtAllowance(token, owner, spender) {
  return read({
    address: token,
    abi: usdtAbi,
    functionName: "allowance",
    args: [owner, spender],
  });
}

export async function approveUsdt(account, token, spender, amount) {
  return send({
    account,
    address: token,
    abi: usdtAbi,
    functionName: "approve",
    args: [spender, amount],
  });
}

export async function readReceiverState() {
  const presale = assertContractAddress("presale");
  const [count, cap, index] = await Promise.all([
    read({ address: presale, abi: presaleAbi, functionName: "receiverCount" }),
    read({ address: presale, abi: presaleAbi, functionName: "RECEIVER_CAP" }),
    read({ address: presale, abi: presaleAbi, functionName: "currentReceiverIndex" }),
  ]);
  const total = Number(count);
  const receivers = await Promise.all(
    Array.from({ length: total }, (_, receiverIndex) => Promise.all([
      read({ address: presale, abi: presaleAbi, functionName: "receivers", args: [BigInt(receiverIndex)] }),
      read({ address: presale, abi: presaleAbi, functionName: "receivedByReceiver", args: [BigInt(receiverIndex)] }),
    ])),
  );

  return {
    cap,
    index: Number(index),
    receivers: receivers.map(([address, received]) => ({ address, received })),
  };
}

export async function readLastInvestment(account) {
  const presale = assertContractAddress("presale");
  return read({
    address: presale,
    abi: presaleAbi,
    functionName: "lastInvestmentOf",
    args: [account],
  });
}

export async function readTotalInvestment(account) {
  const presale = assertContractAddress("presale");
  return read({
    address: presale,
    abi: presaleAbi,
    functionName: "totalInvestmentOf",
    args: [account],
  });
}

export async function readUserOrders(account) {
  const presale = assertContractAddress("presale");
  const [count, pageSize] = await Promise.all([
    read({ address: presale, abi: presaleAbi, functionName: "memberOrderCount", args: [account] }),
    read({ address: presale, abi: presaleAbi, functionName: "ORDER_PAGE_SIZE" }),
  ]);
  const total = Number(count);
  const size = Number(pageSize);
  const pageCount = Math.ceil(total / size);
  const pages = await Promise.all(
    Array.from({ length: pageCount }, (_, index) => read({
      address: presale,
      abi: presaleAbi,
      functionName: "getMemberOrders",
      args: [BigInt(index + 1)],
      account,
    })),
  );

  return pages.flatMap((page) => page[1].map(normalizeOrder));
}

export async function investPresale(account, packageId, amount) {
  const member = ensureAccount(account);
  if (!Number.isInteger(packageId) || packageId < PACKAGE_ID_MIN || packageId > PACKAGE_ID_MAX) {
    throw new Error("请选择有效套餐");
  }

  const presale = assertContractAddress("presale");
  const network = assertContractAddress("network");
  const [usdt, startsAt, closed, registered, lastInvestment] = await Promise.all([
    read({ address: presale, abi: presaleAbi, functionName: "USDT" }),
    read({ address: presale, abi: presaleAbi, functionName: "startsAt" }),
    read({ address: presale, abi: presaleAbi, functionName: "closed" }),
    read({ address: network, abi: networkAbi, functionName: "isRegistered", args: [member] }),
    read({ address: presale, abi: presaleAbi, functionName: "lastInvestmentOf", args: [member] }),
  ]);
  if (!isUsableAddress(usdt)) throw new Error("预售未绑定 USDT");
  if (closed) throw new Error("预售已关闭");
  if (BigInt(Math.floor(Date.now() / 1000)) < startsAt) throw new Error("预售尚未开始");
  if (!registered) throw new Error("请先完成推荐关系注册");
  if (amount < lastInvestment) throw new Error("复投金额不得低于上一笔入金");

  const [balance, allowance] = await Promise.all([
    read({ address: usdt, abi: usdtAbi, functionName: "balanceOf", args: [member] }),
    read({ address: usdt, abi: usdtAbi, functionName: "allowance", args: [member, presale] }),
  ]);
  if (balance < amount) throw new Error("USDT 余额不足");
  if (allowance < amount) await approveUsdt(member, usdt, presale, amount);

  return send({
    account: member,
    address: presale,
    abi: presaleAbi,
    functionName: "invest",
    args: [amount, packageId],
  });
}

export async function readNetworkProfile(account) {
  const network = assertContractAddress("network");
  const [registered, referrer, directCount, activeDirectCount] = await Promise.all([
    read({ address: network, abi: networkAbi, functionName: "isRegistered", args: [account] }),
    read({ address: network, abi: networkAbi, functionName: "referrerOf", args: [account] }),
    read({ address: network, abi: networkAbi, functionName: "directCount", args: [account] }),
    read({ address: network, abi: networkAbi, functionName: "activeDirectCount", args: [account] }),
  ]);

  return {
    registered: Boolean(registered),
    referrer,
    directCount: Number(directCount),
    activeDirectCount: Number(activeDirectCount),
  };
}


export async function registerMember(account, referrer) {
  const network = assertContractAddress("network");
  return send({
    account,
    address: network,
    abi: networkAbi,
    functionName: "register",
    args: [referrer],
  });
}
