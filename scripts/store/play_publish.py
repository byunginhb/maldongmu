#!/usr/bin/env python3
"""
Play Console 업데이트를 Google Play Developer API로 처리한다.
AAB 업로드 → 프로덕션 릴리스(출시 노트) → 스토어 등록정보(제목·설명) → 이미지 교체 → 검증 → (--commit 시) 검토 제출.

사용 예 (docs/store/deploy-checklist.md UPDATE 절):
  ~/android-tools/play-venv/bin/python scripts/store/play_publish.py \
    --aab ~/android-tools/maldongmu-rn-v1.1.0.aab --release-name 1.1.0 --notes notes.txt \
    --title "말동무: 가상 연애와 욕쟁이 할매" --short short.txt --full full.txt \
    --feature docs/store/images/feature-graphic.png --screenshots docs/store/images/screenshot-0*.png --commit

다국어 등록정보 (docs/store/listings/<lang>/{title,short,full,notes}.txt + docs/store/images[/<lang>]/):
  ... --listings-dir docs/store/listings --images-root docs/store/images --default-language en-US --localize-notes --commit
  ko-KR 이미지는 images 루트, 그 외 언어는 images/<lang>/ (없으면 zh-HK→zh-TW 처럼 FALLBACK 참고, 그래도 없으면 이미지 생략).

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
IMAGE_FALLBACK = {"zh-HK": "zh-TW"}  # 같은 번체 이미지 재사용
SCOPES = ["https://www.googleapis.com/auth/androidpublisher"]


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read().strip()


def listing_notes(listings_dir):
    """listings/<lang>/notes.txt → releaseNotes 목록"""
    notes = []
    for lang in sorted(os.listdir(listings_dir)):
        p = os.path.join(listings_dir, lang, "notes.txt")
        if os.path.isfile(p):
            notes.append({"language": lang, "text": read(p)})
    return notes


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
    ap.add_argument("--listings-dir", help="언어별 하위 폴더에 title/short/full/notes.txt")
    ap.add_argument("--images-root", help="언어별 이미지 루트 (ko-KR은 루트, 그 외는 <root>/<lang>/)")
    ap.add_argument("--default-language", help="스토어 기본 언어 변경 (지원 외 언어 사용자에게 보이는 등록정보)")
    ap.add_argument("--localize-notes", action="store_true", help="현재 프로덕션 릴리스의 출시 노트를 listings의 notes.txt로 전 언어 갱신")
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
            notes = listing_notes(a.listings_dir) if a.listings_dir else []
            if a.notes and not any(n["language"] == LANG for n in notes):
                notes.append({"language": LANG, "text": read(a.notes)})
            if notes:
                release["releaseNotes"] = notes
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

        def replace_images(image_type, paths, lang=LANG):
            edits.images().deleteall(packageName=PACKAGE, editId=edit_id, language=lang, imageType=image_type).execute()
            for p in paths:
                edits.images().upload(packageName=PACKAGE, editId=edit_id, language=lang, imageType=image_type,
                                      media_body=MediaFileUpload(p, mimetype="image/png")).execute()
                print(f"  [{lang}] {image_type}: {os.path.basename(p)}")

        if a.feature:
            replace_images("featureGraphic", [a.feature])
        if a.screenshots:
            replace_images("phoneScreenshots", a.screenshots)

        # 다국어 등록정보: 언어 폴더마다 텍스트 + (있으면) 이미지 교체
        if a.listings_dir:
            for lang in sorted(os.listdir(a.listings_dir)):
                d = os.path.join(a.listings_dir, lang)
                if not os.path.isdir(d) or not os.path.exists(os.path.join(d, "title.txt")):
                    continue
                body = {"language": lang, "title": read(os.path.join(d, "title.txt")),
                        "shortDescription": read(os.path.join(d, "short.txt")), "fullDescription": read(os.path.join(d, "full.txt"))}
                edits.listings().update(packageName=PACKAGE, editId=edit_id, language=lang, body=body).execute()
                print(f"[{lang}] 등록정보: 제목 {len(body['title'])}자 / 간단 {len(body['shortDescription'])}자 / 자세한 {len(body['fullDescription'])}자")
                if a.images_root:
                    img_lang = IMAGE_FALLBACK.get(lang, lang)
                    img_dir = a.images_root if img_lang == "ko-KR" else os.path.join(a.images_root, img_lang)
                    # 아이콘도 언어별 자산 — 기본 언어 등록정보엔 필수. 루트의 512 아이콘을 모든 언어에 동일하게
                    icon = os.path.join(a.images_root, "app-icon-512.png")
                    if os.path.exists(icon):
                        replace_images("icon", [icon], lang)
                    feature = os.path.join(img_dir, "feature-graphic.png")
                    shots = sorted(os.path.join(img_dir, f) for f in os.listdir(img_dir) if f.startswith("screenshot-")) if os.path.isdir(img_dir) else []
                    if os.path.exists(feature):
                        replace_images("featureGraphic", [feature], lang)
                    if shots:
                        replace_images("phoneScreenshots", shots, lang)

        if a.default_language:
            cur = edits.details().get(packageName=PACKAGE, editId=edit_id).execute()
            cur["defaultLanguage"] = a.default_language
            edits.details().update(packageName=PACKAGE, editId=edit_id, body=cur).execute()
            print(f"기본 언어 → {a.default_language}")

        if a.localize_notes and not a.aab:
            track = edits.tracks().get(packageName=PACKAGE, editId=edit_id, track=a.track).execute()
            releases = track.get("releases", [])
            notes = listing_notes(a.listings_dir)
            if releases and notes:
                releases[0]["releaseNotes"] = notes
                edits.tracks().update(packageName=PACKAGE, editId=edit_id, track=a.track, body={"track": a.track, "releases": releases}).execute()
                print(f"{a.track} 릴리스 {releases[0].get('name')} 출시 노트 {len(notes)}개 언어로 갱신")

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
