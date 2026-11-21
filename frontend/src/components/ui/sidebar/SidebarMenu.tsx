"use client";

import * as React from "react";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

// Renders the list that holds sidebar menu items.
function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">) {
  return <ul data-slot="sidebar-menu" data-sidebar="menu" className={cn("flex w-full min-w-0 flex-col gap-0", className)} {...props} />;
}

// Renders one sidebar menu entry.
function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li data-slot="sidebar-menu-item" data-sidebar="menu-item" className={cn("group/menu-item relative", className)} {...props} />;
}

// Maps each sidebar menu button variant and size to its classes.
const sidebarMenuButtonVariants = cva(
  "peer/menu-button group/menu-button flex w-full cursor-pointer items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm ring-sidebar-ring outline-hidden transition-[width,height,padding] group-has-data-[sidebar=menu-action]/menu-item:pr-8 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-open:hover:bg-sidebar-accent data-open:hover:text-sidebar-accent-foreground data-active:bg-sidebar-accent data-active:font-medium data-active:text-sidebar-accent-foreground [&_svg]:size-4 [&_svg]:shrink-0 [&>span:last-child]:truncate",
  {
    variants: {
      variant: {
        default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        outline:
          "bg-background shadow-[0_0_0_1px_var(--sidebar-border)] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_var(--sidebar-accent)]",
      },
      size: {
        default: "h-8 text-sm max-md:h-11",
        sm: "h-7 text-xs",
        lg: "h-12 text-sm group-data-[collapsible=icon]:p-0!",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

// Renders a sidebar navigation button (or a link via `render`) with an active state.
function SidebarMenuButton({
  render,
  isActive = false,
  variant = "default",
  size = "default",
  className,
  ...props
}: useRender.ComponentProps<"button"> &
  React.ComponentProps<"button"> & { isActive?: boolean } & VariantProps<typeof sidebarMenuButtonVariants>) {
  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">({ className: cn(sidebarMenuButtonVariants({ variant, size }), className) }, props),
    render,
    state: { slot: "sidebar-menu-button", sidebar: "menu-button", size, active: isActive },
  });
}

// Renders a small counter pinned to the right of a menu button.
function SidebarMenuBadge({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-menu-badge"
      data-sidebar="menu-badge"
      className={cn(
        "pointer-events-none absolute top-1.5 right-1 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-medium text-sidebar-foreground tabular-nums select-none group-data-[collapsible=icon]:hidden peer-hover/menu-button:text-sidebar-accent-foreground peer-data-active/menu-button:text-sidebar-accent-foreground max-md:top-3",
        className
      )}
      {...props}
    />
  );
}

export { SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuBadge };
