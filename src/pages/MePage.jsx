import { useEffect, useState } from "react";
import icon from "../../assets/icon.png";
import { AKN_CHAIN } from "../config/aknRuntime";
import { PACKAGES } from "../data/packages";
import { useNativeBalance, useNetworkProfile, usePresaleStatus, useTotalInvestment, useUserOrders } from "../hooks/useAknReads";
import { useWalletConnector } from "../hooks/useWalletConnector";
import { formatToken, formatTokenInteger } from "../utils/formatters";
import { getActionErrorMessage } from "../utils/walletErrors";
import { PACKAGE_EN, useI18n } from "../i18n/locale";

const ORDER_PAGE_SIZE = 10;

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}

function formatDistance(targetSeconds, nowMs, t) {
  if (!targetSeconds) return "--";
  const delta = Math.max(0, targetSeconds * 1000 - nowMs);
  const hours = Math.floor(delta / 3600000);
  const minutes = Math.floor(delta / 60000) % 60;
  return t(`${hours} 时 ${minutes} 分`, `${hours}h ${minutes}m`);
}

export default function MePage() {
  const { t, locale } = useI18n();
  const now = useNow();
  const wallet = useWalletConnector();
  const [page, setPage] = useState(0);
  const ordersQuery = useUserOrders(wallet.currentAddress);
  const profileQuery = useNetworkProfile(wallet.currentAddress);
  const nativeQuery = useNativeBalance(wallet.currentAddress);
  const statusQuery = usePresaleStatus();
  const investedQuery = useTotalInvestment(wallet.currentAddress);
  const decimals = statusQuery.data?.decimals;
  const orders = ordersQuery.data || [];
  const profile = profileQuery.data;
  const pageCount = Math.max(1, Math.ceil(orders.length / ORDER_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visibleOrders = orders.slice(currentPage * ORDER_PAGE_SIZE, currentPage * ORDER_PAGE_SIZE + ORDER_PAGE_SIZE);
  const investedText = wallet.isConnected && investedQuery.data !== undefined && decimals !== undefined
    ? formatTokenInteger(investedQuery.data, decimals)
    : "--";

  useEffect(() => {
    setPage(0);
  }, [wallet.currentAddress]);

  return (
    <section className="view active">
      <div className="card member-card" style={{ marginTop: 16 }}>
        <div className="profile">
          <img src={icon} alt="" />
          <div className="pn">
            <div style={{ fontSize: 16, fontWeight: 500 }}>{t("AKN 会员", "AKN Member")}</div>
            <div className="ad">{wallet.isConnected ? wallet.shortAddress : t("未连接钱包", "Wallet not connected")}</div>
            <div className="tags">
              <span className={`badge ${profile?.registered ? "badge-gold" : "badge-gray"}`}>{profile?.registered ? t("已注册", "Registered") : t("未注册", "Unregistered")}</span>
              <span className="badge badge-blue">{AKN_CHAIN.name}</span>
            </div>
          </div>
        </div>
        <div className="member-bnb">
          <span>{t("BNB 余额", "BNB balance")}</span>
          <span>{nativeQuery.data ? `${formatToken(nativeQuery.data.value, nativeQuery.data.decimals, 4)} ${nativeQuery.data.symbol}` : "--"}</span>
        </div>
      </div>

      <div className="mini-grid">
        <div className="mini"><div className="l">{t("累计投入 (USDT)", "Total invested (USDT)")}</div><div className="v">{investedText}</div></div>
        <div className="mini"><div className="l">{t("预售订单", "Presale orders")}</div><div className="v">{ordersQuery.data ? t(`${orders.length} 笔`, `${orders.length} orders`) : "--"}</div></div>
        <div className="mini"><div className="l">{t("直推人数", "Direct referrals")}</div><div className="v">{profile ? profile.directCount : "--"}</div></div>
        <div className="mini"><div className="l">{t("可享代数", "Reward levels")}</div><div className="v">--</div></div>
      </div>
      {profileQuery.error || statusQuery.error || investedQuery.error ? (
        <div className="empty">{getActionErrorMessage(profileQuery.error || statusQuery.error || investedQuery.error)}</div>
      ) : null}

      <div className="sec-title"><span className="bar" />{t("我的订单", "My orders")}</div>
      <div>
        {ordersQuery.error ? <div className="empty">{getActionErrorMessage(ordersQuery.error)}</div>
        : !wallet.isConnected ? <div className="empty">{t("连接钱包后查看预售订单。", "Connect a wallet to view presale orders.")}</div>
        : !orders.length ? <div className="empty">{t("暂无预售订单。", "No presale orders yet.")}</div>
        : (
          <>
            {visibleOrders.map((order) => {
              const item = PACKAGES[order.packageId - 1];
              return (
                <div className="order" key={String(order.orderId)}>
                  <div className="order-top">
                    <span className="amt">{decimals === undefined ? "--" : `${formatTokenInteger(order.principal, decimals)} USDT`}</span>
                    <span className="badge badge-gold">{item ? t(item.tag, PACKAGE_EN[item.tag] || item.tag) : t(`套餐 ${order.packageId}`, `Package ${order.packageId}`)}</span>
                    <span className="badge badge-blue">{t("预售 1%/日", "Presale 1%/day")}</span>
                  </div>
                  <div className="order-grid">
                    <div className="og"><div className="l">{t("累计收益", "Accrued")}</div><div className="v gold-text">{decimals === undefined ? "--" : formatToken(order.accruedReward, decimals)}</div></div>
                    <div className="og"><div className="l">{t("距下次结算", "Next settlement")}</div><div className="v">{formatDistance(order.nextAccrualAt, now, t)}</div></div>
                    <div className="og"><div className="l">{t("下单时间", "Time")}</div><div className="v" style={{ fontSize: 11.5 }}>{new Date(order.createdAt * 1000).toLocaleString(locale === "en" ? "en-US" : "zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</div></div>
                  </div>
                </div>
              );
            })}
            {orders.length > ORDER_PAGE_SIZE ? (
              <div className="order-pager">
                <button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>{t("上一页", "Prev")}</button>
                <span>{currentPage + 1}/{pageCount}</span>
                <button type="button" disabled={currentPage >= pageCount - 1} onClick={() => setPage(currentPage + 1)}>{t("下一页", "Next")}</button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
