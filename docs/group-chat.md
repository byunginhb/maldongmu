# 셋이서 수다

홈의 **오늘의 친구 2명과 같이 놀기**에서 한국 시간 기준으로 매일 바뀌는 두 친구와 대화한다.
연령 제한 없이 서로 다른 두 페르소나를 고른다. 기존 1:1 대화에서는 **+ 친구 초대**를 눌러
이름·직업·취미로 친구를 검색하고 한 명을 초대할 수 있다. 기존 대화 기록을 유지하며,
초대 후에는 두 친구와 사용자가 같은 방에서 대화한다. 이웃 수첩의 **셋이서 수다**에서 다시 들어갈 수 있다.

## 대화와 사용량

- 첫 인사는 모델 호출 없이 생성한다. 사용자가 메시지나 주제 칩을 보내야 본 대화를 시작한다.
- 사용자 메시지 한 개당 두 친구가 번갈아 **최대 4번** 답하고 기다린다. 자동 재개·자동 재시도는 없다.
- 마지막 친구에게 사용자를 향한 질문을 지시하며, 질문이 빠지면 짧은 되물음을 붙인다. 추가 모델 호출은 없다.
- 모델 호출당 `max_tokens=180`, 한 묶음 최대 출력 **720토큰**. 입력 토큰은 별도로 소모된다.
- 최근 기록은 최대 24개·3,200자로 제한하고, 각 페르소나의 배경은 필드당 200자로 줄여 전달한다.
- 기본 모델은 `google/gemini-2.5-flash`이며 thinking을 끈다. `GROUP_CHAT_MODEL`로 변경 가능하다.
  `OPENROUTER_MODEL`로 지정한 1:1 모델과 분리되어 있다. 추론이 필수인 모델은 짧은 예산에서 빈 답변을 낼 수 있으므로 변경 시 시험이 필요하다.
- 기존 게스트/로그인 메시지 제한과 함께, 계정당 하루 **20묶음** 제한을 적용한다(UTC 자정 초기화).
- 사용자 메시지와 묶음 사용 횟수를 생성 전에 예약한다. 취소·실패도 이미 사용한 한 묶음으로 남는다.
- 생성은 사용자 계정당 한 번만 진행한다. 1:1 요청, 다른 방, 친구 초대도 같은 계정의 진행 상태를 확인한다.
- **나도 한마디** 또는 생성 중 메시지 전송으로 끼어들면 진행 중인 요청을 취소하고, 서버의 저장 완료를 확인한 뒤 새 메시지를 보낸다.
- 화면 이탈·연결 종료도 요청을 취소한다. 이미 나온 부분은 발화자와 함께 저장한다.
- 각 응답은 최대 25초, 한 묶음은 최대 90초다. 에러가 나면 해당 묶음을 끝내고 사용자 입력을 기다린다.

공급자의 취소 지원에 따라 진행 중이던 한 요청의 과금 중단 시점은 달라질 수 있다.
후속 요청을 만들지 않는 것과 `max_tokens` 상한으로 비용을 제한한다.
[OpenRouter 취소 문서](https://openrouter.zendesk.com/hc/en-us/articles/51691588409883-How-do-I-cancel-a-streaming-request-and-which-providers-stop-billing-when-I-do)

## 서버 배포

프론트를 먼저 배포해도 기존 API와 1:1 대화는 동작한다.
`GET /api/chat/features`가 `groupChat: true`를 반환하는 서버로 업데이트된 후,
홈과 채팅 화면을 다시 열면 새 기능 진입점이 나타난다.

서버 운영 체크아웃에서:

```sh
git pull --ff-only origin main
pnpm install --frozen-lockfile
pnpm --filter @maldongmu/server build
pm2 restart maldongmu
```

기존 `OPENROUTER_API_KEY`를 사용한다. 새 환경변수는 필수가 아니며, 선택적으로 다음을 지정한다.

```dotenv
GROUP_CHAT_MODEL=google/gemini-2.5-flash
```

서버 시작 시 기존 SQLite에 다음 nullable TEXT 컬럼을 자동 추가한다.

- `conversations.second_persona_uuid`: 초대한 두 번째 친구
- `messages.speaker_uuid`: 각 답변의 발화자. 기존 null 메시지는 첫 번째 친구로 해석한다.

기존 레코드는 보존하며 페르소나 DB/ETL 재생성은 필요 없다. SQLite와 단일 NestJS/PM2 프로세스를 전제로 한다.
여러 서버 프로세스로 확장할 때에는 생성 중 상태와 취소 신호를 프로세스 간 공유하도록 변경해야 한다.

## 검증

```sh
pnpm --filter @maldongmu/server test:chat
pnpm --filter @maldongmu/web test:chat
pnpm --filter @maldongmu/web build
```

서버 테스트는 메모리 DB와 모의 모델을 사용한다. 마이그레이션 반복 실행, 소유권, 두 명 제한,
단체·1:1 호환, 사용량 선예약, 동시 요청, 발화자 구분, 스트림 취소, 부분 저장, 마지막 질문을 검증한다.
웹 테스트는 한글 UTF-8 분할 패킷, 발화자 이벤트, 연결 오류, 기존 SSE 형식, 구버전 API 호환을 검증한다.

로컬 브라우저 검증용 API(메모리 DB·모의 모델, 실제 API 키/운영 DB 사용 없음):

```sh
pnpm --filter @maldongmu/server build
cd apps/server
node test/preview-chat.cjs
```

별도 터미널에서 `pnpm dev:web`을 실행한다. 미리보기 API는 `127.0.0.1:4000`에만 바인딩된다.
