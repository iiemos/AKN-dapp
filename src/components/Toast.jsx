import { createContext, useCallback, useContext, useState } from "react";

const ToastContext = createContext(null);

function ToastIcon({ type }) {
  if (type === "ok") {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#E4BC4E" strokeWidth="2.4">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    );
  }
  if (type === "err") {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ff7a7a" strokeWidth="2.4">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v5M12 16h.01" />
      </svg>
    );
  }
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#5EE89A" strokeWidth="2.4">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((message, type) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((list) => [...list, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((list) => list.map((item) => (item.id === id ? { ...item, leaving: true } : item)));
      window.setTimeout(() => {
        setToasts((list) => list.filter((item) => item.id !== id));
      }, 300);
    }, 2400);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toast-wrap">
        {toasts.map((item) => (
          <div key={item.id} className={`toast ${item.type || ""}`} style={item.leaving ? { opacity: 0, transition: "opacity .3s" } : undefined}>
            <ToastIcon type={item.type} />
            <span>{item.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const push = useContext(ToastContext);
  if (!push) throw new Error("ToastProvider missing");
  return push;
}
