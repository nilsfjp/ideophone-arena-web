// Responsive chart width via ResizeObserver, SSR/test-safe: the state starts
// at defaultWidth and the observer attaches through a callback ref — under
// renderToStaticMarkup refs never fire, so node-env tests render the charts
// deterministically at the default width. In a browser without ResizeObserver
// the chart simply stays at the default (graceful, not broken).

import { useCallback, useRef, useState } from "react";

export function useChartSize(defaultWidth = 720): {
  ref: (el: HTMLElement | null) => void;
  width: number;
} {
  const [width, setWidth] = useState(defaultWidth);
  const cleanup = useRef<(() => void) | null>(null);

  const ref = useCallback((el: HTMLElement | null) => {
    cleanup.current?.();
    cleanup.current = null;
    if (el === null || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const measured = entries[0]?.contentRect.width;
      // Rounded to keep re-renders from sub-pixel churn.
      if (measured) setWidth(Math.round(measured));
    });
    observer.observe(el); // fires once immediately with the initial size
    cleanup.current = () => observer.disconnect();
  }, []);

  return { ref, width };
}
