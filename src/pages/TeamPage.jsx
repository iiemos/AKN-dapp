import { useEffect, useState } from "react";
import { isAddress } from "viem";
import { getContractConfigMissingKeys, isContractConfigReady } from "../config/aknRuntime";
import { useDirectMemberPage, useInvalidateAkn, useNetworkProfile, usePresaleStatus, useTotalInvestment } from "../hooks/useAknReads";
import { useWalletConnector } from "../hooks/useWalletConnector";
import { isUsableAddress, registerMember } from "../services/aknContracts";
import { useReferral } from "../state/appState";
import { copyText } from "../utils/clipboard";
import { formatTokenInteger, shortAddress } from "../utils/formatters";
import { getActionErrorMessage } from "../utils/walletErrors";
import { useToast } from "../components/Toast";
import { useI18n } from "../i18n/locale";

const DIRECT_PAGE_SIZE = 10;

function formatReferrer(address, t) {
  if (!isUsableAddress(address)) return t("无上级", "No referrer");
  return shortAddress(address);
}

function formatInvestment(value, decimals, pending) {
  if (pending) return "…";
  if (value == null || decimals == null) return "--";
  return formatTokenInteger(value, decimals);
}

export default function TeamPage() {
  const toast = useToast();
  const { t } = useI18n();
  const wallet = useWalletConnector();
  const preset = useReferral();
  const profileQuery = useNetworkProfile(wallet.currentAddress);
  const statusQuery = usePresaleStatus();
  const investedQuery = useTotalInvestment(wallet.currentAddress);
  const invalidate = useInvalidateAkn();
  const [inviter, setInviter] = useState(preset);
  const [invalid, setInvalid] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [directTab, setDirectTab] = useState("all");
  const [directPage, setDirectPage] = useState(0);
  const profile = profileQuery.data;
  const presaleReady = isContractConfigReady(["presale"]);
  const decimals = statusQuery.data?.decimals;
  const investmentPending = presaleReady && (investedQuery.isLoading || statusQuery.isLoading);
  const personalInvestment = formatInvestment(
    presaleReady ? investedQuery.data : null,
    decimals,
    investmentPending,
  );
  const directTotal = directTab === "active" ? profile?.activeDirectCount ?? 0 : profile?.directCount ?? 0;
  const directPageCount = Math.max(1, Math.ceil(directTotal / DIRECT_PAGE_SIZE));
  const currentDirectPage = Math.min(directPage, Math.max(0, directPageCount - 1));
  const directsQuery = useDirectMemberPage(
    wallet.currentAddress,
    directTab,
    currentDirectPage,
    DIRECT_PAGE_SIZE,
  );
  const inviteLink = wallet.currentAddress
    ? `${window.location.origin}/team?ref=${wallet.currentAddress}`
    : "";

  useEffect(() => {
    if (!preset) return;
    setInviter(preset);
  }, [preset]);

  useEffect(() => {
    setDirectPage(0);
  }, [wallet.currentAddress]);

  async function onConnect() {
    try {
      await wallet.connectWallet();
      toast(t("钱包已连接", "Wallet connected"), "ok");
    } catch (error) {
      toast(getActionErrorMessage(error), "err");
    }
  }

  async function onRegister() {
    const value = inviter.trim();
    if (!isAddress(value)) {
      setInvalid(true);
      toast(t("请输入正确的推荐人地址（0x + 40 位）", "Enter a valid referrer address (0x + 40 hex characters)"), "err");
      return;
    }
    if (value.toLowerCase() === wallet.currentAddress.toLowerCase()) {
      setInvalid(true);
      toast(t("不能绑定自己的地址", "You cannot bind your own address"), "err");
      return;
    }
    setInvalid(false);
    setSubmitting(true);
    try {
      await wallet.ensureCorrectChain();
      await registerMember(wallet.currentAddress, value);
      await invalidate();
      toast(t("推荐关系注册成功", "Referrer registered"), "ok");
    } catch (error) {
      toast(getActionErrorMessage(error), "err");
    } finally {
      setSubmitting(false);
    }
  }

  async function onCopyInvite() {
    const copied = await copyText(inviteLink);
    toast(copied ? t("复制成功", "Copied") : t("复制失败，请手动复制", "Copy failed. Copy it manually"), copied ? "ok" : "err");
  }

  return (
    <section className="view active">
      <div className="sec-title" style={{ marginTop: 16 }}><span className="bar" />{t("我的团队", "My team")}</div>
      <div className="mini-grid">
        <div className="mini"><div className="l">{t("个人投资", "Personal investment")}</div><div className="v">{personalInvestment}</div></div>
        <div className="mini"><div className="l">{t("用户级别", "User level")}</div><div className="v">--</div></div>
        <div className="mini"><div className="l">{t("团队业绩", "Team volume")}</div><div className="v">--</div></div>
        <div className="mini"><div className="l">{t("小区业绩", "Small-area volume")}</div><div className="v">--</div></div>
        <div className="mini"><div className="l">{t("进入底池", "Pool inflow")}</div><div className="v">--</div></div>
      </div>
      {wallet.isConnected && !isContractConfigReady(["network"]) ? <div className="empty">{t(`缺少合约地址，请配置 ${getContractConfigMissingKeys(["network"]).join("、")}`, `Missing contract address. Configure ${getContractConfigMissingKeys(["network"]).join(", ")}`)}</div> : null}
      {profileQuery.error || investedQuery.error ? <div className="empty">{getActionErrorMessage(profileQuery.error || investedQuery.error)}</div> : null}

      <div style={{ marginTop: 14 }}>
        {!wallet.isConnected ? (
          <div className="card">
            <h3><span className="bar" />{t("注册推荐关系", "Bind referrer")}</h3>
            <div className="note-box">{t("连接钱包后，通过邀请链接或输入推荐人地址完成注册。关系永久记录、不可更改，注册后才能参与预售。", "Connect a wallet, then register with an invite link or a referrer address. The relationship is permanent. Registration is required before the presale.")}</div>
            <button className="btn btn-blue" type="button" onClick={onConnect}>{t("连接钱包", "Connect wallet")}</button>
          </div>
        ) : submitting ? (
          <div className="card">
            <div className="centered">
              <div className="spin" style={{ width: 40, height: 40, borderWidth: 3, margin: "0 auto 16px" }} />
              <div style={{ fontSize: 15 }}>{t("正在链上确认注册…", "Confirming registration on-chain...")}</div>
              <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 6 }}>{t("请在钱包中确认交易并支付 Gas", "Confirm the transaction and pay gas in your wallet")}</div>
            </div>
          </div>
        ) : profile?.registered ? (
          <div className="card">
            <h3><span className="bar" />{t("推荐关系已注册", "Referrer registered")}</h3>
            <div className="chain">
              <div className="chain-node"><div className="role">{t("我的推荐人", "My referrer")}</div><div className="ad">{formatReferrer(profile.referrer, t)}</div></div>
              <div className="chain-arrow">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </div>
              <div className="chain-node me"><div className="role">{t("我的地址", "My address")}</div><div className="ad">{wallet.shortAddress}</div></div>
            </div>
          </div>
        ) : (
          <div className="card">
            <h3><span className="bar" />{t("注册推荐关系", "Bind referrer")}</h3>
            <div className="kv"><span className="k">{t("我的地址", "My address")}</span><span className="v mono">{wallet.shortAddress}</span></div>
            <div className="field" style={{ marginTop: 13 }}>
              <label>{t("推荐人地址", "Referrer address")}</label>
              <input className={`input${invalid ? " err" : ""}`} style={{ fontSize: 12 }} placeholder={t("0x…（仅邀请链接会自动带入）", "0x... (filled only from an invite link)")} value={inviter} onChange={(event) => { setInviter(event.target.value); setInvalid(false); }} />
              <div className="hint">{t("注册仅限一次、不可更改，请仔细核对。确认后支付 Gas 完成注册。", "Registration can only be done once and cannot be changed. Check the address, then pay gas.")}</div>
            </div>
            <button className="btn btn-blue" type="button" onClick={onRegister}>{t("确认注册并上链", "Register on-chain")}</button>
          </div>
        )}
      </div>

      {profile?.registered ? (
        <div className="card">
          <h3><span className="bar" />{t("我的专属邀请链接", "My invite link")}</h3>
          <div className="addr-main">
            <span className="ad" style={{ fontSize: 11 }}>{inviteLink}</span>
            <button className="icon-btn" type="button" onClick={onCopyInvite} title={t("复制链接", "Copy link")}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
          </div>
          <button className="btn btn-blue btn-sm" style={{ width: "100%", marginTop: 4 }} type="button" onClick={onCopyInvite}>{t("复制邀请链接", "Copy invite link")}</button>
        </div>
      ) : null}

      <div className="card">
        <h3><span className="bar" />{t("直推地址", "Direct addresses")}</h3>
        <div className="direct-tabs">
          <button className={`direct-tab${directTab === "all" ? " on" : ""}`} type="button" onClick={() => { setDirectTab("all"); setDirectPage(0); }}>
            <span>{t("直推数量", "Direct referrals")}</span>
            <b>{profile ? profile.directCount : "--"}</b>
          </button>
          <button className={`direct-tab${directTab === "active" ? " on" : ""}`} type="button" onClick={() => { setDirectTab("active"); setDirectPage(0); }}>
            <span>{t("有效直推数量", "Active direct referrals")}</span>
            <b>{profile ? profile.activeDirectCount : "--"}</b>
          </button>
        </div>
        {!wallet.isConnected ? <div className="empty">{t("连接钱包后查看直推地址。", "Connect a wallet to view direct referrals.")}</div>
        : !isContractConfigReady(["network"]) ? null
        : profileQuery.isLoading || (directTotal > 0 && directsQuery.isLoading) ? <div className="empty">{t("读取中…", "Loading...")}</div>
        : directsQuery.error ? <div className="empty">{getActionErrorMessage(directsQuery.error)}</div>
        : !directTotal ? <div className="empty">{directTab === "active" ? t("暂无有效直推。", "No active direct referrals.") : t("暂无直推地址。", "No direct referrals.")}</div>
        : !directsQuery.data ? <div className="empty">{t("读取中…", "Loading...")}</div>
        : (
          <>
            {directsQuery.data.map((member) => (
              <div className="order" key={member.address}>
                <div className="order-grid">
                  <div className="og direct-wide"><div className="l">{t("钱包地址", "Wallet")}</div><div className="v direct-address">{member.address}</div></div>
                  <div className="og"><div className="l">{t("个人投资", "Personal investment")}</div><div className="v">{formatInvestment(member.personalInvestment, decimals, presaleReady && statusQuery.isLoading)}</div></div>
                  <div className="og"><div className="l">{t("用户级别", "User level")}</div><div className="v">--</div></div>
                  <div className="og"><div className="l">{t("团队业绩", "Team volume")}</div><div className="v">--</div></div>
                  <div className="og"><div className="l">{t("小区业绩", "Small-area volume")}</div><div className="v">--</div></div>
                  <div className="og"><div className="l">{t("进入底池", "Pool inflow")}</div><div className="v">--</div></div>
                </div>
              </div>
            ))}
            {directTotal > DIRECT_PAGE_SIZE ? (
              <div className="order-pager">
                <button type="button" disabled={currentDirectPage === 0} onClick={() => setDirectPage(currentDirectPage - 1)}>{t("上一页", "Prev")}</button>
                <span>{currentDirectPage + 1}/{directPageCount}</span>
                <button type="button" disabled={currentDirectPage >= directPageCount - 1} onClick={() => setDirectPage(currentDirectPage + 1)}>{t("下一页", "Next")}</button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
