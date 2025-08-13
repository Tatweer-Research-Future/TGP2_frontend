import { cn } from "@/lib/utils";

interface LoaderProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Loader({ className, size = "md" }: LoaderProps) {
  const sizeClasses = {
    sm: "w-6 h-6 border-2",
    md: "w-12 h-12 border-[5px]",
    lg: "w-16 h-16 border-[6px]",
  };

  return (
    <div
      className={cn(
        "border-dotted border-foreground rounded-full inline-block relative box-border",
        sizeClasses[size],
        className
      )}
      style={{
        animation: "rotation 2s linear infinite",
      }}
    />
  );
}
