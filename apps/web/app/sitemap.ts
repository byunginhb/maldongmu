import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.maldongmu.app";

// 서버 OCCUPATION_GROUPS의 key와 동일 (직업 큐레이션 페이지)
const OCCUPATION_KEYS = ["judge", "firefighter", "haenyeo", "pilot", "navigator", "gugak", "monk", "astronomer", "actor", "writer"];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    ...OCCUPATION_KEYS.map((k) => ({ url: `${SITE_URL}/meet/${k}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.7 })),
    { url: `${SITE_URL}/grannies`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: SITE_URL, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/search`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/meet`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE_URL}/dating`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/recommend`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}
