"use client";

import { Children, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { revealStagger } from "../lib/reveal-stagger";

export default function RevealList({ children, className }: { children: ReactNode; className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const played = useRef(false);
  const [phase, setPhase] = useState("idle");

  useEffect(() => {
    const element = root.current;
    if (!element || played.current) return;
    if (typeof IntersectionObserver === "undefined" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let live = true;
    let observer: IntersectionObserver | undefined;
    try {
      observer = new IntersectionObserver((entries) => {
        if (!live || played.current || !entries.some((entry) => entry.isIntersecting)) return;
        played.current = true;
        observer?.disconnect();
        setPhase("revealed");
      }, { threshold: 0 });
      observer.observe(element);
      setPhase("pending");
    } catch {
      observer?.disconnect();
      setPhase("idle");
    }
    return () => {
      live = false;
      observer?.disconnect();
    };
  }, []);

  return (
    <div ref={root} className={className} data-testid="company-motion-list" data-reveal-phase={phase}>
      {Children.toArray(children).map((child, index) => (
        <div key={(typeof child === "object" && child !== null && "key" in child) ? child.key : index}
          className="company-reveal-slot"
          style={{ "--company-reveal-delay": `${revealStagger(index)}ms` } as CSSProperties}>
          {child}
        </div>
      ))}
    </div>
  );
}
