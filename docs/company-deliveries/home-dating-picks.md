# 홈 가상 연애 추천 변경안

계획: delivery-de1130c385000b820ace2f06301e93f1.
기준 revision: c2d73c978f964e2751f071a645ea64bbd7e0124c.

company-delivery 지침과 PM의 9파일 착수 범위 의견을 반영한 제안이다. 도구는 비활성화되어 파일 적용·검사·리뷰·QA·통합·배포를 실행하지 않았다. 제출한 binding의 diff와 evidence 해시는 입력값이며 새 변경의 검증 증거가 아니다.

## 제안 동작

홈의 기존 성별·나이대 chip, 바로 소개받기 CTA와 /dating 링크를 제거한다. 남자 기본 선택과 여자 탭을 두고 각 성별에서 20~29, 30~39, 40~49, 50~99세 네 칸을 표시한다. 기존 GET /personas/dating 경로를 apiGet으로 호출하며 LLM을 새로 호출하지 않는다. helper는 성별·정수 나이 범위를 확인한 뒤 첫 유효 후보만 선택한다. 요청 Promise를 성별로 캐시해 진행 중 중복 요청과 탭 왕복 재요청을 막는다. 컴포넌트는 성별별 결과를 보관하고 현재 성별만 표시하며 effect 정리 뒤 늦은 응답의 상태 반영을 막는다.

카드의 기존 Avatar·이름·나이·직업을 표시한다. 활성화 시 ref 잠금과 disabled·aria-busy를 적용하고 기존 POST /conversations에 personaUuid와 mode:'dating'을 전달한다. 성공 후 id만 포함한 채팅 경로로 이동하며 LoginRequiredError는 홈의 기존 LoginSheet를 연다. 실패 시 번역된 오류를 표시하고 잠금을 해제한다. 서버 src·API 라이브러리·인증·게스트 한도·/dating·온보딩과 초안 자동 전송은 수정하지 않는다.

기존 page의 등장 래퍼를 유지해 헤더·온보딩·연애 영역의 reveal 세 개를 보존한다. coral CTA는 PM 의견대로 최대 한 개 규칙으로 해석하여 새 강조 버튼을 추가하지 않는다. CSS 변수와 폰트, company-home keyframes 세 개와 infinite 두 개를 유지한다. 추천에는 새 애니메이션이나 JS 타이머가 없다. 기존 최대 640px 안에서 768px 미만 한 열, 이상 두 열이다. 버튼 최소 44px와 2px brown 포커스 외곽선·3px offset, 줄바꿈·min-width:0을 적용한다.

## 예정된 검사와 인계

적용기는 최신 main·기존 변경·기준 SHA와 preimage 해시를 확인하고 before가 정확히 한 번 존재하며 치환이 겹치지 않을 때만 지정한 경로에 적용해야 한다. 새 helper 테스트는 TypeScript 메모리 변환과 VM으로 평가하며 남녀 각각 네 요청 인자, 경계·첫 유효 후보·빈 배열·실패·성별 분리·지연 순서·캐시를 검사하도록 제안한다. 기존 아바타·HERO·온보딩·일회성 초안 전달 회귀와 모션 검사를 유지한다.

등록 unit-tests·typecheck·production-build는 모두 미실행이다. 제공되지 않은 shared PersonaCard 정의와 preview fixture 구현을 확인하지 못했으므로 적용 후 occupation 필드 및 f.personas.dating의 인자 계약을 실제 소스와 대조해야 한다. preview 읽기 경로는 동적 uuid 경로보다 앞에 등록한다. 기본 남자 탭에서 실제 fixture 필터 후 후보가 하나 이상 남는지도 확인해야 하며 부족하면 fixture를 변경하지 말고 원인과 차단을 보고해야 한다.

고정 커밋으로 등록 검사와 독립 리뷰를 진행한 뒤 같은 preview의 360·768·1280px에서 taskAcceptance와 onboarding-v1 회귀를 별도로 확인해야 한다. QA는 두 탭을 각각 직접 선택하고 좌우 키·선택 상태·포커스·성별 및 네 나이 범위·이미지·긴 이름과 직업의 줄바꿈·가로 넘침·실제 타깃 크기를 확인한다. 빠른 탭 전환·느린 응답·캐시·중복 활성화·생성 실패·로그인 오류와 reduced-motion도 확인한다. 온보딩 실제 예시 세 개의 data-prompt와 단일 클릭 후 정확한 문장 한 번 자동 전송, 재마운트·뒤로 이동 회귀를 보존해야 한다. 브라우저 backend 쓰기 모의 처리는 실제 API·유료 모델·운영 DB 성공 증거가 아니다.

이후 최신 main 재확인·fast-forward 통합·통합 SHA와 일치하는 Vercel production 배포 SHA·운영 홈의 남녀 탭과 네 칸을 확인해야 전체 완료다. 현재는 미적용·미검증·미배포 변경 제안이며 독립 리뷰나 최종 QA를 자기 승인하지 않는다. 실제 데이터·Git 밖 SQLite·자격증명에 접근하지 않았다.
