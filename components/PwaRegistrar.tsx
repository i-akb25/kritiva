"use client";

import { useEffect, useState } from "react";

export function PwaRegistrar() {
  const [updateReady, setUpdateReady] = useState(false);
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js").then((next) => {
      next.addEventListener("updatefound", () => {
        const installing = next.installing;
        installing?.addEventListener("statechange", () => {
          if (installing.state === "installed" && navigator.serviceWorker.controller) setUpdateReady(true);
        });
      });
    }).catch(() => undefined);
  }, []);
  if (!updateReady) return null;
  return <div className="pwa-update" role="status"><span>A newer KRITIVA release is ready.</span><button onClick={() => window.location.reload()}>Update now</button></div>;
}
