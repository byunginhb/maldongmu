# 배포 체크리스트 — Ben이 직접 해야 할 일

코드는 전부 준비됐습니다. 아래만 순서대로 진행하면 서비스가 열립니다.

## 1. 로컬에서 최종 확인 (개발 맥)

```bash
cd ~/Documents/projects/maldongmu
pnpm install
cp apps/server/.env.example apps/server/.env
# .env에 OPENROUTER_API_KEY 입력 (https://openrouter.ai/keys)

pnpm dev:server   # :4000
pnpm dev:web      # :3000 → 브라우저에서 홈/검색/채팅 확인
```

- 어드민 확인: http://localhost:3000/admin (비밀번호 = .env의 ADMIN_PASSWORD)
- 소셜 로그인은 OAuth 키 등록 전까지는 동작하지 않음 (게스트 3회 대화까지는 키 없이 가능)

## 2. GitHub

```bash
cd ~/Documents/projects/maldongmu
git init && git add -A && git commit -m "말동무 MVP"
# github.com에서 maldongmu 레포 생성 후
git remote add origin git@github.com:<계정>/maldongmu.git
git push -u origin main
```

`.gitignore`가 `.env`, `*.db`를 제외하므로 키와 5GB DB는 올라가지 않습니다.

## 3. 발급/등록해야 할 키 (총 4가지)

| 키 | 어디서 | .env 항목 |
|---|---|---|
| OpenRouter API 키 | https://openrouter.ai/keys | `OPENROUTER_API_KEY` |
| 구글 OAuth 클라이언트 | https://console.cloud.google.com/apis/credentials | `GOOGLE_CLIENT_ID/SECRET` |
| 카카오 REST API 키 | https://developers.kakao.com | `KAKAO_REST_API_KEY` (+`KAKAO_CLIENT_SECRET`) |
| JWT 시크릿 | 터미널: `openssl rand -hex 32` | `JWT_SECRET` |

리디렉션 URI 등록 (구글·카카오 공통 규칙):
- 구글: `{SERVER_PUBLIC_URL}/api/auth/google/callback`
- 카카오: `{SERVER_PUBLIC_URL}/api/auth/kakao/callback`
- 로컬 테스트도 하려면 `http://localhost:4000/...` 버전도 함께 등록

## 4. 맥미니

`docs/macmini-setup.md` 그대로 진행. 요약:

1. `brew install node@20 git` + `npm i -g pnpm pm2`
2. `git clone` → `pnpm install` → `pnpm --filter @maldongmu/server build`
3. `scp`로 maldongmu.db 복사 (5GB)
4. `.env` 작성 (위 키들 + `SERVER_PUBLIC_URL`, `WEB_URL`, `CORS_ORIGINS`)
5. `pm2 start dist/main.js --name maldongmu && pm2 save && pm2 startup`
6. 절전 해제: `sudo pmset -a sleep 0 disksleep 0`
7. Cloudflare Tunnel로 `https://api.<도메인>` 노출

## 5. Vercel

1. vercel.com → Add New Project → GitHub `maldongmu` 레포 선택
2. **Root Directory: `apps/web`** (Framework: Next.js 자동 감지, pnpm 모노레포 자동 처리)
3. 환경변수 1개: `NEXT_PUBLIC_API_URL=https://api.<도메인>`
4. Deploy → 발급된 도메인을 맥미니 `.env`의 `CORS_ORIGINS`와 `WEB_URL`에 반영 → `pm2 restart maldongmu`
5. 구글/카카오 콘솔의 리디렉션 URI가 실제 `SERVER_PUBLIC_URL` 기준인지 최종 확인

## 6. 배포 후 확인

- [ ] `https://api.<도메인>/api/personas/featured` 가 JSON 반환
- [ ] Vercel 웹에서 홈 카드가 뜨고 채팅 스트리밍 동작
- [ ] 게스트로 대화 3회 → 로그인 시트 노출 → 카카오/구글 로그인 → 대화 이력 유지
- [ ] `/admin` 접속 → 통계 표시
