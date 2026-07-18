# 말동무 (maldongmu)

100만 한국인 페르소나(Nemotron-Personas-Korea)를 검색하고 대화하는 서비스.
전체 계획은 PLAN.md, 디자인 규칙은 DESIGN.md(반드시 준수), 맥미니 배포는 docs/macmini-setup.md.

## 구조
- `apps/server` — NestJS :4000. SQLite(better-sqlite3) + OpenRouter SSE 채팅. `pnpm dev:server`
- `apps/web` — Next.js :3000. 모바일 퍼스트, Vercel 배포 예정. `pnpm dev:web`
- `packages/shared` — 공용 타입 + 픽셀 아바타 생성기(`pixelAvatarSvg`, uuid 시드 결정적)
- `scripts/etl/build_db.py` — parquet → maldongmu.db (완료됨, 재실행 불필요)

## 데이터
- `apps/server/data/maldongmu.db` (5.1GB, git 제외): personas(경량 카드) / persona_details(상세, 대화 시작 시만 조회) / persona_fts(FTS5 trigram)
- FTS는 3자 이상만 MATCH, 2자 이하는 LIKE 폴백 (personas.service.ts에 구현됨)
- 원본 parquet는 `~/Documents/studio/Personas-Korea/data` (재빌드 때만 필요)

## 컨벤션 / 주의
- 서비스 기본 프롬프트: `apps/server/prompts/base.md` 한 곳에서 관리 (수정 후 서버 재시작).
  캐시 프리픽스 유지를 위해 완전 정적이어야 함 — 날짜·이름 등 변수 삽입 금지. 구조: 기본(정적)→인물→히스토리
- 인증: JWT 헤더 방식(웹뷰 앱 대비, 쿠키 금지). 게스트 → 대화 3회 후 구글/카카오 로그인 유도
- 서버 .env: .env.example 참고 (OPENROUTER_API_KEY 필요)
- 디자인: coral CTA 화면당 1개, 도트 폰트(NeoDunggeunmo)는 제목 전용, 그림자 금지 — DESIGN.md 참고
- 카피 톤: 다정한 존댓말 ("오늘은 누구랑 얘기할까요?")

## 현재 상태 (2026-07-17)
- 완료: 스캐폴딩, ETL(100만), 서버 코어 API, 웹 MVP(홈/검색/페르소나/SSE채팅/내 대화),
  구글·카카오 OAuth(게스트 이력 이관 포함), 어드민 대시보드(/admin), 배포 문서
- 서버·웹 빌드 및 실 DB 스모크 테스트 통과 (2026-07-17)
- 다음: 사용자가 직접 진행 — GitHub 푸시, OAuth/OpenRouter 키 발급, 맥미니 배포, Vercel 연결
  → **docs/launch-checklist.md** 순서대로 하면 됨 (상세: docs/macmini-setup.md)
- DB의 province 값은 축약형("서울", "경기", "전라남", "전북" 등), sex는 "남자"/"여자"
