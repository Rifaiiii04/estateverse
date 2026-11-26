"use client";

import React, { useCallback, useRef, useState } from "react";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

/** Wording of one confirmation question. */
export interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

// useConfirmDialog replaces window.confirm(): `await confirm({...})` resolves true only when the user confirms.
export function useConfirmDialog() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  // Opens the dialog and waits for the user's answer.
  const confirm = useCallback((next: ConfirmOptions) => {
    resolver.current?.(false);
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  // Closes the dialog and reports the answer to the waiting caller.
  const settle = useCallback((ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOptions(null);
  }, []);

  const confirmDialog = <ConfirmDialog options={options} onSettle={settle} />;
  return { confirm, confirmDialog };
}

// ConfirmDialog renders an accessible, app-styled confirmation for destructive actions.
function ConfirmDialog({ options, onSettle }: { options: ConfirmOptions | null; onSettle: (ok: boolean) => void }) {
  return (
    <AlertDialog.Root open={options !== null} onOpenChange={(open) => !open && onSettle(false)}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-[150] bg-black/30 supports-backdrop-filter:backdrop-blur-xs transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <AlertDialog.Popup className="fixed left-1/2 top-1/2 z-[151] w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl outline-none transition-all data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
          <div className="flex items-start gap-3">
            {options?.destructive && (
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                <AlertTriangle className="size-4" aria-hidden="true" />
              </span>
            )}
            <div className="space-y-1.5">
              <AlertDialog.Title className="text-base font-bold text-neutral-950">{options?.title}</AlertDialog.Title>
              <AlertDialog.Description className="text-sm text-neutral-600">{options?.description}</AlertDialog.Description>
            </div>
          </div>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => onSettle(false)}>
              {options?.cancelLabel ?? "Batal"}
            </Button>
            <Button variant={options?.destructive ? "destructive" : "default"} onClick={() => onSettle(true)}>
              {options?.confirmLabel ?? "Ya, lanjutkan"}
            </Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
