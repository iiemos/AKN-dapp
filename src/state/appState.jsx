import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { isAddress } from "viem";

const SelectionContext = createContext(null);
const ReferralContext = createContext("");
const REF_KEY = "akn.referrer";

export function SelectionProvider({ children }) {
  const [packageIndex, setPackageIndex] = useState(0);
  const value = useMemo(() => ({ packageIndex, setPackageIndex }), [packageIndex]);
  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

export function usePackageSelection() {
  const value = useContext(SelectionContext);
  if (!value) throw new Error("SelectionProvider missing");
  return value;
}

export function ReferralProvider({ children }) {
  const [params] = useSearchParams();
  const fromUrl = params.get("ref") || "";
  const [referrer, setReferrer] = useState(() => {
    if (isAddress(fromUrl)) return fromUrl;
    const stored = window.sessionStorage.getItem(REF_KEY) || "";
    return isAddress(stored) ? stored : "";
  });

  useEffect(() => {
    if (!isAddress(fromUrl)) return;
    setReferrer(fromUrl);
    window.sessionStorage.setItem(REF_KEY, fromUrl);
  }, [fromUrl]);

  return <ReferralContext.Provider value={referrer}>{children}</ReferralContext.Provider>;
}

export function useReferral() {
  return useContext(ReferralContext);
}
