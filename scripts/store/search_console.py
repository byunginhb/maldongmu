#!/usr/bin/env python3
"""Search Console 주간 점검 — 사이트맵 상태, 28일 페이지·검색어 실적, 주요 URL 색인 상태.
  ~/android-tools/play-venv/bin/python scripts/store/search_console.py
서비스 계정(play-publisher)이 Search Console 속성 사용자로 등록되어 있어야 한다. 읽기 전용."""
import datetime as dt
from google.oauth2 import service_account
from googleapiclient.discovery import build

SITE = "sc-domain:maldongmu.app"
KEY = "/Users/byungin/android-tools/play-service-account.json"
CHECK = ["/", "/dating", "/grannies", "/meet", "/meet/judge", "/meet/haenyeo", "/meet/firefighter"]

creds = service_account.Credentials.from_service_account_file(KEY, scopes=["https://www.googleapis.com/auth/webmasters.readonly"])
sc = build("searchconsole", "v1", credentials=creds, cache_discovery=False)
end = dt.date.today() - dt.timedelta(days=2); start = end - dt.timedelta(days=27)
print(f"기간 {start} ~ {end}")
print("--- 사이트맵 ---")
for sm in sc.sitemaps().list(siteUrl=SITE).execute().get("sitemap", []):
    print(f"{sm['path']} | 제출 {sm.get('lastSubmitted','')[:10]} | 마지막 처리 {sm.get('lastDownloaded','')[:10]} | 오류 {sm.get('errors')} | URL {[c.get('submitted') for c in sm.get('contents', [])]}")
for dim, label in [("page", "페이지"), ("query", "검색어")]:
    print(f"--- {label} (노출순) ---")
    r = sc.searchanalytics().query(siteUrl=SITE, body={"startDate": str(start), "endDate": str(end), "dimensions": [dim], "rowLimit": 12}).execute()
    for row in sorted(r.get("rows", []), key=lambda x: -x["impressions"]):
        print(f"{row['keys'][0].replace('https://www.maldongmu.app', '') or '/':50s} 노출 {row['impressions']:>4} 클릭 {row['clicks']:>3} 순위 {row['position']:.1f}")
print("--- 색인 상태 ---")
for path in CHECK:
    try:
        res = sc.urlInspection().index().inspect(body={"inspectionUrl": "https://www.maldongmu.app" + path, "siteUrl": SITE}).execute()["inspectionResult"]["indexStatusResult"]
        print(f"{path:20s} {res.get('verdict')} | {res.get('coverageState')} | 마지막 크롤 {(res.get('lastCrawlTime') or '-')[:10]}")
    except Exception as e:
        print(path, "조회 실패:", str(e)[:100])
