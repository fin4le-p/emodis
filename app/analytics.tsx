"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// ---- any を使わない gtag 型定義 ----
type Gtag = {
  (command: "js", date: Date): void;
  (command: "config", targetId: string, config?: Record<string, unknown>): void;
  (command: "event", action: string, params?: Record<string, unknown>): void;
  (command: "set", params: Record<string, unknown>): void;
  (command: "consent", mode: "default" | "update", params: Record<string, unknown>): void;
};

declare global {
  interface Window {
    gtag?: Gtag;
  }
}

// useSearchParams を使う部分は Suspense 内で実行させる
function AnalyticsInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  useEffect(() => {
    if (!gaId || typeof window === "undefined" || !window.gtag) return;

    const url =
      pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");

    window.gtag("event", "page_view", {
      page_location: window.location.origin + url,
      page_path: pathname,
      page_title: document.title,
    });
  }, [pathname, searchParams, gaId]);

  return null;
}

// デフォルトエクスポートは Suspense で包む
export default function Analytics() {
  return (
    <Suspense fallback={null}>
      <AnalyticsInner />
    </Suspense>
  );
}
