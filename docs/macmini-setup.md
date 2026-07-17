# 맥미니 서버 셋팅 가이드

말동무 API 서버를 맥미니에서 24시간 운영하기 위한 절차. (개발 맥에서 준비 → 맥미니에 배포)

## 0. 사전 준비 (개발 맥에서)

- github에 `maldongmu` 레포 푸시
- ETL로 만든 `maldongmu.db` 준비 (약 5GB — 레포에는 포함하지 않음, .gitignore 처리됨)
- OpenRouter API 키

## 1. 기본 환경 설치

```bash
# Homebrew (없다면)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

brew install node@20 git
npm install -g pnpm pm2
```

## 2. 코드 + 데이터 배포

```bash
# 맥미니에서
git clone https://github.com/<계정>/maldongmu.git ~/maldongmu
cd ~/maldongmu
pnpm install
pnpm --filter @maldongmu/server build
```

```bash
# 개발 맥에서 DB 복사 (5GB, 같은 네트워크면 수 분)
scp apps/server/data/maldongmu.db <맥미니계정>@<맥미니IP>:~/maldongmu/apps/server/data/
```

parquet 원본(1.9GB)도 재빌드 대비 백업해두려면 (선택):

```bash
scp -r ~/Documents/studio/Personas-Korea/data <맥미니계정>@<맥미니IP>:~/nemotron-personas-korea/
```

## 3. 환경변수

```bash
cd ~/maldongmu/apps/server
cp .env.example .env
nano .env
```

```
PORT=4000
DATABASE_PATH=/Users/<계정>/maldongmu/apps/server/data/maldongmu.db
OPENROUTER_API_KEY=sk-or-...          # 실제 키
OPENROUTER_MODEL=google/gemini-2.5-flash
JWT_SECRET=<openssl rand -hex 32 로 생성>
GUEST_CONVERSATION_LIMIT=3
ADMIN_PASSWORD=<강력한 비밀번호>
CORS_ORIGINS=https://<vercel 도메인>,http://localhost:3000
SERVER_PUBLIC_URL=https://api.<도메인>          # OAuth 콜백에 사용
WEB_URL=https://<vercel 도메인>                  # 로그인 후 돌아갈 웹 주소
GOOGLE_CLIENT_ID=...                             # 구글 클라우드 콘솔
GOOGLE_CLIENT_SECRET=...
KAKAO_REST_API_KEY=...                           # 카카오 developers
KAKAO_CLIENT_SECRET=...                          # (보안 > Client Secret 활성화 시)
```

### OAuth 앱 등록 (1회)

**구글** — https://console.cloud.google.com/apis/credentials
1. OAuth 클라이언트 ID 생성 (웹 애플리케이션)
2. 승인된 리디렉션 URI에 추가: `https://api.<도메인>/api/auth/google/callback`
   (로컬 테스트용: `http://localhost:4000/api/auth/google/callback`)

**카카오** — https://developers.kakao.com
1. 애플리케이션 추가 → 앱 키에서 **REST API 키** 복사
2. 카카오 로그인 활성화 → Redirect URI 등록: `https://api.<도메인>/api/auth/kakao/callback`
3. 동의항목에서 닉네임(필수), 이메일(선택) 설정
4. (권장) 보안 탭에서 Client Secret 활성화 후 `.env`에 추가

## 4. 프로세스 관리 (pm2)

```bash
cd ~/maldongmu/apps/server
pm2 start dist/main.js --name maldongmu
pm2 save
pm2 startup   # 출력되는 sudo 명령 실행 → 재부팅 시 자동 시작
```

로그 확인: `pm2 logs maldongmu`, 재시작: `pm2 restart maldongmu`

## 5. 절전 해제 (중요)

```bash
sudo pmset -a sleep 0 disksleep 0
sudo pmset -a displaysleep 10   # 화면만 끄기
```

시스템 설정 > 에너지 절약에서 "전원 공급 시 자동으로 잠자기 방지"도 확인.

## 6. 외부 노출 — Cloudflare Tunnel (권장)

포트포워딩 없이 HTTPS로 노출. 고정 IP 불필요, SSE 지원됨.

```bash
brew install cloudflared
cloudflared tunnel login                      # 브라우저에서 도메인 선택
cloudflared tunnel create maldongmu
cloudflared tunnel route dns maldongmu api.<도메인>
```

`~/.cloudflared/config.yml`:

```yaml
tunnel: maldongmu
credentials-file: /Users/<계정>/.cloudflared/<터널ID>.json
ingress:
  - hostname: api.<도메인>
    service: http://localhost:4000
  - service: http_status:404
```

```bash
sudo cloudflared service install   # launchd 등록, 자동 시작
```

확인: `curl https://api.<도메인>/api/personas/featured` (Authorization 필요 없는 엔드포인트 기준)

> 도메인이 없으면 임시로 `cloudflared tunnel --url http://localhost:4000` (무작위 trycloudflare.com URL) 로 테스트 가능.

## 7. Vercel 웹 연동

- Vercel 프로젝트 생성 → 레포 연결, Root Directory: `apps/web`
- 환경변수: `NEXT_PUBLIC_API_URL=https://api.<도메인>`
- 서버 `.env`의 `CORS_ORIGINS`에 Vercel 도메인 추가 후 `pm2 restart maldongmu`

## 8. 백업

```bash
# crontab -e : 매일 새벽 4시 DB 스냅샷 (최근 7일 보관)
0 4 * * * cd ~/maldongmu/apps/server/data && sqlite3 maldongmu.db ".backup backup-$(date +\%u).db"
```

사용자/대화 데이터가 쌓이는 DB이므로 외장디스크나 클라우드로 주기 복사 권장.

## 9. 업데이트 배포

```bash
cd ~/maldongmu && git pull && pnpm install && pnpm --filter @maldongmu/server build && pm2 restart maldongmu
```
