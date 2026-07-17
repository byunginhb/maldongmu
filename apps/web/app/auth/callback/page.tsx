"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setToken } from "../../../lib/api";

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get("token");
    if (token) {
      setToken(token);
      router.replace("/me");
    } else {
      router.replace("/?login=failed");
    }
  }, [params, router]);

  return <p className="empty">로그인하는 중이에요...</p>;
}

export default function AuthCallbackPage() {
  return (
    <main className="page">
      <Suspense fallback={<p className="empty">로그인하는 중이에요...</p>}>
        <CallbackInner />
      </Suspense>
    </main>
  );
}
