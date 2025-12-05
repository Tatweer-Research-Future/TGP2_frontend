"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonGroupProps = React.HTMLAttributes<HTMLDivElement> & {
  orientation?: "horizontal" | "vertical";
};

/**
 * A lightweight implementation of the shadcn ButtonGroup.
 * Groups related buttons together and normalizes their border radius so
 * they appear as a single control.
 */
function ButtonGroup({
  className,
  orientation = "horizontal",
  ...props
}: ButtonGroupProps) {
  return (
    <div
      role="group"
      data-orientation={orientation}
      className={cn(
        "inline-flex isolate rounded-md border bg-background shadow-xs",
        orientation === "vertical" ? "flex-col" : "flex-row",
        // Normalize border-radius for direct child buttons
        "[&>[data-slot=button]]:rounded-none [&>[data-slot=button]:first-child]:rounded-l-md [&>[data-slot=button]:last-child]:rounded-r-md",
        orientation === "vertical" &&
          "[&>[data-slot=button]:first-child]:rounded-t-md [&>[data-slot=button]:last-child]:rounded-b-md",
        className
      )}
      {...props}
    />
  );
}

export { ButtonGroup };


