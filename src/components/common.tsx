import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleHelp,
  ClipboardCheck,
  Ellipsis,
  GraduationCap,
  Layers,
  Maximize2,
  Pencil,
  Pin,
  Plus,
  RotateCcw,
  Search,
  Shapes,
  Shuffle,
  SlidersHorizontal,
  Star,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ComponentProps } from "react";
import { Button, type buttonVariants } from "@/components/ui/button";
import type { MasteryCounts } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";

export { Kbd } from "@/components/ui/kbd";

type ButtonStyle = VariantProps<typeof buttonVariants>;

/** A Next.js link styled as a shadcn button. */
export function ButtonLink({ variant, size, className, ...props }: ComponentProps<typeof Link> & ButtonStyle) {
  return (
    <Button asChild variant={variant} size={size} className={className}>
      <Link {...props} />
    </Button>
  );
}

/** A square, label-only icon button. */
export function IconButton({
  label,
  variant = "ghost",
  size = "icon",
  ...props
}: ComponentProps<typeof Button> & { label: string }) {
  return <Button aria-label={label} title={label} variant={variant} size={size} {...props} />;
}

export function Spinner() {
  return (
    <div className="flex justify-center py-24" role="status" aria-label="Loading">
      <div className="size-7 animate-spin rounded-full border-3 border-border border-t-primary" />
    </div>
  );
}

/** Small uppercase label used above prompts and section headings. */
export function Eyebrow({ className, ...props }: ComponentProps<"span">) {
  return <span className={cn("block text-xs font-semibold tracking-wider text-muted-foreground uppercase", className)} {...props} />;
}

/**
 * The one mastery indicator used across the app: a segmented bar in a fixed order
 * (green mastered, amber learning, grey new) with an optional matching legend.
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
        className="flex h-2 gap-px overflow-hidden rounded-sm border bg-muted"
        role="img"
        aria-label={`${counts.mastered} mastered, ${counts.learning} learning, ${counts.fresh} new`}
      >
        <div className="bg-good transition-all" style={{ width: `${(counts.mastered / total) * 100}%` }} />
        <div className="bg-primary transition-all" style={{ width: `${(counts.learning / total) * 100}%` }} />
      </div>
      {legend && <MasteryLegend counts={counts} className="mt-2" />}
    </div>
  );
}

export function MasteryLegend({ counts, className = "" }: { counts: MasteryCounts; className?: string }) {
  const item = (dot: string, n: number, label: string) => (
    <span className="flex items-center gap-1.5">
      <span className={cn("size-2 rounded-[2px]", dot)} aria-hidden="true" />
      <span className="font-semibold text-foreground tabular-nums">{n}</span> {label}
    </span>
  );
  return (
    <div className={cn("flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground", className)}>
      {item("bg-good", counts.mastered, "mastered")}
      {item("bg-primary", counts.learning, "learning")}
      {item("border border-border bg-muted", counts.fresh, "new")}
    </div>
  );
}

const ICONS = {
  star: Star,
  left: ChevronLeft,
  right: ChevronRight,
  shuffle: Shuffle,
  close: X,
  edit: Pencil,
  trash: Trash2,
  check: Check,
  x: X,
  up: ChevronUp,
  down: ChevronDown,
  plus: Plus,
  cards: Layers,
  learn: GraduationCap,
  test: ClipboardCheck,
  match: Shapes,
  rotate: RotateCcw,
  expand: Maximize2,
  search: Search,
  more: Ellipsis,
  pin: Pin,
  help: CircleHelp,
  settings: SlidersHorizontal,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, className = "size-5", filled = false }: { name: IconName; className?: string; filled?: boolean }) {
  const C = ICONS[name];
  return <C aria-hidden="true" strokeWidth={2} fill={filled ? "currentColor" : "none"} className={cn("shrink-0", className)} />;
}
