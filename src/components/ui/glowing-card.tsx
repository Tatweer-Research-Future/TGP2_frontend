"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';

export interface GlowingCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  asChild?: boolean;
  glowColor?: string;
  hoverEffect?: boolean;
}

export const GlowingCard = React.forwardRef<HTMLDivElement, GlowingCardProps>(
  ({
    children,
    className,
    glowColor = "#3b82f6",
    hoverEffect = true,
    asChild = false,
    ...props
  }, ref) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const [showOverlay, setShowOverlay] = useState(false);
    const internalRef = ref || cardRef;

    useEffect(() => {
      const card = (internalRef as React.RefObject<HTMLDivElement>)?.current;
      const overlay = overlayRef.current;
      if (!card || !overlay || !hoverEffect) return;

      const handleMouseMove = (e: MouseEvent) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setShowOverlay(true);
        overlay.style.setProperty('--x', x + 'px');
        overlay.style.setProperty('--y', y + 'px');
      };

      const handleMouseLeave = () => {
        setShowOverlay(false);
      };

      card.addEventListener('mousemove', handleMouseMove);
      card.addEventListener('mouseleave', handleMouseLeave);

      return () => {
        card.removeEventListener('mousemove', handleMouseMove);
        card.removeEventListener('mouseleave', handleMouseLeave);
      };
    }, [hoverEffect, internalRef]);

    const Comp = asChild ? Slot : 'div';

    return (
      <Comp
        ref={internalRef as any}
        className={cn(
          "relative overflow-hidden",
          !asChild && className
        )}
        style={{
          '--glow-color': glowColor,
          ...(asChild ? {} : (props.style || {})),
        } as React.CSSProperties}
        {...(asChild ? {} : props)}
      >
        {asChild ? (
          React.Children.map(children, (child) => {
            if (React.isValidElement(child)) {
              return React.cloneElement(child as React.ReactElement<any>, {
                className: cn("relative overflow-hidden", child.props.className),
              });
            }
            return child;
          })
        ) : (
          children
        )}
        {hoverEffect && (
          <div
            ref={overlayRef}
            className={cn(
              "absolute inset-0 pointer-events-none select-none z-[1]",
              "opacity-0 transition-opacity duration-400 ease-out"
            )}
            style={{
              WebkitMask: "radial-gradient(15rem 15rem at var(--x, 0) var(--y, 0), #000 1%, transparent 50%)",
              mask: "radial-gradient(15rem 15rem at var(--x, 0) var(--y, 0), #000 1%, transparent 50%)",
              opacity: showOverlay ? 0.5 : 0,
            }}
          >
            <div
              className="absolute inset-0 rounded-md"
              style={{
                background: `radial-gradient(circle at var(--x, 0) var(--y, 0), ${glowColor}50, transparent 70%)`,
              }}
            />
          </div>
        )}
      </Comp>
    );
  }
);

GlowingCard.displayName = "GlowingCard";

