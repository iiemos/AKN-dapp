import { useNavigate } from "react-router-dom";
import icon from "../../assets/icon.png";
import { AKN_CHAIN } from "../config/aknRuntime";
import { useNativeBalance, useNetworkProfile, usePresaleStatus, useReceiverState, useTotalInvestment, useUserOrders } from "../hooks/useAknReads";
import { useWalletConnector } from "../hooks/useWalletConnector";
import { formatToken, formatTokenInteger } from "../utils/formatters";
import { getActionErrorMessage } from "../utils/walletErrors";
import { useI18n } from "../i18n/locale";

export default function MePage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const wallet = useWalletConnector();
  const ordersQuery = useUserOrders(wallet.currentAddress);
  const profileQuery = useNetworkProfile(wallet.currentAddress);
  const nativeQuery = useNativeBalance(wallet.currentAddress);
  const statusQuery = usePresaleStatus();
  const investedQuery = useTotalInvestment(wallet.currentAddress);
  const receiverQuery = useReceiverState();
  const decimals = statusQuery.data?.decimals;
  const orders = ordersQuery.data;
  const profile = profileQuery.data;
  const investedText = wallet.isConnected && investedQuery.data !== undefined && decimals !== undefined
    ? formatTokenInteger(investedQuery.data, decimals)
    : "--";
  const currentReceiver = receiverQuery.data?.receivers?.[receiverQuery.data.index];
  const receiverCaption = currentReceiver?.address || "--";

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
        <div className="mini"><div className="l">{t("预售订单", "Presale orders")}</div><div className="v">{orders ? t(`${orders.length} 笔`, `${orders.length} orders`) : "--"}</div></div>
        <div className="mini"><div className="l">{t("直推人数", "Direct referrals")}</div><div className="v">{profile ? profile.directCount : "--"}</div></div>
        <div className="mini"><div className="l">{t("可享代数", "Reward levels")}</div><div className="v">--</div></div>
      </div>
      {profileQuery.error || statusQuery.error || investedQuery.error || ordersQuery.error || receiverQuery.error ? (
        <div className="empty">{getActionErrorMessage(profileQuery.error || statusQuery.error || investedQuery.error || ordersQuery.error || receiverQuery.error)}</div>
      ) : null}

      <div className="card">
        <h3><span className="bar" />{t("订单与资产", "Orders and assets")}</h3>
        <div className="lrow" onClick={() => navigate("/invest")}>
          <div className="lrow-txt"><div className="lrow-label">{t("我的订单", "My orders")}</div><div className="lrow-sub">{t("查看预售订单与收款进度", "View presale orders and deposit progress")}</div></div>
          <span className="lrow-ic"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M8 2v4M16 2v4" /></svg></span>
        </div>
        <div className="lrow">
          <div className="lrow-txt"><div className="lrow-label">{t("当前收款地址", "Current deposit address")}</div><div className="lrow-sub" style={{ wordBreak: "break-all" }}>{receiverCaption}</div></div>
          <span className="lrow-ic"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg></span>
        </div>
        <div className="lrow">
          <div className="lrow-txt"><div className="lrow-label">{t("赎回说明", "Redemption")}</div><div className="lrow-sub">{t("保险池可随时赎回，赎回后订单结束", "The insurance pool can be redeemed at any time. Redeeming ends the order.")}</div></div>
          <span className="lrow-ic"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg></span>
        </div>
      </div>

      <div className="card">
        <h3><span className="bar" />{t("网络与支持", "Network and support")}</h3>
        <div className="lrow">
          <div className="lrow-txt"><div className="lrow-label">{t("网络设置", "Network")}</div><div className="lrow-sub">{AKN_CHAIN.name} · BEP20</div></div>
          <span className="lrow-ic"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" /></svg></span>
        </div>
        <div className="lrow">
          <div className="lrow-txt"><div className="lrow-label">{t("帮助中心", "Help")}</div><div className="lrow-sub">xxxx@xxxx.com</div></div>
          <span className="lrow-ic"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="12" cy="12" r="10" /><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></svg></span>
        </div>
        <div className="lrow">
          <div className="lrow-txt"><div className="lrow-label">{t("关于 AKN", "About AKN")}</div><div className="lrow-sub">{t("源律机制 · 源于代码，律于共识", "AKN · Code is the source. Consensus is the rule.")}</div></div>
          <span className="lrow-ic"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg></span>
        </div>
      </div>

    </section>
  );
}
