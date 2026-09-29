import { formatUnits } from "viem";

export function shortAddress(value) {
  if (!value) return "";
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export function formatFixed(value, digits = 2) {
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatInteger(value) {
  return Math.floor(Number(value)).toLocaleString("en-US");
}

export function formatToken(value, decimals = 18, digits = 2) {
  const numeric = Number(formatUnits(value, decimals));
  if (!Number.isFinite(numeric)) return "0";
  return formatFixed(numeric, digits);
}

export function formatTokenInteger(value, decimals = 18) {
  const numeric = Number(formatUnits(value, decimals));
  if (!Number.isFinite(numeric)) return "0";
  return formatInteger(numeric);
}

export function tokenToNumber(value, decimals = 18) {
  const numeric = Number(formatUnits(value, decimals));
  return Number.isFinite(numeric) ? numeric : 0;
}
