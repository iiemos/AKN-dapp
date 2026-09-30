import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { parseUnits } from "viem";
import ring from "../../assets/ring.png";
import { getContractConfigMissingKeys, isContractConfigReady } from "../config/aknRuntime";
import { MAX_INVEST, MIN_INVEST, PACKAGES, PREVIEW_BASE } from "../data/packages";
import { useInvalidateAkn, useLastInvestment, useNetworkProfile, usePresaleStatus, useUsdtBalance, useUserOrders } from "../hooks/useAknReads";
import { useWalletConnector } from "../hooks/useWalletConnector";
import { investPresale } from "../services/aknContracts";
import { usePackageSelection } from "../state/appState";
import { formatFixed, formatToken, formatTokenInteger } from "../utils/formatters";
import { getActionErrorMessage } from "../utils/walletErrors";
import { useToast } from "../components/Toast";
import { PACKAGE_EN, useI18n } from "../i18n/locale";

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

export default function InvestPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { t, locale } = useI18n();
  const now = useNow();
  const wallet = useWalletConnector();
  const { packageIndex, setPackageIndex } = usePackageSelection();
  const ordersQuery = useUserOrders(wallet.currentAddress);
  const profileQuery = useNetworkProfile(wallet.currentAddress);
  const statusQuery = usePresaleStatus();
  const balanceQuery = useUsdtBalance(wallet.currentAddress);
  const lastInvestmentQuery = useLastInvestment(wallet.currentAddress);
  const invalidate = useInvalidateAkn();
  const [hidden, setHidden] = useState(false);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
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
    ? t("连接钱包后读取 USDT 余额", "Connect a wallet to read the USDT balance")
    : !presaleReady
      ? t(`缺少合约地址，请配置 ${getContractConfigMissingKeys(["presale"]).join("、")}`, `Missing contract address. Configure ${getContractConfigMissingKeys(["presale"]).join(", ")}`)
      : statusQuery.error
        ? getActionErrorMessage(statusQuery.error)
        : balanceQuery.error
          ? getActionErrorMessage(balanceQuery.error)
          : balanceQuery.data !== undefined && decimals !== undefined && !hidden
            ? `≈ $${formatToken(balanceQuery.data, decimals)}`
            : "";

  const amountState = useMemo(() => {
    if (amount === "") return { ok: true, message: t("金额须为 1 的整数倍；可投多笔，每笔金额须大于等于上一笔。", "Amount must be a whole number. Each order must be at least the previous one.") };
    if (!/^\d+$/.test(amount)) return { ok: false, message: t("金额须为 1 的整数倍（不含小数）", "Amount must be a whole number") };
    const value = Number(amount);
    if (value < MIN_INVEST || value > MAX_INVEST) return { ok: false, message: t(`单笔金额须在 ${MIN_INVEST.toLocaleString("en-US")} ~ ${MAX_INVEST.toLocaleString("en-US")} USDT 之间`, `Each order must be between ${MIN_INVEST.toLocaleString("en-US")} and ${MAX_INVEST.toLocaleString("en-US")} USDT`) };
    if (decimals === undefined) return { ok: false, message: t("正在读取 USDT 精度", "Reading USDT decimals") };
    if (wallet.isConnected && lastInvestmentQuery.isError) return { ok: false, message: getActionErrorMessage(lastInvestmentQuery.error) };
    if (wallet.isConnected && lastInvestmentQuery.data === undefined) return { ok: false, message: t("正在读取上笔入金", "Reading the previous investment") };
    const parsed = parseUnits(amount, decimals);
    if (lastInvestmentQuery.data !== undefined && parsed < lastInvestmentQuery.data) {
      const previous = formatTokenInteger(lastInvestmentQuery.data, decimals);
      return { ok: false, message: t(`复投金额须 ≥ 上笔 ${previous} USDT`, `Reinvestment must be at least the previous ${previous} USDT`) };
    }
    return { ok: true, message: t("金额须为 1 的整数倍；可投多笔，每笔金额须大于等于上一笔。", "Amount must be a whole number. Each order must be at least the previous one.") };
  }, [amount, decimals, lastInvestmentQuery.data, lastInvestmentQuery.error, lastInvestmentQuery.isError, t, wallet.isConnected]);

  const preview = amountState.ok && amount ? Number(amount) : 0;
  const selected = PACKAGES[packageIndex];
  const ratioBase = preview || PREVIEW_BASE;
  const radius = 46;
  const circ = 2 * Math.PI * radius;
  const investLen = (circ * selected.interact) / 100;
  const insureLen = (circ * selected.insurance) / 100;

  async function onInvest() {
    if (!wallet.isConnected) {
      toast(t("请先连接钱包", "Connect your wallet first"), "err");
      return;
    }
    if (!profileQuery.data) {
      toast(profileQuery.error ? getActionErrorMessage(profileQuery.error) : t("正在读取注册状态", "Reading registration status"), "err");
      return;
    }
    if (!profileQuery.data.registered) {
      toast(t("请先完成推荐关系注册", "Bind a referrer before joining"), "err");
      navigate("/team");
      return;
    }
    if (!status) {
      toast(statusQuery.error ? getActionErrorMessage(statusQuery.error) : t("正在读取预售状态", "Reading presale status"), "err");
      return;
    }
    if (status.closed) {
      toast(t("预售已关闭", "Presale is closed"), "err");
      return;
    }
    if (Date.now() < status.startsAt * 1000) {
      toast(t("预售尚未开始", "Presale has not started"), "err");
      return;
    }
    if (decimals === undefined || !amountState.ok || !amount) {
      toast(amountState.ok ? t("正在读取 USDT 精度", "Reading USDT decimals") : t("请检查投资金额", "Check the investment amount"), "err");
      return;
    }

    setSubmitting(true);
    try {
      await wallet.ensureCorrectChain();
      const result = await investPresale(wallet.currentAddress, packageIndex + 1, parseUnits(amount, decimals));
      setAmount("");
      await invalidate();
      toast(t(`预售参与成功，${formatFixed(Number(amount), 2)} USDT 已上链`, `Presale joined. ${formatFixed(Number(amount), 2)} USDT is on-chain`), "ok");
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
      <div className="card asset-card">
        <img className="ring-deco" src={ring} alt="" />
        <div className="asset-info">
          <div style={{ fontSize: 14, color: "var(--muted)" }}>
            {t("我的资产 (USDT)", "My assets (USDT)")}
            <button className="eye" type="button" onClick={() => setHidden((value) => !value)} title={t("隐藏/显示", "Hide or show")}>
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
      </div>

      <div className="card">
        <h3><span className="bar" />{t("选择方案并参与", "Choose a plan")}</h3>
        <div className="sub-hd">{t(selected.tag, PACKAGE_EN[selected.tag] || selected.tag)} · {t(`投资 ${selected.interact}% / 保险 ${selected.insurance}%`, `Invest ${selected.interact}% / Insurance ${selected.insurance}%`)}</div>
        <div className="periods">
          {PACKAGES.map((item, index) => (
            <button key={item.tag} type="button" className={`period${index === packageIndex ? " on" : ""}`} onClick={() => setPackageIndex(index)}>
              <span className="pv">{item.rate}%</span>
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
                  <stop offset="0" stopColor="#8A6A1E" />
                  <stop offset="1" stopColor="#F2CE6E" />
                </linearGradient>
              </defs>
            </svg>
            <div className="dc">{selected.rate}%</div>
          </div>
          <div className="donut-meta">
            <div className="dm">
              <div className="t"><span className="dot" style={{ background: "var(--brand-bright)" }} />{t("投资比例", "Investment")}</div>
              <div className="p">{selected.interact}%</div>
              <div className="a">{t(`投资 ${formatFixed((ratioBase * selected.interact) / 100, 0)} USDT`, `Invest ${formatFixed((ratioBase * selected.interact) / 100, 0)} USDT`)}</div>
            </div>
            <div className="dm">
              <div className="t"><span className="dot" style={{ background: "var(--gold)" }} />{t("保险比例", "Insurance")}</div>
              <div className="p">{selected.insurance}%</div>
              <div className="a">{t(`保险 ${formatFixed((ratioBase * selected.insurance) / 100, 0)} USDT`, `Insurance ${formatFixed((ratioBase * selected.insurance) / 100, 0)} USDT`)}</div>
            </div>
          </div>
        </div>
        <div className="field" style={{ marginTop: 14 }}>
          <label>{t("投资金额（USDT）", "Amount (USDT)")}</label>
          <div className="input-wrap">
            <input
              className={`input${amount !== "" && !amountState.ok ? " err" : ""}`}
              type="number"
              min={MIN_INVEST}
              max={MAX_INVEST}
              step="1"
              placeholder={t("输入 100 ~ 10,000 的整数金额", "Enter a whole number from 100 to 10,000")}
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
          {submitting ? <><span className="spin" />{t("链上确认中…", "Confirming...")}</> : t("确认参与预售", "Join presale")}
        </button>
        <div className="note-box">
          {t("资金分配：保险池部分进入保险池地址（开源丢权限，可随时在 DApp / 链上赎回，赎回后该笔订单结束、业绩消失）；交互合约部分 80% 中一半买币与剩余油组 LP 转黑洞，20% 至运营地址 USDT。", "Allocation: the insurance share goes to the insurance pool (open-source, permissions renounced, redeemable in the DApp or on-chain; redeeming ends that order and removes its volume). Of the interaction-contract share, half of the 80% buys tokens and the rest plus gas forms LP sent to the burn address; 20% is sent as USDT to the operations address.")}
        </div>
      </div>

      <div className="sec-title"><span className="bar" />{t("收益测算（预售期统一 1% / 24h，以 LP 结算）", "Yield preview (presale: 1% / 24h, settled in LP)")}</div>
      <div className="card">
        <table className="est-table">
          <thead>
            <tr>
              <th>{t("持有时间", "Holding")}</th>
              <th>{t("1 天", "1 day")}</th>
              <th>{t("7 天", "7 days")}</th>
              <th>{t("15 天", "15 days")}</th>
              <th>{t("30 天", "30 days")}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="hl">{t("累计静态 LP", "Static LP")}</td>
              {[1, 7, 15, 30].map((days) => (
                <td key={days}>1%</td>
              ))}
            </tr>
          </tbody>
        </table>
        <div className="note-box">
          {t("预售期间不分套餐，每 24 小时统一按 ", "During presale, every package accrues ")}<span className="gold-text">1%</span>{t(" 结算 LP，暂不可领取；正式上线后恢复套餐日静态收益（1% / 1.5% / 2% / 2.5%）并开放领取，领取静态时同步向上结算代数奖、团队奖与小区分红。", " LP every 24 hours. It cannot be claimed yet. After launch, package daily yields (1% / 1.5% / 2% / 2.5%) resume, and generation, team, and small-area rewards settle upward when static yield is claimed.")}
        </div>
      </div>

      <div className="sec-title"><span className="bar" />{t("我的预售订单", "My presale orders")}</div>
      <div>
        {ordersQuery.error ? <div className="empty">{getActionErrorMessage(ordersQuery.error)}</div>
        : !presaleReady ? <div className="empty">{t(`缺少合约地址，请配置 ${getContractConfigMissingKeys(["presale"]).join("、")}`, `Missing contract address. Configure ${getContractConfigMissingKeys(["presale"]).join(", ")}`)}</div>
        : !wallet.isConnected || !orders.length ? <div className="empty">{t("暂无预售订单，连接钱包并完成注册后即可参与。", "No presale orders yet. Connect a wallet and register to join.")}</div> : orders.map((order) => {
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
      </div>

    </section>
  );
}
