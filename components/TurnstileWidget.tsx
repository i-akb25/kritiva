"use client";

import Script from "next/script";
import { useEffect, useId, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (target: string | HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export function TurnstileWidget({ siteKey, resetKey, onToken, nonce }: { siteKey: string; resetKey: number; onToken: (token: string) => void; nonce?: string }) {
  const rawId = useId();
  const elementId = `turnstile-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const widgetId = useRef<string | null>(null);

  const render = () => {
    if (!siteKey || !window.turnstile || widgetId.current) return;
    widgetId.current = window.turnstile.render(`#${elementId}`, {
      sitekey: siteKey,
      theme: "light",
      size: "flexible",
      callback: (token: string) => onToken(token),
      "expired-callback": () => onToken(""),
      "error-callback": () => onToken(""),
    });
  };

  useEffect(() => {
    if (widgetId.current && window.turnstile) {
      window.turnstile.reset(widgetId.current);
      onToken("");
    }
  }, [resetKey, onToken]);

  useEffect(() => () => {
    if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
  }, []);

  if (!siteKey) return null;
  return <>
    <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" nonce={nonce} onLoad={render} />
    <div className="turnstile-wrap" id={elementId} />
  </>;
}
