const { withAppBuildGradle } = require("@expo/config-plugins");

// 릴리스 AAB를 업로드 키스토어로 서명하도록 android/app/build.gradle을 패치.
// 시크릿은 gradle 프로퍼티(-P 또는 ~/.gradle/gradle.properties)로 주입 → 저장소엔 안 들어간다.
// android/가 gitignore(Expo CNG)라, expo prebuild 때마다 이 플러그인이 서명 설정을 다시 적용한다.
const RELEASE_SIGNING = `        release {
            if (project.hasProperty('MALDONGMU_STORE_FILE')) {
                storeFile file(MALDONGMU_STORE_FILE)
                storePassword MALDONGMU_STORE_PASSWORD
                keyAlias MALDONGMU_KEY_ALIAS
                keyPassword MALDONGMU_KEY_PASSWORD
            }
        }
`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let c = cfg.modResults.contents;
    if (!c.includes("MALDONGMU_STORE_FILE")) {
      c = c.replace(/signingConfigs\s*\{\n/, (m) => m + RELEASE_SIGNING);
      c = c.replace(
        "signingConfig signingConfigs.debug\n            def enableShrinkResources",
        "signingConfig project.hasProperty('MALDONGMU_STORE_FILE') ? signingConfigs.release : signingConfigs.debug\n            def enableShrinkResources",
      );
    }
    cfg.modResults.contents = c;
    return cfg;
  });
};
