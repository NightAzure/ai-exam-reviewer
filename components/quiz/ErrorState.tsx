import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="mx-auto max-w-4xl rounded-2xl border border-destructive/20 bg-surface p-6 shadow-sm"
    >
      <div className="flex items-start gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
          <AlertCircle aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-[family-name:var(--font-display)] text-xl text-ink">
            Couldn&apos;t Load This Quiz
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate">
            {message ||
              "Something went wrong while preparing your questions. Check your connection and try again."}
          </p>
          {onRetry ? (
            <Button type="button" className="mt-4" onClick={onRetry}>
              Try Again
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
