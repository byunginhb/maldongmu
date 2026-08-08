import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView, type WebViewNavigation } from "react-native-webview";
import type { ShouldStartLoadRequest } from "react-native-webview/lib/WebViewTypes";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import * as SplashScreen from "expo-splash-screen";

const SITE = "https://www.maldongmu.app";
const CREAM = "#f2e9d9";
const CORAL = "#e8613c";
const BROWN = "#3d2b1f";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const webRef = useRef<WebView>(null);
  const canGoBack = useRef(false);
  const [ready, setReady] = useState(false);
  const [errored, setErrored] = useState(false);

  // Android 물리 뒤로가기 → WebView 뒤로. 더 못 가면 앱 종료(기본 동작).
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (canGoBack.current) {
        webRef.current?.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, []);

  // 임베디드 WebView에선 구글 OAuth가 차단됨 → 외부 인증 세션(Custom Tab)으로 열고,
  // 서버가 maldongmu://auth?token= 로 돌려주면 토큰을 WebView localStorage에 심고 /me로 이동.
  const handleOAuth = useCallback(async (startUrl: string) => {
    try {
      const sep = startUrl.includes("?") ? "&" : "?";
      const res = await WebBrowser.openAuthSessionAsync(`${startUrl}${sep}app=1`, "maldongmu://auth");
      if (res.type === "success" && res.url) {
        const m = res.url.match(/[?&]token=([^&]+)/);
        if (m) {
          const token = decodeURIComponent(m[1]);
          webRef.current?.injectJavaScript(
            `(function(){try{localStorage.setItem('mdm_token',${JSON.stringify(
              token,
            )});location.href='/me';}catch(e){}})(); true;`,
          );
        }
      }
    } catch {
      /* 사용자가 취소하거나 실패 — 게스트로 계속 사용 가능 */
    }
  }, []);

  const onShouldStart = useCallback(
    (req: ShouldStartLoadRequest): boolean => {
      const url = req.url || "";
      // 소셜 로그인 시작 → 외부 브라우저 인증 세션으로 넘김
      if (url.includes("/api/auth/") && url.includes("/start")) {
        handleOAuth(url);
        return false;
      }
      if (url.startsWith("http://") || url.startsWith("https://")) {
        // 서비스 도메인은 앱 내 WebView 유지
        if (url.includes("maldongmu.app")) return true;
        // 그 외 외부 링크는 시스템 브라우저(Custom Tab)로
        WebBrowser.openBrowserAsync(url).catch(() => {});
        return false;
      }
      // mailto:, tel: 등은 OS에 위임
      if (!url.startsWith("about:") && !url.startsWith("data:")) {
        Linking.openURL(url).catch(() => {});
        return false;
      }
      return true;
    },
    [handleOAuth],
  );

  const onNav = useCallback((s: WebViewNavigation) => {
    canGoBack.current = s.canGoBack;
  }, []);

  const finishLoad = useCallback(() => {
    if (!ready) {
      setReady(true);
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  const reload = useCallback(() => {
    setErrored(false);
    webRef.current?.reload();
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <StatusBar style="dark" />
        {errored ? (
          <View style={styles.center}>
            <Text style={styles.errTitle}>연결이 어려워요</Text>
            <Text style={styles.errBody}>인터넷 연결을 확인하고 다시 시도해주세요.</Text>
            <TouchableOpacity style={styles.btn} onPress={reload} activeOpacity={0.8}>
              <Text style={styles.btnText}>다시 시도</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <WebView
            ref={webRef}
            source={{ uri: SITE }}
            applicationNameForUserAgent="maldongmuApp"
            onShouldStartLoadWithRequest={onShouldStart}
            onNavigationStateChange={onNav}
            onLoadEnd={finishLoad}
            onError={() => {
              setErrored(true);
              finishLoad();
            }}
            onHttpError={() => finishLoad()}
            pullToRefreshEnabled
            allowsBackForwardNavigationGestures
            setSupportMultipleWindows={false}
            overScrollMode="never"
            style={styles.web}
          />
        )}
        {!ready && !errored && (
          <View style={styles.center} pointerEvents="none">
            <ActivityIndicator size="large" color={CORAL} />
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: CREAM },
  web: { flex: 1, backgroundColor: CREAM },
  center: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CREAM,
    padding: 32,
  },
  errTitle: { fontSize: 18, fontWeight: "700", color: BROWN, marginBottom: 8 },
  errBody: { fontSize: 14, color: "#8c7361", textAlign: "center", marginBottom: 20 },
  btn: { backgroundColor: CORAL, borderRadius: 24, paddingHorizontal: 28, paddingVertical: 13 },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
