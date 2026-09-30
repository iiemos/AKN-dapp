import { useEffect, useState } from "react";
import { isAddress } from "viem";
import { useInvalidateAkn } from "../hooks/useAknReads";
import { useWalletConnector } from "../hooks/useWalletConnector";
import { useI18n } from "../i18n/locale";
import { registerMember } from "../services/aknContracts";
import { useReferral } from "../state/appState";
import { getActionErrorMessage } from "../utils/walletErrors";
import { useToast } from "./Toast";

export default function ReferralBindModal({ onClose }) {
  const { t } = useI18n();
  const toast = useToast();
  const wallet = useWalletConnector();
  const preset = useReferral();
  const invalidate = useInvalidateAkn();
  const [inviter, setInviter] = useState(preset);
  const [invalid, setInvalid] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!preset) return;
    setInviter(preset);
  }, [preset]);

  async function onBind() {
    const value = inviter.trim();
    if (!isAddress(value)) {
      setInvalid(true);
      toast(t("请输入正确的邀请人地址（0x + 40 位）", "Enter a valid referrer address (0x + 40 hex characters)"), "err");
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
      toast(t("邀请人绑定成功", "Referrer bound"), "ok");
    } catch (error) {
      toast(getActionErrorMessage(error), "err");
    } finally {
      setSubmitting(false);
    }
  }

  function close() {
    if (submitting) return;
    onClose();
  }

  return (
    <div className="bind-mask" onClick={close}>
      <div className="bind-dialog" role="dialog" aria-modal="true" aria-labelledby="bind-title" onClick={(event) => event.stopPropagation()}>
        <div className="bind-head">
          <h3 id="bind-title">{t("绑定邀请人", "Referral Program")}</h3>
          <button className="bind-x" type="button" aria-label={t("关闭", "Close")} onClick={close}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <p className="bind-sub">{t("绑定推荐人后即可参与预售，并获得团队收益。", "Bind a referrer to join the presale and earn team rewards.")}</p>
        <input
          className={`input${invalid ? " err" : ""}`}
          placeholder="0x..."
          value={inviter}
          disabled={submitting}
          onChange={(event) => {
            setInviter(event.target.value);
            setInvalid(false);
          }}
        />
        <div className="bind-steps">
          <h4>{t("操作说明", "How to operate")}</h4>
          <ul>
            <li>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              <span>{t("输入邀请人地址", "Enter the referrer's address")}</span>
            </li>
            <li>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              <span>{t("点击绑定按钮", "Click the bind button")}</span>
            </li>
            <li>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              <span>{t("在钱包中确认交易", "Confirm the transaction in your wallet")}</span>
            </li>
          </ul>
        </div>
        <button className="btn btn-blue" type="button" disabled={submitting} onClick={onBind}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M10 13a5 5 0 0 0 7.07.07l1.41-1.41a5 5 0 0 0-7.07-7.07L10 6" />
            <path d="M14 11a5 5 0 0 0-7.07-.07L5.5 12.34a5 5 0 0 0 7.07 7.07L14 18" />
          </svg>
          {submitting ? t("绑定中…", "Binding...") : t("绑定邀请人", "Bind Referrer")}
        </button>
      </div>
    </div>
  );
}
