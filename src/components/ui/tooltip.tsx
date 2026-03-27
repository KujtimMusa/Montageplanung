"use client";

import * as React from "react";
import { Tooltip } from "@base-ui/react/tooltip";
import { cn } from "@/lib/utils";

function TooltipProvider({
  children,
  ...props
}: React.ComponentProps<typeof Tooltip.Provider>) {
  return <Tooltip.Provider {...props}>{children}</Tooltip.Provider>;
}

function TooltipRoot({
  children,
  ...props
}: React.ComponentProps<typeof Tooltip.Root>) {
  return <Tooltip.Root {...props}>{children}</Tooltip.Root>;
}

function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof Tooltip.Trigger>) {
  return <Tooltip.Trigger {...props} />;
}

function TooltipContent({
  className,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof Tooltip.Popup> &
  Pick<React.ComponentProps<typeof Tooltip.Positioner>, "sideOffset">) {
  return (
    <Tooltip.Portal>
      <Tooltip.Positioner sideOffset={sideOffset}>
        <Tooltip.Popup
          className={cn(
            "z-50 max-w-xs rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100 shadow-md",
            className
          )}
          {...props}
        />
      </Tooltip.Positioner>
    </Tooltip.Portal>
  );
}

export { TooltipRoot as Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
