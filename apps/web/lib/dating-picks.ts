export type DatingSex = "남자" | "여자";
export const DATING_AGES = [
  { label: "20대", min: 20, max: 29 },
  { label: "30대", min: 30, max: 39 },
  { label: "40대", min: 40, max: 49 },
  { label: "50대 이상", min: 50, max: 99 },
] as const;
export type DatingCandidate = { uuid: string; sex?: string | null; age?: number | null };
export type DatingSlot<T> = { label: string; status: "ready" | "error"; pick: T | null };
export function mapDatingPick<T extends DatingCandidate>(items: readonly T[], sex: DatingSex, min: number, max: number): T | null {
  return items.find((item) => item.sex === sex && typeof item.age === "number" && Number.isInteger(item.age) && item.age >= min && item.age <= max) ?? null;
}
// キャッシュは各ホームのインスタンス内に閉じ、性別ごとに完了値と進行中の要求を保持する。
export function createDatingLoader<T extends DatingCandidate>(fetcher: (sex: DatingSex, min: number, max: number) => Promise<readonly T[]>) {
  const cache = new Map<DatingSex, Promise<DatingSlot<T>[]>>();
  return (sex: DatingSex): Promise<DatingSlot<T>[]> => {
    const existing = cache.get(sex);
    if (existing) return existing;
    const request = Promise.all(DATING_AGES.map(async ({ label, min, max }): Promise<DatingSlot<T>> => {
      try {
        const items = await fetcher(sex, min, max);
        return { label, status: "ready", pick: mapDatingPick(items, sex, min, max) };
      } catch {
        return { label, status: "error", pick: null };
      }
    }));
    cache.set(sex, request);
    return request;
  };
}
