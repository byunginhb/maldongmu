/** 네트워크·React에 의존하지 않는 응답 경계와 세션 내 최근 이웃 관리. */
export type DrawNeighbor = {
  uuid: string;
  name: string;
  sex: string;
  age: number;
  occupation: string;
  province: string;
  oneLiner: string;
};

export function parseDrawNeighbor(value: unknown): DrawNeighbor {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid neighbor");
  const p = value as Record<string, unknown>;
  for (const key of ["uuid", "name", "sex", "occupation", "province", "oneLiner"] as const) {
    if (typeof p[key] !== "string" || !(p[key] as string).trim()) throw new Error(`Invalid neighbor ${key}`);
  }
  if (typeof p.age !== "number" || !Number.isInteger(p.age) || p.age < 0 || p.age > 130) throw new Error("Invalid neighbor age");
  return {
    uuid: p.uuid as string, name: p.name as string, sex: p.sex as string,
    age: p.age, occupation: p.occupation as string, province: p.province as string,
    oneLiner: p.oneLiner as string,
  };
}

export function createNeighborDraw(fetcher: () => Promise<unknown>, recentLimit = 8) {
  if (!Number.isInteger(recentLimit) || recentLimit < 1 || recentLimit > 100) throw new Error("Invalid recent limit");
  let recent: string[] = [];
  let pending: Promise<DrawNeighbor> | null = null;
  const draw = (): Promise<DrawNeighbor> => {
    if (pending) return pending;
    // 마이크로태스크에서 fetcher를 실행해 동기 예외와 재진입도 같은 잠금으로 처리한다.
    const task = Promise.resolve().then(async () => {
      let person: DrawNeighbor | undefined;
      for (let attempt = 0; attempt < 3; attempt++) {
        person = parseDrawNeighbor(await fetcher());
        if (!recent.includes(person.uuid)) break;
      }
      const result = person!;
      recent = [...recent.filter((id) => id !== result.uuid), result.uuid].slice(-recentLimit);
      return result;
    });
    pending = task.then(
      (person) => { pending = null; return person; },
      (error: unknown) => { pending = null; throw error; },
    );
    return pending;
  };
  return { draw, recentIds: (): readonly string[] => [...recent] };
}
