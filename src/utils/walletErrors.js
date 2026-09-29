import { AKN_CHAIN } from "../config/aknRuntime";
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
    return message;
  }

  const text = collectErrorParts(error).join(" ").toLowerCase();

  if (includesAny(text, ["-32002", "already pending", "wallet_requestpermissions"])) {
    return "已有钱包授权请求待确认，请先在钱包中处理";
  }
  if (includesAny(text, ["4001", "action_rejected", "userrejected", "user rejected", "user denied", "request rejected", "rejected by user", "cancelled by user", "canceled by user"])) {
    return "已取消钱包请求";
  }
  if (includesAny(text, ["insufficient funds", "insufficient balance", "not enough funds", "exceeds balance", "fee exceeds", "balance too low", "gas required exceeds allowance"])) {
    return "余额不足以支付 Gas 或代币";
  }
  if (includesAny(text, ["wrong chain", "switch chain", "unsupported chain", "chain mismatch", "unrecognized chain"])) {
    return `请切换到 ${AKN_CHAIN.name}`;
  }
  if (includesAny(text, ["no_provider", "provider not found", "connector not found", "no wallet connector", "wallet not found", "暂无可用钱包"])) {
    return "未检测到可用钱包";
  }
  if (includesAny(text, ["wallet_timeout", "wallet connection timeout", "wallet switch chain timeout"])) {
    return "钱包响应超时，请重试";
  }
  if (includesAny(text, ["execution reverted", "estimate gas", "estimategas", "cannot estimate", "missing revert data", "call exception", "contract function reverted"])) {
    const reason = error?.shortMessage || error?.cause?.shortMessage;
    return reason ? `合约执行失败：${reason}` : "合约执行失败";
  }
  if (includesAny(text, ["network error", "fetch failed", "failed to fetch", "timeout", "http request failed"])) {
    return "网络请求失败，请稍后重试";
  }

  return message || "操作失败";
}
