import { useEffect, useRef, useState } from "react";
// import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import logo from "../../assets/logo.png";
import { useNetworkProfile } from "../hooks/useAknReads";
import { useWalletConnector } from "../hooks/useWalletConnector";
import { useI18n } from "../i18n/locale";
import { getActionErrorMessage } from "../utils/walletErrors";
import ReferralBindModal from "./ReferralBindModal";
import { useToast } from "./Toast";

const TABS = [
  { to: "/", zh: "首页", en: "Home", icon: "home" },
  { to: "/invest", zh: "投资", en: "Invest", icon: "invest" },
  { to: "/team", zh: "团队", en: "Team", icon: "team" },
  { to: "/me", zh: "我的", en: "Me", icon: "me" },
];

function TabIcon({ name }) {
  if (name === "home") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <path d="M9 22V12h6v10" />
      </svg>
    );
  }
  if (name === "invest") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 3v18h18" />
        <rect x="7" y="10" width="3" height="7" />
        <rect x="12" y="6" width="3" height="11" />
        <rect x="17" y="13" width="3" height="4" />
      </svg>
    );
  }
  if (name === "team") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export default function AppShell() {
  const location = useLocation();
  const toast = useToast();
  const wallet = useWalletConnector();
  const { locale, setLocale, t } = useI18n();
  const profileQuery = useNetworkProfile(wallet.currentAddress);
  const [langOpen, setLangOpen] = useState(false);
  const [bindClosed, setBindClosed] = useState(false);
  const langRef = useRef(null);
  const bindReopenTimer = useRef(0);
  // const navigate = useNavigate();
  // const allowedPathRef = useRef(location.pathname === "/invest" ? "/" : location.pathname);
  // const investBlockedRef = useRef(false);
  const bindOpen = Boolean(
    wallet.isConnected
    && wallet.currentAddress
    && profileQuery.data
    && !profileQuery.data.registered
    && !bindClosed,
  );

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // useEffect(() => {
  //   if (location.pathname !== "/invest") {
  //     allowedPathRef.current = location.pathname;
  //     investBlockedRef.current = false;
  //     return;
  //   }
  //   if (investBlockedRef.current) return;
  //   investBlockedRef.current = true;
  //   toast(t("暂未开放", "Not open yet"));
  //   navigate(allowedPathRef.current, { replace: true });
  // }, [location.pathname, navigate, t, toast]);

  useEffect(() => () => window.clearTimeout(bindReopenTimer.current), []);

  useEffect(() => {
    window.clearTimeout(bindReopenTimer.current);
    setBindClosed(false);
  }, [wallet.currentAddress]);

  function dismissBindPrompt() {
    window.clearTimeout(bindReopenTimer.current);
    setBindClosed(true);
    bindReopenTimer.current = window.setTimeout(() => setBindClosed(false), 1000);
  }

  useEffect(() => {
    if (!langOpen) return undefined;
    function onPointerDown(event) {
      if (!langRef.current?.contains(event.target)) setLangOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [langOpen]);

  async function onWalletClick() {
    if (wallet.isConnected) {
      try {
        await wallet.disconnectWallet();
        toast(t("钱包已断开", "Wallet disconnected"));
      } catch (error) {
        toast(getActionErrorMessage(error), "err");
      }
      return;
    }
    try {
      await wallet.connectWallet();
      toast(t("钱包已连接", "Wallet connected"), "ok");
    } catch (error) {
      toast(getActionErrorMessage(error), "err");
    }
  }

  function chooseLocale(next) {
    setLocale(next);
    setLangOpen(false);
  }

  return (
    <div className="app">
      <header className="app-head">
        <div className="head-brand">
          <img className="hlogo" src={logo} alt="AKN" />
          <div className="head-name">
            <div className="wm"><span className="a">A</span><span className="k">K</span><span className="n">N</span></div>
            <div className="wm-tg">
              <div>CODE · <span style={{ color: "var(--brand)" }}>LIQUIDITY</span> ·</div>
              <div>CONSENSUS</div>
            </div>
          </div>
        </div>
        <div className="head-actions">
          <button className={`wallet-pill${wallet.isConnected ? "" : " off"}`} type="button" onClick={onWalletClick}>
            <span className="wallet-dot" />
            <span className="wallet-addr">{wallet.isConnecting ? t("连接中", "Connecting") : wallet.isConnected ? wallet.shortAddress : t("连接钱包", "Connect")}</span>
            {wallet.isConnected ? (
              <svg className="wallet-exit" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" width="1em" height="1em" viewBox="0 0 24 24">
                <path fill="currentColor" d="m17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5M4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4z" />
              </svg>
            ) : null}
          </button>
          <div className="lang-wrap" ref={langRef}>
            <button className="lang-btn" type="button" aria-label={t("切换语言", "Language")} aria-expanded={langOpen} onClick={() => setLangOpen((open) => !open)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18" />
                <path d="M12 3a14 14 0 0 1 0 18" />
                <path d="M12 3a14 14 0 0 0 0 18" />
              </svg>
            </button>
            {langOpen ? (
              <div className="lang-menu">
                <button type="button" className={locale === "zh" ? "on" : ""} onClick={() => chooseLocale("zh")}>中文</button>
                <button type="button" className={locale === "en" ? "on" : ""} onClick={() => chooseLocale("en")}>English</button>
              </div>
            ) : null}
          </div>
        </div>
      </header>
      <Outlet />
      {/* {location.pathname === "/invest" ? null : <Outlet />} */}
      {/* Invest entry block is temporarily disabled.
          onClick={(event) => {
            if (tab.to !== "/invest") return;
            event.preventDefault();
            toast(t("暂未开放", "Not open yet"));
          }}
      */}
      <nav className="tabbar">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === "/"}
            className={({ isActive }) => `tab${isActive ? " on" : ""}`}
          >
            <TabIcon name={tab.icon} />
            {t(tab.zh, tab.en)}
          </NavLink>
        ))}
      </nav>
      {bindOpen ? <ReferralBindModal onClose={dismissBindPrompt} /> : null}
    </div>
  );
}
