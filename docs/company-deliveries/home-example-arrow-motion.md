# 홈 예시 질문 화살표 반복 모션 변경안

계획: delivery-c874449a7f1fc90d7bb00a017d544997.
프로젝트: maldongmu.
기준 revision: d8432c14ad04a2d51fc087385ec03826060910c5.

도구가 비활성화된 호출에서 작성한 정확히 4파일의 변경 제안이다. 파일 적용·검사·독립 리뷰·QA·통합·배포는 실행하지 않았다. company-delivery 지침을 적용했으며 PM 의견은 지정 범위의 착수 승인으로만 반영했다.

## 제안 동작

기존 예시 버튼의 번역 문장을 span으로 감싸고 그 뒤에 장식용 화살표 →를 하나 배치한다. 화살표는 company-example-arrow test id와 aria-hidden="true"를 가지므로 버튼의 접근성 이름은 문장만 유지한다. data-prompt={text}, start(text), ref 잠금, disabled·aria-busy, 오류·LoginSheet 및 saveOnboardingDraft 이후 대화 경로 이동은 그대로 둔다. 기존 일회성 초안 전달과 채팅 자동 전송 구현은 수정하지 않는다.

버튼은 flex와 space-between을 사용한다. 문장 영역은 min-width:0과 자연 줄바꿈을 유지하고 화살표는 축소되지 않는다. 4px 오른쪽 여백을 확보해 이동이 버튼의 기존 16px 안쪽 여백을 침범하지 않게 한다. 최소 44×44px와 기존 focus-visible 외곽선을 유지한다. 기존 본문 폰트와 sand·line·brown 토큰을 사용하고 화살표는 brown-soft다. 새 그림자·그라데이션·coral 강조는 없다.

화살표는 CSS company-home-arrow로 2.6초마다 0→4px→0 이동하며 두 번째와 세 번째 버튼은 각각 240ms·480ms 지연한다. transform만 변경하므로 레이아웃 크기는 움직이지 않는다. JS 타이머를 추가하지 않고 기존 헤더 company-home-float 반복을 유지한다. 기존 두 reduced-motion 규칙 모두에 화살표를 포함해 animation과 transform을 해제하고 opacity:1로 정적 표시한다.

## 예정된 검증과 인계

실행기는 적용 전 기준 SHA·각 preimage SHA-256·최신 main·기존 변경을 확인해야 한다. 각 before가 정확히 한 번 존재하고 치환이 겹치지 않을 때만 지정한 4개 경로에 적용한다. 서버·API·인증·게스트 한도·i18n·의존성·lockfile·Git 외부 운영 데이터와 자격증명은 변경하지 않는다. 새 비용과 모델 호출은 없다.

기존 avatar-catalog.test.cjs의 아바타 검사는 그대로 유지한다. 온보딩 검사는 새 문장 span과 장식용 화살표 구조에 맞춰 갱신하며 data-prompt·start(text) 단일 호출·잠금·saveOnboardingDraft·타이머 금지 검증을 보존한다. disabled·aria-busy, 문장 수, 화살표 test id·aria-hidden, 레이아웃·이동 여백·시차·포커스 선언 검증을 추가한다. company-home keyframes는 3개, infinite 선언은 float와 화살표 2개로 검사하고 모든 해당 keyframes의 속성이 transform·opacity뿐인지 검증한다. 두 reduced-motion 규칙의 화살표 포함도 검사한다. 정적 검사는 실제 접근성 이름·화살표 위치·반복 동작의 브라우저 증거를 대신하지 않는다. 기존 순수 초안 전달 회귀 테스트도 등록 전체 검사에서 유지해야 한다.

등록된 unit-tests·typecheck·production-build는 모두 미실행이다. 적용 후 고정 커밋에서 실행 결과를 수집하고 구현자와 분리된 독립 리뷰에 전달해야 한다. 새 변경은 영향받는 검증을 무효화한다.

독립 QA는 같은 고정 커밋 preview의 360·1280px에서 taskAcceptance와 maldongmu-onboarding-v1 기준선 회귀를 별도로 확인해야 한다. 버튼 3개 각각의 오른쪽 화살표 하나, 정확한 접근성 이름·data-prompt, en·ja 긴 문장의 줄바꿈, 겹침·잘림·가로 넘침, 44×44px 이상 크기와 실제 키보드 포커스 외곽선을 확인한다. 모션 허용 시 여러 주기에서 4px 왕복·2.6초 반복·버튼별 시차·헤더 float 유지·버튼 크기 고정을 관측한다. reduced-motion에서는 화살표·헤더·등장이 정적이며 화살표가 계속 보이는지 확인한다. disabled 상태의 표시도 확인한다.

한 번 클릭과 한 번 키보드 활성화 각각에서 기존 대화 생성 후 정확한 문장이 한 번 자동 전송되는지, 연속 클릭 잠금·로딩·오류·LoginSheet와 기존 일회성 전달 회귀를 확인한다. 브라우저 QA의 backend 쓰기는 유료 호출 방지를 위한 모의 처리이며 실제 API·모델·DB 성공으로 보고하지 않는다. 제품의 기존 실제 API 경로는 유지한다.

등록 검사·독립 리뷰·preview QA를 통과한 뒤 최신 main을 재확인하고 fast-forward 통합해야 한다. Vercel production 배포 SHA가 통합 SHA와 같은지와 운영 홈의 화살표 3개·실제 반복 화면 증거까지 확인해야 전체 완료다. 현재는 변경 제안만 완료했으며 이 후속 검증·통합·운영 확인은 모두 남아 있다.
