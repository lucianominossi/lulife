"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, X } from "lucide-react";

export function useSuccessToast(durationMs = 3200) {
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), durationMs);
    return () => window.clearTimeout(id);
  }, [toast, durationMs]);

  return { toast, setToast, clearToast: () => setToast(null) };
}

export function SuccessToast({
  message,
  onClose,
}: {
  message: string | null;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-6 right-6 z-[110] flex max-w-sm items-start gap-3 rounded-2xl border border-white/10 bg-[#141A23] px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
          role="status"
        >
          <CheckCircle2
            size={18}
            className="mt-0.5 shrink-0 text-[var(--color-ok)]"
          />
          <p className="flex-1 text-sm font-medium text-white">{message}</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--color-ink-subtle)] transition hover:bg-white/5 hover:text-white"
            aria-label="Fechar"
          >
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
