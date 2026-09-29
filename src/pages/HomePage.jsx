import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/logo.png";
import { useI18n } from "../i18n/locale";

const NOTICES = [
  ["AKN 预售已在 BNB Smart Chain 开启", "AKN presale is live on BNB Smart Chain"],
  ["预售期每 24 小时按 1% 结算 LP，暂不可领取", "Presale LP accrues at 1% every 24 hours and cannot be claimed yet"],
];

const FEATURES = [
  {
    icon: "shield",
    title: ["链上安全", "On-chain security"],
    desc: ["预售、收益与赎回均由 BSC 智能合约执行，合约开源并丢弃权限。", "Presale, rewards, and redemption run on BSC contracts. The code is open-source and permissions are renounced."],
  },
  {
    icon: "pool",
    title: ["保险池", "Insurance pool"],
    desc: ["资金按比例进入保险池，可随时赎回；赎回后该笔订单结束。", "A share of each order goes to the insurance pool and can be redeemed at any time. Redeeming ends that order."],
  },
  {
    icon: "team",
    title: ["团队奖励", "Team rewards"],
    desc: ["推荐关系链上绑定。领取静态收益时，同步结算代数奖、团队奖与小区分红。", "Referrals are bound on-chain. Generation, team, and small-area rewards settle when static yield is claimed."],
  },
  {
    icon: "wallet",
    title: ["多钱包 BSC", "BSC wallets"],
    desc: ["支持 MetaMask、Trust Wallet、TokenPocket、Binance Wallet，手机与桌面均可。", "MetaMask, Trust Wallet, TokenPocket, and Binance Wallet work on mobile and desktop."],
  },
];

const STEPS = [
  {
    title: ["连接钱包", "Connect wallet"],
    desc: ["连接 BSC 钱包，并完成推荐关系注册。", "Connect a BSC wallet and bind your referrer."],
  },
  {
    title: ["选择套餐并参与", "Choose a package"],
    desc: ["选择套餐与金额。资金按比例进入保险池与交互合约。", "Pick a package and amount. Funds split into the insurance pool and the interaction contract."],
  },
  {
    title: ["收益与赎回", "Rewards and redemption"],
    desc: ["预售期每 24 小时按 1% 结算 LP。保险池可随时赎回。", "During presale, LP accrues at 1% every 24 hours. The insurance pool can be redeemed at any time."],
  },
];

function FeatureIcon({ name }) {
  if (name === "shield") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3 5 6v6c0 4.2 2.8 7.4 7 9 4.2-1.6 7-4.8 7-9V6l-7-3Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    );
  }
  if (name === "pool") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3v10" />
        <path d="M8 9a4 4 0 0 0 8 0" />
        <path d="M5 14c1.5 1.2 3.2 1.8 7 1.8s5.5-.6 7-1.8" />
        <path d="M5 18c1.5 1.2 3.2 1.8 7 1.8s5.5-.6 7-1.8" />
      </svg>
    );
  }
  if (name === "team") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="3" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="6" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
      <path d="M16 15h2" />
    </svg>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [noticeIndex, setNoticeIndex] = useState(0);
  const notice = NOTICES[noticeIndex];

  function moveNotice(step) {
    setNoticeIndex((current) => (current + step + NOTICES.length) % NOTICES.length);
  }

  return (
    <section className="view active home-view">
      <div className="home-notice">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M4 10v4h3l5 4V6L7 10H4Z" />
          <path d="M16 9a4 4 0 0 1 0 6" />
        </svg>
        <span className="msg">{t(notice[0], notice[1])}</span>
        <button type="button" aria-label={t("上一条", "Previous")} onClick={() => moveNotice(-1)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
        </button>
        <span className="pager">{noticeIndex + 1}/{NOTICES.length}</span>
        <button type="button" aria-label={t("下一条", "Next")} onClick={() => moveNotice(1)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
        </button>
      </div>

      <div className="home-hero">
        <h1>{t("释放数字收益的力量", "Unlock the power of digital yield")}</h1>
        <p>{t("体验 AKN 预售与网体协议，运行在 BNB Smart Chain。合约开源、权限丢弃、去中心化。", "AKN is a presale and referral protocol on BNB Smart Chain. Open-source contracts, renounced permissions, and decentralized settlement.")}</p>
        <button className="btn btn-blue" type="button" onClick={() => navigate("/invest")}>
          {t("前往投资", "Start investing")}
        </button>
      </div>

      <div className="home-orbit animate-float">
        <div className="orbit-stage">
          <span className="orbit-ring a" />
          <span className="orbit-ring b" />
          <span className="orbit-ring c" />
          <span className="orbit-dot" />
          <img src={logo} alt="AKN" />
        </div>
        <div className="orbit-meta">
          <div className="k">{t("网络状态", "Network status")}</div>
          <div className="v">{t("去中心化且安全", "Decentralized and secure")}</div>
        </div>
      </div>

      <section className="home-sec">
        <div className="home-kicker">{t("为什么选择 AKN", "Why AKN")}</div>
        <h2>{t("源律机制，构建于 BSC 之上", "AKN, built on BSC")}</h2>
        <p className="lead">{t("全链上结算、透明合约。资金进入保险池与交互合约，收益由合约结算。", "On-chain settlement and transparent contracts. Funds go to the insurance pool and the interaction contract, and rewards are settled by contract.")}</p>
        <div className="home-grid">
          {FEATURES.map((item) => (
            <article className="home-feature" key={item.title[0]}>
              <div className="ic"><FeatureIcon name={item.icon} /></div>
              <h3>{t(item.title[0], item.title[1])}</h3>
              <p>{t(item.desc[0], item.desc[1])}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-sec">
        <div className="home-kicker">{t("如何运作", "How it works")}</div>
        <h2>{t("三步开始参与预售", "Join the presale in three steps")}</h2>
        <div className="home-grid">
          {STEPS.map((item, index) => (
            <article className="home-step" key={item.title[0]}>
              <div className="no">0{index + 1}</div>
              <h3>{t(item.title[0], item.title[1])}</h3>
              <p>{t(item.desc[0], item.desc[1])}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-ready">
        <h2>{t("准备好最大化您的资产了吗？", "Ready to maximize your assets?")}</h2>
        <p>{t("注册推荐关系后，按套餐参与 AKN 预售。资金进入保险池与交互合约，收益由合约结算。", "Bind a referrer, then join the AKN presale. Funds go to the insurance pool and the interaction contract, and rewards are settled by contract.")}</p>
        <button className="home-ready-btn" type="button" onClick={() => navigate("/invest")}>
          {t("前往投资", "Connect and invest")}
        </button>
      </section>

      <div className="earth">
        <div className="ewm"><span className="a">A</span><span className="k">K</span><span className="n">N</span></div>
        <div className="et">{t("源于代码，律于共识", "Code is the source. Consensus is the rule.")}</div>
        <div className="eln" />
        <div className="een">CODE · LIQUIDITY · CONSENSUS</div>
      </div>
    </section>
  );
}
