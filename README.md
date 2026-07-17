# 말동무 (maldongmu)

100만 명의 한국인 페르소나(Nemotron-Personas-Korea) 중 원하는 사람을 찾아 대화하는 서비스.

> "오늘은 누구랑 얘기할까요?"

## 구조

- `apps/server` — NestJS API 서버 (SSE 채팅, OpenRouter, SQLite)
- `apps/web` — Next.js 웹 (모바일 퍼스트, Vercel 배포)
- `packages/shared` — 공용 타입 + 픽셀 아바타 생성기
- `scripts/etl` — parquet → SQLite 변환 (1회성)

## 개발 시작

```bash
pnpm install

# 1. DB 생성 (최초 1회, Nemotron parquet 필요)
python3 scripts/etl/build_db.py --src <parquet 폴더> --out apps/server/data/maldongmu.db

# 2. 서버 (:4000)
cp apps/server/.env.example apps/server/.env   # OPENROUTER_API_KEY 입력
pnpm dev:server

# 3. 웹 (:3000)
pnpm dev:web
```

자세한 계획은 [PLAN.md](./PLAN.md), 디자인 시스템은 [DESIGN.md](./DESIGN.md), 맥미니 배포는 [docs/macmini-setup.md](./docs/macmini-setup.md) 참고.
