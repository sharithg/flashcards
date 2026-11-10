import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

/*
 * PostHog-style buttons. The raised variants (default, secondary) sit on a darker
 * "base" drawn with stacked box-shadows: they lift on hover and press down on click.
 */
const raised =
  "border-[1.5px] border-primary-edge font-bold shadow-[0_2px_0_0_var(--primary-base),0_3.5px_0_0_var(--primary-edge)] -translate-y-px hover:-translate-y-0.5 hover:shadow-[0_3px_0_0_var(--primary-base),0_4.5px_0_0_var(--primary-edge)] active:translate-y-px active:shadow-[0_0.5px_0_0_var(--primary-base),0_2px_0_0_var(--primary-edge)] disabled:translate-y-0 disabled:shadow-none"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent text-[15px] font-semibold whitespace-nowrap transition-[translate,box-shadow,background-color,border-color,color] duration-100 outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: cn("bg-primary text-primary-foreground", raised),
        secondary: cn("bg-card text-foreground dark:border-primary", raised),
        outline:
          "border-border bg-card text-foreground hover:bg-accent aria-expanded:bg-accent aria-pressed:bg-accent aria-pressed:border-foreground/40",
        ghost:
          "text-foreground hover:border-border hover:bg-accent/60 aria-expanded:border-border aria-expanded:bg-accent aria-pressed:border-border aria-pressed:bg-accent",
        destructive:
          "border-border bg-card text-destructive hover:border-destructive/50 hover:bg-bad-soft focus-visible:ring-destructive/30",
        link: "h-auto px-0 text-brand underline decoration-brand/40 underline-offset-4 hover:decoration-brand",
      },
      size: {
        default: "h-9 gap-1.5 px-3.5",
        xs: "h-6 gap-1 rounded-sm px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 px-2.5 text-[13px] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 gap-2 px-5 text-base",
        icon: "size-9",
        "icon-xs": "size-6 rounded-sm [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  type,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      // Plain <button>s default to "button" so they never submit a surrounding form by accident.
      type={asChild ? type : (type ?? "button")}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
