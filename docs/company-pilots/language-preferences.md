# Accept-Language 선호도 처리 변경안

계획: `maldongmu-operation-readiness-r2`.
기준 revision: `1ba9746f556823a1867504bbe800135aa3d8ccc3`.

이 문서는 구현 제안의 동작과 예정된 검증을 설명한다. 이번 호출에서는 도구 실행, 실제 파일 변경, 테스트, 빌드, 배포를 수행하지 않았다. PM 의견은 3개 경로의 착수 범위 승인으로만 반영했으며 산출물이나 최종 수락 승인이 아니다.

## 범위와 선택 규칙

변경 대상은 `apps/web/lib/i18n.ts`의 `pickLang`, 순수 모듈 단위 테스트 `apps/web/test/i18n.test.cjs`, 이 문서뿐이다. 번역사전과 `translate` 구현, 프롬프트, API, UI, 서버, 인증, 사용자 데이터, 네트워크, 모델 호출, package 및 lock 파일은 변경하지 않는다.

- 헤더 없음, 빈 문자열 또는 공백뿐인 헤더는 `ko`를 반환한다.
- 콤마로 나눈 각 언어 범위를 검사한다. 언어와 q 매개변수 이름은 대소문자를 구분하지 않고 주변 공백을 제거한다.
- 기본 언어 하위 태그가 정확히 `ko`, `en`, `ja`인 항목을 지원한다. `ko-KR`, `en-US`, `ja-JP`, `ja-Jpan-JP`처럼 하이픈 뒤에 1~8자리 영숫자 하위 태그가 붙어도 같은 기본 언어로 선택한다. `korean`, `jafoo`, `ko_`, 끝이 하이픈인 태그는 일치하지 않는다. 전체 BCP 47 의미 검증을 추가하지 않는다.
- q 생략 시 1이다. q는 0 또는 1로 시작하며 소수점 이하 최대 3자리를 허용한다. 1의 소수부는 모두 0이어야 한다. `0`, `0.5`, `0.001`, `1`, `1.000`은 유효하다. HTTP qvalue 문법에 따라 `0.`과 `1.`도 허용한다.
- q가 0이거나 형식/범위가 잘못된 범위는 제외한다. 빈 q, 숫자가 아닌 값, 음수, 1 초과, `.5`, 지수 표기, 소수 4자리 이상은 제외한다. 같은 범위에 q가 중복되어도 제외한다. q 이외의 매개변수는 선호도에 영향을 주지 않는다.
- 유효한 지원 언어 중 가장 높은 q를 선택하며 동점이면 헤더의 원래 순서를 유지한다.
- 와일드카드는 건너뛴다. 지원 언어와 섞여 있으면 남은 지원 언어에서 선택한다. 이 해석은 PM 참고 의견을 반영한 것으로 테스트에 고정한다.
- 비어 있지 않은 헤더에서 선택 가능한 지원 언어가 없으면 기존 `en` 폴백을 유지한다. 이는 q=0으로 영어까지 제외된 경우에도 적용하는 기존 폴백 계약이다. 완전한 HTTP 콘텐츠 협상이나 406 응답은 추가하지 않는다.

## 예시

- `en-US;q=0.2,ko-KR;q=1` → `ko`
- `en;q=0,ja-JP;q=1` → `ja`
- `ja-JP;q=0.1,en-US;q=1` → `en`
- `en-US;q=0.8,ja-JP;q=0.8` → `en`
- `ja;q=0.8,en;q=0.8` → `ja`
- `ko;q=invalid,ja;q=0.1` → `ja`
- `ko;q=1.1,ja;q=0.1` → `ja`
- `*;q=1,ko;q=0.5` → `ko`
- `*` 또는 `fr-FR` 또는 `ko;q=0,ja;q=0,en;q=0` → `en`
- `null` 또는 빈 문자열 → `ko`

## 예정된 검증

승인된 격리 작업 경로에서 아래 검사를 실행하고 실제 결과와 적용 후 정확한 revision을 별도로 기록해야 한다. 현재 결과는 모두 미실행이다. 외부 API, auth, provider, DB, 사용자 데이터 또는 모델을 호출하는 검사는 허용하지 않는다.

단위 테스트는 기존 설치된 TypeScript로 `i18n.ts` 하나만 메모리에서 CommonJS로 변환하고 `require`가 제공되지 않은 VM에서 평가한다. 앱의 다른 모듈은 로드하지 않으며 컴파일 결과 파일도 쓰지 않는다. 지원 언어, q 경계, 동점, 폴백, 사전 조회 및 interpolation의 관측 결과를 단언한다.

```sh
/Users/byungin/.hermes/node/bin/node --test apps/web/test/i18n.test.cjs
/Users/byungin/.hermes/node/bin/node --test apps/web/test/chat-api.test.cjs
/Users/byungin/.hermes/node/bin/node --experimental-strip-types --input-type=module -e 'import a from "node:assert/strict";import * as m from "./apps/web/lib/i18n.ts";for(const [h,e] of [[null,"ko"],["","ko"],["ko-KR,ko;q=0.9,en;q=0.8","ko"],["ja-JP","ja"],["en-US","en"],["fr-FR","en"],["en-US;q=0.2,ko-KR;q=1","ko"],["en;q=0,ja-JP;q=1","ja"],["ja-JP;q=0.1,en-US;q=1","en"],["en-US;q=0.8,ja-JP;q=0.8","en"]])a.equal(m.pickLang(h),e,String(h));a.equal(m.translate("ko","hello {name}",{name:"Ben"}),"hello Ben");console.log("operator language acceptance: 11 assertions");'
/Users/byungin/.hermes/node/bin/node apps/web/node_modules/typescript/bin/tsc --noEmit --project apps/web/tsconfig.json
/Users/byungin/.hermes/node/bin/node -e 'process.execArgv=[];const bin=require.resolve("./apps/web/node_modules/next/dist/bin/next");process.env.NEXT_PUBLIC_API_URL="http://127.0.0.1:9";process.chdir("apps/web");process.argv=[process.execPath,bin,"build"];require(bin);'
```

trusted-acceptance은 언어 선택 10개와 기존 interpolation 1개, 총 11개 단언이다. production build의 API 주소는 계획대로 로컬 비서비스 포트를 지정한다. 실제 운영 연결·배포 검증은 위 검사에 포함되지 않는다.

## 인계와 남은 작업

실행기는 적용 전 원문 해시와 기준 SHA, 기존 변경, 원격 main 변화를 확인하고 세 경로만 적용해야 한다. 적용 후 위 검사 결과를 수집하고 고정된 커밋·증거를 별도 reviewer와 QA에 넘긴다. 구현자는 독립 리뷰나 최종 QA를 자기 승인하지 않는다. 새 변경이 생기면 영향받는 검증을 다시 받아야 한다.

r2는 이전 engineer CLI가 180초에 변경안 산출 전에 시간초과한 뒤 같은 기준 SHA에서 준비한 별도 재시도다. 이전 실패 기록은 보존하며 범위 반려, 테스트 실패 또는 이미 적용된 구현으로 해석하지 않는다. 실행 예산 조정은 부모의 독립 검토·적용 완료 후에만 진행하며 이 제안은 실행 예산이나 권한을 변경하지 않는다.

## Operator verification after proposal

All five registered checks subsequently passed in the actual sandbox: new pure i18n regressions, existing mocked web regressions, 11 fixed acceptance assertions, TypeScript and Next production build. Independent reviewer 355713ce-c198-4d74-a3d9-a216aeefb31c and QA 7613d98d-c5cc-4424-aac4-e2402c70f045 approved fixed diff dccc81572c8a2dad22cbd316ee9e4e3c63cd18012067648c2736efe44ff30f5d. The translation dictionary and code following the language selector remain byte-identical to the base revision. This later documentation note does not change the tested module/test. PR, merge and live deployment remain subsequent steps.
