# 홈 가상 연애 추천 변경 및 preview 복구 제안

계획: delivery-de1130c385000b820ace2f06301e93f1.
프로젝트: maldongmu.
기준 revision: c2d73c978f964e2751f071a645ea64bbd7e0124c.

company-delivery 지침과 전달된 PM 범위 의견을 적용한 9파일 변경 제안이다. 도구는 비활성화되어 파일 적용·검사·리뷰·QA·통합·배포를 실행하지 않았다. binding의 diff·evidence 해시는 입력 바인딩이며 이번 후보의 검사 결과가 아니다.

## 제공된 실패와 제한된 수정

제공된 실행 기록에 따르면 이전 후보 3ec92380e1ed7654954323cab6adb5607632f53b는 360px preview의 dating-picks-count에서 실제 카드 수 0으로 실패했다. 읽기 전용으로 제공된 personas.service.ts의 dating()은 { items }를 반환한다. 이전 클라이언트는 이를 PersonaCard[]로 선언하고 배열 helper에 그대로 전달했다. 따라서 items.find 예외가 각 칸의 error·pick null로 처리되는 응답 형식 불일치가 코드상 원인이다. 이번 호출에서 실패를 직접 재현하지는 않았다.

이전 후보와 비교한 제품 수정은 HomeDatingPicks의 클라이언트 어댑터에 한정한다. apiGet<{ items: PersonaCard[] }>의 response.items를 반환해 기존 배열 helper로 전달한다. helper 계약과 고정 테스트, preview 읽기 경로 및 fixture는 이전 후보 그대로 보존한다. 제출 preimage는 이전 후보 SHA가 아니라 payload.source의 기준 파일 해시이며 새 파일은 전체 내용을 제공한다.

## 보존한 원래 변경

홈의 성별·나이대 chip, 바로 소개받기 CTA와 직접 골라서 만나기 링크를 제거한다. 남자 기본 선택과 여자 탭을 제공하고 선택한 성별의 20~29·30~39·40~49·50~99세 네 칸을 표시한다. 기존 GET /personas/dating을 사용하며 helper는 성별·정수 나이 범위를 확인하고 첫 유효 후보만 선택한다. 성별별 Promise 캐시는 중복 요청과 탭 왕복 재요청을 막는다. 컴포넌트는 성별별 결과와 현재 선택을 분리하고 effect 정리 이후 늦은 응답을 화면 상태에 반영하지 않는다.

카드는 기존 Avatar·이름·나이·직업을 표시한다. 실제 버튼 활성화는 ref 잠금과 disabled·aria-busy로 중복 생성을 막고 POST /conversations {personaUuid, mode:'dating'} 성공 후 /chat/{id}로 이동한다. LoginRequiredError는 홈의 기존 LoginSheet를 연다. 실패 시 오류를 표시하고 잠금을 해제한다. 빈 결과와 조회 실패 문구에는 en·ja 번역을 추가한다.

기존 등장 래퍼 세 개, CSS 변수와 제목용 도트·본문 폰트, company-home keyframes 세 개와 infinite 두 개를 보존한다. 새 강조 버튼·반복 애니메이션·JS 타이머는 없다. 전달된 디자인 의견에 따라 제거한 coral CTA를 대체하는 강조 버튼은 추가하지 않는다. 기존 최대 640px 안에서 768px 미만 한 열, 이상 두 열이며 최소 44×44px·2px brown 포커스 외곽선·3px offset·min-width:0·자연 줄바꿈을 적용한다.

/dating·온보딩·초안 전달·채팅 입력창·서버 src·lib/api.ts·인증·게스트 한도·의존성·fixture 데이터는 변경하지 않는다. preview에는 기존 f.personas.dating을 그대로 반환하는 GET 읽기 경로만 uuid 동적 경로 앞에 등록한다. 실제 데이터·Git 밖 SQLite·자격증명 접근이나 외부 호출은 수행하지 않았다.

## 미실행 검사와 다음 인계

적용기는 최신 main·기존 변경·기준 SHA·정확한 preimage를 확인하고 각 before가 한 번만 존재하며 치환이 겹치지 않을 때 지정 경로에 적용해야 한다. 기본 남자 탭의 preview fixture에서 필터 후 후보가 적어도 한 명 남는지는 아직 확인하지 못했다. fixture를 수정하거나 수락 기준을 낮추지 말고 실제 응답과 렌더 결과로 확인해야 한다.

등록 unit-tests·typecheck·production-build와 새 고정 커밋의 독립 리뷰가 필요하다. 고정 순수 테스트는 TypeScript 메모리 변환과 VM으로 helper를 평가하며 남녀 네 칸 호출 인자, 첫 유효 후보, 빈 결과, 실패, 범위 밖 제외, 지연 순서와 캐시를 검사한다. 기존 아바타·HERO·온보딩·타이머 금지·모션 및 일회성 초안 회귀는 유지한다. 이 검사들은 이번 호출에서 모두 미실행이다.

독립 QA는 같은 고정 커밋 preview의 360·768·1280px에서 taskAcceptance와 onboarding-v1 회귀를 각각 확인해야 한다. 두 탭을 직접 선택해 실제 성별 변경·네 칸·후보 이미지·좌우 키·선택 상태·44px 타깃·포커스 외곽선·긴 이름과 직업의 줄바꿈·가로 넘침을 확인한다. 빠른 탭 전환과 느린 응답, 캐시, 카드 중복 활성화, 생성 실패·로그인 오류 및 reduced-motion도 확인한다. 온보딩 예시 버튼 세 개와 data-prompt의 정확한 문장, 한 번 클릭 후 기존 흐름으로 한 번 자동 전송되는 동작, 재마운트·뒤로 이동 회귀를 보존해야 한다. 모의 backend 결과는 실제 API·유료 모델 검증이 아니다.

과거 승인은 이번 후보를 승인하지 않는다. 새 독립 리뷰·QA 이후 최신 main 확인과 fast-forward 통합, 통합 SHA와 같은 Vercel production SHA, 운영 홈의 남녀 탭과 네 칸 확인까지 남아 있다. 현재 결과는 미적용·미검증·미배포 변경 제안이다.
