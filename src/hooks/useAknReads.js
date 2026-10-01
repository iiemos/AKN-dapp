import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isContractConfigReady } from "../config/aknRuntime";
import {
  isUsableAddress,
  readLastInvestment,
  readNativeBalance,
  readNetworkProfile,
  readPresaleStatus,
  readReceiverState,
  readTokenBalance,
  readDirectMemberPage,
  readTotalInvestment,
  readUserOrders,
} from "../services/aknContracts";

export function usePresaleStatus() {
  return useQuery({
    queryKey: ["akn", "presale", "status"],
    enabled: isContractConfigReady(["presale"]),
    queryFn: readPresaleStatus,
  });
}

export function useUsdtBalance(address) {
  const status = usePresaleStatus();
  const token = status.data?.usdt;
  return useQuery({
    queryKey: ["akn", "usdt", "balance", token, address],
    enabled: Boolean(address) && isUsableAddress(token),
    queryFn: () => readTokenBalance(token, address),
  });
}

export function useNativeBalance(address) {
  return useQuery({
    queryKey: ["akn", "native", address],
    enabled: Boolean(address),
    queryFn: () => readNativeBalance(address),
  });
}

export function useReceiverState() {
  return useQuery({
    queryKey: ["akn", "receivers"],
    enabled: isContractConfigReady(["presale"]),
    queryFn: readReceiverState,
  });
}

export function useUserOrders(address) {
  return useQuery({
    queryKey: ["akn", "orders", address],
    enabled: Boolean(address) && isContractConfigReady(["presale"]),
    queryFn: () => readUserOrders(address),
  });
}

export function useLastInvestment(address) {
  return useQuery({
    queryKey: ["akn", "last-investment", address],
    enabled: Boolean(address) && isContractConfigReady(["presale"]),
    queryFn: () => readLastInvestment(address),
  });
}

export function useTotalInvestment(address) {
  return useQuery({
    queryKey: ["akn", "total-investment", address],
    enabled: Boolean(address) && isContractConfigReady(["presale"]),
    queryFn: () => readTotalInvestment(address),
  });
}

export function useNetworkProfile(address) {
  return useQuery({
    queryKey: ["akn", "network", address],
    enabled: Boolean(address) && isContractConfigReady(["network"]),
    queryFn: () => readNetworkProfile(address),
  });
}

export function useDirectMemberPage(address, mode, page, pageSize) {
  return useQuery({
    queryKey: ["akn", "directs", address, mode, page, pageSize],
    enabled: Boolean(address) && isContractConfigReady(["network"]),
    queryFn: () => readDirectMemberPage(address, mode, page, pageSize),
  });
}


export function useInvalidateAkn() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: ["akn"] });
}
