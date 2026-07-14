import { cn } from "@/lib/utils";

type PageShellProps = {
  children: React.ReactNode;
  className?: string;
  width?: "standard" | "wide" | "full";
};

const widthClass = {
  standard: "max-w-6xl",
  wide: "max-w-7xl",
  full: "max-w-none",
};

export function PageShell({
  children,
  className,
  width = "wide",
}: PageShellProps) {
  return (
    <main
      className={cn(
        "mx-auto w-full px-4 py-5 sm:px-6 sm:py-7 lg:px-6 lg:py-8",
        widthClass[width],
        className,
      )}
    >
      {children}
    </main>
  );
}

export function PageHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      {children}
    </header>
  );
}

export const courseGridClass =
  "grid gap-4 sm:gap-5 grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))]";

export const workspaceGridClass =
  "grid grid-cols-1 gap-6 xl:grid-cols-[minmax(280px,0.9fr)_minmax(0,2fr)]";

export const segmentedTabsListClass =
  "grid w-full gap-1 rounded-lg bg-muted p-1 h-auto";

export const segmentedTabsTriggerClass =
  "rounded-md py-2.5 text-sm font-medium text-muted-foreground transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm";
