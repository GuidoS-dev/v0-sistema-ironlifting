# Component Patterns

A reference of canonical, production-grade patterns for the most common UI components. These are not the only valid implementations — they're the **default starting point** when nothing else is specified.

All examples assume:
- React 18+ with TypeScript
- Tailwind CSS v4 with the design tokens from `tokens.css` exposed as utilities (e.g. `bg-bg`, `text-fg`, `border-border`)
- `cn` helper from `lib/utils.ts` (clsx + tailwind-merge)
- `cva` from `class-variance-authority`

---

## Table of contents

1. [Button](#button)
2. [Input](#input)
3. [Textarea](#textarea)
4. [Select](#select)
5. [Checkbox](#checkbox)
6. [Switch](#switch)
7. [Card](#card)
8. [Badge](#badge)
9. [Avatar](#avatar)
10. [Dialog / Modal](#dialog--modal)
11. [Toast](#toast)
12. [Tooltip](#tooltip)
13. [Tabs](#tabs)
14. [Empty state](#empty-state)
15. [Loading skeleton](#loading-skeleton)
16. [Data table](#data-table)
17. [Page shell](#page-shell)

---

## Button

```tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium",
    "rounded-md transition-colors duration-150 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:size-4 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary:   "bg-fg text-bg hover:bg-fg/90 active:bg-fg/80",
        secondary: "bg-surface text-fg border border-border hover:bg-surface-hover hover:border-border-strong",
        ghost:     "text-fg hover:bg-surface-hover",
        accent:    "bg-accent text-accent-fg hover:bg-accent-hover",
        danger:    "bg-danger text-bg hover:bg-danger/90",
        link:      "text-accent underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-xs gap-1.5",
        md: "h-9 px-4 text-sm",
        lg: "h-10 px-5 text-sm",
        xl: "h-12 px-6 text-base",
        icon: "size-9",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, iconLeft, iconRight, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        data-loading={loading || undefined}
        {...props}
      >
        {loading ? <Loader2 className="animate-spin" /> : iconLeft}
        {children}
        {!loading && iconRight}
      </button>
    );
  }
);
Button.displayName = "Button";
```

**Usage**

```tsx
<Button variant="accent" iconLeft={<Plus />}>New project</Button>
<Button variant="secondary" size="sm">Cancel</Button>
<Button loading>Saving</Button>
```

---

## Input

```tsx
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "flex h-9 w-full rounded-md border border-border bg-surface px-3 py-2",
        "text-sm text-fg placeholder:text-fg-subtle",
        "transition-colors duration-150 ease-out",
        "focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-bg-subtle",
        "aria-[invalid=true]:border-danger aria-[invalid=true]:focus-visible:ring-danger/20",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
```

**Always pair with `<Label>`** — placeholder is not a label.

---

## Textarea

```tsx
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-border bg-surface px-3 py-2",
        "text-sm text-fg placeholder:text-fg-subtle resize-y",
        "transition-colors focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
```

---

## Select

Use **Radix Select** under the hood for accessibility. Don't reinvent.

```tsx
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;

export const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 py-2",
      "text-sm text-fg",
      "focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20",
      "data-[placeholder]:text-fg-subtle disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="size-4 opacity-60" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = "SelectTrigger";

export const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position="popper"
      sideOffset={4}
      className={cn(
        "z-dropdown overflow-hidden rounded-lg border border-border bg-surface-elevated shadow-lg",
        "min-w-[8rem]",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
        "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
        className
      )}
      {...props}
    >
      <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = "SelectContent";

export const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center gap-2 rounded-md py-1.5 pl-8 pr-2",
      "text-sm text-fg outline-none",
      "data-[highlighted]:bg-surface-hover data-[state=checked]:font-medium",
      "data-[disabled]:opacity-50 data-[disabled]:pointer-events-none",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex size-4 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="size-4 text-accent" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = "SelectItem";
```

---

## Checkbox

Radix-based.

```tsx
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";

export const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer size-4 shrink-0 rounded border border-border-strong bg-surface",
      "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
      "data-[state=checked]:bg-accent data-[state=checked]:border-accent data-[state=checked]:text-accent-fg",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
      <Check className="size-3" strokeWidth={3} />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = "Checkbox";
```

---

## Switch

```tsx
import * as SwitchPrimitive from "@radix-ui/react-switch";

export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent",
      "transition-colors duration-200 ease-out",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
      "data-[state=checked]:bg-accent data-[state=unchecked]:bg-border-strong",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        "pointer-events-none block size-4 rounded-full bg-bg shadow-sm",
        "transition-transform duration-200 ease-out",
        "data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0.5"
      )}
    />
  </SwitchPrimitive.Root>
));
Switch.displayName = "Switch";
```

---

## Card

```tsx
export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border border-border bg-surface text-fg",
        "transition-colors hover:border-border-strong",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

export const CardHeader = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-1.5 p-6", className)} {...p} />
);
export const CardTitle = ({ className, ...p }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn("text-base font-medium leading-tight tracking-tight", className)} {...p} />
);
export const CardDescription = ({ className, ...p }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("text-sm text-fg-muted leading-snug", className)} {...p} />
);
export const CardContent = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-6 pt-0", className)} {...p} />
);
export const CardFooter = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex items-center gap-2 p-6 pt-0", className)} {...p} />
);
```

---

## Badge

```tsx
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tracking-tight",
  {
    variants: {
      variant: {
        neutral: "bg-bg-subtle text-fg-muted border border-border",
        accent:  "bg-accent/10 text-accent border border-accent/20",
        success: "bg-success/10 text-success border border-success/20",
        warning: "bg-warning/10 text-warning-700 border border-warning/20",
        danger:  "bg-danger/10 text-danger border border-danger/20",
        solid:   "bg-fg text-bg",
      },
    },
    defaultVariants: { variant: "neutral" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = ({ className, variant, ...props }: BadgeProps) => (
  <span className={cn(badgeVariants({ variant }), className)} {...props} />
);
```

---

## Avatar

```tsx
import * as AvatarPrimitive from "@radix-ui/react-avatar";

export const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn("relative flex size-9 shrink-0 overflow-hidden rounded-full bg-bg-subtle", className)}
    {...props}
  />
));
Avatar.displayName = "Avatar";

export const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image ref={ref} className={cn("aspect-square size-full object-cover", className)} {...props} />
));
AvatarImage.displayName = "AvatarImage";

export const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn("flex size-full items-center justify-center text-xs font-medium text-fg-muted", className)}
    {...props}
  />
));
AvatarFallback.displayName = "AvatarFallback";
```

---

## Dialog / Modal

Always use Radix Dialog. Always trap focus, always close on Esc, always overlay-click-to-close (configurable).

```tsx
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay
      className={cn(
        "fixed inset-0 z-overlay bg-fg/40 backdrop-blur-[2px]",
        "data-[state=open]:animate-in data-[state=open]:fade-in-0",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
      )}
    />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-modal w-full max-w-lg -translate-x-1/2 -translate-y-1/2",
        "rounded-xl border border-border bg-surface-elevated p-6 shadow-xl",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
        "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
        "data-[state=open]:slide-in-from-bottom-2",
        "duration-200",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        className={cn(
          "absolute right-4 top-4 rounded-sm opacity-60 transition-opacity hover:opacity-100",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
        )}
      >
        <X className="size-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = "DialogContent";

export const DialogHeader = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-1.5 mb-4", className)} {...p} />
);
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;
```

---

## Toast

Use **Sonner** (`sonner` package) — clean, accessible, well-themed. Don't reinvent.

```tsx
// app/layout.tsx
import { Toaster } from "sonner";

<Toaster
  position="bottom-right"
  toastOptions={{
    classNames: {
      toast: "border border-border bg-surface-elevated text-fg shadow-lg rounded-lg",
      title: "text-sm font-medium",
      description: "text-xs text-fg-muted",
    },
  }}
/>
```

```tsx
import { toast } from "sonner";
toast.success("Project created", { description: "View it in your dashboard." });
```

---

## Tooltip

```tsx
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-tooltip overflow-hidden rounded-md border border-border bg-fg px-2 py-1 text-xs text-bg",
      "data-[state=delayed-open]:animate-in data-[state=closed]:animate-out",
      "data-[state=delayed-open]:fade-in-0 data-[state=closed]:fade-out-0",
      "data-[state=delayed-open]:zoom-in-95 data-[state=closed]:zoom-out-95",
      className
    )}
    {...props}
  />
));
TooltipContent.displayName = "TooltipContent";
```

---

## Tabs

```tsx
import * as TabsPrimitive from "@radix-ui/react-tabs";

export const Tabs = TabsPrimitive.Root;

export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn("inline-flex items-center gap-1 border-b border-border", className)}
    {...props}
  />
));
TabsList.displayName = "TabsList";

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "relative inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-fg-muted",
      "transition-colors hover:text-fg",
      "data-[state=active]:text-fg",
      "after:absolute after:inset-x-0 after:-bottom-px after:h-px after:bg-transparent",
      "data-[state=active]:after:bg-fg",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 rounded-sm",
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = "TabsTrigger";

export const TabsContent = TabsPrimitive.Content;
```

---

## Empty state

A pattern, not a single component. Use this whenever a list is empty.

```tsx
<div className="flex flex-col items-center justify-center py-16 px-6 text-center">
  <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-bg-subtle border border-border">
    <Inbox className="size-5 text-fg-muted" />
  </div>
  <h3 className="text-base font-medium tracking-tight">No invoices yet</h3>
  <p className="mt-1 max-w-sm text-sm text-fg-muted">
    Create your first invoice to start tracking payments. It takes less than a minute.
  </p>
  <Button variant="accent" size="sm" iconLeft={<Plus />} className="mt-4">
    New invoice
  </Button>
</div>
```

---

## Loading skeleton

```tsx
export const Skeleton = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("animate-pulse rounded-md bg-bg-subtle", className)}
    aria-hidden="true"
    {...p}
  />
);

// Usage
<div className="space-y-2">
  <Skeleton className="h-4 w-2/3" />
  <Skeleton className="h-4 w-full" />
  <Skeleton className="h-4 w-5/6" />
</div>
```

Always provide `aria-hidden="true"` and a real `aria-busy` on the parent when the data loads.

---

## Data table

For anything beyond a static table, use **`@tanstack/react-table`** for headless logic + style with these classes:

```tsx
<table className="w-full text-sm">
  <thead>
    <tr className="border-b border-border">
      <th className="px-3 py-2 text-left font-medium text-fg-muted text-xs uppercase tracking-wider">
        Customer
      </th>
      {/* ... */}
    </tr>
  </thead>
  <tbody>
    {rows.map((row) => (
      <tr key={row.id} className="border-b border-border/60 hover:bg-surface-hover transition-colors">
        <td className="px-3 py-2.5 text-fg">{row.customer}</td>
        {/* ... */}
      </tr>
    ))}
  </tbody>
</table>
```

Right-align numbers. Use `tabular-nums` (`font-variant-numeric: tabular-nums`) for any column with figures.

---

## Page shell

The default app layout. Sidebar + topbar + main.

```tsx
<div className="grid min-h-dvh grid-cols-[260px_1fr] bg-bg text-fg">
  <aside className="border-r border-border bg-bg-subtle">
    <div className="flex h-14 items-center px-4 border-b border-border">
      <Logo />
    </div>
    <nav className="p-3 space-y-0.5">
      <NavItem href="/" icon={<Home />}>Dashboard</NavItem>
      <NavItem href="/invoices" icon={<FileText />}>Invoices</NavItem>
      <NavItem href="/settings" icon={<Settings />}>Settings</NavItem>
    </nav>
  </aside>

  <div className="flex flex-col">
    <header className="flex h-14 items-center justify-between px-6 border-b border-border">
      <h1 className="text-sm font-medium tracking-tight">Invoices</h1>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon"><Bell className="size-4" /></Button>
        <Avatar><AvatarFallback>GR</AvatarFallback></Avatar>
      </div>
    </header>

    <main className="flex-1 overflow-y-auto p-6">
      {children}
    </main>
  </div>
</div>
```
