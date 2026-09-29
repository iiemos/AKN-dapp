import { useEffect, useState } from "react";
import { isAddress } from "viem";
import { getContractConfigMissingKeys, isContractConfigReady } from "../config/aknRuntime";
import { useInvalidateAkn, useNetworkProfile, useTopMember } from "../hooks/useAknReads";
import { useWalletConnector } from "../hooks/useWalletConnector";
import { isUsableAddress, registerMember, ZERO_ADDRESS } from "../services/aknContracts";
import { useReferral } from "../state/appState";
import { copyText } from "../utils/clipboard";
import { shortAddress } from "../utils/formatters";
import { getActionErrorMessage } from "../utils/walletErrors";
import { useToast } from "../components/Toast";
import { useI18n } from "../i18n/locale";

function formatReferrer(address, t) {
  if (!isUsableAddress(address)) return t("无上级", "No referrer");
  return shortAddress(address);
}

export default function TeamPage() {
  const toast = useToast();
  const { t } = useI18n();
  const wallet = useWalletConnector();
  const preset = useReferral();
  const profileQuery = useNetworkProfile(wallet.currentAddress);
  const topMemberQuery = useTopMember();
  const invalidate = useInvalidateAkn();
  const [inviter, setInviter] = useState(preset);
  const [invalid, setInvalid] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const profile = profileQuery.data;
  const inviteLink = wallet.currentAddress
    ? `${window.location.origin}/team?ref=${wallet.currentAddress}`
    : "";

  useEffect(() => {
    if (preset) {
      setInviter(preset);
      return;
    }
    const topMember = topMemberQuery.data;
    if (!isAddress(topMember) || topMember.toLowerCase() === ZERO_ADDRESS) return;
    if (wallet.currentAddress && topMember.toLowerCase() === wallet.currentAddress.toLowerCase()) return;
    setInviter((current) => current || topMember);
  }, [preset, topMemberQuery.data, wallet.currentAddress]);

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
    toast(copied ? t("邀请链接已复制", "Invite link copied") : t("复制失败，请手动复制", "Copy failed. Copy it manually"), copied ? "ok" : "err");
  }

  return (
    <section className="view active">
      <div className="sec-title" style={{ marginTop: 16 }}><span className="bar" />{t("我的团队", "My team")}</div>
      <div className="mini-grid">
        <div className="mini"><div className="l">{t("直推人数", "Direct referrals")}</div><div className="v">{profile ? profile.directCount : "--"}</div></div>
        <div className="mini"><div className="l">{t("有效会员", "Active members")}</div><div className="v">{profile ? profile.activeDirectCount : "--"}</div></div>
        <div className="mini"><div className="l">{t("团队业绩 (USDT)", "Team volume (USDT)")}</div><div className="v">--</div></div>
        <div className="mini"><div className="l">{t("可享代数", "Reward levels")}</div><div className="v">--</div></div>
      </div>
      {wallet.isConnected && !isContractConfigReady(["network"]) ? <div className="empty">{t(`缺少合约地址，请配置 ${getContractConfigMissingKeys(["network"]).join("、")}`, `Missing contract address. Configure ${getContractConfigMissingKeys(["network"]).join(", ")}`)}</div> : null}
      {profileQuery.error ? <div className="empty">{getActionErrorMessage(profileQuery.error)}</div> : null}

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
              <input className={`input${invalid ? " err" : ""}`} placeholder={t("0x…（邀请链接自动带入，否则使用网体 Top）", "0x... (invite link, otherwise network top)")} value={inviter} onChange={(event) => { setInviter(event.target.value); setInvalid(false); }} />
              <div className="hint">{t("注册仅限一次、不可更改，请仔细核对。确认后支付 Gas 完成注册。", "Registration can only be done once and cannot be changed. Check the address, then pay gas.")}</div>
              {topMemberQuery.error ? <div className="hint" style={{ color: "#ff8a8a" }}>{getActionErrorMessage(topMemberQuery.error)}</div> : null}
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
          <button className="btn btn-blue btn-sm" style={{ width: "100%", marginTop: 4 }} type="button" onClick={() => toast(t("邀请海报已生成（原型演示）", "Invite poster generated (preview)"))}>{t("保存邀请海报", "Save invite poster")}</button>
        </div>
      ) : null}

      <div className="card">
        <h3><span className="bar" />{t("推荐规则", "Referral rules")}</h3>
        <ul className="rule-list">
          <li>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E4BC4E" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span><b>{t("有效推荐", "Active referral")}</b>{t("：推荐人必须正在产生收益；已出局或未投资的空号向上紧缩。", ": The referrer must be earning. Inactive or exited accounts compress upward.")}</span>
          </li>
          <li>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#12C45C" strokeWidth="2">
              <path d="M12 2 2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <span>{t("直推 N 人即享 N 代，每代静态收益 ", "N direct referrals unlock N generations, each paying ")}<b>2%</b>{t("，烧伤机制，最高 ", " of static yield, with burn rules, up to ")}<b>15 {t("代", "generations")}</b>{t("。", ".")}</span>
          </li>
          <li>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#12C45C" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <span>{t("代数奖在", "Generation rewards settle ")}<b>{t("领取静态收益时同步结算", "when static yield is claimed")}</b>{t("；紧缩部分奖给上方满足条件的地址。", ". Compressed rewards go to the next qualified address above.")}</span>
          </li>
        </ul>
      </div>
    </section>
  );
}
