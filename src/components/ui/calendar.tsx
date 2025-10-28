"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  className?: string;
};

export function Calendar({ className, ...props }: CalendarProps) {
  return (
    <DayPicker
      className={cn(
        "bg-background p-2 [--cell-size:1.75rem]",
        "[&_button]:rounded-md [&_button]:text-xs",
        "[&_button:hover]:bg-accent [&_button:hover]:text-accent-foreground",
        className
      )}
      {...props}
    />
  );
}
