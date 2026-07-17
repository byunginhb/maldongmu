# 말동무 (maldongmu) — 개발 계획서

> 100만 명의 한국인 페르소나(Nemotron-Personas-Korea) 중 원하는 사람을 찾아 대화하는 서비스.
> "오늘은 누구랑 얘기할까요?"

작성일: 2026-07-16

---

## 1. 확정된 결정사항

| 항목 | 결정 |
|---|---|
| 서비스명 | 말동무 (영문/레포: `maldongmu`) |
| 구조 | 모노레포 (서버 + 웹 한 프로젝트) |
| 서버 | Node.js + **NestJS**, SSE(EventStream) 스트리밍 |
| LLM | **OpenRouter** API |
| DB | 로컬 **SQLite** (better-sqlite3 + Drizzle ORM) |
| 데이터 | 전체 **100만 페르소나** 인덱싱 |
| 웹 | **Next.js** (App Router), 모바일 퍼스트 반응형 |
| 인증 | 게스트로 바로 사용 → **대화 3회 후 구글/카카오 로그인** 유도 |
| 디자인 | 레트로 픽셀 감성 룩 + 따뜻한 일반 톤 (게임 시스템 요소 없음) |
| 서버 배포 | 맥미니 (직접 운영) |
| 웹 배포 | Vercel |
| 향후 | 웹뷰 기반 앱 출시 고려한 설계 |

---

## 2. 프로젝트 구조 (모노레포)

위치: `/Users/byunginsong/Documents/projects/maldongmu`

```
maldongmu/
├── apps/
│   ├── server/                 # NestJS API 서버 (맥미니 배포)
│   │   ├── src/
│   │   │   ├── personas/       # 페르소나 검색/조회
│   │   │   ├── chat/           # SSE 스트리밍 대화
│   │   │   ├── auth/           # 게스트 + 구글/카카오 OAuth
│   │   │   ├── admin/          # 어드민 API (통계/랭킹)
│   │   │   ├── analytics/      # 사용량 이벤트 기록
│   │   │   └── llm/            # OpenRouter 클라이언트
│   │   └── data/               # maldongmu.db (SQLite, git 제외)
│   └── web/                    # Next.js 웹 (Vercel 배포)
│       ├── app/
│       │   ├── (main)/         # 홈, 검색, 페르소나 상세
│       │   ├── chat/[id]/      # 대화 화면
│       │   └── admin/          # 어드민 대시보드
│       └── ...
├── packages/
│   └── shared/                 # 공용 타입, API 클라이언트, 아바타 생성기
├── scripts/
│   └── etl/                    # parquet → SQLite 변환 (1회성, Python)
├── DESIGN.md                   # 디자인 시스템 (아래 6장)
├── PLAN.md                     # 이 문서
├── docs/
│   └── macmini-setup.md        # 맥미니 서버 셋팅 가이드
└── pnpm-workspace.yaml
```

- 패키지 매니저: **pnpm workspaces** (모노레포 표준, Vercel도 지원)
- 웹뷰 앱 대비: 웹은 처음부터 API 호출을 `packages/shared`의 클라이언트로 통일 →
  나중에 앱(웹뷰)에서도 같은 서버 API 그대로 사용. 인증은 쿠키가 아닌 **JWT(헤더)** 기반으로 설계해 웹뷰 호환성 확보.

---

## 3. 데이터 계획

### 3.1 원본 데이터 현황
- parquet 9개, 총 1.9GB, **1,000,008행** (파일당 111,112행)
- 주요 컬럼: `persona`(한줄 요약), professional/sports/arts/travel/culinary/family 페르소나,
  cultural_background, skills, hobbies, career_goals, 나이/성별/지역/직업/학력 등 26개
- **이름 컬럼이 없음** → 페르소나 텍스트가 "전기태 씨는 …" 형태이므로 ETL에서 정규식으로 이름 추출
  (`^(\S+?) 씨는` 패턴, 실패 시 "이웃 #번호" 폴백)

### 3.2 ETL (parquet → SQLite)
- Python(pyarrow) 스크립트 1회 실행 → `maldongmu.db` 생성 (예상 2~3GB)
- 목록/검색용 컬럼과 상세 텍스트를 **같은 DB, 다른 테이블**로 분리:
  - `personas` (경량): uuid, name, one_liner(persona), age, sex, occupation, province, district — 목록/카드용
  - `persona_details`: uuid + 나머지 긴 텍스트 전부 — **대화 시작할 때만 조회** (시스템 프롬프트 구성용)
  - `persona_fts`: FTS5 가상 테이블 (**trigram 토크나이저** — 한글 부분일치 검색 지원)
- 검색: 키워드(FTS) + 필터(지역/연령대/성별/직업 카테고리) 조합
- 이렇게 하면 "용량 커서 타이틀만 먼저" 문제 해결: 목록 API는 경량 테이블만 읽고,
  상세는 필요할 때만 로드. 별도 파일 분리 불필요.

### 3.3 맥미니에 원본 데이터셋이 필요한가?
**런타임에는 불필요.** 서버는 `maldongmu.db`(SQLite)만 있으면 동작합니다.
- 권장: ETL은 지금 작업 중인 맥에서 실행 → 완성된 `maldongmu.db` 파일만 맥미니로 복사(scp)
- 다만 **인덱스 재구축/스키마 변경 가능성**에 대비해 parquet 1.9GB를 맥미니에도 백업해두는 걸 권장
  (용량 부담 크지 않고, 재빌드 시 데이터 다시 받을 필요 없음). 필수는 아님.

---

## 4. 서버 설계 (NestJS)

### 4.1 API 개요
```
GET  /api/personas/featured        # 홈 추천 (오늘의 이웃 — 일별 시드 랜덤 N명)
GET  /api/personas/search          # q + 필터(region, ageRange, sex, occupation) + 페이징
GET  /api/personas/random          # "아무나 만나기"
GET  /api/personas/:uuid           # 카드 상세 (경량)
GET  /api/personas/popular         # 인기 랭킹 (사용량 집계 기반)

POST /api/conversations            # 대화 시작 (persona uuid → 상세 로드, 시스템 프롬프트 구성)
GET  /api/conversations            # 내 대화 목록
GET  /api/conversations/:id        # 대화 + 메시지 이력
POST /api/chat/:conversationId     # 메시지 전송 → SSE 스트림 응답 (text/event-stream)

POST /api/auth/guest               # 게스트 토큰 발급
GET  /api/auth/google | /kakao     # OAuth (게스트 → 정식 계정 승격, 대화 이력 이관)

GET  /api/admin/stats              # DAU, 대화수, 토큰 사용량 추이
GET  /api/admin/personas/ranking   # 인기 페르소나
GET  /api/admin/users              # 사용자 목록/사용량
```

### 4.2 대화(SSE) 흐름
1. 클라이언트가 메시지 POST → 서버가 대화 이력 + 페르소나 시스템 프롬프트 조합
2. OpenRouter에 `stream: true`로 요청 → 청크를 SSE로 그대로 릴레이
3. 스트림 종료 시 메시지·토큰 사용량 DB 저장, usage 이벤트 기록
- 시스템 프롬프트: 페르소나 상세 필드(성격/말투/배경/취미) → "당신은 ○○입니다. 사투리·말투 유지,
  AI임을 드러내지 않되 안전 가이드라인 준수" 템플릿
- 대화 이력이 길어지면 최근 N턴 + 요약으로 컨텍스트 관리 (2단계에서)
- 기본 모델: 저렴한 모델(예: gemini-flash 계열)로 시작, 어드민에서 모델 전환 가능하게 설정값으로 관리

### 4.3 DB 스키마 (핵심)
```
personas / persona_details / persona_fts   # 3.2 참고
users            (id, type: guest|google|kakao, email?, nickname, created_at)
conversations    (id, user_id, persona_uuid, title, created_at, last_message_at)
messages         (id, conversation_id, role, content, tokens_in, tokens_out, created_at)
usage_events     (id, user_id, persona_uuid, event: chat_start|message|search, tokens, created_at)
daily_stats      (date, dau, conversations, messages, tokens)   # 배치 집계
```

### 4.4 인증/제한
- 게스트: 첫 방문 시 익명 JWT 발급 (웹뷰 호환) → 대화 **3회** 도달 시 로그인 요구
- OAuth: 구글 + 카카오. 로그인 시 게스트 이력을 계정으로 이관
- Rate limit: 사용자당 분당 메시지 제한 (OpenRouter 비용 보호)

---

## 5. 웹 설계 (Next.js)

### 5.1 화면
| 화면 | 내용 |
|---|---|
| 홈 | "오늘은 누구랑 얘기할까요?" + 오늘의 이웃 카드 6~8명 + 인기 페르소나 + 아무나 만나기 버튼 |
| 검색 | 키워드 + 필터 칩(지역/나이/성별/직업), 무한 스크롤 카드 목록 |
| 페르소나 카드 | 픽셀 아바타, 이름·나이·직업, 성격 한줄 → "대화 시작하기" |
| 대화 | 채팅 UI, 스트리밍 타이핑 표시, 상단에 페르소나 미니 프로필 |
| 내 대화 | 대화 이력 목록, 이어서 대화 |
| 어드민 | `/admin` (비밀번호/화이트리스트 보호) — 통계 차트, 인기 랭킹, 사용자별 사용량 |

### 5.2 픽셀 아바타 자동 생성
- 100만 명 이미지를 만들 수 없으므로 **uuid를 시드로 한 결정적(deterministic) SVG 픽셀 아바타** 생성
- 성별/연령대/직업 카테고리에 따라 머리모양·피부톤·옷 색 팔레트 분기 → 같은 사람은 항상 같은 얼굴
- `packages/shared/avatar`로 구현해 웹·어드민·OG 이미지에서 공용 사용
- 공유 기능: 페르소나별 OG 이미지(아바타 + 한줄 소개) 동적 생성

---

## 6. 디자인 시스템 (DESIGN.md 방향)

VoltAgent/awesome-design-md의 특정 브랜드를 그대로 쓰지 않고, **자체 DESIGN.md** 작성.
구조는 Stitch DESIGN.md 포맷(테마/컬러/타이포/컴포넌트/레이아웃/Do&Don't/반응형)을 따르되 내용은 말동무 고유.

- **무드**: 레트로 픽셀 감성 + 따뜻한 동네 분위기. 게임 UI 요소(LV, HP, 8bit 프레임)는 없음
- **컬러**: 크림 배경(#FDF6EF 계열) + 코랄/주황 포인트 + 딥브라운 텍스트 (광장/시장의 따뜻함)
- **타이포**:
  - 제목/로고/버튼: **네오둥근모(NeoDunggeunmo)** 등 한글 도트 폰트 → 픽셀 감성의 핵심
  - 본문/채팅: **Pretendard** → 긴 대화 가독성 확보
- **픽셀 요소는 3곳에만**: 아바타(도트), 제목 타이포, 소소한 장식(구분선·아이콘) — 절제해서 촌스러움 방지
- **채팅 버블**: 일반적인 라운드 버블 (가독성 우선), 페르소나 쪽 버블에만 옅은 컬러
- **모바일 퍼스트**: 하단 탭(홈/검색/내 대화), 터치 타겟 44px+, 데스크톱은 중앙 정렬 확장

→ 1단계에서 preview.html 포함한 DESIGN.md를 먼저 만들어 확인받고 진행.

---

## 7. 추가 아이디어 (백로그)

- **오늘의 이웃**: 날짜 시드 랜덤 추천 → 매일 새 인물, 재방문 동기
- **아무나 만나기**: 랜덤 1명 즉시 대화 (첫 경험 진입장벽 제거)
- **인기 랭킹**: usage_events 집계 → 홈 노출 (어드민 요구사항과 연결)
- **페르소나 공유 링크**: OG 이미지로 SNS 공유 → 바이럴 루프
- **대화 이어하기 + 첫인사**: 대화 시작 시 페르소나가 먼저 말 걸기 (빈 화면 방지)
- **인터뷰 모드** (차별화 포인트): 서비스 기획자/마케터가 타겟 조건으로 페르소나를 뽑아
  유저 인터뷰 시뮬레이션 — 이 폴더의 sector-king 인터뷰 실험이 이미 그 사례. B2B 확장 가능성
- **그룹 대화**: 페르소나 2~3명과 동시 대화 (후순위)
- **안전장치**: 시스템 프롬프트 가드레일, 미성년 페르소나 제외 필터, 신고 기능

---

## 8. 개발 로드맵

| 단계 | 내용 | 산출물 |
|---|---|---|
| **0. 준비** | 모노레포 스캐폴딩, DESIGN.md 작성·확인, ETL 실행 | 프로젝트 뼈대, maldongmu.db |
| **1. 서버 코어** | personas API(검색/추천/상세), OpenRouter SSE 채팅, 게스트 인증 | 로컬에서 curl로 대화 가능 |
| **2. 웹 MVP** | 홈/검색/카드/채팅 화면, 픽셀 아바타 | 로컬에서 E2E 시연 가능 |
| **3. 인증·사용량** | 구글/카카오 OAuth, 3회 제한, usage 기록 | 계정 체계 완성 |
| **4. 어드민** | 통계 대시보드, 인기 랭킹, 사용자 관리 | /admin |
| **5. 배포** | 맥미니(서버) + Vercel(웹), 도메인/HTTPS, github 연결 | 실서비스 URL |
| **6. 고도화** | 백로그 아이디어, 웹뷰 앱 준비 | - |

각 단계 끝날 때마다 확인받고 다음 단계 진행.

---

## 9. 맥미니 서버 셋팅 가이드 (요약)

> 상세 버전은 개발 시 `docs/macmini-setup.md`로 별도 작성. 핵심 절차:

1. **기본 환경**: Homebrew → `brew install node pnpm git` (Node 20 LTS)
2. **코드 배포**: github 레포 clone → `pnpm install` → `pnpm --filter server build`
3. **데이터**: 작업 맥에서 `scp maldongmu.db 맥미니:~/maldongmu/apps/server/data/`
   (parquet 원본도 백업용으로 복사 권장 — 필수 아님, 3.3 참고)
4. **환경변수**: `.env` — `OPENROUTER_API_KEY`, `JWT_SECRET`, OAuth 키, `ADMIN_PASSWORD`
5. **프로세스 관리**: `pm2 start dist/main.js --name maldongmu` + `pm2 startup`(launchd 등록, 재부팅 자동시작)
6. **외부 노출**: 공유기 포트포워딩 대신 **Cloudflare Tunnel 권장**
   (`brew install cloudflared` → 고정 IP·포트개방 불필요, 무료 HTTPS, `api.도메인` 연결)
   - SSE 주의: 프록시 버퍼링 없는지 확인 (Cloudflare Tunnel은 SSE 지원됨)
7. **절전 해제**: `sudo pmset -a sleep 0 displaysleep 10` (서버가 잠들지 않게)
8. **Vercel 웹 연동**: 웹 환경변수 `NEXT_PUBLIC_API_URL=https://api.도메인`, 서버 CORS에 Vercel 도메인 허용
9. **백업**: `maldongmu.db` 일일 스냅샷 (cron + 외장/클라우드)

---

## 10. 바로 결정/준비가 필요한 것

1. **프로젝트 폴더 접근**: `/Users/byunginsong/Documents/projects`는 현재 세션에 연결 안 됨 →
   개발 시작할 때 해당 폴더를 추가로 연결해주거나, 새 세션에서 그 폴더 열고 진행
2. **OpenRouter API 키** 준비 (개발용)
3. **도메인** 여부: 있으면 Cloudflare Tunnel 연결, 없어도 개발엔 지장 없음
4. OAuth(구글/카카오) 앱 등록은 3단계에서 하면 됨
