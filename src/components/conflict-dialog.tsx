"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { RefreshCw, ShieldAlert, X } from "lucide-react";
import { invalidateTaskQueries } from "../lib/task-api";
import { useConflictStore } from "../stores/conflict-store";

type ConflictViewState = Pick<
  ReturnType<typeof useConflictStore.getState>,
  "isOpen" | "message" | "latestData" | "serverVersion" | "clientVersion"
>;

export function ConflictDialog() {
  const state = useConflictStore();
  return (
    <ConflictDialogView
      state={state}
      onClose={state.closeConflict}
      onReload={async () => {
        await invalidateTaskQueries();
        state.closeConflict();
      }}
    />
  );
}

export function ConflictDialogView({
  state,
  onClose: closeConflict,
  onReload: handleRefreshAndClose,
}: {
  state: ConflictViewState;
  onClose: () => void;
  onReload: () => Promise<unknown>;
}) {
  const { isOpen, message, latestData, serverVersion, clientVersion } = state;
  if (!isOpen) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && closeConflict()}>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay backdrop-blur-sm" />
      <Dialog.Content
        role="alertdialog"
        aria-describedby="conflict-description"
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%_-_2rem)] max-w-lg rounded-2xl border border-danger/30 glass bg-surface p-6 shadow-glow animate-in-scale"
      >
        <button
          onClick={closeConflict}
          aria-label="Close conflict dialog"
          className="absolute top-4 right-4 text-faint hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" strokeWidth={1.5} />
        </button>

        <div className="flex items-start gap-4 mb-4">
          <div className="p-3 rounded-xl bg-danger/10 border border-danger/25 text-danger">
            <ShieldAlert className="w-7 h-7" strokeWidth={1.5} />
          </div>
          <div>
            <Dialog.Title className="text-xl font-bold text-foreground">
              This task was updated by someone else
            </Dialog.Title>
            <Dialog.Description id="conflict-description" className="text-sm text-muted mt-1">
              Your changes were safely paused to prevent overwriting their work.
            </Dialog.Description>
          </div>
        </div>

        <div className="space-y-3 text-sm text-muted bg-background/50 p-4 rounded-xl border border-border">
          <p>
            {message ||
              "Another user modified this deliverable at the exact same moment. Nothing was silently overwritten."}
          </p>

          {clientVersion !== null && serverVersion !== null && (
            <p className="text-xs font-mono">
              Your version: v{clientVersion} · Server version: v{serverVersion}
            </p>
          )}
          {latestData && (
            <div className="mt-3 pt-3 border-t border-border text-xs space-y-1.5">
              <div className="text-faint font-semibold uppercase tracking-wider">
                Current server state
              </div>
              <div className="flex items-center gap-2">
                <span className="text-faint">Status:</span>
                <span className="font-mono text-primary-tint">{latestData.status}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-faint">Latest Version:</span>
                <span className="font-mono text-warning">v{latestData.version}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-faint">Last Modified:</span>
                <span>{new Date(latestData.updatedAt).toLocaleTimeString()}</span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={closeConflict}
            className="px-4 py-2 rounded-lg text-sm font-medium text-muted hover:text-foreground hover:bg-surface-raised transition-colors duration-200"
          >
            Keep My View
          </button>
          <button
            onClick={handleRefreshAndClose}
            className="px-4 py-2 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-primary to-deep hover:brightness-110 shadow-glow flex items-center gap-2 transition-all duration-200"
          >
            <RefreshCw className="w-4 h-4" strokeWidth={1.5} />
            Reload Latest Version
          </button>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
