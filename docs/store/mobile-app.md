# 말동무 안드로이드 앱 (Expo + React Native)

말동무 웹앱(www.maldongmu.app)을 **Expo/React Native**로 감싼 안드로이드 앱.
`react-native-webview`로 사이트를 띄우고, **추후 인앱결제(IAP)·네이티브 기능**을 붙일 수 있는 네이티브 골격을 갖춤.
(초기 TWA 방식은 `android-build.md`에 있으나, RN 방식으로 대체됨 — 결제/네이티브 확장성 때문.)

- 프로젝트: `mobile/` (Expo SDK 57, RN 0.86)
- 패키지 ID: `app.maldongmu.twa` (기존 유지 — 키스토어/assetlinks 연속성)
- 앱 이름: 말동무

---

## 1. 구성 요소

| 파일 | 역할 |
|---|---|
| `mobile/App.tsx` | WebView + Android 뒤로가기 + 스플래시 + OAuth 딥링크 핸들 + 에러 재시도 |
| `mobile/app.json` | 이름·아이콘·스플래시·스킴(maldongmu)·패키지 |
| `mobile/assets/` | 브랜드 아이콘(coral 도트 말풍선)·스플래시 |
| `mobile/withReleaseSigning.js` | prebuild 시 업로드 키 서명 설정을 주입하는 config plugin |

### OAuth (중요)
임베디드 WebView에선 **구글 로그인이 차단**되므로, 로그인 시 외부 인증 세션(Custom Tab)으로 열고
서버가 `maldongmu://auth?token=` 딥링크로 토큰을 돌려주면 앱이 WebView에 심는다.
- 이를 위한 **서버 변경 포함**: `apps/server/src/auth`에서 `app=1` 플래그를 state에 실어
  콜백을 `maldongmu://`로 리다이렉트. ⚠️ **서버 재시작해야 앱 로그인 동작.** 재시작 전에도 게스트 사용은 정상.

---

## 2. 서명 키스토어 (TWA와 동일 재사용)
- `~/android-tools/maldongmu-upload.keystore` (alias `maldongmu`), 비번 `~/android-tools/maldongmu-keystore-password.txt`
- ⚠️ 백업 필수. repo 밖(커밋 금지).

---

## 3. AAB 빌드 방법

```bash
export JAVA_HOME="$HOME/android-tools/jdk-17.0.20+8/Contents/Home"
export ANDROID_HOME="$HOME/android-tools/android_sdk"
cd mobile
npx expo prebuild --platform android --clean   # android/ 재생성(+서명 플러그인 적용)
PW="$(cat ~/android-tools/maldongmu-keystore-password.txt)"
cd android && echo "sdk.dir=$ANDROID_HOME" > local.properties
./gradlew bundleRelease \
  -PMALDONGMU_STORE_FILE="$HOME/android-tools/maldongmu-upload.keystore" \
  -PMALDONGMU_STORE_PASSWORD="$PW" -PMALDONGMU_KEY_ALIAS=maldongmu -PMALDONGMU_KEY_PASSWORD="$PW"
# 산출물: mobile/android/app/build/outputs/bundle/release/app-release.aab
```

버전 올릴 때: `mobile/app.json`의 `expo.version` + `expo.android.versionCode` 증가.

---

## 4. Play Console 업로드
`android-build.md` §5와 동일 (앱 생성 → AAB 업로드 → 스토어 등록정보/이미지/설문 → 검토).
- 스토어 문구·이미지: `docs/store/listing.md`, `docs/store/images/`
- ※ RN WebView 앱은 TWA와 달리 **assetlinks가 필수는 아님**(주소창이 없음). 딥링크(App Links) 확장 시에만 사용.

---

## 5. 다음 단계 — 인앱결제(IAP)
- Expo dev build에서 `react-native-purchases`(RevenueCat) 또는 `react-native-iap` 추가.
- 웹↔네이티브 연동: WebView `postMessage`로 웹에서 구매 요청 → 네이티브가 Play Billing 처리 → 결과를 WebView에 주입.
- Play Console에서 인앱 상품/구독 등록 + 데이터 안전 폼에 "인앱 구매 있음" 반영.
