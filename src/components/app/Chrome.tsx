"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

/** Lets full-screen learning modes hide the navigation chrome. */
const Ctx = createContext<{ hidden: boolean; setHidden: (v: boolean) => void } | null>(null);

export function ChromeProvider({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);
  const value = useMemo(() => ({ hidden, setHidden }), [hidden]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useChrome() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useChrome must be used inside ChromeProvider");
  return ctx;
}

/** Hide the navigation while this component is mounted. */
export function useFocusMode(active = true) {
  const { setHidden } = useChrome();
  useEffect(() => {
    if (!active) return;
    setHidden(true);
    return () => setHidden(false);
  }, [active, setHidden]);
}
