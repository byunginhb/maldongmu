import { request as httpsRequest } from "https";
import { request as httpRequest } from "http";
import { lookup as dnsLookup } from "dns";
import { isIP } from "net";

/**
 * SSRF 방어 URL 본문 추출.
 * 핵심: 커스텀 lookup에서 해석된 모든 IP를 검증하고, 검증한 IP로만 연결(핀닝)한다.
 * 글로벌 fetch는 검증 후 재-resolve로 DNS rebinding(TOCTOU)이 남지만, 여기선 lookup이 반환한
 * 바로 그 IP로 소켓이 연결되므로 검증과 연결이 원자적이다. 새 의존성 없음.
 */

const MAX_BYTES = 1_500_000;
const TIMEOUT_MS = 6000;
const MAX_REDIRECTS = 3;
const MAX_TEXT = 6000;

/** 사설/예약/루프백/링크로컬/메타데이터 대역이면 true (차단). */
export function isBlockedIp(ip: string): boolean {
  let addr = ip;
  // IPv4-mapped IPv6 (::ffff:127.0.0.1) 언랩
  const low = addr.toLowerCase();
  if (isIP(addr) === 6 && low.startsWith("::ffff:")) {
    const tail = addr.slice(addr.lastIndexOf(":") + 1);
    if (isIP(tail) === 4) addr = tail;
  }
  const fam = isIP(addr);
  if (fam === 4) {
    const p = addr.split(".").map(Number);
    const [a, b] = p;
    if (a === 0) return true; // 0.0.0.0/8 (unspecified)
    if (a === 10) return true; // private
    if (a === 127) return true; // loopback
    if (a === 169 && b === 254) return true; // link-local + cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true; // multicast/reserved
    return false;
  }
  if (fam === 6) {
    const l = addr.toLowerCase();
    if (l === "::1" || l === "::") return true; // loopback / unspecified
    if (l.startsWith("fe80")) return true; // link-local
    if (l.startsWith("fc") || l.startsWith("fd")) return true; // ULA fc00::/7
    if (l.startsWith("ff")) return true; // multicast
    return false;
  }
  return true; // 파싱 불가 → 차단
}

/**
 * http(s) request의 lookup 훅: 해석된 모든 주소를 검증하고 검증된 IP로만 연결(핀닝).
 * Agent가 opts.all=true로 호출하면(happy-eyeballs) 콜백도 배열 형식으로 응답해야 한다.
 */
function safeLookup(hostname: string, opts: any, cb: (err: Error | null, addr?: any, fam?: number) => void) {
  dnsLookup(hostname, { all: true, verbatim: true }, (err, addresses: any) => {
    if (err) return cb(err);
    const list = Array.isArray(addresses) ? addresses : [addresses];
    if (!list.length) return cb(new Error("no address"));
    for (const a of list) if (isBlockedIp(a.address)) return cb(new Error("blocked address"));
    if (opts && opts.all) cb(null, list);
    else cb(null, list[0].address, list[0].family);
  });
}

type Once = { status: number; redirectTo?: string; body?: string };

function fetchOnce(urlStr: string): Promise<Once> {
  const u = new URL(urlStr);
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("scheme not allowed");
  const port = u.port ? Number(u.port) : u.protocol === "https:" ? 443 : 80;
  if (port !== 80 && port !== 443) throw new Error("port not allowed");
  // IP 리터럴은 Node가 lookup 훅을 거치지 않으므로 여기서 직접 검증(우회 차단).
  // WHATWG URL이 10진/8진/16진 IPv4를 점표기로 정규화하므로 그것들도 잡힌다.
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host) && isBlockedIp(host)) throw new Error("blocked host");
  const mod = u.protocol === "https:" ? httpsRequest : httpRequest;

  return new Promise<Once>((resolve, reject) => {
    let settled = false;
    const done = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };
    const req = mod(
      u,
      {
        method: "GET",
        lookup: safeLookup as any,
        timeout: TIMEOUT_MS,
        headers: { "User-Agent": "maldongmu-interview/1.0", Accept: "text/html,text/plain,*/*;q=0.1" },
      },
      (res) => {
        const status = res.statusCode || 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          res.destroy();
          return done(() => resolve({ status, redirectTo: new URL(res.headers.location as string, u).toString() }));
        }
        const ct = String(res.headers["content-type"] || "");
        if (!/text\/html|text\/plain/i.test(ct)) {
          res.destroy();
          return done(() => reject(new Error("unsupported content-type")));
        }
        let bytes = 0;
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => {
          bytes += c.length;
          if (bytes > MAX_BYTES) {
            res.destroy();
            return done(() => resolve({ status, body: Buffer.concat(chunks).toString("utf8") }));
          }
          chunks.push(c);
        });
        res.on("end", () => done(() => resolve({ status, body: Buffer.concat(chunks).toString("utf8") })));
        res.on("error", (e) => done(() => reject(e)));
      },
    );
    req.on("timeout", () => {
      req.destroy(new Error("timeout"));
    });
    req.on("error", (e) => done(() => reject(e)));
    req.end();
  });
}

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'", "#34": '"',
};
function decodeEntities(s: string): string {
  return s.replace(/&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, e) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e] ?? m;
  });
}

function extractText(html: string): string {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  const title = (cleaned.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").trim();
  const body = decodeEntities(cleaned.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
  const text = (title ? `${title}\n\n` : "") + body;
  return text.slice(0, MAX_TEXT);
}

/** URL을 안전하게 가져와 본문 텍스트(제목+본문, ~6k자)로 반환. 실패 시 throw. */
export async function fetchUrlText(input: string): Promise<string> {
  let url = input.trim();
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const r = await fetchOnce(url);
    if (r.redirectTo) {
      url = r.redirectTo;
      continue;
    }
    if (r.status >= 400 || r.body == null) throw new Error(`fetch failed (${r.status})`);
    const text = extractText(r.body);
    if (text.replace(/\s/g, "").length < 40) throw new Error("too little text");
    return text;
  }
  throw new Error("too many redirects");
}
