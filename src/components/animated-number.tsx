import { useEffect, useState } from "react";
import { animate, useMotionValue, useTransform } from "framer-motion";

interface Props {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
}

export function AnimatedNumber({ value, format = (n) => n.toFixed(0), duration = 0.6, className }: Props) {
  const mv = useMotionValue(value);
  const [display, setDisplay] = useState(format(value));

  useEffect(() => {
    const controls = animate(mv, value, {
      duration,
      ease: [0.32, 0.72, 0, 1],
      onUpdate: (latest) => setDisplay(format(latest)),
    });
    return controls.stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  // appease unused warning
  void useTransform;

  return <span className={className}>{display}</span>;
}
