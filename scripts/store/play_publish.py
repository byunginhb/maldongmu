#!/usr/bin/env python3
"""
Play Console 업데이트를 Google Play Developer API로 처리한다.
AAB 업로드 → 프로덕션 릴리스(출시 노트) → 스토어 등록정보(제목·설명) → 이미지 교체 → 검증 → (--commit 시) 검토 제출.

사용 예 (docs/store/deploy-checklist.md UPDATE 절):
  ~/android-tools/play-venv/bin/python scripts/store/play_publish.py \
    --aab ~/android-tools/maldongmu-rn-v1.1.0.aab --release-name 1.1.0 --notes notes.txt \
    --title "말동무: 가상 연애와 욕쟁이 할매" --short short.txt --full full.txt \
    --feature docs/store/images/feature-graphic.png --screenshots docs/store/images/screenshot-0*.png --commit

서비스 계정 키: ~/android-tools/play-service-account.json (또는 PLAY_SA_JSON). 저장소엔 시크릿 없음.
API로 안 되는 것: 콘텐츠 등급·데이터 안전·타겟층 설문, 스토어 태그 — 콘솔에서 직접.
"""
import argparse
import os
import sys

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

PACKAGE = "app.maldongmu.twa"
LANG = "ko-KR"
SCOPES = ["https://www.googleapis.com/auth/androidpublisher"]


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read().strip()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--aab")
    ap.add_argument("--release-name")
    ap.add_argument("--notes", help="출시 노트 텍스트 파일")
    ap.add_argument("--track", default="production")
    ap.add_argument("--title")
    ap.add_argument("--short", help="간단한 설명 텍스트 파일")
    ap.add_argument("--full", help="자세한 설명 텍스트 파일")
    ap.add_argument("--feature", help="피처 그래픽 PNG (1024x500)")
    ap.add_argument("--screenshots", nargs="*", help="휴대전화 스크린샷 PNG, 표시 순서대로")
    ap.add_argument("--commit", action="store_true", help="검증 후 실제 제출. 없으면 검증만 하고 편집을 버린다")
    a = ap.parse_args()

    key = os.environ.get("PLAY_SA_JSON", os.path.expanduser("~/android-tools/play-service-account.json"))
    creds = service_account.Credentials.from_service_account_file(key, scopes=SCOPES)
    svc = build("androidpublisher", "v3", credentials=creds, cache_discovery=False)
    edits = svc.edits()
    edit_id = edits.insert(packageName=PACKAGE, body={}).execute()["id"]
    print(f"edit 시작: {edit_id}")

    try:
        if a.aab:
            media = MediaFileUpload(a.aab, mimetype="application/octet-stream", resumable=True, chunksize=8 * 1024 * 1024)
            req = edits.bundles().upload(packageName=PACKAGE, editId=edit_id, media_body=media)
            resp = None
            while resp is None:
                status, resp = req.next_chunk()
                if status:
                    print(f"  AAB 업로드 {int(status.progress() * 100)}%")
            vc = resp["versionCode"]
            print(f"AAB 업로드 완료: versionCode {vc}")
            release = {"name": a.release_name or str(vc), "versionCodes": [str(vc)], "status": "completed"}
            if a.notes:
                release["releaseNotes"] = [{"language": LANG, "text": read(a.notes)}]
            edits.tracks().update(packageName=PACKAGE, editId=edit_id, track=a.track,
                                  body={"track": a.track, "releases": [release]}).execute()
            print(f"{a.track} 트랙 릴리스 설정: {release['name']} (전체 출시)")

        if a.title or a.short or a.full:
            try:
                cur = edits.listings().get(packageName=PACKAGE, editId=edit_id, language=LANG).execute()
            except Exception:
                cur = {}
            body = {
                "language": LANG,
                "title": a.title or cur.get("title", ""),
                "shortDescription": read(a.short) if a.short else cur.get("shortDescription", ""),
                "fullDescription": read(a.full) if a.full else cur.get("fullDescription", ""),
            }
            if cur.get("video"):
                body["video"] = cur["video"]
            edits.listings().update(packageName=PACKAGE, editId=edit_id, language=LANG, body=body).execute()
            print(f"등록정보 갱신: 제목 {len(body['title'])}자 / 간단 {len(body['shortDescription'])}자 / 자세한 {len(body['fullDescription'])}자")

        def replace_images(image_type, paths):
            edits.images().deleteall(packageName=PACKAGE, editId=edit_id, language=LANG, imageType=image_type).execute()
            for p in paths:
                edits.images().upload(packageName=PACKAGE, editId=edit_id, language=LANG, imageType=image_type,
                                      media_body=MediaFileUpload(p, mimetype="image/png")).execute()
                print(f"  {image_type}: {os.path.basename(p)}")

        if a.feature:
            replace_images("featureGraphic", [a.feature])
        if a.screenshots:
            replace_images("phoneScreenshots", a.screenshots)

        edits.validate(packageName=PACKAGE, editId=edit_id).execute()
        print("검증 통과")
        if a.commit:
            edits.commit(packageName=PACKAGE, editId=edit_id, changesNotSentForReview=False).execute()
            print("커밋 완료 → 검토 제출됨")
        else:
            edits.delete(packageName=PACKAGE, editId=edit_id).execute()
            print("(--commit 없음) 편집 폐기 — 실제 변경 없음")
    except Exception:
        try:
            edits.delete(packageName=PACKAGE, editId=edit_id).execute()
        except Exception:
            pass
        raise


if __name__ == "__main__":
    sys.exit(main())
