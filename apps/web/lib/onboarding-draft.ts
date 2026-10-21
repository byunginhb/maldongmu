export const ONBOARDING_TTL_MS = 5 * 60 * 1000;
export const ONBOARDING_MAX_LENGTH = 2000;
const PREFIX = "mdm_onboarding_v1:";

type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type Draft = { text: string; expiresAt: number };

// Storage and time are injected so regressions need no browser or app modules.
export function createOnboardingDraftStore(
  storage: () => DraftStorage | null,
  now: () => number = Date.now,
) {
  const memory = new Map<string, Draft>();
  const consumed = new Set<string>();
  const validText = (text: unknown): text is string =>
    typeof text === "string" && text.length <= ONBOARDING_MAX_LENGTH && text.trim().length > 0;

  return {
    save(id: string, text: string): boolean {
      if (!id || !validText(text) || consumed.has(id)) return false;
      const draft: Draft = { text, expiresAt: now() + ONBOARDING_TTL_MS };
      // Keep a same-document fallback even when storage is only partly usable.
      memory.set(id, draft);
      try { storage()?.setItem(PREFIX + id, JSON.stringify(draft)); }
      catch { /* Same-document client navigation uses memory. */ }
      return true;
    },
    take(id: string): string {
      if (!id || consumed.has(id)) return "";
      const fallback = memory.get(id);
      memory.delete(id);
      consumed.add(id);
      let draft: unknown = fallback;
      try {
        const target = storage();
        if (target) {
          const raw = target.getItem(PREFIX + id);
          // Delete before returning anything that could initiate a send.
          try { target.removeItem(PREFIX + id); }
          catch {
            // If deletion alone is blocked, an empty tombstone also prevents replay.
            try { target.setItem(PREFIX + id, ""); }
            catch { return ""; }
          }
          if (raw !== null) {
            try { draft = JSON.parse(raw); }
            catch { return ""; }
          }
        }
      } catch { /* Fully blocked storage uses only the in-memory draft. */ }
      if (!draft || typeof draft !== "object") return "";
      const value = draft as Partial<Draft>;
      return validText(value.text) && typeof value.expiresAt === "number"
        && Number.isFinite(value.expiresAt) && value.expiresAt > now()
        && value.expiresAt <= now() + ONBOARDING_TTL_MS
        ? value.text : "";
    },
  };
}

const browserDrafts = createOnboardingDraftStore(() => {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
});

export const saveOnboardingDraft = (id: string, text: string): boolean => browserDrafts.save(id, text);
export const takeOnboardingDraft = (id: string): string => browserDrafts.take(id);
