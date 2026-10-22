# 홈·이웃 수첩 모션 변경 제안

계획: delivery-2dce14fab670b4d31e2cbf35b36099ba
기준 revision: a4e49b1e2a3f51c11a6f94abaf5ce2d75b6968d2

company-delivery 지침과 PM 착수 의견을 반영한 등록 9개 파일의 변경 제안이다. 도구 실행·파일 적용·검사·독립 리뷰·QA·배포는 이번 호출에서 수행하지 않았다. 반환한 binding은 입력 기준이며 새 후보의 검증 결과가 아니다.

## 동작과 보존 경계

홈 헤더→온보딩→가상 연애의 기존 3개 영역은 0/60/120ms 순서로 등장한다. 홈 featured/popular PersonaCard 및 TodayFriends의 실제 링크·버튼, /me의 이웃·새 이웃·그룹·연애 링크에 company-motion-item을 둔다. 홈 항목 지연은 최대 360ms, /me는 최대 160ms다. 새 이웃에는 고정 키를 사용한다. 스켈레톤·오류·빈 상태에는 식별자를 추가하지 않는다.

숨김은 클라이언트 준비 클래스 아래에서만 적용한다. 최초 화면 안 항목은 관찰을 기다리지 않고 등장 처리한다. IO 미지원·생성/관찰 실패에서는 즉시 최종 표시하며 훅 준비 실패 시 준비 클래스를 제거한다. 카드 등장은 opacity·개별 translate를 사용하고 기존 :active transform scale을 보존한다. 홈 영역은 기존 company-home-enter의 opacity·transform을 유지한다.

페이지당 공유 IO 하나가 등장과 헤더를 감시한다. 최초 교차한 등장 대상은 unobserve하고 대상이 없으면 disconnect한다. 홈 헤더는 계속 관찰 대상으로 남아 모든 카드 등장 후에도 화면 밖 정지를 감시한다. document.hidden이면 헤더 반복 모션을 멈춘다. childList 전용 MutationObserver로 비동기 항목 추가·제거를 감지하며 타이머·setInterval·반복 RAF는 추가하지 않는다. 언마운트 시 관찰자와 visibilitychange·미디어 설정 리스너를 정리한다.

등장 키는 페이지 훅 수명 동안 기억하며 같은 키의 새 요소는 애니메이션 없이 표시한다. reduced-motion이면 animation·transition을 제거하고 최종 상태를 표시한다. 실행 중 reduce로 전환하면 관찰도 정리하며 같은 마운트에서 설정을 해제해도 다시 시작하지 않는다.

기존 온보딩·초안 전달·채팅·서버 API·인증·게스트 한도를 수정하지 않는다. 기존 예시 3개와 한 번 클릭 후 정확한 문장 1회 자동 전송은 새 revision의 회귀 검사 대상이다. 브랜드 토큰·사진·의존성·lockfile·CTA는 변경하지 않는다. 다른 화면의 PersonaCard에는 motionKey가 없으므로 식별자나 새 등장 모션을 붙이지 않는다.

## 이번 수정과 근거의 한계

전달된 이전 후보의 unit-tests는 39개 중 38개 통과, avatar-catalog.test.cjs:227의 CSS match 실패 1개다. 실패 출력이 잘려 정확한 정규식은 제공되지 않았다. 이번 후보는 기존 홈 keyframe과 기존 reduced-motion 선택자·선언을 원문대로 보존하고, 새 항목·준비 상태에 필요한 reduced-motion 규칙을 별도로 추가한다. 카드용 keyframe은 독립 translate를 유지한다. 테스트·품질 설정·명령·수락 기준은 변경하지 않는다. 고정 motion.test.cjs는 제공된 내용 그대로다. 이 수정으로 검사 통과가 확인됐다고 주장하지 않는다.

## 실행기에 남기는 검증

적용 전 최신 main·기존 변경·기준 SHA·파일별 원문 해시를 확인한다. 각 치환 원문은 정확히 한 번 존재하며 서로 겹치지 않아야 한다. 새 파일은 부재를 확인한다. 등록 unit-tests·typecheck·production-build를 새 후보에서 실행하고 정확한 revision과 출력을 보관한다. glob이 셸 확장되지 않는 실행기라면 실제 테스트 파일 목록으로 확장해야 한다.

순수 테스트는 motion.ts 하나만 메모리에서 변환해 VM에서 실행한다. 지연 경계, 첫 교차 해제·최종 disconnect, 키 중복 방지, 최초 화면 안 항목, 카드 등장 뒤 헤더 감시 유지, hidden/화면 밖 정지, destroy 정리, IO 실패·reduced-motion 대체를 확인한다. 실제 훅·레이아웃·성능을 증명하는 검사는 아니다.

독립 브라우저 QA는 featured/popular와 /conversations 모의 목록 및 TodayFriends 기능 응답으로 실제 항목을 렌더링한다. 360/390/768/1024/1280/1440px에서 가로 넘침, 44×44px 선택 대상, 실제 키보드 포커스 잘림, 최초·재렌더 등장, active scale, 스크롤·숨긴 탭의 헤더 정지와 reduced-motion을 확인해야 한다. 기존 company-home-reveal 3개, 온보딩 버튼 3개, 정확한 문장 1회 자동 전송 및 등록 taskAcceptance를 새 revision에서 확인한다. backend 쓰기 모의는 실제 API·DB·모델 검증과 구분한다. CLS나 성능 수치는 보증하지 않는다.

고정 커밋의 검사·독립 리뷰·독립 QA·preview 브라우저 증거 후 최신 main을 다시 확인해 통합한다. 기존 Vercel main 자동 배포의 정확한 production SHA와 운영 화면 증거까지 있어야 완료다. 필수 실패나 증거 누락은 릴리스를 차단한다. 구현자는 자기 변경의 독립 리뷰·최종 QA를 승인하지 않는다.
