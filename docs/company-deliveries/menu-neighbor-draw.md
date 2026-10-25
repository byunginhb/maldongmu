# 할매 진입점 이동과 이웃 뽑기 변경 제안

계획: delivery-a7a62f7e33573c780dfb3effd94ea32e.
프로젝트: maldongmu.
기준 revision: 6dc9f9d4858a5ff85adf9a1228cbc1148cac287f.

company-delivery 지침과 전달된 PM 착수 범위 의견을 적용했다. 이 호출은 도구가 비활성화되어 있다. 아래는 변경 제안이며 파일 적용·테스트·빌드·독립 리뷰·QA·통합·배포는 모두 미실행이다. 응답의 diff_sha256·evidence_sha256는 제공된 입력 binding을 그대로 반환하며 새 변경의 검사 증거가 아니다.

## 제안 동작과 소유 범위

등록된 12개 경로만 제안한다. 홈 할매 배너와 사용하지 않는 GRANNY_FACES를 제거하고 /meet 목록의 API 조건문 앞에 정적 할매 카드를 둔다. 직업 목록의 로딩·실패·빈 결과와 관계없이 카드는 남는다. 할매 목록의 기존 대화 생성·LoginSheet는 보존하고 뒤로가기만 /meet 및 최소 44px 크기로 바꾼다. /grannies layout과 서버 API는 변경하지 않는다.

TabBar에 뽑기를 추가한다. /draw 정확한 경로에서만 해당 탭을 활성화하고 모바일 6개 탭의 번역 라벨을 줄바꿈한다. 링크의 포커스 외곽선은 탭 내부에 배치한다. 기존 고정 탭바는 번역 라벨 공간을 위해 72px로 높인다. 기존 화면의 하단 콘텐츠를 가리지 않는지는 독립 QA에서 확인해야 한다.

/draw는 제목, 설명, 기존 정적 사진 Avatar 세 장, coral 뽑기 버튼을 표시한다. 결과에서는 이름·나이·직업·지역·한줄 소개와 Avatar를 표시하며 coral 대화 버튼 하나와 ghost 다시 뽑기 버튼을 둔다. 제목에만 도트 폰트를 사용한다. 기존 색 토큰과 640px 폭을 유지하며 새 그림자·그라데이션·확률·희귀도·모션·타이머는 추가하지 않는다. 긴 문자열은 줄바꿈하며 버튼 포커스가 잘리지 않도록 여백을 둔다.

순수 helper는 필수 문자열과 정수 나이를 검증한다. 첫 뽑기는 한 번 호출하고 최근 8명과 겹칠 때만 최대 두 번 추가 요청한다. 그래도 겹치면 마지막 유효 결과를 표시한다. 실패하면 최근 목록을 변경하지 않고 잠금을 해제한다. 대기 중 helper 호출은 같은 Promise를 공유한다. 화면 ref 잠금은 뽑기와 대화 시작을 함께 보호하고 disabled·aria-busy로 대기 상태를 노출한다. 다시 뽑기 실패 시 기존 결과를 남겨 대화 또는 재시도를 할 수 있다. LoginRequiredError는 LoginSheet를 열고 다른 실패는 번역된 alert로 알린다. 대화 생성 성공 시 이동이 끝날 때까지 화면 잠금을 유지한다.

제품은 기존 GET /personas/random과 POST /conversations {personaUuid}를 사용한다. 서버 src·lib/api.ts·인증·게스트 한도·의존성·SQLite 데이터·자격증명은 변경하지 않는다. preview는 기존 f.cards를 순환 반환하는 random 읽기 경로만 :uuid 앞에 추가한다. fixture와 기존 경로는 그대로 둔다.

## 검사 제안과 제한

실행기는 최신 main·기존 변경·기준 SHA·정확한 preimage를 확인하고 각 before가 한 번만 존재하며 치환이 겹치지 않을 때 적용해야 한다. 제공되지 않은 공유 타입·실제 random 응답·fixture 필드의 적합성은 이번 호출에서 확인하지 못했다. 특히 province·oneLiner·occupation의 유효 문자열 계약을 실제 읽기 응답과 대조해야 한다. 누락을 숨기기 위해 fixture나 수락 기준을 변경하지 않는다.

새 테스트는 TypeScript 메모리 변환과 VM으로 helper를 평가한다. 정상 매핑, 잘못된 응답, 최초 단일 호출, 대기 중 Promise 공유, 최근 중복 회피, 재시도 두 번 상한, 네트워크·동기·검증 실패 후 복구, 최근 목록 상한과 외부 변경 차단을 검사하도록 제안한다. 같은 파일에 메뉴 제거·정적 할매 카드 순서·뒤로가기·화면 test id·기존 홈 연결·preview 경로 순서의 정적 계약 검사를 둔다. 정적 검사는 실제 렌더 동작을 증명하지 않는다.

기존 avatar-catalog·dating-picks·onboarding-draft·i18n 테스트는 수정하지 않는다. 홈 OnboardingPrompts·HomeDatingPicks·기존 reveal 연결·eager 선언과 company-home CSS/keyframes/reduced-motion 블록은 보존한다. 등록된 unit-tests·typecheck·production-build는 모두 실행 전이다. 인자 기반 실행기가 glob을 직접 확장하지 않으면 등록된 테스트 glob을 실제 파일 목록으로 확장해야 한다.

## 독립 검증과 릴리스 인계

등록 검사 뒤 고정 커밋을 구현자와 다른 reviewer·QA에게 전달한다. 360·768·1280px 및 en·ja에서 탭 여섯 개, 라벨 겹침·가로 넘침·탭바에 의한 하단 가림, 할매 카드의 로딩·실패·빈 결과 중 노출, /meet 이동과 기존 할매 대화 생성을 확인해야 한다. 뽑기 전 Avatar 세 장과 결과 Avatar의 실제 로딩, 모든 조작의 44×44px 이상 크기, 키보드 포커스, 긴 이름·직업, reduced-motion도 관측해야 한다.

선언된 12개 taskAssertions 외에도 모의 backend를 사용한 뽑기→결과→대화 이동, 대기 중 연속 클릭의 GET·POST 횟수, 최근 중복과 최대 추가 요청 두 번, 조회·생성 실패 후 복구, LoginSheet, 결과 상태 coral CTA 하나를 별도로 검증해야 한다. fixture의 현재 결과만으로 실패·중복 시나리오를 검증했다고 주장하지 않는다. 독립 QA는 요청 차단·응답 지연·오류 주입을 사용하되 제품 코드와 fixture를 바꾸지 않아야 한다.

onboarding-v1은 별도 회귀다. 실제 예시 버튼 세 개 이상의 data-prompt와 표시 문장, 한 번 클릭 후 기존 대화 생성과 정확한 문장 한 번 자동 전송, company-message-input, 재마운트·뒤로/앞으로 이동의 중복 방지를 확인한다. 이 baseline이나 읽기 전용 단언만으로 이번 새 흐름을 승인하지 않는다. 모의 backend 결과는 실제 API·유료 모델 검증이 아니다.

독립 리뷰·QA 승인 이후 최신 main을 다시 확인해 fast-forward 통합하고, 통합 SHA와 Vercel production SHA 일치 및 실제 운영 화면을 확인해야 한다. 운영에서는 뽑기 탭·홈 할매 배너 부재·/meet 할매 진입을 확인하고, 실제 대화 생성은 실행기의 기존 권한과 비용 경계를 따라 별도 증거를 남긴다. 현재 결과에는 승인·PR·병합·배포·운영 성공 증거가 없다. 새 변경이 생기면 영향받는 고정 revision 검증을 다시 받아야 한다.
