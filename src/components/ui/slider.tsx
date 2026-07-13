import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn("relative flex w-full touch-none select-none items-center", className)}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-primary/15">
      <SliderPrimitive.Range
        className="absolute h-full rounded-full"
        style={{
          backgroundImage:
            "linear-gradient(90deg, var(--brand-from, hsl(var(--primary))), var(--brand-to, hsl(var(--primary))))",
        }}
      />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb
      className="block h-5 w-5 rounded-full border-2 border-background bg-background shadow-md ring-0 transition-transform duration-150 hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50"
      style={{
        backgroundImage:
          "linear-gradient(135deg, var(--brand-from, hsl(var(--primary))), var(--brand-to, hsl(var(--primary))))",
        boxShadow:
          "0 0 0 2px var(--background, #fff), 0 4px 12px -2px color-mix(in oklab, var(--brand-from, #888) 55%, transparent)",
      }}
    />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
