import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { useNavigate } from "react-router-dom";
import { parseUnits } from "viem";
import ring from "../../assets/ring.png";
import { getContractConfigMissingKeys, isContractConfigReady } from "../config/aknRuntime";
import { MAX_INVEST, MIN_INVEST, PACKAGES, PRESALE_DAILY_RATE, PREVIEW_BASE } from "../data/packages";
import { useInvalidateAkn, useLastInvestment, useNetworkProfile, usePresaleStatus, useReceiverState, useUsdtBalance, useUserOrders } from "../hooks/useAknReads";
import { useWalletConnector } from "../hooks/useWalletConnector";
import { investPresale } from "../services/aknContracts";
import { usePackageSelection } from "../state/appState";
import { copyText } from "../utils/clipboard";
import { formatFixed, formatToken, formatTokenInteger, shortAddress } from "../utils/formatters";
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
  const statusQuery = usePresaleStatus();
  const balanceQuery = useUsdtBalance(wallet.currentAddress);
  const receiverQuery = useReceiverState();
  const lastInvestmentQuery = useLastInvestment(wallet.currentAddress);
  const invalidate = useInvalidateAkn();
  const [hidden, setHidden] = useState(false);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [recharge, setRecharge] = useState(null);
  const status = statusQuery.data;
  const decimals = status?.decimals;
  const orders = ordersQuery.data || [];
  const closed = Boolean(status?.closed);
  const startsAtMs = status ? status.startsAt * 1000 : 0;
  const live = Boolean(status) && !closed && now >= startsAtMs;
  const presaleReady = isContractConfigReady(["presale"]);
  const balanceText = !wallet.isConnected || !presaleReady
    ? "--"
    : balanceQuery.isLoading || statusQuery.isLoading
      ? "…"
      : balanceQuery.data !== undefined && decimals !== undefined
        ? formatToken(balanceQuery.data, decimals)
        : "--";
  const balanceCaption = !wallet.isConnected
    ? "连接钱包后读取 USDT 余额"
    : !presaleReady
      ? `缺少合约地址，请配置 ${getContractConfigMissingKeys(["presale"]).join("、")}`
      : statusQuery.error
        ? getActionErrorMessage(statusQuery.error)
        : balanceQuery.error
          ? getActionErrorMessage(balanceQuery.error)
          : balanceQuery.data !== undefined && decimals !== undefined && !hidden
            ? `≈ $${formatToken(balanceQuery.data, decimals)}`
            : "";

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
  const selected = PACKAGES[packageIndex];
  const ratioBase = preview || PREVIEW_BASE;
  const radius = 46;
  const circ = 2 * Math.PI * radius;
  const investLen = (circ * selected.interact) / 100;
  const insureLen = (circ * selected.insurance) / 100;
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

  async function onRecharge() {
    if (!wallet.isConnected) {
      try {
        await wallet.connectWallet();
      } catch (error) {
        toast(getActionErrorMessage(error), "err");
        return;
      }
    }
    if (!presaleReady) {
      toast(`缺少合约地址，请配置 ${getContractConfigMissingKeys(["presale"]).join("、")}`, "err");
      return;
    }
    const receiver = receiverQuery.data?.receivers?.[receiverQuery.data.index];
    if (!receiver) {
      toast(getActionErrorMessage(receiverQuery.error) || "当前收款地址尚未读取", "err");
      return;
    }
    try {
      const qr = await QRCode.toDataURL(receiver.address, {
        width: 480,
        margin: 1,
        errorCorrectionLevel: "M",
        color: { dark: "#062014", light: "#FFFFFF" },
      });
      setRecharge({ address: receiver.address, qr });
    } catch (error) {
      toast(getActionErrorMessage(error), "err");
    }
  }

  async function onCopyRechargeAddress() {
    if (!recharge?.address) return;
    const copied = await copyText(recharge.address);
    toast(copied ? "收款地址已复制" : "复制失败", copied ? "ok" : "err");
  }

  async function onWithdraw() {
    if (!wallet.isConnected) {
      try {
        await wallet.connectWallet();
      } catch (error) {
        toast(getActionErrorMessage(error), "err");
        return;
      }
    }
    toast("预售期收益暂不可提现，11 月上线后开放", "err");
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
      <div className="stat-strip">
        <div className="ss">
          <div className="l1"><span className="gdot" />网络正常</div>
          <div className="l2">Network Healthy</div>
        </div>
        <div className="ss">
          <div className="v">25,843,671</div>
          <div className="l2">总锁仓量 (USDT)</div>
        </div>
        <div className="ss">
          <div className="l1">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            128,421
          </div>
          <div className="l2">社区成员</div>
        </div>
      </div>

      <div className="card asset-card">
        <img className="ring-deco" src={ring} alt="" />
        <div className="asset-info">
          <div style={{ fontSize: 14, color: "var(--muted)" }}>
            我的资产 (USDT)
            <button className="eye" type="button" onClick={() => setHidden((value) => !value)} title="隐藏/显示">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </div>
          <div className="big-num">{hidden ? "****" : balanceText}</div>
          <div className="usd-line">{balanceCaption}</div>
        </div>
        <div className="slogan">
          <div className="zh">源于代码<br />律于共识</div>
          <div className="ln" />
          <div className="en">Code is the source.<br />Consensus is the rule.</div>
        </div>
        <div className="btn-row">
          <button className="btn btn-blue" type="button" onClick={onRecharge}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <path d="M7 10l5 5 5-5" />
              <path d="M12 15V3" />
            </svg>
            充值
          </button>
          <button className="btn btn-dark" type="button" onClick={onWithdraw}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <path d="M17 8l-5-5-5 5" />
              <path d="M12 3v12" />
            </svg>
            提现
          </button>
        </div>
      </div>

      <div className="sec-title"><span className="bar" />参与 AKN 预售</div>
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
        <div className="sub-hd">{selected.tag} · 投资 {selected.interact}% / 保险 {selected.insurance}%</div>
        <div className="periods">
          {PACKAGES.map((item, index) => (
            <button key={item.tag} type="button" className={`period${index === packageIndex ? " on" : ""}`} onClick={() => setPackageIndex(index)}>
              <span className="pv">{item.rate}%</span>
              <span className="pl">{item.interact}/{item.insurance}</span>
            </button>
          ))}
        </div>
        <div className="donut-panel">
          <div className="donut">
            <svg width="108" height="108" viewBox="0 0 108 108">
              <circle cx="54" cy="54" r={radius} fill="none" stroke="url(#gInvest)" strokeWidth="12" strokeDasharray={`${investLen} ${circ - investLen}`} strokeDashoffset="0" />
              <circle cx="54" cy="54" r={radius} fill="none" stroke="url(#gInsure)" strokeWidth="12" strokeDasharray={`${insureLen} ${circ - insureLen}`} strokeDashoffset={circ - investLen} />
              <defs>
                <linearGradient id="gInvest" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#0B7A42" />
                  <stop offset="1" stopColor="#5EE89A" />
                </linearGradient>
                <linearGradient id="gInsure" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#145C38" />
                  <stop offset="1" stopColor="#3DDC84" />
                </linearGradient>
              </defs>
            </svg>
            <div className="dc">{selected.rate}%</div>
          </div>
          <div className="donut-meta">
            <div className="dm">
              <div className="t"><span className="dot" style={{ background: "var(--brand-bright)" }} />投资比例</div>
              <div className="p">{selected.interact}%</div>
              <div className="a">投资 {formatFixed((ratioBase * selected.interact) / 100, 0)} USDT</div>
            </div>
            <div className="dm">
              <div className="t"><span className="dot" style={{ background: "#3DDC84" }} />保险比例</div>
              <div className="p">{selected.insurance}%</div>
              <div className="a">保险 {formatFixed((ratioBase * selected.insurance) / 100, 0)} USDT</div>
            </div>
          </div>
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

      {recharge ? (
        <div className="recharge-mask" onClick={() => setRecharge(null)}>
          <div className="recharge-dialog" role="dialog" aria-modal="true" aria-labelledby="recharge-title" onClick={(event) => event.stopPropagation()}>
            <button className="recharge-x" type="button" aria-label="关闭" onClick={() => setRecharge(null)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
            <h3 id="recharge-title">充值 USDT</h3>
            <p className="recharge-sub">扫描二维码，或复制下方地址转入 BEP20 USDT</p>
            <img className="recharge-qr" src={recharge.qr} alt="收款地址二维码" />
            <div className="recharge-addr mono">{recharge.address}</div>
            <button className="btn btn-blue" type="button" onClick={onCopyRechargeAddress}>复制地址</button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

