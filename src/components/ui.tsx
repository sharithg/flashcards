import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import type { MasteryCounts } from "@/lib/types";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:border disabled:border-dashed disabled:border-line disabled:bg-surface-2 disabled:text-muted disabled:brightness-100";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:brightness-110",
  secondary: "border border-line bg-surface text-ink hover:bg-surface-2",
  ghost: "text-muted hover:bg-surface-2 hover:text-ink",
  danger: "border border-line bg-surface text-bad hover:bg-bad-soft",
};

const sizes = { sm: "h-9 px-4 text-sm", md: "h-11 px-5 text-sm", lg: "h-12 px-7 text-base" };

export function buttonClass(variant: Variant = "primary", size: keyof typeof sizes = "md", extra = "") {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: keyof typeof sizes }) {
  return <button type="button" className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: keyof typeof sizes }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

export function IconButton({
  label,
  className = "",
  ...props
}: ComponentProps<"button"> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex size-10 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      {...props}
    />
  );
}

export function Spinner() {
  return (
    <div className="flex justify-center py-24" role="status" aria-label="Loading">
      <div className="size-8 animate-spin rounded-full border-3 border-line border-t-accent" />
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-line bg-surface shadow-sm ${className}`}>{children}</div>;
}

/**
 * The one mastery indicator used across the app: a segmented bar in a fixed order
 * (green mastered, orange learning, grey new) with an optional matching legend.
 */
export function MasteryBar({
  counts,
  legend = false,
  className = "",
}: {
  counts: MasteryCounts;
  legend?: boolean;
  className?: string;
}) {
  const total = counts.total || 1;
  return (
    <div className={className}>
      <div
        className="flex h-2 gap-px overflow-hidden rounded-full bg-surface-2"
        role="img"
        aria-label={`${counts.mastered} mastered, ${counts.learning} learning, ${counts.fresh} new`}
      >
        <div className="bg-good transition-all" style={{ width: `${(counts.mastered / total) * 100}%` }} />
        <div className="bg-warn transition-all" style={{ width: `${(counts.learning / total) * 100}%` }} />
      </div>
      {legend && <MasteryLegend counts={counts} className="mt-2" />}
    </div>
  );
}

export function MasteryLegend({ counts, className = "" }: { counts: MasteryCounts; className?: string }) {
  const item = (dot: string, n: number, label: string) => (
    <span className="flex items-center gap-1.5">
      <span className={`size-2 rounded-full ${dot}`} aria-hidden="true" />
      <span className="font-semibold text-ink">{n}</span> {label}
    </span>
  );
  return (
    <div className={`flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted ${className}`}>
      {item("bg-good", counts.mastered, "mastered")}
      {item("bg-warn", counts.learning, "learning")}
      {item("bg-line", counts.fresh, "new")}
    </div>
  );
}

/** A short keyboard key label. */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex min-w-5 items-center justify-center rounded border border-line bg-surface px-1 font-sans text-[11px] font-semibold text-muted">
      {children}
    </kbd>
  );
}

const paths: Record<string, ReactNode> = {
  star: <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5z" />,
  left: <path d="M15 5l-7 7 7 7" />,
  right: <path d="M9 5l7 7-7 7" />,
  shuffle: <path d="M4 7h3.5c2 0 3.2 1 4.3 2.7l.4.6M4 17h3.5c2 0 3.2-1 4.3-2.7l2.4-3.6C15.3 9 16.5 8 18.5 8H20M17 5l3 3-3 3M20 16h-1.5c-1.3 0-2.3-.5-3.1-1.3M17 13l3 3-3 3" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  edit: <path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" />,
  trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  x: <path d="M7 7l10 10M17 7L7 17" />,
  up: <path d="M6 15l6-6 6 6" />,
  down: <path d="M6 9l6 6 6-6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  cards: <path d="M7 4h11a2 2 0 012 2v9M4 8h11a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V8z" />,
  learn: <path d="M3 9l9-5 9 5-9 5-9-5zM7 11.5V16c0 1.5 2.2 3 5 3s5-1.5 5-3v-4.5M21 9v6" />,
  test: <path d="M8 4h8l3 3v13H5V4h3zM9 12l2 2 4-4M9 17h6" />,
  match: <path d="M4 4h7v7H4zM13 13h7v7h-7zM15 4h5v5M9 20H4v-5" />,
  rotate: <path d="M4 12a8 8 0 0113.7-5.6L20 8.5M20 4v4.5h-4.5M20 12a8 8 0 01-13.7 5.6L4 15.5M4 20v-4.5h4.5" />,
  expand: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  search: <path d="M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4" />,
  more: <path d="M5 12h.01M12 12h.01M19 12h.01" strokeWidth={3} />,
  pin: <path d="M9 4h6l-1 6 3 3H7l3-3-1-6zM12 13v7" />,
  help: <path d="M12 21a9 9 0 100-18 9 9 0 000 18zM9.5 9.5a2.5 2.5 0 114 2c-.8.5-1.5 1-1.5 2M12 17h.01" />,
  settings: <path d="M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4" />,
};

export function Icon({ name, className = "size-5", filled = false }: { name: keyof typeof paths; className?: string; filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      {paths[name]}
    </svg>
  );
}
