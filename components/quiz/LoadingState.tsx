export function LoadingState() {
  return (
    <div
      className="mx-auto w-full max-w-4xl space-y-6"
      role="status"
      aria-live="polite"
      aria-label="Loading quiz"
    >
      <div className="rounded-2xl border border-ink/10 bg-surface p-5 shadow-sm sm:p-6">
        <div className="h-3 w-24 animate-pulse rounded bg-ink/10 motion-reduce:animate-none" />
        <div className="mt-3 h-8 w-2/3 animate-pulse rounded bg-ink/10 motion-reduce:animate-none" />
        <div className="mt-3 h-4 w-full max-w-xl animate-pulse rounded bg-ink/8 motion-reduce:animate-none" />
        <div className="mt-5 h-1.5 w-full animate-pulse rounded-full bg-ink/10 motion-reduce:animate-none" />
        <div className="mt-4 flex gap-3">
          <div className="h-6 w-16 animate-pulse rounded-full bg-ink/8 motion-reduce:animate-none" />
          <div className="h-6 w-24 animate-pulse rounded-full bg-ink/8 motion-reduce:animate-none" />
        </div>
      </div>

      <div className="rounded-2xl border border-ink/10 bg-surface p-5 shadow-sm sm:p-6">
        <div className="h-7 w-4/5 animate-pulse rounded bg-ink/10 motion-reduce:animate-none" />
        <div className="mt-5 space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-14 animate-pulse rounded-xl border border-ink/10 bg-ink/[0.04] motion-reduce:animate-none"
            />
          ))}
        </div>
      </div>

      <p className="text-center text-sm text-slate">Loading quiz…</p>
    </div>
  );
}
