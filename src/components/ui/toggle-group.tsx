"use client";

import * as React from "react";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { cn } from "@/lib/utils";

const ToggleGroup = ToggleGroupPrimitive;

type ToggleGroupItemProps = React.ComponentProps<typeof TogglePrimitive> & {
  className?: string;
};

function ToggleGroupItem({
  className,
  children,
  ...props
}: ToggleGroupItemProps) {
  return (
    <TogglePrimitive
      className={cn(
        "inline-flex h-9 min-w-[2.5rem] items-center justify-center rounded-md px-3 text-sm font-medium text-zinc-300 outline-none transition-colors hover:bg-zinc-800/80 data-[pressed]:bg-zinc-800 data-[pressed]:text-zinc-50",
        className
      )}
      {...props}
    >
      {children}
    </TogglePrimitive>
  );
}

export { ToggleGroup, ToggleGroupItem };
