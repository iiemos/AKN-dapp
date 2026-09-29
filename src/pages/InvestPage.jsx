import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { parseUnits } from "viem";
import { getContractConfigMissingKeys, isContractConfigReady } from "../config/aknRuntime";
import { MAX_INVEST, MIN_INVEST, PACKAGES, PRESALE_DAILY_RATE } from "../data/packages";
import { useInvalidateAkn, useLastInvestment, useNetworkProfile, usePresaleStatus, useReceiverState, useUserOrders } from "../hooks/useAknReads";
import { useWalletConnector } from "../hooks/useWalletConnector";
import { investPresale } from "../services/aknContracts";
import { usePackageSelection } from "../state/appState";
import { copyText } from "../utils/clipboard";
import { formatFixed, formatToken, formatTokenInteger, shortAddress, tokenToNumber } from "../utils/formatters";
import { getActionErrorMessage } from "../utils/walletErrors";
import { useToast } from "../components/Toast";

function pad(value) {
  return String(value).padStart(2, "0");
}

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}

function formatTimestamp(seconds) {
  if (!seconds) return "--";
  return new Date(seconds * 1000).toLocaleString("zh-CN", { hour12: false });
}

function formatDistance(targetSeconds, nowMs) {
  if (!targetSeconds) return "--";
  const delta = Math.max(0, targetSeconds * 1000 - nowMs);
  const hours = Math.floor(delta / 3600000);
  const minutes = Math.floor(delta / 60000) % 60;
  return `${hours} 时 ${minutes} 分`;
}

export default function InvestPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const now = useNow();
  const wallet = useWalletConnector();
  const { packageIndex, setPackageIndex } = usePackageSelection();
  const ordersQuery = useUserOrders(wallet.currentAddress);
  const profileQuery = useNetworkProfile(wallet.currentAddress);
  const receiverQuery = useReceiverState();
  const statusQuery = usePresaleStatus();
  const lastInvestmentQuery = useLastInvestment(wallet.currentAddress);
  const invalidate = useInvalidateAkn();
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const status = statusQuery.data;
  const decimals = status?.decimals;
  const orders = ordersQuery.data || [];
  const closed = Boolean(status?.closed);
  const startsAtMs = status ? status.startsAt * 1000 : 0;
  const live = Boolean(status) && !closed && now >= startsAtMs;
  const presaleReady = isContractConfigReady(["presale"]);

  const amountState = useMemo(() => {
    if (amount === "") return { ok: true, message: "金额须为 1 的整数倍；可投多笔，每笔金额须大于等于上一笔。" };
    if (!/^\d+$/.test(amount)) return { ok: false, message: "金额须为 1 的整数倍（不含小数）" };
    const value = Number(amount);
    if (value < MIN_INVEST || value > MAX_INVEST) return { ok: false, message: `单笔金额须在 ${MIN_INVEST.toLocaleString("en-US")} ~ ${MAX_INVEST.toLocaleString("en-US")} USDT 之间` };
    if (decimals === undefined) return { ok: false, message: "正在读取 USDT 精度" };
    if (wallet.isConnected && lastInvestmentQuery.isError) return { ok: false, message: getActionErrorMessage(lastInvestmentQuery.error) };
    if (wallet.isConnected && lastInvestmentQuery.data === undefined) return { ok: false, message: "正在读取上笔入金" };
    const parsed = parseUnits(amount, decimals);
    if (lastInvestmentQuery.data !== undefined && parsed < lastInvestmentQuery.data) {
      return { ok: false, message: `复投金额须 ≥ 上笔 ${formatTokenInteger(lastInvestmentQuery.data, decimals)} USDT` };
    }
    return { ok: true, message: "金额须为 1 的整数倍；可投多笔，每笔金额须大于等于上一笔。" };
  }, [amount, decimals, lastInvestmentQuery.data, lastInvestmentQuery.error, lastInvestmentQuery.isError, wallet.isConnected]);

  const remain = Math.max(0, startsAtMs - now);
  const cells = live || !status || closed ? null : {
    days: pad(Math.floor(remain / 86400000)),
    hours: pad(Math.floor(remain / 3600000) % 24),
    minutes: pad(Math.floor(remain / 60000) % 60),
    seconds: pad(Math.floor(remain / 1000) % 60),
  };
  const preview = amountState.ok && amount ? Number(amount) : 0;
  const receiver = receiverQuery.data?.receivers?.[receiverQuery.data.index];
  const cap = receiverQuery.data && decimals !== undefined ? tokenToNumber(receiverQuery.data.cap, decimals) : 0;
  const raised = receiver && decimals !== undefined ? tokenToNumber(receiver.received, decimals) : 0;
  const progress = cap > 0 ? Math.min(100, (raised / cap) * 100) : 0;
  const bannerTitle = !presaleReady
    ? "缺少预售合约"
    : statusQuery.isLoading
      ? "正在读取预售状态"
      : statusQuery.error
        ? "预售状态读取失败"
        : closed
          ? "预售已关闭"
          : live
            ? "预售进行中"
            : "距预售开始";

  async function onCopyReceiver() {
    if (!receiver) return;
    const copied = await copyText(receiver.address);
    toast(copied ? "收款地址已复制" : "复制失败，请手动复制", copied ? "ok" : "err");
  }

  async function onInvest() {
    if (!wallet.isConnected) {
      toast("请先连接钱包", "err");
      return;
    }
    if (!profileQuery.data) {
      toast(profileQuery.error ? getActionErrorMessage(profileQuery.error) : "正在读取注册状态", "err");
      return;
    }
    if (!profileQuery.data.registered) {
      toast("请先完成推荐关系注册", "err");
      navigate("/team");
      return;
    }
    if (!status) {
      toast(statusQuery.error ? getActionErrorMessage(statusQuery.error) : "正在读取预售状态", "err");
      return;
    }
    if (status.closed) {
      toast("预售已关闭", "err");
      return;
    }
    if (Date.now() < status.startsAt * 1000) {
      toast("预售尚未开始", "err");
      return;
    }
    if (decimals === undefined || !amountState.ok || !amount) {
      toast(amountState.ok ? "正在读取 USDT 精度" : "请检查投资金额", "err");
      return;
    }

    setSubmitting(true);
    try {
      await wallet.ensureCorrectChain();
      const result = await investPresale(wallet.currentAddress, packageIndex + 1, parseUnits(amount, decimals));
      setAmount("");
      await invalidate();
      toast(`预售参与成功，${formatFixed(Number(amount), 2)} USDT 已上链`, "ok");
      return result;
    } catch (error) {
      toast(getActionErrorMessage(error), "err");
      return undefined;
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="view active">
      <div className="sec-title" style={{ marginTop: 16 }}><span className="bar" />参与 AKN 预售</div>
      <div className={`count-banner${live ? " live" : ""}`}>
        <div className="ct">{bannerTitle}</div>
        <div className="cs">{status ? formatTimestamp(status.startsAt) : statusQuery.error ? getActionErrorMessage(statusQuery.error) : "开始时间以链上 startsAt 为准"}</div>
        <div className="count-cells">
          {live ? <div className="live-pill">PRESALE LIVE · 正在进行中</div> : closed ? <div className="live-pill">PRESALE CLOSED</div> : cells ? (
            <>
              <div className="count-cell"><b>{cells.days}</b><span>天</span></div>
              <div className="count-cell"><b>{cells.hours}</b><span>时</span></div>
              <div className="count-cell"><b>{cells.minutes}</b><span>分</span></div>
              <div className="count-cell"><b>{cells.seconds}</b><span>秒</span></div>
            </>
          ) : null}
        </div>
      </div>

      <div className="card">
        <h3><span className="bar" />选择套餐并参与</h3>
        <div className="periods">
          {PACKAGES.map((item, index) => (
            <button key={item.tag} type="button" className={`period${index === packageIndex ? " on" : ""}`} onClick={() => setPackageIndex(index)}>
              <span className="pv">{item.rate}%</span>
              <span className="pl">{item.tag}</span>
            </button>
          ))}
        </div>
        <div className="field" style={{ marginTop: 14 }}>
          <label>投资金额（USDT）</label>
          <div className="input-wrap">
            <input
              className={`input${amount !== "" && !amountState.ok ? " err" : ""}`}
              type="number"
              min={MIN_INVEST}
              max={MAX_INVEST}
              step="1"
              placeholder="输入 100 ~ 10,000 的整数金额"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
            <span className="suffix">USDT</span>
          </div>
          <div className="hint">
            {amount !== "" && !amountState.ok ? <span style={{ color: "#ff8a8a" }}>{amountState.message}</span> : amountState.message}
          </div>
        </div>
        <button className="btn btn-blue" type="button" disabled={submitting || closed || (Boolean(status) && !live)} onClick={onInvest}>
          {submitting ? <><span className="spin" />链上确认中…</> : "确认参与预售"}
        </button>
        <div className="note-box">
          资金分配：保险池部分进入保险池地址（开源丢权限，可随时在 DApp / 链上赎回，赎回后该笔订单结束、业绩消失）；交互合约部分 80% 中一半买币与剩余油组 LP 转黑洞，20% 至运营地址 USDT。
        </div>
      </div>

      <div className="card">
        <h3><span className="bar" />预售收款合约（地址轮序）</h3>
        {!presaleReady ? <div className="empty">缺少合约地址，请配置 {getContractConfigMissingKeys(["presale"]).join("、")}</div> : null}
        {receiverQuery.isLoading ? <div className="empty">正在读取收款地址…</div> : null}
        {receiverQuery.error ? <div className="empty">{getActionErrorMessage(receiverQuery.error)}</div> : null}
        {receiver && decimals !== undefined ? (
          <>
            <div className="addr-main">
              <span className="seq">#{pad(receiverQuery.data.index + 1)}</span>
              <span className="ad">{receiver.address}</span>
              <button className="icon-btn" type="button" onClick={onCopyReceiver} title="复制地址">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </button>
            </div>
            <div className="progress"><i style={{ width: `${progress}%` }} /></div>
            <div className="pf-meta"><span>{formatFixed(raised, 0)} / {formatFixed(cap, 0)} USDT</span><span>满额自动切换</span></div>
            <div className="seq-dots">
              {receiverQuery.data.receivers.map((item, index) => {
                const state = index < receiverQuery.data.index ? "done" : index === receiverQuery.data.index ? "cur" : "";
                return <span key={`${item.address}-${index}`} className={`seq-dot ${state}`}>{index + 1}</span>;
              })}
            </div>
          </>
        ) : null}
      </div>

      <div className="sec-title"><span className="bar" />收益测算（预售期统一 1% / 24h，以 LP 结算）</div>
      <div className="card">
        <table className="est-table">
          <thead>
            <tr>
              <th>持有时间</th>
              <th>1 天</th>
              <th>7 天</th>
              <th>15 天</th>
              <th>30 天</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="hl">累计静态 LP</td>
              {[1, 7, 15, 30].map((days) => (
                <td key={days}>{preview ? `${formatFixed(preview * PRESALE_DAILY_RATE * days)} LP` : "—"}</td>
              ))}
            </tr>
          </tbody>
        </table>
        <div className="note-box">
          预售期间不分套餐，每 24 小时统一按 <span className="gold-text">1%</span> 结算 LP，暂不可领取；正式上线后恢复套餐日静态收益（1% / 1.5% / 2% / 2.5%）并开放领取，领取静态时同步向上结算代数奖、团队奖与小区分红。
        </div>
      </div>

      <div className="sec-title"><span className="bar" />我的预售订单</div>
      <div>
        {ordersQuery.error ? <div className="empty">{getActionErrorMessage(ordersQuery.error)}</div>
        : !presaleReady ? <div className="empty">缺少合约地址，请配置 {getContractConfigMissingKeys(["presale"]).join("、")}</div>
        : !wallet.isConnected || !orders.length ? <div className="empty">暂无预售订单，连接钱包并完成注册后即可参与。</div> : orders.map((order) => {
          const item = PACKAGES[order.packageId - 1];
          return (
            <div className="order" key={String(order.orderId)}>
              <div className="order-top">
                <span className="amt">{decimals === undefined ? "--" : `${formatTokenInteger(order.principal, decimals)} USDT`}</span>
                <span className="badge badge-gold">{item ? item.tag : `套餐 ${order.packageId}`}</span>
                <span className="badge badge-blue">预售 1%/日</span>
              </div>
              <div className="order-grid">
                <div className="og"><div className="l">累计收益</div><div className="v gold-text">{decimals === undefined ? "--" : formatToken(order.accruedReward, decimals)}</div></div>
                <div className="og"><div className="l">距下次结算</div><div className="v">{formatDistance(order.nextAccrualAt, now)}</div></div>
                <div className="og"><div className="l">收款地址</div><div className="v">{shortAddress(order.receiver)}</div></div>
                <div className="og"><div className="l">下单时间</div><div className="v" style={{ fontSize: 11.5 }}>{new Date(order.createdAt * 1000).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</div></div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

