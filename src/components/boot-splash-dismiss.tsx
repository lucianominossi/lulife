"use client";

import { useEffect } from "react";

/** Hides the static #boot-splash once the client app has mounted. */
export function BootSplashDismiss() {
  useEffect(() => {
    document.documentElement.classList.add("app-ready");
  }, []);
  return null;
}
