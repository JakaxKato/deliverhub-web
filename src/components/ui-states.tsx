import { AlertTriangle, Inbox, Loader2, RefreshCw } from "lucide-react";

export function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <span className="text-xs">{label}</span>
    </div>
  );
}

export function ErrorState({
  title,
  message,
  onRetry,
}: {
  title: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
      <div className="p-4 rounded-2xl bg-danger/10 border border-danger/30 text-danger">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <h3 className="text-sm font-bold text-foreground">{title}</h3>
      {message && <p className="text-xs text-muted max-w-md">{message}</p>}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-white bg-gradient-to-r from-primary to-deep hover:brightness-110 shadow-glow transition-all duration-200"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, message }: { title: string; message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
      <div className="p-3 rounded-xl bg-surface-raised border border-border text-faint">
        <Inbox className="w-5 h-5" />
      </div>
      <span className="text-xs font-semibold text-muted">{title}</span>
      {message && <span className="text-[11px] text-faint max-w-[240px]">{message}</span>}
    </div>
  );
}
