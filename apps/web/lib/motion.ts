export type MotionProfile = "home" | "me";

export function motionDelay(index: number, profile: MotionProfile): number {
  const step = profile === "home" ? 60 : 40;
  const cap = profile === "home" ? 6 : 4;
  return Math.min(cap, Number.isFinite(index) ? Math.max(0, Math.floor(index)) : 0) * step;
}

export function reducedMotion(match?: (query: string) => { matches: boolean }): boolean {
  try { return match ? match("(prefers-reduced-motion: reduce)").matches : true; }
  catch { return true; }
}

type Observer = Pick<IntersectionObserver, "observe" | "unobserve" | "disconnect">;
type Visibility = {
  readonly hidden: boolean;
  addEventListener(type: "visibilitychange", listener: () => void): void;
  removeEventListener(type: "visibilitychange", listener: () => void): void;
};
type Entry = { target: Element; isIntersecting: boolean };
type Options = {
  createObserver?: (callback: (entries: Entry[]) => void) => Observer;
  visibility: Visibility;
  reduced: boolean;
  seen?: Set<string>;
  inView: (element: Element) => boolean;
};

// DOM 변경은 호출자가 담당한다. 같은 페이지의 등장·헤더 감시가 IO 하나를 공유한다.
export function createMotionController(options: Options) {
  const seen = options.seen ?? new Set<string>();
  const pending = new Map<Element, { key: string; show: (animate: boolean) => void }>();
  const heroes = new Map<Element, { visible: boolean; pause: (paused: boolean) => void }>();
  let observer: Observer | undefined;
  let failed = options.reduced || !options.createObserver;
  let destroyed = false;
  const updateHeroes = () => {
    for (const hero of heroes.values()) hero.pause(failed || destroyed || options.visibility.hidden || !hero.visible);
  };
  const idle = () => {
    if (!pending.size && !heroes.size) { observer?.disconnect(); observer = undefined; }
  };
  const finish = (element: Element, animate: boolean) => {
    const item = pending.get(element);
    if (!item) return;
    pending.delete(element);
    seen.add(item.key);
    observer?.unobserve(element);
    item.show(animate);
  };
  const fallback = () => {
    failed = true;
    observer?.disconnect();
    observer = undefined;
    for (const [element] of pending) finish(element, false);
    updateHeroes();
  };
  const ensureObserver = () => {
    if (observer || failed || destroyed) return;
    try {
      observer = options.createObserver!((entries) => {
        if (destroyed || failed) return;
        try {
          for (const entry of entries) {
            const hero = heroes.get(entry.target);
            if (hero) hero.visible = entry.isIntersecting;
            if (entry.isIntersecting) finish(entry.target, true);
          }
          updateHeroes();
          idle();
        } catch { fallback(); }
      });
    } catch { fallback(); }
  };
  options.visibility.addEventListener("visibilitychange", updateHeroes);
  return {
    register(element: Element, key: string, prepare: () => void, show: (animate: boolean) => void) {
      if (destroyed || pending.has(element)) return;
      if (seen.has(key)) { show(false); return; }
      if (failed) { seen.add(key); show(false); return; }
      try {
        if (options.inView(element)) { seen.add(key); show(true); return; }
        pending.set(element, { key, show });
        ensureObserver();
        if (failed) return;
        prepare();
        observer!.observe(element);
      } catch { fallback(); show(false); }
    },
    watchHero(element: Element, pause: (paused: boolean) => void) {
      if (destroyed || heroes.has(element)) return;
      try {
        heroes.set(element, { visible: options.inView(element), pause });
        ensureObserver();
        updateHeroes();
        if (!failed) observer!.observe(element);
      } catch { fallback(); }
    },
    retain(elements: Set<Element>) {
      try {
        for (const [element, item] of pending) {
          if (!elements.has(element)) {
            observer?.unobserve(element);
            pending.delete(element);
            item.show(false);
          }
        }
        for (const [element, hero] of heroes) {
          if (!elements.has(element)) {
            observer?.unobserve(element);
            hero.pause(true);
            heroes.delete(element);
          }
        }
        idle();
      } catch { fallback(); }
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      options.visibility.removeEventListener("visibilitychange", updateHeroes);
      fallback();
      heroes.clear();
    },
  };
}
