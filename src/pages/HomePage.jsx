import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ring from "../../assets/ring.png";
import { PACKAGES, PREVIEW_BASE } from "../data/packages";
import { getContractConfigMissingKeys, isContractConfigReady } from "../config/aknRuntime";
import { usePresaleStatus, useReceiverState, useUsdtBalance } from "../hooks/useAknReads";
import { useWalletConnector } from "../hooks/useWalletConnector";
import { usePackageSelection } from "../state/appState";
import { formatFixed, formatToken } from "../utils/formatters";
import { copyText } from "../utils/clipboard";
import { useToast } from "../components/Toast";
import { getActionErrorMessage } from "../utils/walletErrors";

const RADIUS = 46;
const CIRC = 2 * Math.PI * RADIUS;

export default function HomePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const wallet = useWalletConnector();
  const { packageIndex, setPackageIndex } = usePackageSelection();
  const statusQuery = usePresaleStatus();
  const balanceQuery = useUsdtBalance(wallet.currentAddress);
  const receiverQuery = useReceiverState();
  const [hidden, setHidden] = useState(false);
  const selected = PACKAGES[packageIndex];
  const invLen = (CIRC * selected.interact) / 100;
  const insLen = (CIRC * selected.insurance) / 100;
  const presaleReady = isContractConfigReady(["presale"]);
  const decimals = statusQuery.data?.decimals;
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
    const copied = await copyText(receiver.address);
    toast(copied ? `请向当前收款地址转入 USDT：${receiver.address}` : "请向当前收款合约地址转入 USDT 完成充值");
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
          <button className="btn btn-gold" type="button" onClick={onRecharge}>
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

      <div className="card">
        <h3>
          <span className="bar" />投资周期
          <button className="right" type="button" onClick={() => toast("四个套餐对应保险/投资比例，上线后日静态 1% ~ 2.5%")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            周期说明
          </button>
        </h3>
        <div className="sub-hd">选择周期，开启 AKN 价值循环</div>
        <div className="seg">
          {PACKAGES.map((item, index) => (
            <button key={item.tag} type="button" className={`seg-item${index === packageIndex ? " on" : ""}`} onClick={() => setPackageIndex(index)}>
              <span className="sv">{item.minutes}分</span>
              <span className="sl">{item.tag}</span>
            </button>
          ))}
        </div>
        <div className="donut-panel">
          <div className="donut">
            <svg width="108" height="108" viewBox="0 0 108 108">
              <circle cx="54" cy="54" r={RADIUS} fill="none" stroke="url(#gBrand)" strokeWidth="12" strokeDasharray={`${invLen} ${CIRC - invLen}`} strokeDashoffset="0" />
              <circle cx="54" cy="54" r={RADIUS} fill="none" stroke="url(#gGold)" strokeWidth="12" strokeDasharray={`${insLen} ${CIRC - insLen}`} strokeDashoffset={CIRC - invLen} />
              <defs>
                <linearGradient id="gBrand" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#0B7A42" />
                  <stop offset="1" stopColor="#5EE89A" />
                </linearGradient>
                <linearGradient id="gGold" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#caa244" />
                  <stop offset="1" stopColor="#E4BC4E" />
                </linearGradient>
              </defs>
            </svg>
            <div className="dc">100%</div>
          </div>
          <div className="donut-meta">
            <div className="dm">
              <div className="t"><span className="dot" style={{ background: "var(--brand-bright)" }} />投资比例</div>
              <div className="p">{selected.interact}%</div>
              <div className="a">投资 {formatFixed((PREVIEW_BASE * selected.interact) / 100, 0)} USDT</div>
            </div>
            <div className="dm">
              <div className="t"><span className="dot" style={{ background: "var(--gold)" }} />保险比例</div>
              <div className="p">{selected.insurance}%</div>
              <div className="a">保险 {formatFixed((PREVIEW_BASE * selected.insurance) / 100, 0)} USDT</div>
            </div>
          </div>
        </div>
        <button className="btn btn-gold" style={{ marginTop: 14 }} type="button" onClick={() => navigate("/invest")}>
          开始投资
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
        <button className="guarantee" type="button" onClick={() => toast("保险池与交互合约均开源丢权限，收益自动结算")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3 5 6v6c0 4.2 2.8 7.4 7 9 4.2-1.6 7-4.8 7-9V6l-7-3z" />
          </svg>
          智能合约保障 · 公开透明 · 收益自动结算
          <span className="chev">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </span>
        </button>
      </div>

      <div className="earth">
        <div className="ewm"><span className="a">A</span><span className="k">K</span><span className="n">N</span></div>
        <div className="et">链接代码与价值的未来</div>
        <div className="eln" />
        <div className="een">A MORE OPEN FINANCIAL WORLD</div>
      </div>
    </section>
  );
}
