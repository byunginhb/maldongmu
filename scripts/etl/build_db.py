#!/usr/bin/env python3
"""
Nemotron-Personas-Korea parquet -> maldongmu.db (SQLite)

- personas         : 목록/카드용 경량 테이블 (rowid로 랜덤 접근)
- persona_details  : 대화 시작 시에만 읽는 상세 텍스트
- persona_fts      : FTS5 trigram 인덱스 (한글 부분일치 검색: 이름/한줄소개/직업)

사용:
  pip install pyarrow
  python3 build_db.py --src /path/to/parquet-dir --out maldongmu.db
"""
import argparse
import glob
import os
import re
import sqlite3
import sys

NAME_RE = re.compile(r"^([가-힣]{2,4})\s*(?:씨|님)?는")

DETAIL_COLS = [
    "professional_persona", "sports_persona", "arts_persona", "travel_persona",
    "culinary_persona", "family_persona", "cultural_background",
    "skills_and_expertise", "hobbies_and_interests", "career_goals_and_ambitions",
    "marital_status", "education_level", "family_type", "housing_type",
    "bachelors_field", "military_status",
]


def extract_name(row: dict, idx: int) -> str:
    for field in ("persona", "professional_persona", "family_persona"):
        text = row.get(field) or ""
        m = NAME_RE.match(text.strip())
        if m:
            return m.group(1)
    return f"이웃{idx}"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True, help="parquet 파일들이 있는 폴더")
    ap.add_argument("--out", required=True, help="출력 SQLite 경로")
    ap.add_argument("--limit", type=int, default=0, help="행 제한 (0=전체)")
    ap.add_argument("--skip", type=int, default=0, help="앞에서 건너뛸 행 수 (청크 이어하기)")
    ap.add_argument("--append", action="store_true", help="기존 DB에 이어쓰기")
    ap.add_argument("--finalize", action="store_true", help="인덱스만 생성하고 종료")
    args = ap.parse_args()

    import pyarrow.parquet as pq

    files = sorted(glob.glob(os.path.join(args.src, "*.parquet")))
    if not files:
        sys.exit(f"parquet 없음: {args.src}")

    if not args.append and not args.finalize and os.path.exists(args.out):
        os.remove(args.out)
    con = sqlite3.connect(args.out)
    con.executescript(
        """
        PRAGMA journal_mode = OFF;
        PRAGMA synchronous = OFF;
        PRAGMA cache_size = -200000;
        """
    )

    if args.finalize:
        print("인덱스 생성 중...", flush=True)
        con.executescript(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS idx_personas_uuid ON personas(uuid);
            CREATE INDEX IF NOT EXISTS idx_personas_filter ON personas(province, sex, age);
            PRAGMA optimize;
            """
        )
        con.execute("PRAGMA journal_mode = WAL")
        n = con.execute("SELECT COUNT(*) FROM personas").fetchone()[0]
        con.close()
        size_mb = os.path.getsize(args.out) / 1024 / 1024
        print(f"완료: {args.out} — {n:,}명, {size_mb:,.0f}MB")
        return

    if not args.append:
        con.executescript(
        """
        CREATE TABLE personas (
          uuid TEXT NOT NULL,
          name TEXT NOT NULL,
          one_liner TEXT NOT NULL,
          age INTEGER,
          sex TEXT,
          occupation TEXT,
          province TEXT,
          district TEXT
        );
        CREATE TABLE persona_details (
          uuid TEXT PRIMARY KEY,
          """ + ",\n          ".join(f"{c} TEXT" for c in DETAIL_COLS) + """
        );
        CREATE VIRTUAL TABLE persona_fts USING fts5(
          uuid UNINDEXED, name, one_liner, occupation,
          tokenize = 'trigram'
        );
        """
        )

    p_sql = "INSERT INTO personas VALUES (?,?,?,?,?,?,?,?)"
    d_sql = f"INSERT INTO persona_details VALUES (?,{','.join('?' * len(DETAIL_COLS))})"
    f_sql = "INSERT INTO persona_fts VALUES (?,?,?,?)"

    total = 0
    seen = 0
    done = 0
    for fp in files:
        pf = pq.ParquetFile(fp)
        nrows = pf.metadata.num_rows
        if seen + nrows <= args.skip:
            seen += nrows
            total += nrows
            continue
        for batch in pf.iter_batches(batch_size=5000):
            blen = batch.num_rows
            if seen + blen <= args.skip:
                seen += blen
                total += blen
                continue
            seen += blen
            rows = batch.to_pylist()
            p_rows, d_rows, f_rows = [], [], []
            for row in rows:
                total += 1
                uuid = row["uuid"]
                name = extract_name(row, total)
                one_liner = (row.get("persona") or "").strip()
                occupation = (row.get("occupation") or "").strip()
                try:
                    age = int(row.get("age") or 0)
                except (TypeError, ValueError):
                    age = 0
                p_rows.append((uuid, name, one_liner, age, row.get("sex"),
                               occupation, row.get("province"), row.get("district")))
                d_rows.append((uuid, *[(row.get(c) or "").strip() if isinstance(row.get(c), str) else str(row.get(c) or "") for c in DETAIL_COLS]))
                f_rows.append((uuid, name, one_liner, occupation))
            con.executemany(p_sql, p_rows)
            con.executemany(d_sql, d_rows)
            con.executemany(f_sql, f_rows)
            con.commit()
            done += len(p_rows)
            if args.limit and done >= args.limit:
                break
        if args.limit and done >= args.limit:
            break

    con.close()
    print(f"chunk done: skip={args.skip} inserted={done:,} next_skip={args.skip + done}")

    if not args.limit and not args.append:
        print("전체 완료. --finalize로 인덱스를 생성하세요.")


if __name__ == "__main__":
    main()
