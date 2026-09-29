import { AKN_CHAIN } from "../config/aknRuntime";
import { getActiveLocale } from "../i18n/locale";

function text(zh, en) {
  return getActiveLocale() === "en" ? en : zh;
}

function localizeKnown(message) {
  if (getActiveLocale() !== "en") return message;
  const exact = {
    "请先连接钱包": "Connect your wallet first",
    "预售未绑定 USDT": "Presale USDT is not configured",
    "请选择有效套餐": "Select a valid package",
    "预售已关闭": "Presale is closed",
    "预售尚未开始": "Presale has not started",
    "请先完成推荐关系注册": "Bind a referrer before joining",
    "复投金额不得低于上一笔入金": "Reinvestment must be at least the previous amount",
    "USDT 余额不足": "Insufficient USDT balance",
    "请输入正确的推荐人地址（0x + 40 位）": "Enter a valid referrer address (0x + 40 hex characters)",
    "不能绑定自己的地址": "You cannot bind your own address",
  };
  if (exact[message]) return exact[message];
  const missing = message.match(/^缺少合约地址：(.+)，请配置 (.+)$/);
  if (missing) return `Missing contract address: ${missing[1]}. Configure ${missing[2]}`;
  return message;
}
function collectErrorParts(error, depth = 0) {
  if (!error || depth > 3) return [];
  if (typeof error === "string") return [error];
  if (typeof error !== "object") return [String(error)];

  const fields = [
    error.name,
    error.code,
    error.message,
    error.shortMessage,
    error.details,
    error.reason,
    error.data?.message,
    error.cause?.message,
    error.cause?.shortMessage,
    error.cause?.details,
    error.cause?.code,
  ];

  return [
    ...fields.filter((value) => value !== undefined && value !== null && value !== ""),
    ...collectErrorParts(error.cause, depth + 1),
  ];
}

function includesAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

export function getActionErrorMessage(error) {
  const message = typeof error?.message === "string" ? error.message : "";
  if (message.startsWith("缺少合约地址") || message.startsWith("请先连接钱包") || message.startsWith("请")) {
    return localizeKnown(message);
  }

  const text = collectErrorParts(error).join(" ").toLowerCase();

  if (includesAny(text, ["-32002", "already pending", "wallet_requestpermissions"])) {
    return text("已有钱包授权请求待确认，请先在钱包中处理", "A wallet request is already pending. Confirm it in your wallet");
  }
  if (includesAny(text, ["4001", "action_rejected", "userrejected", "user rejected", "user denied", "request rejected", "rejected by user", "cancelled by user", "canceled by user"])) {
    return text("已取消钱包请求", "Wallet request cancelled");
  }
  if (includesAny(text, ["insufficient funds", "insufficient balance", "not enough funds", "exceeds balance", "fee exceeds", "balance too low", "gas required exceeds allowance"])) {
    return text("余额不足以支付 Gas 或代币", "Balance is too low for gas or tokens");
  }
  if (includesAny(text, ["wrong chain", "switch chain", "unsupported chain", "chain mismatch", "unrecognized chain"])) {
    return text(`请切换到 ${AKN_CHAIN.name}`, `Switch to ${AKN_CHAIN.name}`);
  }
  if (includesAny(text, ["no_provider", "provider not found", "connector not found", "no wallet connector", "wallet not found", "暂无可用钱包"])) {
    return text("未检测到可用钱包", "No wallet detected");
  }
  if (includesAny(text, ["wallet_timeout", "wallet connection timeout", "wallet switch chain timeout"])) {
    return text("钱包响应超时，请重试", "Wallet timed out. Try again");
  }
  if (includesAny(text, ["execution reverted", "estimate gas", "estimategas", "cannot estimate", "missing revert data", "call exception", "contract function reverted"])) {
    const reason = error?.shortMessage || error?.cause?.shortMessage;
    return reason ? text(`合约执行失败：${reason}`, `Contract execution failed: ${reason}`) : text("合约执行失败", "Contract execution failed");
  }
  if (includesAny(text, ["network error", "fetch failed", "failed to fetch", "timeout", "http request failed"])) {
    return text("网络请求失败，请稍后重试", "Network request failed. Try again later");
  }

  return localizeKnown(message) || text("操作失败", "Action failed");
}
