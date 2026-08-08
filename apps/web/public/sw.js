// 최소 서비스워커 — PWA '설치 가능' 조건 충족 + TWA 호환용.
// SSR 실서비스라 캐싱은 stale 콘텐츠 위험이 커서, 의도적으로 캐시 없이 네트워크로 통과시킨다.
// ponytail: 캐싱 없음. 오프라인 캐시가 실제로 필요해지면 그때 워크박스 도입.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  /* 기본 네트워크 처리에 위임 (respondWith 호출 안 함) */
});
