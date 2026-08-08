# 말동무 안드로이드 앱 (TWA) — 빌드 & 배포 가이드

말동무 웹앱(www.maldongmu.app)을 **TWA(Trusted Web Activity)**로 감싼 안드로이드 앱.
Chrome 엔진으로 사이트를 전체화면 실행 = "사이트가 곧 앱". 웹을 배포하면 앱 내용도 자동 최신.

- **패키지 ID (영구): `app.maldongmu.twa`** ← 앱의 영구 식별자. 첫 업로드 뒤엔 변경 불가.
  다른 이름 원하면 업로드 전에 알려주세요.
- 앱 이름: 말동무
- 대상 URL: https://www.maldongmu.app/

---

## 1. ⚠️ 서명 키스토어 — 가장 중요 (반드시 백업)

| 항목 | 값 |
|---|---|
| 업로드 키스토어 | `~/android-tools/maldongmu-upload.keystore` |
| 별칭(alias) | `maldongmu` |
| 비밀번호 | `~/android-tools/maldongmu-keystore-password.txt` 에 저장됨 |
| SHA256 지문 | `E4:27:04:D8:A0:20:8F:1C:FD:C8:8C:F3:A1:99:04:A0:DD:F6:0F:20:56:AD:4F:14:C4:72:7C:B7:6F:B0:66:5B` |

- 이 키스토어 + 비밀번호를 **비밀번호 관리자/외장 백업**에 반드시 보관하세요.
- Play App Signing(권장, 기본)을 쓰면 이건 "업로드 키"라, 최악의 경우 분실해도 Google 지원으로 재설정 가능.
  그래도 잃어버리지 않는 게 정석입니다.
- ❌ 이 키스토어와 비밀번호 파일은 git에 커밋 금지 (repo 밖 `~/android-tools/`에 있음).

---

## 2. 산출물 (AAB)

- 서명된 앱 번들: `~/android-tools/maldongmu-twa/app-release-bundle.aab`  ← Play Console에 업로드
- (테스트용 APK: `~/android-tools/maldongmu-twa/app-release-signed.apk` — 실기기 사이드로드 확인용)

---

## 3. Digital Asset Links (URL 바 숨기기)

TWA가 도메인 소유를 확인해야 주소창 없이 전체화면으로 뜹니다.

- 파일: `apps/web/public/.well-known/assetlinks.json` → 배포되면 https://www.maldongmu.app/.well-known/assetlinks.json
- 현재 **업로드 키 지문**이 들어있음.
- ⚠️ **첫 업로드 후 필수**: Play Console → 앱 → 설정 → 앱 무결성(App integrity) → **앱 서명 키 인증서**의
  SHA-256 지문을 복사해 assetlinks.json의 `sha256_cert_fingerprints` 배열에 **추가**하세요.
  (Play App Signing이 앱을 Google 키로 재서명하므로, 게시된 앱 검증엔 이 지문이 필요합니다. 배열에 둘 다 넣으면 됨.)

---

## 4. 앱 업데이트(재빌드) 방법

웹만 바뀌면 앱은 자동 반영 → **재빌드 불필요**. 앱 자체(아이콘/이름/버전)를 바꿀 때만 재빌드:

```bash
export JAVA_HOME="$HOME/android-tools/jdk-17.0.20+8/Contents/Home"
export ANDROID_HOME="$HOME/android-tools/android_sdk"
export BUBBLEWRAP_KEYSTORE_PASSWORD="$(cat ~/android-tools/maldongmu-keystore-password.txt)"
export BUBBLEWRAP_KEY_PASSWORD="$BUBBLEWRAP_KEYSTORE_PASSWORD"
cd ~/android-tools/maldongmu-twa
# 버전 올리기: twa-manifest.json의 appVersionCode(+1), appVersionName 수정 후
npx bubblewrap update     # versionName 물으면 입력
npx bubblewrap build --skipPwaValidation
```

---

## 5. Play Console 업로드 순서 (Ben이 진행)

1. **앱 만들기**: Play Console → 앱 만들기 → 이름 "말동무", 무료, 앱 유형.
2. **AAB 업로드**: 프로덕션(또는 비공개 테스트) 트랙 → 새 버전 만들기 →
   `app-release-bundle.aab` 업로드. (Play App Signing 자동 적용에 동의)
3. **앱 서명 키 지문 추가**: 설정 → 앱 무결성 → 앱 서명 키 SHA-256 복사 →
   `assetlinks.json`에 추가 → 커밋/푸시(자동 배포) → 반영 확인.
4. **스토어 등록정보**: `docs/store/listing.md`의 문구 + `docs/store/images/`의 이미지
   (아이콘 512, 피처그래픽 1024×500, 스크린샷 4장) 업로드.
5. **콘텐츠 등급 / 데이터 안전 / 대상 연령**: `listing.md`의 설문 답안 가이드대로 작성.
6. **개인정보처리방침**: https://www.maldongmu.app/privacy
7. 검토 제출 → 승인 후 게시.

> 검증 팁: 앱 설치 후 주소창이 보이면 assetlinks 검증 실패 → 3번(앱 서명 키 지문) 확인.
> `https://developers.google.com/digital-asset-links/tools/generator` 로 점검 가능.

---

## 부록: 로컬 툴체인 (이 맥에 설치됨, sudo 없이 ~/android-tools/)
- JDK 17: `~/android-tools/jdk-17.0.20+8`
- Android SDK: `~/android-tools/android_sdk` (platform 34, build-tools)
- Bubblewrap 설정: `~/.bubblewrap/config.json`
- TWA 프로젝트: `~/android-tools/maldongmu-twa/`
