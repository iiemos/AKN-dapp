import { useEffect } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import logo from "../../assets/logo.png";
import { useWalletConnector } from "../hooks/useWalletConnector";
import { useToast } from "./Toast";
import { getActionErrorMessage } from "../utils/walletErrors";

const TABS = [
  { to: "/", label: "首页", icon: "home" },
  { to: "/invest", label: "投资", icon: "invest" },
  { to: "/team", label: "团队", icon: "team" },
  { to: "/me", label: "我的", icon: "me" },
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
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const wallet = useWalletConnector();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  async function onWalletClick() {
    if (wallet.isConnected) {
      navigate("/me");
      return;
    }
    try {
      await wallet.connectWallet();
      toast("钱包已连接", "ok");
    } catch (error) {
      toast(getActionErrorMessage(error), "err");
    }
  }

  return (
    <div className="app">
      <header className="app-head">
        <img className="hlogo" src={logo} alt="AKN" />
        <div>
          <div className="wm"><span className="a">A</span><span className="k">K</span><span className="n">N</span></div>
          <div className="wm-tg">CODE · <span style={{ color: "var(--brand)" }}>LIQUIDITY</span> · CONSENSUS</div>
        </div>
        <button className={`wallet-pill${wallet.isConnected ? "" : " off"}`} type="button" onClick={onWalletClick}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="6" width="20" height="14" rx="2" />
            <path d="M16 13h2" />
            <path d="M2 10h20" />
          </svg>
          <span>{wallet.isConnecting ? "连接中" : wallet.isConnected ? wallet.shortAddress : "连接钱包"}</span>
          <svg className="chev" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </header>
      <Outlet />
      <nav className="tabbar">
        {TABS.map((tab) => (
          <NavLink key={tab.to} to={tab.to} end={tab.to === "/"} className={({ isActive }) => `tab${isActive ? " on" : ""}`}>
            <TabIcon name={tab.icon} />
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
