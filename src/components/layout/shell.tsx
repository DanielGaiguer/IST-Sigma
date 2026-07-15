"use client";

import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

export function Shell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = (e: MediaQueryList | MediaQueryListEvent) => {
      setCollapsed(!e.matches);
    };
    sync(mq);
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const expand = useCallback(() => {
    setCollapsed((prev) => (window.innerWidth >= 1024 ? false : prev));
  }, []);

  const collapse = useCallback(() => {
    setCollapsed((prev) => (window.innerWidth >= 1024 ? true : prev));
  }, []);

  return (
    <div className="min-h-screen bg-muted/40">
      <Sidebar collapsed={collapsed} onMouseEnter={expand} onMouseLeave={collapse} />
      <Header collapsed={collapsed} />
      <main className={`pt-14 transition-all duration-200 ${collapsed ? "lg:pl-16" : "lg:pl-64"}`}>
        <div className="p-4 sm:p-6">{children}</div>
      </main>
    </div>
  );
}
