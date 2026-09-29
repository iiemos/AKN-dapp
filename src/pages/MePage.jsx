import { useNavigate } from "react-router-dom";
import icon from "../../assets/icon.png";
import { AKN_CHAIN } from "../config/aknRuntime";
import { useNativeBalance, useNetworkProfile, usePresaleStatus, useReceiverState, useTotalInvestment, useUserOrders } from "../hooks/useAknReads";
import { useWalletConnector } from "../hooks/useWalletConnector";
import { formatToken, formatTokenInteger } from "../utils/formatters";
import { getActionErrorMessage } from "../utils/walletErrors";
import { useToast } from "../components/Toast";

export default function MePage() {
  const navigate = useNavigate();
  const toast = useToast();
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

  async function onDisconnect() {
    try {
      await wallet.disconnectWallet();
      toast("钱包已断开");
    } catch (error) {
      toast(getActionErrorMessage(error), "err");
    }
  }

  return (
    <section className="view active">
      <div className="card member-card" style={{ marginTop: 16 }}>
        <div className="profile">
          <img src={icon} alt="" />
          <div className="pn">
            <div style={{ fontSize: 16, fontWeight: 500 }}>AKN 会员</div>
            <div className="ad">{wallet.isConnected ? wallet.shortAddress : "未连接钱包"}</div>
            <div className="tags">
              <span className={`badge ${profile?.registered ? "badge-gold" : "badge-gray"}`}>{profile?.registered ? "已注册" : "未注册"}</span>
              <span className="badge badge-blue">{AKN_CHAIN.name}</span>
            </div>
          </div>
        </div>
        <div className="member-bnb">
          <span>BNB 余额</span>
          <span>{nativeQuery.data ? `${formatToken(nativeQuery.data.value, nativeQuery.data.decimals, 4)} ${nativeQuery.data.symbol}` : "--"}</span>
        </div>
      </div>

      <div className="mini-grid">
        <div className="mini"><div className="l">累计投入 (USDT)</div><div className="v">{investedText}</div></div>
        <div className="mini"><div className="l">预售订单</div><div className="v">{orders ? `${orders.length} 笔` : "--"}</div></div>
        <div className="mini"><div className="l">直推人数</div><div className="v">{profile ? profile.directCount : "--"}</div></div>
        <div className="mini"><div className="l">可享代数</div><div className="v">--</div></div>
      </div>
      {profileQuery.error || statusQuery.error || investedQuery.error || ordersQuery.error || receiverQuery.error ? (
        <div className="empty">{getActionErrorMessage(profileQuery.error || statusQuery.error || investedQuery.error || ordersQuery.error || receiverQuery.error)}</div>
      ) : null}

      <div className="card">
        <h3><span className="bar" />订单与资产</h3>
        <div className="lrow" onClick={() => navigate("/invest")}>
          <div className="lrow-txt"><div className="lrow-label">我的订单</div><div className="lrow-sub">查看预售订单与收款进度</div></div>
          <span className="lrow-ic"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M8 2v4M16 2v4" /></svg></span>
        </div>
        <div className="lrow">
          <div className="lrow-txt"><div className="lrow-label">当前收款地址</div><div className="lrow-sub" style={{ wordBreak: "break-all" }}>{receiverCaption}</div></div>
          <span className="lrow-ic"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg></span>
        </div>
        <div className="lrow">
          <div className="lrow-txt"><div className="lrow-label">赎回说明</div><div className="lrow-sub">保险池可随时赎回，赎回后订单结束</div></div>
          <span className="lrow-ic"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg></span>
        </div>
      </div>

      <div className="card">
        <h3><span className="bar" />网络与支持</h3>
        <div className="lrow">
          <div className="lrow-txt"><div className="lrow-label">网络设置</div><div className="lrow-sub">{AKN_CHAIN.name} · BEP20</div></div>
          <span className="lrow-ic"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" /></svg></span>
        </div>
        <div className="lrow">
          <div className="lrow-txt"><div className="lrow-label">帮助中心</div><div className="lrow-sub">xxxx@xxxx.com</div></div>
          <span className="lrow-ic"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="12" cy="12" r="10" /><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></svg></span>
        </div>
        <div className="lrow">
          <div className="lrow-txt"><div className="lrow-label">关于 AKN</div><div className="lrow-sub">源律机制 · 源于代码，律于共识</div></div>
          <span className="lrow-ic"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg></span>
        </div>
      </div>

      {wallet.isConnected ? (
        <button className="btn btn-ghost" type="button" onClick={onDisconnect}>断开钱包连接</button>
      ) : null}
    </section>
  );
}
