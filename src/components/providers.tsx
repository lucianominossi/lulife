"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { BootSplashDismiss } from "@/components/boot-splash-dismiss";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <BootSplashDismiss />
      {children}
    </ThemeProvider>
  );
}
