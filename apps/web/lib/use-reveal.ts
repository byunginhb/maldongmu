"use client";

import { useEffect, useRef } from "react";
import { createMotionController, motionDelay, reducedMotion, type MotionProfile } from "./motion";

export function useReveal(profile: MotionProfile) {
  const root = useRef<HTMLElement>(null);
  const seen = useRef(new Set<string>());
  useEffect(() => {
    const page = root.current;
    if (!page) return;
    const processed = new WeakSet<Element>();
    let mutations: MutationObserver | undefined;
    let media: MediaQueryList | undefined;
    let stopped = false;
    const reset = () => {
      page.classList.remove("company-motion-ready");
      page.querySelectorAll<HTMLElement>(".company-motion-pending, .company-motion-enter").forEach((element) => {
        element.classList.remove("company-motion-pending", "company-motion-enter");
      });
      page.querySelectorAll<HTMLElement>('[data-testid="company-hero-avatars"]').forEach((element) => {
        element.style.animationPlayState = "paused";
      });
    };
    const controller = createMotionController({
      visibility: document,
      seen: seen.current,
      reduced: reducedMotion(typeof window.matchMedia === "function" ? window.matchMedia.bind(window) : undefined),
      createObserver: typeof IntersectionObserver === "function"
        ? (callback) => new IntersectionObserver(callback, { threshold: 0 })
        : undefined,
      inView: (element) => {
        const rect = element.getBoundingClientRect();
        return rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
      },
    });
    const stop = () => {
      stopped = true;
      mutations?.disconnect();
      controller.destroy();
      reset();
    };
    const scan = () => {
      if (stopped) return;
      try {
        const elements = new Set<Element>();
        page.querySelectorAll<HTMLElement>('[data-testid="company-home-reveal"], [data-testid="company-motion-item"]').forEach((element, index) => {
          elements.add(element);
          if (processed.has(element)) return;
          processed.add(element);
          const home = element.dataset.testid === "company-home-reveal";
          const key = home ? `home-region:${index}` : element.dataset.motionKey;
          if (!key) return;
          const delay = home ? index * 60 : motionDelay(Number(element.dataset.motionIndex ?? 0), profile);
          element.style.setProperty("--company-motion-delay", `${delay}ms`);
          controller.register(element, key,
            () => element.classList.add("company-motion-pending"),
            (animate) => {
              element.classList.remove("company-motion-pending");
              element.classList.toggle("company-motion-enter", animate);
            });
        });
        page.querySelectorAll<HTMLElement>('[data-testid="company-hero-avatars"]').forEach((element) => {
          elements.add(element);
          controller.watchHero(element, (paused) => {
            element.style.animationPlayState = paused ? "paused" : "running";
          });
        });
        controller.retain(elements);
      } catch { stop(); }
    };
    const preferenceChanged = () => {
      if (media?.matches) stop();
    };
    try {
      if (typeof window.matchMedia === "function") {
        media = window.matchMedia("(prefers-reduced-motion: reduce)");
        media.addEventListener("change", preferenceChanged);
      }
      page.classList.add("company-motion-ready");
      scan();
      if (!stopped) {
        mutations = new MutationObserver(scan);
        mutations.observe(page, { childList: true, subtree: true });
      }
    } catch { stop(); }
    return () => {
      stop();
      media?.removeEventListener("change", preferenceChanged);
    };
  }, [profile]);
  return root;
}
