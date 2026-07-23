"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "lulife-hide-amounts";

type PrivacyContextValue = {
  hidden: boolean;
  ready: boolean;
  toggle: () => void;
  setHidden: (hidden: boolean) => void;
};

const PrivacyContext = createContext<PrivacyContextValue | null>(null);

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [hidden, setHiddenState] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setHiddenState(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // ignore
    }
    setReady(true);
  }, []);

  const setHidden = useCallback((next: boolean) => {
    setHiddenState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // ignore
    }
  }, []);

  const toggle = useCallback(() => {
    setHiddenState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ hidden, ready, toggle, setHidden }),
    [hidden, ready, toggle, setHidden],
  );

  return (
    <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  const ctx = useContext(PrivacyContext);
  if (!ctx) {
    return {
      hidden: false,
      ready: true,
      toggle: () => {},
      setHidden: () => {},
    };
  }
  return ctx;
}

export const HIDDEN_AMOUNT_LABEL = "R$ ••••";
