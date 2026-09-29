import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const KEY = "akn.locale";
const I18nContext = createContext(null);

let activeLocale = "zh";

export function readLocale() {
  try {
    return window.localStorage.getItem(KEY) === "en" ? "en" : "zh";
  } catch {
    return "zh";
  }
}

export function getActiveLocale() {
  return activeLocale;
}

export function setActiveLocale(locale) {
  activeLocale = locale === "en" ? "en" : "zh";
}

export const PACKAGE_EN = {
  "稳健增值": "Steady",
  "平衡收益": "Balanced",
  "进阶增长": "Growth",
  "高效回报": "Premium",
};

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(() => {
    const initial = readLocale();
    setActiveLocale(initial);
    return initial;
  });

  const setLocale = useCallback((next) => {
    const value = next === "en" ? "en" : "zh";
    setActiveLocale(value);
    setLocaleState(value);
    window.localStorage.setItem(KEY, value);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === "en" ? "en" : "zh-CN";
  }, [locale]);

  const t = useCallback((zh, en) => (locale === "en" ? en : zh), [locale]);
  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("I18nProvider missing");
  return value;
}
