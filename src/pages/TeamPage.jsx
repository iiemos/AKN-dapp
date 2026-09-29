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

function formatReferrer(address) {
  if (!isUsableAddress(address)) return "无上级";
  return shortAddress(address);
}

export default function TeamPage() {
  const toast = useToast();
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
      toast("钱包已连接", "ok");
    } catch (error) {
      toast(getActionErrorMessage(error), "err");
    }
  }

  async function onRegister() {
    const value = inviter.trim();
    if (!isAddress(value)) {
      setInvalid(true);
      toast("请输入正确的推荐人地址（0x + 40 位）", "err");
      return;
    }
    if (value.toLowerCase() === wallet.currentAddress.toLowerCase()) {
      setInvalid(true);
      toast("不能绑定自己的地址", "err");
      return;
    }
    setInvalid(false);
    setSubmitting(true);
    try {
      await wallet.ensureCorrectChain();
      await registerMember(wallet.currentAddress, value);
      await invalidate();
      toast("推荐关系注册成功", "ok");
    } catch (error) {
      toast(getActionErrorMessage(error), "err");
    } finally {
      setSubmitting(false);
    }
  }

  async function onCopyInvite() {
    const copied = await copyText(inviteLink);
    toast(copied ? "邀请链接已复制" : "复制失败，请手动复制", copied ? "ok" : "err");
  }

  return (
    <section className="view active">
      <div className="sec-title" style={{ marginTop: 16 }}><span className="bar" />我的团队</div>
      <div className="mini-grid">
        <div className="mini"><div className="l">直推人数</div><div className="v">{profile ? profile.directCount : "--"}</div></div>
        <div className="mini"><div className="l">有效会员</div><div className="v">{profile ? profile.activeDirectCount : "--"}</div></div>
        <div className="mini"><div className="l">团队业绩 (USDT)</div><div className="v">--</div></div>
        <div className="mini"><div className="l">可享代数</div><div className="v">--</div></div>
      </div>
      {wallet.isConnected && !isContractConfigReady(["network"]) ? <div className="empty">缺少合约地址，请配置 {getContractConfigMissingKeys(["network"]).join("、")}</div> : null}
      {profileQuery.error ? <div className="empty">{getActionErrorMessage(profileQuery.error)}</div> : null}

      <div style={{ marginTop: 14 }}>
        {!wallet.isConnected ? (
          <div className="card">
            <h3><span className="bar" />注册推荐关系</h3>
            <div className="note-box">连接钱包后，通过邀请链接或输入推荐人地址完成注册。关系永久记录、不可更改，注册后才能参与预售。</div>
            <button className="btn btn-blue" type="button" onClick={onConnect}>连接钱包</button>
          </div>
        ) : submitting ? (
          <div className="card">
            <div className="centered">
              <div className="spin" style={{ width: 40, height: 40, borderWidth: 3, margin: "0 auto 16px" }} />
              <div style={{ fontSize: 15 }}>正在链上确认注册…</div>
              <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 6 }}>请在钱包中确认交易并支付 Gas</div>
            </div>
          </div>
        ) : profile?.registered ? (
          <div className="card">
            <h3><span className="bar" />推荐关系已注册</h3>
            <div className="chain">
              <div className="chain-node"><div className="role">我的推荐人</div><div className="ad">{formatReferrer(profile.referrer)}</div></div>
              <div className="chain-arrow">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </div>
              <div className="chain-node me"><div className="role">我的地址</div><div className="ad">{wallet.shortAddress}</div></div>
            </div>
          </div>
        ) : (
          <div className="card">
            <h3><span className="bar" />注册推荐关系</h3>
            <div className="kv"><span className="k">我的地址</span><span className="v mono">{wallet.shortAddress}</span></div>
            <div className="field" style={{ marginTop: 13 }}>
              <label>推荐人地址</label>
              <input className={`input${invalid ? " err" : ""}`} placeholder="0x…（邀请链接自动带入，否则使用网体 Top）" value={inviter} onChange={(event) => { setInviter(event.target.value); setInvalid(false); }} />
              <div className="hint">注册仅限一次、不可更改，请仔细核对。确认后支付 Gas 完成注册。</div>
              {topMemberQuery.error ? <div className="hint" style={{ color: "#ff8a8a" }}>{getActionErrorMessage(topMemberQuery.error)}</div> : null}
            </div>
            <button className="btn btn-blue" type="button" onClick={onRegister}>确认注册并上链</button>
          </div>
        )}
      </div>

      {profile?.registered ? (
        <div className="card">
          <h3><span className="bar" />我的专属邀请链接</h3>
          <div className="addr-main">
            <span className="ad" style={{ fontSize: 11 }}>{inviteLink}</span>
            <button className="icon-btn" type="button" onClick={onCopyInvite} title="复制链接">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
          </div>
          <button className="btn btn-blue btn-sm" style={{ width: "100%", marginTop: 4 }} type="button" onClick={() => toast("邀请海报已生成（原型演示）")}>保存邀请海报</button>
        </div>
      ) : null}

      <div className="card">
        <h3><span className="bar" />推荐规则</h3>
        <ul className="rule-list">
          <li>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E4BC4E" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span><b>有效推荐</b>：推荐人必须正在产生收益；已出局或未投资的空号向上紧缩。</span>
          </li>
          <li>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#12C45C" strokeWidth="2">
              <path d="M12 2 2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <span>直推 N 人即享 N 代，每代静态收益 <b>2%</b>，烧伤机制，最高 <b>15 代</b>。</span>
          </li>
          <li>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#12C45C" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <span>代数奖在<b>领取静态收益时同步结算</b>；紧缩部分奖给上方满足条件的地址。</span>
          </li>
        </ul>
      </div>
    </section>
  );
}
